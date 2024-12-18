import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.rooms = set()
        await self.accept()

    async def disconnect(self, close_code):
        for room_group_name in self.rooms:
            await self.channel_layer.group_discard(
                room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        room_id = data.get('room_id')

        if not room_id:
            return

        room_group_name = f"chat_{room_id}"

        if message_type == 'join_room':
            self.rooms.add(room_group_name)
            await self.channel_layer.group_add(
                room_group_name,
                self.channel_name
            )
            return

        if room_group_name in self.rooms:
            await self.channel_layer.group_send(
                room_group_name,
                {
                    'type': 'chat_message',
                    'message': data['message'],
                    'room_id': room_id,
                    'user': self.scope["user"].username,
                    'avatar': self.scope["user"].avatar.url
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'room_id': event['room_id'],
            'user': event['user'],
            'avatar': event['avatar']
        }))

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        
        self.notification_group_name = f'notifications_{self.scope["user"].username}'
        
        if not hasattr(self.channel_layer, 'online_users'):
            self.channel_layer.online_users = set()
            
        self.channel_layer.online_users.add(self.scope["user"].username)
        
        await self.channel_layer.group_add('online', self.channel_name)
        
        await self.channel_layer.group_send(
            'online',
            {
                'type': 'user_status_update',
                'online_users': list(self.channel_layer.online_users)
            }
        )
        
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group_name'):
            if hasattr(self.channel_layer, 'online_users'):
                self.channel_layer.online_users.discard(self.scope["user"].username)
                
                await self.channel_layer.group_send(
                    'online',
                    {
                        'type': 'user_status_update',
                        'online_users': list(self.channel_layer.online_users)
                    }
                )
            
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
            await self.channel_layer.group_discard(
                'online',
                self.channel_name
            )

    async def user_status_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status_update',
            'online_users': event['online_users']
        }))

    async def notification(self, event):
        message_data = {
            'type': 'notification',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }

        await self.send(text_data=json.dumps(message_data))

    async def invite(self, event):
        message_data = {
            'type': 'invite',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }
        
        await self.send(text_data=json.dumps(message_data))

    async def invite_accepted(self, event):
        message_data = {
            'type': 'invite_accepted',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }
        
        await self.send(text_data=json.dumps(message_data))

    #Tournament Feature
    async def tournament_join(self, event):
        if not hasattr(self.channel_layer, 'tournament_queue'):
            self.channel_layer.tournament_queue = []
        if not hasattr(self.channel_layer, 'tournament_finalist'):
            self.channel_layer.tournament_finalist = []
        
        username = event['data']['username']
        user = await self.get_user(username)
        player_info = {
            'username': username,
            'avatar': user.avatar.url if user.avatar else None
        }
        
        if not any(p['username'] == username for p in self.channel_layer.tournament_queue):
            self.channel_layer.tournament_queue.append(player_info)
        
        current_players = self.channel_layer.tournament_queue.copy()
        
        for player in current_players:
            await self.channel_layer.group_send(
                f'notifications_{player["username"]}',
                {
                    'type': 'tournament_player_joined',
                    'player': player_info,
                    'current_players': current_players
                }
            )
        
        if len(self.channel_layer.tournament_queue) == 4:
            players = self.channel_layer.tournament_queue.copy()
            
            pairings = [
                [players[0]['username'], players[1]['username']],
                [players[2]['username'], players[3]['username']]
            ]

            for player in players:
                await self.channel_layer.group_send(
                    f'notifications_{player["username"]}',
                    {
                        'type': 'tournament_ready',
                        'players': players,
                        'pairings': pairings
                    }
                )
            self.channel_layer.tournament_queue = []

    async def tournament_player_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'tournament_player_joined',
            'player': event.get('player'),
            'current_players': event.get('current_players')
        }))

    async def tournament_ready(self, event):
        await self.send(text_data=json.dumps({
            'type': 'tournament_ready',
            'players': event.get('players'),
            'pairings': event.get('pairings'),
        }))

    async def random_match(self, event):
        if not hasattr(self.channel_layer, 'random_match_queue'):
            self.channel_layer.random_match_queue = []
        
        username = event['data']['username']
        user = await self.get_user(username)
        player_info = {
            'username': username,
            'avatar': user.avatar.url if user.avatar else None
        }
        
        if not any(p['username'] == username for p in self.channel_layer.random_match_queue):
            self.channel_layer.random_match_queue.append(player_info)
            players = self.channel_layer.random_match_queue.copy()
            
            for player in players:
                await self.channel_layer.group_send(
                    f'notifications_{player["username"]}',
                    {
                        'type': 'random_match_player_joined',
                        'player': player_info,
                        'current_players': self.channel_layer.random_match_queue
                    }
                )
        
        if len(self.channel_layer.random_match_queue) == 2:
            players = self.channel_layer.random_match_queue.copy()
            self.channel_layer.random_match_queue = []
            
            room_id = f"random_{players[0]['username']}_{players[1]['username']}"
            
            for player in players:
                await self.channel_layer.group_send(
                    f'notifications_{player["username"]}',
                    {
                        'type': 'random_match_ready',
                        'players': players,
                        'roomId': room_id
                    }
                )

    async def random_match_ready(self, event):
        await self.send(text_data=json.dumps({
            'type': 'random_match_ready',
            'players': event.get('players'),
            'roomId': event.get('roomId')
        }))

    async def random_match_player_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'random_match_player_joined',
            'player': event.get('player'),
            'current_players': event.get('current_players')
        }))

    async def tournament_winner(self, event):
        try:
            finalists = self.channel_layer.tournament_finalist
            if event['username'] not in finalists:
                finalists.append(event['username'])

            if (len(finalists) == 2):
                for player in finalists:
                    await self.channel_layer.group_send(
                        f'notifications_{player}',
                        {
                            'type': 'tournament_final',
                            'finalists': finalists,
                            'room_id' : f"tournamet_final_{finalists[0]}_{finalists[1]}"
                        }
                    )
                self.channel_layer.tournament_finalist = []

        except Exception as e:
            await self.send_json({
                'type': 'error',
                'message': 'Tournament winner process failed'
            })

    async def tournament_final(self, event):        
        await self.send(text_data=json.dumps({
            'type': 'tournament_final',
            'finalists': event.get('finalists'),
            'room_id' : event.get('room_id')
        }))
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            notification_type = data.get('type')
            
            if notification_type == 'tournament_join':
                await self.channel_layer.group_send(
                    self.notification_group_name,
                    {
                        'type': 'tournament_join',
                        'data': data.get('data', {}),
                    }
                )
            elif notification_type == 'tournament_winner':
                await self.channel_layer.group_send(
                    self.notification_group_name,
                    {
                        'type': 'tournament_winner',
                        'username': data.get('username')
                    }
                )
            elif notification_type == 'tournament_final':
                await self.channel_layer.group_send(
                    self.notification_group_name,
                    {
                        'type': 'tournament_final',
                        'finalists': data.get('finalists')
                    }
                )
            elif notification_type == 'get_online_users':
                await self.send(text_data=json.dumps({
                    'type': 'user_status_update',
                    'online_users': list(self.channel_layer.online_users) if hasattr(self.channel_layer, 'online_users') else []
                }))
            else:
                target_username = data.get('username')
                title = data.get('title')
                message = data.get('message')
                extra_data = data.get('data', {})

                target_group_name = f'notifications_{target_username}'
                
                await self.channel_layer.group_send(
                    target_group_name,
                    {
                        'type': notification_type,
                        'title': title,
                        'message': message,
                        'data': extra_data,
                        'timestamp': datetime.now().isoformat()
                    }
                )
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))

    async def get_user(self, username):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return await User.objects.aget(username=username)
        except User.DoesNotExist:
            return None