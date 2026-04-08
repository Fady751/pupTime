from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')

urlpatterns = [
    path('', include(router.urls)),
]
