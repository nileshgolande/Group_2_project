from rest_framework import serializers

from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = (
            'id',
            'session_id',
            'query',
            'response',
            'query_type',
            'response_time_ms',
            'created_at',
        )
