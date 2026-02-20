from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    FriendshipSerializer, FriendshipAcceptSerializer,
    FriendshipCancelRequestSerializer , BlockFriendshipSerializer 
    ,UnblockFriendshipSerializer
)


class FriendshipRequestView(generics.CreateAPIView):
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]  

    @swagger_auto_schema(
        request_body=FriendshipSerializer,
        responses={
            201: openapi.Response('Friendship request created successfully', FriendshipSerializer),
            400: openapi.Response('Bad request - validation errors or friendship already exists'),
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        serializer_sender = self.get_serializer(data=request.data)
        serializer_sender.is_valid(raise_exception=True)
        user = serializer_sender.save()
        token, _ = Token.objects.get_or_create(user=user)
        headers = self.get_success_headers(serializer_sender.data)
        response_data = serializer_sender.data
        response_data['token'] = token.key
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
    
class FriendshipAcceptView(generics.UpdateAPIView):
    serializer_class = FriendshipAcceptSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=FriendshipAcceptSerializer,
        responses={
            200: openapi.Response('Friendship request accepted successfully', FriendshipAcceptSerializer),
            400: openapi.Response('Bad request - validation errors or not authorized to accept this request'),
        }
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
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

class BlockFriendshipView(generics.UpdateAPIView):
    serializer_class = BlockFriendshipSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=BlockFriendshipSerializer,
        responses={
            200: openapi.Response('User blocked successfully', BlockFriendshipSerializer),
            400: openapi.Response('Bad request - validation errors or not authorized to block this user'),
        }
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
class UnblockFriendshipView(generics.UpdateAPIView):
    serializer_class = UnblockFriendshipSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        request_body=UnblockFriendshipSerializer,
        responses={
            200: openapi.Response('User unblocked successfully', UnblockFriendshipSerializer),
            400: openapi.Response('Bad request - validation errors or not authorized to unblock this user'),
        }
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    