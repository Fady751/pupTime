from rest_framework import serializers
from django.db.models import Q

from .models import Hobby


class HobbySerializer(serializers.ModelSerializer):
    class Meta:
        model = Hobby
        fields = ['id', 'name']
