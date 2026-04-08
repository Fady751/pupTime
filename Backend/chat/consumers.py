import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
            
        is_member = await self.is_user_in_room(self.room_id, self.scope['user'])
        if not is_member:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_content = text_data_json.get('message', '')
        if not message_content:
            return

        # Save message to database
        message = await self.save_message(self.room_id, self.scope['user'], message_content)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message.content,
                'sender': message.sender.username,
                'sender_id': message.sender.id,
                'created_at': message.created_at.isoformat()
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
            'sender_id': event['sender_id'],
            'created_at': event['created_at']
        }))

    @database_sync_to_async
    def is_user_in_room(self, room_id, user):
        try:
            room = ChatRoom.objects.get(id=room_id)
            return room.users.filter(id=user.id).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, room_id, user, content):
        room = ChatRoom.objects.get(id=room_id)
        return Message.objects.create(room=room, sender=user, content=content)
