from rest_framework import viewsets, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from django.contrib.auth import get_user_model
from django.db.models import Count
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

User = get_user_model()

class ChatRoomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ChatRoomPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ChatRoom.objects.none()
        return self.request.user.chatrooms.all().order_by('-created_at')

    @swagger_auto_schema(
        operation_summary="Create or fetch a 1-to-1 Chat Room",
        operation_description="Provide a `user_id` to start or resume a 1-on-1 chat with that user. Automatically returns the existing room if one operates between you two.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description="ID of the target user")
            }
        ),
        responses={
            201: openapi.Response("Created a newly minted chat room", ChatRoomSerializer),
            200: openapi.Response("Fetched existing chat room", ChatRoomSerializer),
            400: "Bad Request - Missing user_id or trying to chat with yourself",
            404: "Not Found - User doesn't exist"
        }
    )
    def create(self, request, *args, **kwargs):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'Cannot create a chat with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        existing_rooms = ChatRoom.objects.annotate(user_count=Count('users')).filter(
            users=request.user
        ).filter(
            users=target_user
        ).filter(
            user_count=2
        )

        if existing_rooms.exists():
            room = existing_rooms.first()
            serializer = self.get_serializer(room)
            return Response(serializer.data, status=status.HTTP_200_OK)

        room = ChatRoom.objects.create()
        room.users.add(request.user, target_user)
        
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Get Historical Messages for Room",
        operation_description="Returns a paginated list of historical messages in this ChatRoom. Use `page` and `page_size` query params to control pagination.",
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description="Page number"),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description="Results per page (max 100)"),
        ],
        responses={200: MessageSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        room = self.get_object()
        qs = room.messages.all().order_by('created_at')

        paginator = ChatRoomPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = MessageSerializer(qs, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary="Add a User to ChatRoom",
        operation_description="Add a specific user (via user_id) to this room, turning it into a group chat.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description="ID of the user to add")
            }
        ),
        responses={200: "User added successfully", 400: "Bad Request", 404: "User not found"}
    )
    @action(detail=True, methods=['post'])
    def add_user(self, request, pk=None):
        room = self.get_object()
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        room.users.add(target_user)
        return Response({'success': f'User {target_user.username} added to the room.'}, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_summary="Remove a User from ChatRoom",
        operation_description="Remove a specific user (via user_id) from this room.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['user_id'],
            properties={
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description="ID of the user to remove")
            }
        ),
        responses={200: "User removed successfully", 400: "Bad Request"}
    )
    @action(detail=True, methods=['post'])
    def remove_user(self, request, pk=None):
        room = self.get_object()
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        target_user = room.users.filter(id=target_user_id).first()
        if not target_user:
            return Response({'error': 'User is not in this room'}, status=status.HTTP_400_BAD_REQUEST)

        room.users.remove(target_user)
        return Response({'success': f'User {target_user.username} has been removed from the room.'}, status=status.HTTP_200_OK)
