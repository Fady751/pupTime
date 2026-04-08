import urllib.parse
from channels.middleware import BaseMiddleware
from rest_framework.authtoken.models import Token
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = urllib.parse.parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]
        
        if token_key:
            scope['user'] = await get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)
