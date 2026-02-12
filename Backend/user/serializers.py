from rest_framework import serializers
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .models import User, InterestCategory, Interest, UserInterest


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True, help_text='Google ID token from frontend')

    def validate_id_token(self, value):
        try:
            idinfo = id_token.verify_oauth2_token(
                value,
                google_requests.Request(),
                settings.GOOGLE_WEB_CLIENT_ID
            )

            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise serializers.ValidationError('Invalid token issuer.')

            return {
                'google_id': idinfo['sub'],
                'email': idinfo.get('email', ''),
                'email_verified': idinfo.get('email_verified', False),
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
            }
        except ValueError as e:
            raise serializers.ValidationError(f'Invalid Google token: {str(e)}')


class InterestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InterestCategory
        fields = ['id', 'name']


class InterestSerializer(serializers.ModelSerializer):
    category = InterestCategorySerializer(read_only=True)

    class Meta:
        model = Interest
        fields = ['id', 'title', 'category']


class UserInterestSerializer(serializers.Serializer):
    interest_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='List of interest IDs to assign to the user',
    )


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)
    google_auth_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    has_interests = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'google_auth_id', 'gender', 'birth_day', 'streak_cnt', 'joined_on', 'has_interests']
        read_only_fields = ['id', 'joined_on', 'streak_cnt', 'has_interests']

    def get_has_interests(self, obj):
        return obj.user_interests.exists()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],

            google_auth_id=validated_data.get('google_auth_id'),
            gender=validated_data.get('gender'),
            birth_day=validated_data.get('birth_day')
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    has_interests = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'google_auth_id', 'gender', 'birth_day', 'streak_cnt', 'joined_on', 'has_interests']
        read_only_fields = ['id', 'joined_on', 'streak_cnt', 'has_interests']

    def get_has_interests(self, obj):
        return obj.user_interests.exists()

    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        user = self.instance
        if User.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
