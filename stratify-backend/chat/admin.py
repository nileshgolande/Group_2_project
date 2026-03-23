from django.contrib import admin

from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'query_type', 'response_time_ms', 'created_at')
    search_fields = ('session_id', 'query')
