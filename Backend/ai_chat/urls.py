from django.urls import path

from .views import ChatView, ConversationDetailView, ConversationListView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='ai-chat'),
    path('conversations/', ConversationListView.as_view(), name='ai-conversations'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
]
