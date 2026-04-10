
from requests import Response
from django.db.models import Q
from .models import User
from .models import Friendship


def delete_cancelled_friendship(friendship_id):
    try:
        f = Friendship.objects.get(id=friendship_id)
        if f.status == f.Status.CANCELLED:
            f.delete()
    except Friendship.DoesNotExist:
        pass
  
def get_user_by_id(user_id):    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)
    return user


def get_friendship_by_id(friendship_id):
    try: 
        friendship = Friendship.objects.get(id=friendship_id)
    except Friendship.DoesNotExist:
        return Response({"error": "Friendship not found."}, status=404)
    return friendship


def check_existing_friendship(sender_id, receiver_id):
    existing_friendship = Friendship.objects.filter(
        Q(sender_id=sender_id, receiver_id=receiver_id) | Q(sender_id=receiver_id, receiver_id=sender_id)).first()
    return existing_friendship