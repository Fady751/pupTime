from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .Backend import (
    check_existing_friendship , 
    get_user_by_id ,
    get_friendship_by_id
)

from user.models import User
from .models import Friendship

from .models import Status

from .serializers import (
    FriendshipRequestSerializer, FriendshipAcceptSerializer,
    FriendshipCancelRequestSerializer , BlockFriendshipSerializer 
    ,UnblockFriendshipSerializer
)


class FriendshipRequestView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=FriendshipRequestSerializer,
        responses={
            201: openapi.Response('Friendship request created successfully', FriendshipRequestSerializer),
            400: openapi.Response('Bad request - validation errors or friendship already exists'),
        }
    )
    def post(self, request, user_id):
        sender = request.user
        
        receiver = get_user_by_id(user_id)
        
        if re

        existing_friendship = check_existing_friendship(sender.id, receiver.id) 
    
        if existing_friendship:
            return Response({"error": "relation request already exists or requested." , "status": existing_friendship.status}, status=400)

        serializer = FriendshipRequestSerializer(data={'sender': sender.id, 'receiver': receiver.id, 'status': Status.PENDING} , context={'request': request})
        print(serializer.initial_data , "------------------------------------------------------")
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=201)
    
class FriendshipAcceptView(APIView):
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        request_body=FriendshipAcceptSerializer,
        responses={
            200: openapi.Response('Friendship request accepted successfully', FriendshipAcceptSerializer),
            400: openapi.Response('Bad request - validation errors or not authorized to accept this request'),
        }
    )
    def post(self, request, friendship_id):
        sender = request.user
        friendship = get_object_or_404(Friendship, id=friendship_id)
        serializer = FriendshipAcceptSerializer(friendship, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class FriendshipCancelRequestView(generics.DestroyAPIView):
    serializer_class = FriendshipCancelRequestSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=FriendshipCancelRequestSerializer,
        responses={
            204: openapi.Response('Friendship request cancelled successfully'),
            400: openapi.Response('Bad request - validation errors or not authorized to cancel this request'),
        }
    )
    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)  

class BlockFriendshipView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=None,
        responses={
            200: openapi.Response('User blocked successfully', BlockFriendshipSerializer),
            400: openapi.Response('Bad request - validation errors or unauthorized action'),
        }
    )
    def post(self, request, user_id):
        sender = request.user
        
        try:
            receiver = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            existing_friendship = Friendship.objects.filter(
                Q(sender=sender, receiver=receiver) | Q(sender=receiver, receiver=sender)).first()
        except Friendship.DoesNotExist:
            return Response({"error": "No existing relationship found"}, status=status.HTTP_404_NOT_FOUND)

        if existing_friendship:
            relationship = existing_friendship
            serializer = BlockFriendshipSerializer(relationship, data={'status': Status.BLOCKED, 'blocked_by': sender.id}, partial=True , context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            data = serializer.data
        else:
            serializer = BlockFriendshipSerializer(data={'sender': sender.id, 'receiver': receiver.id, 'status': Status.BLOCKED, 'blocked_by': sender.id} , context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
           
            data = serializer.data

        return Response(
            {
                "message": "User blocked successfully",
                "data": data
            },
            status=status.HTTP_200_OK
        )
    
class UnblockFriendshipView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=UnblockFriendshipSerializer,
        responses={
            200: openapi.Response('User unblocked successfully', UnblockFriendshipSerializer),
            400: openapi.Response('Bad request'),
        }
    )
    def delete(self, request, user_id):
        sender = request.user

        try:
            receiver = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        try:
            friendship = Friendship.objects.get(sender=sender, receiver=receiver, status=Status.BLOCKED)
        except Friendship.DoesNotExist:
            return Response({"error": "can not unblock user you did not block him"}, status=404)

        friendship.delete()

        return Response(
            {
                "message": "User unblocked successfully"
            },
            status=status.HTTP_200_OK
        )