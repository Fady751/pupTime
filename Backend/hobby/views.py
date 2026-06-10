from .models import Hobby
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from friendship.models import Friendship, Status
from .serializers import HobbySerializer
from .models import HobbyRecommendation


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
            from .recommend import calculate_friend_recommendations
            friend_hobbies = calculate_friend_recommendations(request.user)
            if friend_hobbies:
                rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=request.user, rec_type='friend')
                rec_obj.hobbies.set(friend_hobbies)
        else:
            friend_hobbies = list(rec.hobbies.all())

        if not friend_hobbies:
            return Response([], status=status.HTTP_200_OK)

        sliced_hobbies = friend_hobbies[start:start + 3]

        response_data = []
        for hobby in sliced_hobbies:
            hobby_data = HobbySerializer(hobby).data
            hobby_data.pop('id', None)
            response_data.append(hobby_data)

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
            from .recommend import calculate_self_recommendations
            self_hobbies = calculate_self_recommendations(request.user)
            if self_hobbies:
                rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=request.user, rec_type='self')
                rec_obj.hobbies.set(self_hobbies)
        else:
            self_hobbies = list(rec.hobbies.all())

        response_data = []
        for hobby in self_hobbies:
            hobby_data = HobbySerializer(hobby).data
            hobby_data.pop('id', None)
            response_data.append(hobby_data)

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

