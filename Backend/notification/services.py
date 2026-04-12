from time import timezone
import firebase_admin
from firebase_admin import messaging

from .models import Notification
from django.utils.timezone import timezone

from .models import User


def push_accept_notification(reciever , user_acceptedFriendship , notification_type , accepted_at):


    # don't forget to put fcm_token here

    if not reciever or not user_acceptedFriendship or not notification_type:
        return ('400') 
    

    notification = Notification.objects.create(
        receiver = reciever,
        type = notification_type,
        data={
            'message': f'{user_acceptedFriendship.username} accepted your friend request.',
            'user': user_acceptedFriendship,
            'accepted_at': accepted_at.isoformat()
        }
    )

    # try:
    #     message_obj = messaging.Message(
    #         notification=messaging.Notification(title= notification_type , body=notification.data),
    #         token=fcm_token
    #     )
    #     messaging.send(message_obj)
    #     notification.is_sent = True
    #     notification.save()
    # except Exception as e:
    #     return ('500')

    return ('200')



def push_request_notification(reciever , user_sentFriendship , notification_type , sent_at):

    if not reciever or not user_sentFriendship or not notification_type:
        return ('400') 


    notification = Notification.objects.create(
        receiver = reciever,
        type = notification_type,
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
            'sent_at': sent_at
        }
    )

    # try:
    #     message_obj = messaging.Message(
    #         notification=messaging.Notification(title= notification_type , body=notification.data),
    #         token=fcm_token
    #     )
    #     messaging.send(message_obj)
    #     notification.is_sent = True
    #     notification.save()

    # except Exception as e:
    #     return ('500')

    return ('200')
