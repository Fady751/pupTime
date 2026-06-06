from django.urls import path

from .views import FriendHobbyView, HobbySuggestionView

app_name = 'hobby'

urlpatterns = [
    path('friends/<int:start>/', FriendHobbyView.as_view(), name='friend-hobby-suggestions'),
    path('friends/<int:start>', FriendHobbyView.as_view(), name='friend-hobby-suggestions_no_slash'),
    path('suggest/<int:hobby_id>/', HobbySuggestionView.as_view(), name='hobby-suggestions'),
    path('suggest/<int:hobby_id>', HobbySuggestionView.as_view(), name='hobby-suggestions_no_slash'),
]
