from celery import shared_task
from .models import Friendship, Status
@shared_task
def delete_canceled_friendships():
    deleted_count, _ = Friendship.objects.filter(status=Status.CANCELLED).delete()
    return f'Deleted {deleted_count} canceled friendships.'