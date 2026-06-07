from django.urls import path

from .views import (
    ApproveAIChoiceView, ChatView, ConversationDetailView,
    ConversationListView, VoiceChatView, VoiceFileView, VoiceUploadView,
)

urlpatterns = [
    path('chat/', ChatView.as_view(), name='ai-chat'),
    path('chat/voice/', VoiceChatView.as_view(), name='ai-chat-voice'),
    path('chat/voice/upload/', VoiceUploadView.as_view(), name='ai-voice-upload'),
    path('chat/approve-choice/', ApproveAIChoiceView.as_view(), name='ai-approve-choice'),
    path('conversations/', ConversationListView.as_view(), name='ai-conversations'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
    path('voice/<uuid:message_id>/', VoiceFileView.as_view(), name='ai-voice-file'),
]
