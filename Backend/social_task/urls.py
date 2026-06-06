from django.urls import path
from .views import (
    SocialTaskListCreateView, SocialTaskDetailView,
    SocialTaskAcceptView, SocialTaskDeclineView,
    SocialTaskInvitesView, SocialTaskAddSubTaskView, SocialTaskInviteView,
)

urlpatterns = [
    path('', SocialTaskListCreateView.as_view(), name='social-task-list-create'),
    path('invites/', SocialTaskInvitesView.as_view(), name='social-task-invites'),
    path('<uuid:pk>/', SocialTaskDetailView.as_view(), name='social-task-detail'),
    path('<uuid:pk>/accept/', SocialTaskAcceptView.as_view(), name='social-task-accept'),
    path('<uuid:pk>/decline/', SocialTaskDeclineView.as_view(), name='social-task-decline'),
    path('<uuid:pk>/invite/', SocialTaskInviteView.as_view(), name='social-task-invite'),
    path('<uuid:pk>/sub-tasks/', SocialTaskAddSubTaskView.as_view(), name='social-task-add-sub'),
]
