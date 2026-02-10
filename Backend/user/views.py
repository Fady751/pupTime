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
    UserSerializer, LoginSerializer, UserUpdateSerializer,
    InterestSerializer, InterestCategorySerializer, UserInterestSerializer,
)
from .models import User, Interest, InterestCategory, UserInterest


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
                }
            )),
            401: openapi.Response('Invalid credentials'),
        }
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']

        user = authenticate(email=email, password=password)

        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
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