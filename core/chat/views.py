from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Room, User, Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime

class ChatViewset(viewsets.ViewSet):
    def get_room(self, request):
        try:
            second_user = User.objects.get(username=request.data.get('second_user'))
            room = Room.objects.get(
                Q(first_user=request.user, second_user=second_user) |
                Q(first_user=second_user, second_user=request.user)
            )
            return Response({"room_id": room.id}, status=status.HTTP_200_OK)
        except Room.DoesNotExist:
            room = Room.objects.create(first_user=request.user, second_user=second_user)
            return Response({"room_id": room.id}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({"error": "Second user not found"}, status=status.HTTP_404_NOT_FOUND)
        
    def save_message(self, request):
        try:
            room = Room.objects.get(id=request.data.get('room_id'))
            message = Message.objects.create(
                user=request.user,
                room=room,
                content=request.data.get('content')
            )
            return Response({"message_id": message.id}, status=status.HTTP_201_CREATED)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)
        
    def get_messages(self, request):
        try:
            room = Room.objects.get(id=request.data.get('room_id'))
            messages = Message.objects.filter(room=room).order_by('created_date')
            messages_data = [
                {
                    "user": message.user.username,
                    "avatar" : message.user.avatar.url,
                    "content": message.content,
                    "created_date": message.created_date
                }
                for message in messages
            ]
            return Response({"messages": messages_data}, status=status.HTTP_200_OK)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)