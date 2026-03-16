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

from friendship.models import Friendship, Status

from .serializers import (
    UserFriendsSerializer, UserReqeustsSerializer, UserSerializer, LoginSerializer, UserUpdateSerializer,
    InterestSerializer, InterestCategorySerializer, UserInterestSerializer,
    GoogleAuthSerializer, UserFriendsSerializer, SearchUserByUsernameSerializer
)
from .models import User, Interest, InterestCategory, UserInterest
import uuid


class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer

    @swagger_auto_schema(
        request_body=UserSerializer,
        responses={
            201: openapi.Response('User created successfully', UserSerializer),
            400: openapi.Response('Bad request - validation errors (e.g., duplicate email/username)'),
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        headers = self.get_success_headers(serializer.data)
        response_data = serializer.data
        response_data['token'] = token.key
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)


class LoginView(APIView):
    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={
            200: openapi.Response('Login successful', openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'token': openapi.Schema(type=openapi.TYPE_STRING),
                    'user_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'username': openapi.Schema(type=openapi.TYPE_STRING),
                    'email': openapi.Schema(type=openapi.TYPE_STRING),
                    'fcm_token': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )),
            401: openapi.Response('Invalid credentials'),
        }
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        fcm_token = serializer.validated_data.get('fcm_token')
        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']
        
        user = authenticate(email=email, password=password)

        if user:
            if fcm_token:
                User.objects.filter(fcm_token=fcm_token).exclude(pk=user.pk).update(fcm_token=None)
                if user.fcm_token != fcm_token:
                    user.fcm_token = fcm_token
                    user.save(update_fields=['fcm_token'])

            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'fcm_token': user.fcm_token,
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid credentials. Please check your email and password.'}, status=status.HTTP_401_UNAUTHORIZED)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('User details', UserSerializer),
            404: openapi.Response('User not found'),
        }
    )
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        request_body=UserUpdateSerializer,
        responses={
            200: openapi.Response('User updated successfully', UserUpdateSerializer),
            400: openapi.Response('Bad request - validation errors'),
            403: openapi.Response('Forbidden - cannot update other users'),
            404: openapi.Response('User not found'),
        }
    )
    def put(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        
        if request.user.id != user.id:
            return Response({'error': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = UserUpdateSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        request_body=UserUpdateSerializer,
        responses={
            200: openapi.Response('User updated successfully', UserUpdateSerializer),
            400: openapi.Response('Bad request - validation errors'),
            403: openapi.Response('Forbidden - cannot update other users'),
            404: openapi.Response('User not found'),
        }
    )
    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        
        if request.user.id != user.id:
            return Response({'error': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        responses={
            204: openapi.Response('User deleted successfully'),
            403: openapi.Response('Forbidden - cannot delete other users'),
            404: openapi.Response('User not found'),
        }
    )
    def delete(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        
        if request.user.id != user.id:
            return Response({'error': 'You can only delete your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InterestCategoryListView(APIView):
    @swagger_auto_schema(
        responses={200: InterestCategorySerializer(many=True)}
    )
    def get(self, request):
        categories = InterestCategory.objects.all()
        serializer = InterestCategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InterestListView(APIView):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'category', openapi.IN_QUERY,
                description='Filter interests by category name',
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={200: InterestSerializer(many=True)}
    )
    def get(self, request):
        interests = Interest.objects.select_related('category').all()
        category = request.query_params.get('category')
        if category:
            interests = interests.filter(category__name__iexact=category)
        serializer = InterestSerializer(interests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserInterestsView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={200: InterestSerializer(many=True)}
    )
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        interests = user.interests.select_related('category').all()
        serializer = InterestSerializer(interests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        request_body=UserInterestSerializer,
        responses={
            200: InterestSerializer(many=True),
            400: openapi.Response('Bad request'),
            403: openapi.Response('Forbidden'),
        }
    )
    def put(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        if request.user.id != user.id:
            return Response({'error': 'You can only update your own interests.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        interest_ids = serializer.validated_data['interest_ids']

        interests = Interest.objects.filter(id__in=interest_ids)
        if interests.count() != len(set(interest_ids)):
            return Response({'error': 'One or more interest IDs are invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        UserInterest.objects.filter(user=user).delete()
        UserInterest.objects.bulk_create(
            [UserInterest(user=user, interest=interest) for interest in interests]
        )

        updated_interests = user.interests.select_related('category').all()
        return Response(InterestSerializer(updated_interests, many=True).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        responses={
            204: openapi.Response('All interests removed'),
            403: openapi.Response('Forbidden'),
        }
    )
    def delete(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        if request.user.id != user.id:
            return Response({'error': 'You can only update your own interests.'}, status=status.HTTP_403_FORBIDDEN)

        UserInterest.objects.filter(user=user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GoogleAuthView(APIView):
    @swagger_auto_schema(
        request_body=GoogleAuthSerializer,
        responses={
            200: openapi.Response('Login successful', openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'token': openapi.Schema(type=openapi.TYPE_STRING),
                    'user_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'username': openapi.Schema(type=openapi.TYPE_STRING),
                    'email': openapi.Schema(type=openapi.TYPE_STRING),
                    'is_new_user': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                }
            )),
            400: openapi.Response('Invalid token'),
        }
    )
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_info = serializer.validated_data['id_token']
        google_id = google_info['google_id']
        email = google_info['email'].lower()
        name = google_info['name']

        is_new_user = False

        user = User.objects.filter(google_auth_id=google_id).first()

        if not user:
            user = User.objects.filter(email__iexact=email).first()

            if user:
                user.google_auth_id = google_id
                user.save()
            else:
                is_new_user = True
                base_username = name.replace(' ', '_') if name else email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=uuid.uuid4().hex,
                    google_auth_id=google_id,
                )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'is_new_user': is_new_user,
            'has_interests': user.user_interests.exists(),
        }, status=status.HTTP_200_OK)
    


class UserFreindsView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
    responses={
        200: openapi.Response('User friends retrieved successfully', UserFriendsSerializer(many=True)),
        400: openapi.Response('Bad request'),
        403: openapi.Response('Forbidden'),
        404: openapi.Response('User not found or user doesnot have friends yet'),
    }
    )
    def get(self, request, user_id):

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        friendships = Friendship.objects.filter(
            (Q(sender=user) | Q(receiver=user)) & Q(status=Status.ACCEPTED)
        ).select_related('sender', 'receiver')

        if not friendships.exists():
            return Response({'error': 'User does not have friends yet'}, status=status.HTTP_404_NOT_FOUND)

        friends = [
            f.receiver if f.sender == user else f.sender
            for f in friendships
        ]

        serializer = UserFriendsSerializer(friends, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)


class UserReqeustsView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('User friend requests retrieved successfully', UserFriendsSerializer(many=True)),
            400: openapi.Response('Bad request'),
            403: openapi.Response('Forbidden'),
            404: openapi.Response('User not found or user doesnot have friend requests yet'),
        }
    )
    def get(self, request):

        user_id = request.user.id

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        friend_requests = Friendship.objects.filter(
            receiver=user, status=Status.PENDING
        ).select_related('sender')

        if not friend_requests.exists():
            return Response({'error': 'User does not have friend requests yet'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UserReqeustsSerializer(friend_requests, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
    
class SearchUserByUsernameView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('Search results', SearchUserByUsernameSerializer()),
            400: openapi.Response('Bad request - missing query parameter'),
        }
    )
    
    def get(self, request , username):
        UserName = username
        if not username:
            return Response({'error': 'Username parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username = UserName)

        if not user:
            return Response({'error': 'No users found with the given username.'}, status=status.HTTP_404_NOT_FOUND) 

        serializer = SearchUserByUsernameSerializer(user.first())
        serializer.is_valid(raise_exception=True)

        return Response(serializer.data, status=status.HTTP_200_OK)