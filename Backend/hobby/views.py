from django.shortcuts import render
from grpc import Status
from httpx import Response
from pupTime.Backend import user
from recommend.py import suggest_hobbies
from httpcore import request
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db.models import Q



from friendship.models import Friendship
from .serializers import HobbySerializer

class FriendHobbyView (APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response('hobbies returned successfully', HobbySerializer),
            400: openapi.Response('Bad request - validation errors or unauthorized action'),
        }
    )


    def get(self, request, start):
       user = request.user
       friends = Friendship.objects.filter(Q(sender=user) | Q(receiver=user), status=Status.ACCEPTED).order_by('-accepted_at')[start:start+3]
       friends_ids = [f.receiver.id if f.sender == user else f.sender.id for f in friends]
       user
       



