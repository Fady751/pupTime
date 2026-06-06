from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from friendship.models import Friendship, Status
from .serializers import HobbySerializer
from .models import Hobby
from .recommend import suggest_similar_hobbies, suggest_hobbies_from_friend_interests


class FriendHobbyView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('Friend hobby suggestions returned successfully', HobbySerializer(many=True)),
            400: openapi.Response('Bad request - validation errors or unauthorized action'),
        }
    )
    def get(self, request, start=0):
        user = request.user
        friends = Friendship.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status=Status.ACCEPTED
        ).order_by('-accepted_at')[start:start + 3]

        if not friends:
            return Response({'detail': 'No accepted friends found.'}, status=status.HTTP_404_NOT_FOUND)

        friend_users = [f.receiver if f.sender == user else f.sender for f in friends]
        recommended_hobbies = suggest_hobbies_from_friend_interests(friend_users, num_recommendations=5)

        serializer = HobbySerializer(recommended_hobbies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HobbySuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('Similar hobbies returned successfully', HobbySerializer(many=True)),
            404: openapi.Response('Hobby not found'),
            400: openapi.Response('Bad request'),
        }
    )
    def get(self, request, hobby_id):
        get_object_or_404(Hobby, id=hobby_id)
        suggested_hobbies = suggest_similar_hobbies(hobby_id, num_recommendations=5)
        serializer = HobbySerializer(suggested_hobbies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

