from django.urls import path

from .views import FriendHobbyView, SelfHobbyView, HobbyListView

app_name = 'hobby'

urlpatterns = [
    path('', HobbyListView.as_view(), name='hobby-list'),
    path('friends/', FriendHobbyView.as_view(), {'start': 0}, name='friend-hobby-suggestions-default'),
    path('friends/<int:start>/', FriendHobbyView.as_view(), name='friend-hobby-suggestions'),
    path('self/', SelfHobbyView.as_view(), name='self-hobby-suggestions'),
]
