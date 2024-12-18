from django.contrib.auth import get_user_model
from django.conf import settings
from django.shortcuts import redirect
from django.contrib.auth import login, logout
from rest_framework.response import Response
from rest_framework import viewsets, status
from datetime import datetime, timezone, timedelta
import requests
import jwt
import uuid
import pyotp
import re
from django.contrib.auth import authenticate
from .models import Notification

class AuthViewset(viewsets.ViewSet):
    def create_access_token(self, user_id):
        payload = {
            'user_id': str(user_id),
            'jti': str(uuid.uuid4()),
            'exp': datetime.now(tz=timezone.utc) + timedelta(minutes=1440),
            'iat': datetime.now(tz=timezone.utc)
        }
        access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return access_token

    def create_refresh_token(self, user_id):
        payload = {
            'user_id': str(user_id),
            'jti': str(uuid.uuid4()),
            'exp': datetime.now(tz=timezone.utc) + timedelta(days=7),
            'iat': datetime.now(tz=timezone.utc)
        }
        refresh_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return refresh_token
    
    def get_new_token(self,request):
        refresh_token = request.data.get('refresh_token')

        try:
            jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
            return Response({"access_token" : self.create_access_token(request.user.id), 'refresh_token' : self.create_refresh_token(request.user.id)})
        except jwt.DecodeError:
            return Response({"error": "not enough segments in token"}, status=status.HTTP_400_BAD_REQUEST)
        except jwt.ExpiredSignatureError:
            return Response({"error": "token has expired"}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({"error": "invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
    
    def get_intra_access_token(self, request):
        try:
            code = request.query_params['code']
            intra_auth_url = "https://api.intra.42.fr/oauth/token"
            data = {
                    "grant_type": "authorization_code",
                    "client_id": settings.INTRA_UID,
                    "client_secret": settings.INTRA_SECRET,
                    "code": code,
                    "redirect_uri": f"https://{settings.SERVER_NAME}/accounts/intra"
                }
            response = requests.post(intra_auth_url, data=data)
            if response.status_code != 200:
                return Response({'Error': 'Intra Auth Error'}, status=response.status_code)
            intra_access_token = response.json().get("access_token")
            return intra_access_token
        except Exception as e:
            return Response({'Error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_intra_user_info(self, request):
        try:
            intra_access_token = self.get_intra_access_token(request)
            user_info_url = "https://api.intra.42.fr/v2/me"
            headers = {'Authorization': f"Bearer {intra_access_token}"}
            response = requests.get(user_info_url, headers=headers)
        except Exception as e:
            return Response({'Error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return response.json()

    def intra_login(self, request):
        info_json = self.get_intra_user_info(request)
        User = get_user_model()
        email = info_json.get("email")

        try:
            user = User.objects.get(email=email)
            if (user.isTfaActive):
                response = redirect(f'https://{settings.SERVER_NAME}/tfa')
                response.set_cookie('uuid', user.id)
                return response
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                first_name=info_json.get("first_name"),
                last_name=info_json.get("last_name"),
            )

        login(request, user)

        access_token = self.create_access_token(user.id)
        refresh_token = self.create_refresh_token(user.id)
        
        response = redirect(f'https://{settings.SERVER_NAME}/profile')
        response.set_cookie('access_token', access_token)
        response.set_cookie('refresh_token', refresh_token)
        return response
    
    def tfa_login(self, request):
        try:
            User = get_user_model()
            user = User.objects.get(id=request.COOKIES.get('uuid'))
            totp = pyotp.TOTP(user.tfaSecret)
            tfa_code = request.data.get('tfaCode')
            if totp.verify(tfa_code):
                login(request, user)

                access_token = self.create_access_token(user.id)
                refresh_token = self.create_refresh_token(user.id)

                return Response({
                    'access_token': access_token,
                    'refresh_token': refresh_token
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'invalid TOTP code'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'user not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def user_register(self, request):
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        password = request.data.get('password')
        email = request.data.get('email')

        first_name_pattern = re.compile(r'^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$')
        if not first_name_pattern.match(first_name) or len(first_name) < 2 or len(first_name) > 30:
            return Response({'error': 'Invalid first name'}, status=status.HTTP_400_BAD_REQUEST)

        last_name_pattern = re.compile(r'^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$')
        if not last_name_pattern.match(last_name) or len(last_name) < 2 or len(last_name) > 30:
            return Response({'error': 'Invalid last name'}, status=status.HTTP_400_BAD_REQUEST)
        
        email_pattern = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
        if not email_pattern.match(email) or len(email) > 50:
            return Response({'error': 'Invalid email address'}, status=status.HTTP_400_BAD_REQUEST)

        password_pattern = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$')
        if not password_pattern.match(password) or len(password) > 20:
            return Response({'error': 'Invalid password. Password must be at least 8 characters long, contain at least one letter, one number, and one special character.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            User.objects.get(email=email)
            return Response({'error': 'user already register'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password
            )
            return Response({'success': 'user created'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def user_login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        email_pattern = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
        if not email_pattern.match(email) or len(email) > 50:
            return Response({'error': 'Invalid email address'}, status=status.HTTP_400_BAD_REQUEST)

        password_pattern = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$')
        if not password_pattern.match(password) or len(password) > 20:
            return Response({'error': 'Invalid password. Password must be at least 8 characters long, contain at least one letter, one number, and one special character.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            user = authenticate(request, email=email, password=password)
            
            if user is not None:
                if user.isTfaActive:
                     return Response({'uuid': user.id}, status=status.HTTP_200_OK)
                else:
                    login(request, user)

                    access_token = self.create_access_token(user.id)
                    refresh_token = self.create_refresh_token(user.id)

                    return Response({
                        'access_token': access_token,
                        'refresh_token': refresh_token
                    }, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid email or password'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def user_logout(self, request):
        if request.user.is_authenticated:
            try:
                logout(request)
                return Response("success", status=status.HTTP_200_OK)
            except Exception:
                return Response("error", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response("No user is logged in", status=status.HTTP_400_BAD_REQUEST)

    def get_intra_auth_url(self, request):
        return Response({'intra_auth_url': settings.INTRA_AUTH_URL}, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ViewSet):
    def check_notifications(self, request):
        try:
            notifications = Notification.objects.filter(user=request.user, is_read=False)
            if notifications.exists():
                notifications_data = [
                    {'id': n.id, 'message': n.message, 'type' : n.type ,'created_at': n.created_at}
                    for n in notifications
                ]
                return Response({'notifications': notifications_data}, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'no notifications'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def mark_as_read(self, request, pk=None):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({'message': 'Notification marked as read'}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)