from celery.utils import functional
import logging
from firebase_admin import messaging
from .models import Notification

logger = logging.getLogger(__name__)


def _user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'gender': user.gender,
        'streak_cnt': user.streak_cnt,
        'joined_on': user.joined_on.isoformat() if hasattr(user.joined_on, 'isoformat') else str(user.joined_on),
    }


def _send_push(fcm_token, notification, title, body, data):

    if not fcm_token:
        return

    payload = {'type': notification.type, 'notification_id': str(notification.id)}
    payload.update({k: str(v) for k, v in data.items() if v is not None})

    try:
        messaging.send(messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=payload,
            token=fcm_token,
        ))
        notification.is_sent = True
        notification.save(update_fields=['is_sent'])
    except Exception as e:
        logger.warning(f"Failed to send push notification: {e}")


def push_request_notification(receiver, fcm_token, sender, notification_type, sent_at):
    if not receiver or not sender or not notification_type:
        return '400'

    notification = Notification.objects.create(
        receiver=receiver,
        type=notification_type,
        data={
            'message': f'{sender.username} sent you a friend request.',
            'user': _user_payload(sender),
            'sent_at': sent_at.isoformat() if hasattr(sent_at, 'isoformat') else sent_at,
        },
    )

    _send_push(
        fcm_token, notification,
        title=notification_type,
        body=notification.data['message'],
        data={'sender_id': sender.id, 'sender_username': sender.username},
    )
    return '200'


def push_accept_notification(receiver, fcm_token, accepter, notification_type, accepted_at):
    if not receiver or not accepter or not notification_type:
        return '400'

    notification = Notification.objects.create(
        receiver=receiver,
        type=notification_type,
        data={
            'message': f'{accepter.username} accepted your friend request.',
            'user': _user_payload(accepter),
            'accepted_at': accepted_at.isoformat() if hasattr(accepted_at, 'isoformat') else accepted_at,
        },
    )

    _send_push(
        fcm_token, notification,
        title=notification_type,
        body=notification.data['message'],
        data={'sender_id': accepter.id, 'sender_username': accepter.username},
    )
    return '200'


def push_invitation_notification(receiver, fcm_token, initiator, social_task, notification_type='Invitation'):
    if not receiver or not initiator or not social_task:
        return '400'

    notification = Notification.objects.create(
        receiver=receiver,
        type=notification_type,
        data={
            'message': f'{initiator.username} invited you to "{social_task.title}".',
            'user': _user_payload(initiator),
            'social_task': {
                'id': str(social_task.id),
                'title': social_task.title,
                'description': social_task.description,
                'duration_minutes': social_task.duration_minutes,
                'scheduled_at': social_task.scheduled_at.isoformat() if social_task.scheduled_at else None,
            },
        },
    )

    _send_push(
        fcm_token, notification,
        title=notification_type,
        body=notification.data['message'],
        data={
            'sender_id': initiator.id,
            'sender_username': initiator.username,
            'social_task_id': str(social_task.id),
            'title': social_task.title,
        },
    )
    return '200'


def push_message_notification(receiver, fcm_token, sender, message, notification_type='Message'):
    if not receiver or not sender or not message:
        return '400'

    notification = Notification.objects.create(
        receiver=receiver,
        type=notification_type,
        data={
            'message': f'{sender.username}: {message.content}',
            'user': _user_payload(sender),
            'room_id': message.room_id,
            'message_id': message.id,
            'content': message.content,
            'created_at': message.created_at.isoformat() if hasattr(message.created_at, 'isoformat') else str(message.created_at),
        },
    )

    _send_push(
        fcm_token, notification,
        title=sender.username,
        body=message.content,
        data={
            'sender_id': sender.id,
            'sender_username': sender.username,
            'room_id': message.room_id,
            'message_id': message.id,
        },
    )
    return '200'


def push_warning_notification(receiver, fcm_token, reason):
    if not receiver or not fcm_token:
        return '400'

    notification = Notification.objects.create(
        receiver=receiver,
        type='Report',
        data={
            'message': f'You have received a warning',
            'reason': reason,
        },
    )

    _send_push(
        fcm_token, notification,
        title='Warning Notification',
        body=notification.data['message'],
        data={'reason': reason},
    )
    return '200'

