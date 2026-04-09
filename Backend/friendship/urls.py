from django.urls import path
from .views import (
    FriendshipRequestView, FriendshipAcceptView
    , FriendshipCancelRequestView, BlockFriendshipView, GetFriendshipStatusView, UnblockFriendshipView, check, delete_that
)

urlpatterns = [
    path ('request/<int:user_id>/', FriendshipRequestView.as_view(), name='friendship-request'),
    path ('accept/<int:friendship_id>/', FriendshipAcceptView.as_view(), name='friendship-accept'),
    path ('cancel/<int:friendship_id>/', FriendshipCancelRequestView.as_view(), name='friendship-cancel'),
    path ('block/<int:user_id>/', BlockFriendshipView.as_view(), name='friendship-block'),
    path ('unblock/<int:user_id>/', UnblockFriendshipView.as_view(), name='friendship-unblock'),
    path('check/', check.as_view(), name='friendship-check'),
    path('delete/<int:friendship_id>/', delete_that.as_view(), name='friendship-delete'),
    path('status/<int:friendship_id>/', GetFriendshipStatusView.as_view(), name='friendship-status'),
]