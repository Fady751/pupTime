from unittest import result

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db.models import Q

from .services import (
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

from notification.services import push_accept_notification , push_request_notification


class FriendshipRequestView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=FriendshipRequestSerializer,
        responses={
            201: openapi.Response('Friendship request created successfully', FriendshipRequestSerializer),
            400: openapi.Response('Bad request - validation errors or friendship already exists'),
        },
        required= {
            "fcm_token": openapi.Schema(type=openapi.TYPE_STRING, description='FCM token of the receiver for push notification')
        }
    )
    def post(self, request, user_id):
        sender = request.user
        
        receiver = get_user_by_id(user_id)

        existing_friendship = check_existing_friendship(sender.id, receiver.id) 
    
        if existing_friendship:
            return Response({"error": "relation request already exists" , "status": existing_friendship.status}, status=400)

        serializer = FriendshipRequestSerializer(data={'sender': sender.id, 'receiver': receiver.id, 'status': Status.PENDING} , context={'request': request})
        
        serializer.is_valid(raise_exception=True)
        serializer.save()

        notification = push_request_notification(receiver , sender , 'FR' , receiver.fcm_token ,existing_friendship.sent_at) 

        if notification == '500':
            return Response({"error": "Failed to send notification"}, status=500)
        elif notification == '400':
            return Response({"error": "Invalid data for notification"}, status=400)

        return Response(serializer.data, status=201)
    

    
class FriendshipAcceptView(APIView):
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        request_body=FriendshipAcceptSerializer,
        responses={
            200: openapi.Response('Friendship request accepted successfully', FriendshipAcceptSerializer),
            400: openapi.Response('Bad request - validation errors or not authorized to accept this request'),
        },
        required= {
            'fcm_token': openapi.Schema(type=openapi.TYPE_STRING, description='FCM token of the receiver for push notification')
        }
    )

    def post(self, request, friendship_id):

        fcm_token = request.data.get('fcm_token')

        if not fcm_token:
            return Response({"error": "FCM token is required for sending notification"}, status=400)

        friendship = get_object_or_404(Friendship, id=friendship_id)

        serializer = FriendshipAcceptSerializer(friendship, data=request.data, partial=True, context={'request': request})

        serializer.is_valid(raise_exception=True)
        serializer.save()

        notification = push_accept_notification(friendship.sender , request.user , 'FA', friendship.sender.fcm_token , friendship.accepted_at)

        if notification == '500':
            return Response({"error": "Failed to send notification"}, status=500)
        elif notification == '400':
            return Response({"error": "Invalid data for notification"}, status=400)
        
        serializer['fcm_token'] = fcm_token
        return Response(serializer.data , status=200)
    




class FriendshipCancelRequestView(APIView):

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=FriendshipCancelRequestSerializer,
        responses={
            204: openapi.Response('Friendship request cancelled successfully'),
            400: openapi.Response('Bad request - validation errors or not authorized to cancel this request'),
        }
    )
    def delete(self, request, *args, **kwargs):
        
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
        
        if sender.id == user_id:
            return Response({"error": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            receiver = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        existing_friendship = Friendship.objects.filter(
            Q(sender=sender, receiver=receiver) | Q(sender=receiver, receiver=sender)).first()

    
        if existing_friendship:

            if existing_friendship.status == Status.BLOCKED:
                return Response({"error": "This user is already blocked."}, status=status.HTTP_400_BAD_REQUEST)
            
            relationship = existing_friendship

            serializer = BlockFriendshipSerializer(relationship, data={'status': Status.BLOCKED, 'blocked_by': sender.id}, partial=True , context={'request': request})

        else:
            serializer = BlockFriendshipSerializer(data={'sender': sender.id, 'receiver': receiver.id} , context={'request': request})

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
    


class check(APIView):

    def get(self, request,):
        data = Friendship.objects.all()
        return Response(data.values())