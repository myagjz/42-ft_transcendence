from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_first')
    second_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_second')

    class Meta:
        unique_together = ('first_user', 'second_user')

class Message(models.Model):
    user = models.ForeignKey(User, related_name="messages", verbose_name="Kullanıcı", on_delete=models.CASCADE)
    room = models.ForeignKey(Room, related_name="messages", verbose_name="Oda", on_delete=models.CASCADE)
    content = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)