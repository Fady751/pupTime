import json
from channels.generic.websocket import AsyncWebsocketConsumer

from .loop_service import AILoopService
from .services import ChatService
from .s3_storage import download_voice_file


class AIChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        await self.accept()

    async def disconnect(self, code):
        pass

    async def receive(self, text_data):
        pass
