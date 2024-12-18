from rest_framework.serializers import ModelSerializer, ImageField, CharField
from django.contrib.auth import get_user_model
from accounts.models import Game
from rest_framework import serializers

class UserSerializer(ModelSerializer):
    avatar_url = ImageField(source='avatar', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['username', 'email', 'first_name', 'last_name', 'avatar_url', 'isTfaActive', 'score']

class GameSerializer(serializers.ModelSerializer):
    winner_username = serializers.CharField(source='winner.username')
    loser_username = serializers.CharField(source='loser.username')
    
    class Meta:
        model = Game
        fields = ['winner_username', 'loser_username', 'winnerScore', 'loserScore', 'played_at']