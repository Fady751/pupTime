from datetime import timedelta
from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from .models import Friendship, Status
from user.models import User
from .Backend import delete_cancelled_friendship


class FriendshipSerializer(serializers.ModelSerializer):
    sender = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Friendship
        fields = [
            'id',
            'sender',
            'receiver',
            'status',
            'blocked_by',
            'sent_at',
            'accepted_at'
        ]
        read_only_fields = ['status', 'blocked_by', 'sent_at', 'accepted_at']

    def validate(self, data):
        sender = self.context['request'].user
        receiver = data.get('receiver')

        if sender == receiver:
            raise serializers.ValidationError("You cannot send a friend request to yourself.")

        if Friendship.objects.filter(
            Q(sender=sender, receiver=receiver) |
            Q(sender=receiver, receiver=sender)
        ).exists():
            raise serializers.ValidationError("Friendship already exists or pending.")

        return data

    def create(self, validated_data):
        return Friendship.objects.create(**validated_data)
    

class FriendshipAcceptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = ['id', 'status', 'accepted_at' , 'sender', 'receiver']
        read_only_fields = ['id', 'accepted_at', 'sender', 'receiver']

    def update(self, instance, validated_data):

        if instance.receiver != self.context['request'].user:
            raise serializers.ValidationError("You can only accept friend requests sent to you.")
        
        if instance.status != Status.PENDING:
            raise serializers.ValidationError(f"Relationship is not pending, but {instance.status}.")
     
        instance.status = Status.ACCEPTED
        instance.accepted_at = timezone.now()
        instance.save()
        return instance  
    
class FriendshipCancelRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = ['id', 'status', 'sender', 'receiver']
        read_only_fields = ['id', 'sender', 'receiver' , 'status']

    def update(self, instance, validated_data):

        if instance.sender != self.context['request'].user:
            raise serializers.ValidationError("You can only cancel friend requests you have sent.")
        
        if instance.status != Status.PENDING:
            raise serializers.ValidationError(f"Relationship is not pending, but {instance.status}.")
        
        instance.status = Status.CANCELLED
        instance.save()
        delete_cancelled_friendship.apply_async(args=[instance.id], countdown=3600)
        return instance
    
class BlockFriendshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = ['id', 'status', 'blocked_by', 'sender', 'receiver']
        read_only_fields = ['id', 'sender', 'receiver' , 'status']

    def update(self, instance, validated_data):
        request_user = self.context['request'].user

        if instance.status == Status.BLOCKED:
            raise serializers.ValidationError("This user is already blocked.")
        
        if request_user != instance.sender and request_user != instance.receiver:
            raise serializers.ValidationError("You can only block users you have a relationship with.")
        
        instance.status = Status.BLOCKED
        instance.blocked_by = request_user
        instance.save()
        return instance
    
class UnblockFriendshipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Friendship
        fields = ['id', 'status', 'blocked_by', 'sender', 'receiver']
        read_only_fields = ['id', 'sender', 'receiver' , 'status']

    def update(self, instance, validated_data):
        request_user = self.context['request'].user

        if instance.status != Status.BLOCKED:
            raise serializers.ValidationError("This user is not blocked.")
        
        if instance.blocked_by != request_user:
            raise serializers.ValidationError("You can only unblock users you have blocked.")

        instance.delete()
        return None
        


