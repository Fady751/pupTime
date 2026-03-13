
from notification.models import Notification 
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .serializers import NotificationSerializer
from rest_framework.response import Response

class NotificationPagination(PageNumberPagination):
    page_size = 10 

 
class NotificationView(APIView):
    @swagger_auto_schema(
        responses={
            200: NotificationSerializer(many=True),
            404: 'no notifications found'
        }
    )
    def get(self, request):
        user = request.user
        notifications = Notification.objects.filter(reciever=user)

        if not notifications.exists():
            return Response({'message': 'No notifications found for this user'}, status=200)
        
        paginator = NotificationPagination()
        paginated_notifications = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(paginated_notifications, many=True)
        return paginator.get_paginated_response(serializer.data)


class MarkAsReadView(APIView):
    @swagger_auto_schema(
        responses={
            200: 'Notification marked as read successfully',
            404: 'Notification not found'
        },
        required={
            'notification_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID of the notification to mark as read')
        }
    )
    def post(self, request):
        notification_id = request.data.get('notification_id')
        try:
            notification = Notification.objects.get(id=notification_id, reciever=request.user , is_read=False)
        except Notification.DoesNotExist:
            return Response({'error': 'notification already read'}, status=404)

        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read successfully'}, status=200)



class CountUnreadNotificationsView(APIView):
    @swagger_auto_schema(
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'unread_count': openapi.Schema(type=openapi.TYPE_INTEGER, description='Number of unread notifications')
                }
            )
        }
    )
    def get(self, request):
        user = request.user
        unread_count = Notification.objects.filter(reciever=user, is_read=False).count()
        return Response({'unread_count': unread_count}, status=200)
    


class GetUnreadNotificationsView(APIView):
    @swagger_auto_schema(
         responses={
            200: openapi.Response('Friendship request accepted successfully', NotificationSerializer(many=True)),
            400: openapi.Response('Bad request - validation errors or not authorized to accept this request'),
        },
    )
    def get(self, request):
        user = request.user
        unread_notifications = Notification.objects.filter(reciever=user, is_read=False)

        if not unread_notifications.exists():
            return Response({'message': 'No unread notifications found for this user'}, status=200)
        
        paginator = NotificationPagination()
        paginated_notifications = paginator.paginate_queryset(unread_notifications, request)
        
        serializer = NotificationSerializer(paginated_notifications, many=True)
        return paginator.get_paginated_response(serializer.data)
    

class MarkAllAsReadView(APIView):
    @swagger_auto_schema(
        responses={
            200: 'All notifications marked as read successfully',
            404: 'No notifications found to mark as read'
        }
    )
    def post(self, request):
        user = request.user
        notifications = Notification.objects.filter(reciever=user, is_read=False)

        if not notifications.exists():
            return Response({'message': 'Already all notifications are read'}, status=200)
        
        notifications.update(is_read=True)
        notifications.save() 

        return Response({'message': 'All notifications marked as read successfully'}, status=200)