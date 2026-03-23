from decimal import Decimal

from django.conf import settings
from django.db import models

from stocks.models import Stock


class Portfolio(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portfolio')
    total_value = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    total_invested = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    total_gain_loss = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    total_return_percentage = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self) -> None:
        tv = Decimal('0')
        inv = Decimal('0')
        for h in self.holdings.all():
            tv += h.current_value or Decimal('0')
            inv += h.invested_value or Decimal('0')
        self.total_value = tv
        self.total_invested = inv
        self.total_gain_loss = tv - inv
        self.total_return_percentage = ((tv - inv) / inv * 100) if inv > 0 else Decimal('0')
        self.save()

    def __str__(self) -> str:
        return f"{self.user.email}'s portfolio"


class Holding(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='holdings')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    purchase_price = models.DecimalField(max_digits=14, decimal_places=4)
    purchase_date = models.DateField()
    current_value = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    gain_loss = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    gain_loss_percentage = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    invested_value = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('portfolio', 'stock')]
        ordering = ['-updated_at']

    def calculate_values(self) -> None:
        self.stock.refresh_from_db()
        q = Decimal(int(self.quantity))
        pp = Decimal(str(self.purchase_price))
        cp = Decimal(str(self.stock.current_price))
        self.invested_value = (q * pp).quantize(Decimal('0.0001'))
        self.current_value = (q * cp).quantize(Decimal('0.0001'))
        self.gain_loss = self.current_value - self.invested_value
        self.gain_loss_percentage = (
            (self.gain_loss / self.invested_value * 100) if self.invested_value > 0 else Decimal('0')
        ).quantize(Decimal('0.0001'))
        self.save()

    def __str__(self) -> str:
        return f'{self.stock.symbol} x{self.quantity}'
