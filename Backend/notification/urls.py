from django.urls import path


from .views import NotificationsView , MarkAsReadView , CountUnreadNotificationsView
urlpatterns = [
    path('', NotificationsView.as_view(), name='notification-list'),
    path('mark-as-read/', MarkAsReadView.as_view(), name='notification-mark-as-read'),
    path('count-unread/', CountUnreadNotificationsView.as_view(), name='notification-unread-count'),
]