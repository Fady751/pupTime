from django.urls import path

from .views import ApproveAIChoiceView, ChatView, ConversationDetailView, ConversationListView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='ai-chat'),
    path('chat/approve-choice/', ApproveAIChoiceView.as_view(), name='ai-approve-choice'),
    path('conversations/', ConversationListView.as_view(), name='ai-conversations'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
]
