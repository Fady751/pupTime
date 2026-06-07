import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PUPtime.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from chat.middleware import TokenAuthMiddleware
import chat.routing
import ai_chat.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddleware(
            URLRouter(
                chat.routing.websocket_urlpatterns +
                ai_chat.routing.websocket_urlpatterns
            )
        )
    ),
})
