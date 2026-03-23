from django.conf import settings
from django.db import models


class ChatMessage(models.Model):
    QUERY_TYPES = [
        ('qa', 'Q&A'),
        ('recommendation', 'Recommendation'),
        ('portfolio_action', 'Portfolio Action'),
        ('forecast', 'Forecast'),
        ('sentiment', 'Sentiment'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        null=True,
        blank=True,
    )
    session_id = models.CharField(max_length=255, db_index=True)
    query = models.TextField()
    response = models.TextField()
    query_type = models.CharField(max_length=20, choices=QUERY_TYPES, default='qa')
    intent = models.CharField(max_length=100, blank=True, null=True)
    action_required = models.BooleanField(default=False)
    action_type = models.CharField(max_length=50, blank=True, null=True)
    response_time_ms = models.IntegerField(default=0)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['user']),
        ]

    def __str__(self) -> str:
        return f'{self.session_id}: {self.query[:40]}'
