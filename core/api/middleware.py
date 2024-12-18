import jwt
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth import get_user_model

class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api'):
            authorization = request.headers.get("Authorization")

            if not authorization or not authorization.startswith("Bearer "):
                return JsonResponse({"error": "unauthorized"}, status=401)

            token = authorization.split(" ")[1]

            try:
                User = get_user_model()
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user = User.objects.get(id=payload['user_id'])
                request.user = user
            except jwt.DecodeError:
                return JsonResponse({"error": "not enough segments in token"}, status=400)
            except User.DoesNotExist:
                return JsonResponse({"error": "user does not exist"}, status=404)
            except jwt.ExpiredSignatureError:
                return JsonResponse({"error": "token has expired"}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({"error": "invalid token"}, status=401)

        response = self.get_response(request)
        return response