import uuid
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from friendship.models import Friendship, Status
from .models import Hobby, HobbyRecommendation
from .serializers import HobbySerializer
from .recommend import calculate_self_recommendations, calculate_friend_recommendations , get_free_time_slots
from task.models import TaskTemplate
from task.serializers import TaskSerializer
from ai_chat.ai.provider import ChatMessage, get_ai_provider
import logging


class FriendHobbyView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('Friend hobby suggestions returned successfully', HobbySerializer(many=True)),
            400: openapi.Response('Bad request'),
        }
    )
    def get(self, request, start=0):
      
        friendships = Friendship.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user),
            status=Status.ACCEPTED
        ).select_related('sender', 'receiver').prefetch_related('sender__interests', 'receiver__interests')

        if not friendships.exists():
            return Response({"message": "User does not have any friends."}, status=status.HTTP_200_OK)

        rec = HobbyRecommendation.objects.filter(user=request.user, rec_type='friend').first()
        if not rec or not rec.hobbies.exists():

            friend_hobbies = calculate_friend_recommendations(request.user)
            if friend_hobbies:
                rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=request.user, rec_type='friend')
                rec_obj.hobbies.set(friend_hobbies)
        else:
            friend_hobbies = list(rec.hobbies.all())

        if not friend_hobbies:
            return Response([], status=status.HTTP_200_OK)

        sliced_hobbies = friend_hobbies[start:start + 3]

        free_slots = get_free_time_slots(request.user, count=len(sliced_hobbies), duration_minutes=60)
        response_data = []

        for i, hobby in enumerate(sliced_hobbies):
            task = TaskTemplate(
                user=request.user,
                title=hobby.name,
                priority=TaskTemplate.PRIORITY_NONE,
                emoji= "💡",
                start_datetime=free_slots[i],
                duration_minutes=60,
                is_recurring=False,
                rrule=None
            )
            task_data = TaskSerializer(task, context={'request': request}).data

            task_data['timezone'] = None
            task_data['created_at'] = timezone.now().isoformat()
            task_data['override'] = 1
            task_data['is_overriding'] = False
            task_data['is_deleted'] = False
            task_data['is_recurring'] = False
            task_data['rrule'] = None
            
            response_data.append(task_data)

        return Response(response_data, status=status.HTTP_200_OK)


class SelfHobbyView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('Self hobby recommendations returned successfully', HobbySerializer(many=True)),
        }
    )
    def get(self, request):
        rec = HobbyRecommendation.objects.filter(user=request.user, rec_type='self').first()

        if not rec or not rec.hobbies.exists():

            self_hobbies = calculate_self_recommendations(request.user)
            if self_hobbies:
                rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=request.user, rec_type='self')
                rec_obj.hobbies.set(self_hobbies)
        else:
            self_hobbies = list(rec.hobbies.all())

        if not self_hobbies:
            return Response([], status=status.HTTP_200_OK)

        free_slots = get_free_time_slots(request.user, count=len(self_hobbies), duration_minutes=60)
        response_data = []

        for i, hobby in enumerate(self_hobbies):
            task = TaskTemplate(
                user=request.user,
                title=hobby.name,
                priority=TaskTemplate.PRIORITY_MEDIUM,
                emoji= "💡",
                start_datetime=free_slots[i],
                duration_minutes=60,
                is_recurring=False,
                rrule=None
            )
            task_data = TaskSerializer(task, context={'request': request}).data

            task_data['timezone'] = None
            task_data['created_at'] = timezone.now().isoformat()
            task_data['override'] = 1
            task_data['is_overriding'] = False
            task_data['is_deleted'] = False
            task_data['is_recurring'] = False
            task_data['rrule'] = None
            
            response_data.append(task_data)

        return Response(response_data, status=status.HTTP_200_OK)


class HobbyListView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={200: HobbySerializer(many=True)}
    )
    def get(self, request):
        hobbies = Hobby.objects.all()
        serializer = HobbySerializer(hobbies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
