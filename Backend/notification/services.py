from time import timezone
import firebase_admin
from firebase_admin import messaging 
from .models import Notification
from django.utils.timezone import timezone



def push_accept_notification(reciever , user_acceptedFriendship , notification_type , fcm_token , accepted_at):

    if not reciever or not user_acceptedFriendship or not notification_type or not fcm_token:
        return ('400') 
    

    notification = Notification.objects.create(
        receiver = reciever,
        type = notification_type,
        created_at = timezone.now(),
        data={
            'message': f'{user_acceptedFriendship.username} accepted your friend request.',
            'user': user_acceptedFriendship,
            'accepted_at': accepted_at.isoformat()
        }
    )

    try:
        message_obj = messaging.Message(
            notification=messaging.Notification(title= notification_type , body=notification.data),
            token=fcm_token
        )
        messaging.send(message_obj)
        notification.is_sent = True
        notification.save()
    except Exception as e:
        return ('500')

    return ('200')



def push_request_notification(reciever , user_sentFriendship , notification_type , fcm_token , sent_at):

    if not reciever or not user_sentFriendship or not notification_type or not fcm_token:
        return ('400') 
    

    notification = Notification.objects.create(
        receiver = reciever,
        type = notification_type,
        created_at = timezone.now(),
        data={
            'message': f'{user_sentFriendship.username} sent you a friend request.',
            'user': {
                'id': user_sentFriendship.id,
                'username': user_sentFriendship.username,
                'email': user_sentFriendship.email,
                'gender': user_sentFriendship.gender,
                'streak_cnt': user_sentFriendship.streak_cnt,
                'joined_on': user_sentFriendship.joined_on.isoformat()
            },
            'sent_at': sent_at.isoformat()
        }
    )

    try:
        message_obj = messaging.Message(
            notification=messaging.Notification(title= notification_type , body=notification.data),
            token=fcm_token
        )
        messaging.send(message_obj)
        notification.is_sent = True
        notification.save()

    except Exception as e:
        return ('500')

    return ('200')
