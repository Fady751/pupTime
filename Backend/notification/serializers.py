from .models import Notification , User
from rest_framework import serializers  


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'receiver', 'type', 'is_read', 'created_at' , 'data']
        read_only_fields = ["id", "created_at"]
