from celery import shared_task
from django.contrib.auth import get_user_model
from .models import HobbyRecommendation
from .recommend import calculate_friend_recommendations, calculate_self_recommendations

User = get_user_model()

@shared_task
def update_all_hobby_recommendations():
    users = User.objects.all()
    for user in users:
        friend_recs = calculate_friend_recommendations(user)
        if friend_recs:
            rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=user, rec_type='friend')
            rec_obj.hobbies.set(friend_recs)
        else:
            HobbyRecommendation.objects.filter(user=user, rec_type='friend').delete()

        self_recs = calculate_self_recommendations(user)
        if self_recs:
            rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=user, rec_type='self')
            rec_obj.hobbies.set(self_recs)
        else:
            HobbyRecommendation.objects.filter(user=user, rec_type='self').delete()


@shared_task
def update_user_hobby_recommendations(user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return

    friend_recs = calculate_friend_recommendations(user)
    if friend_recs:
        rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=user, rec_type='friend')
        rec_obj.hobbies.set(friend_recs)
    else:
        HobbyRecommendation.objects.filter(user=user, rec_type='friend').delete()

    self_recs = calculate_self_recommendations(user)
    if self_recs:
        rec_obj, _ = HobbyRecommendation.objects.get_or_create(user=user, rec_type='self')
        rec_obj.hobbies.set(self_recs)
    else:
        HobbyRecommendation.objects.filter(user=user, rec_type='self').delete()

