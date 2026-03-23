from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    RISK_CHOICES = [
        ('conservative', 'Conservative'),
        ('moderate', 'Moderate'),
        ('aggressive', 'Aggressive'),
    ]

    email = models.EmailField(unique=True)
    telegram_id = models.CharField(max_length=255, blank=True, null=True)
    risk_tolerance = models.CharField(max_length=20, choices=RISK_CHOICES, default='moderate')
    mpin_hash = models.CharField(max_length=255, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        ordering = ['-created_at']

    def set_mpin(self, mpin: str) -> None:
        self.mpin_hash = make_password(mpin)
        self.save(update_fields=['mpin_hash', 'updated_at'])

    def verify_mpin(self, mpin: str) -> bool:
        if not self.mpin_hash:
            return False
        return check_password(mpin, self.mpin_hash)

    def __str__(self) -> str:
        return self.email
