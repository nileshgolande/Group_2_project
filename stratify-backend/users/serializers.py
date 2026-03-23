from rest_framework import serializers

from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'risk_tolerance',
            'telegram_id',
            'is_email_verified',
            'date_joined',
        )
        read_only_fields = ('id', 'date_joined', 'is_email_verified')
