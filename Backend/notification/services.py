import logging
from firebase_admin import messaging
from .models import Notification

logger = logging.getLogger(__name__)


def push_accept_notification(reciever, fcm_token, user_acceptedFriendship, notification_type, accepted_at):

    if not reciever or not user_acceptedFriendship or not notification_type:
        return '400' 
    
    notification = Notification.objects.create(
        receiver = reciever,
        type = notification_type,
        data={
            'message': f'{user_acceptedFriendship.username} accepted your friend request.',
            'user': {
                'id': user_acceptedFriendship.id,
                'username': user_acceptedFriendship.username,
                'email': user_acceptedFriendship.email,
                'gender': user_acceptedFriendship.gender,
                'streak_cnt': user_acceptedFriendship.streak_cnt,
                'joined_on': user_acceptedFriendship.joined_on.isoformat() if hasattr(user_acceptedFriendship.joined_on, 'isoformat') else str(user_acceptedFriendship.joined_on)
            },
            'accepted_at': accepted_at.isoformat() if hasattr(accepted_at, 'isoformat') else accepted_at
        }
    )

    if fcm_token:
        try:
            message_obj = messaging.Message(
                notification=messaging.Notification(
                    title=notification_type,
                    body=notification.data.get('message', '')
                ),
                token=fcm_token
            )
            messaging.send(message_obj)
            notification.is_sent = True
            notification.save()
            
        except Exception as e:
            logger.warning(f"Failed to send push notification: {e}")
            return '200'

    return '200'



def push_request_notification(reciever, fcm_token, user_sentFriendship, notification_type, sent_at):

    if not reciever or not user_sentFriendship or not notification_type:
        return '400' 

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
                'joined_on': user_sentFriendship.joined_on.isoformat() if hasattr(user_sentFriendship.joined_on, 'isoformat') else str(user_sentFriendship.joined_on)
            },
            'sent_at': sent_at.isoformat() if hasattr(sent_at, 'isoformat') else sent_at
        }
    )

    if fcm_token:
        try:
            message_obj = messaging.Message(
                notification=messaging.Notification(
                    title=notification_type,
                    body=notification.data.get('message', '')
                ),
                token=fcm_token
            )
            messaging.send(message_obj)
            notification.is_sent = True
            notification.save()
            
        except Exception as e:
            logger.warning(f"Failed to send push notification: {e}")
            return '200'

    return '200'
