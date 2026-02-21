from celery import shared_task
from .models import Friendship

@shared_task
def delete_cancelled_friendship(friendship_id):
    try:
        f = Friendship.objects.get(id=friendship_id)
        if f.status == f.Status.CANCELLED:
            f.delete()
    except Friendship.DoesNotExist:
        pass