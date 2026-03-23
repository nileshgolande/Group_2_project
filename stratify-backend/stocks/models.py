from django.db import models


class Stock(models.Model):
    symbol = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100, db_index=True, default='Unknown')
    current_price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    change_percent = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    pe_ratio = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    pb_ratio = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    market_cap = models.BigIntegerField(null=True, blank=True)
    dividend_yield = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    price_52w_high = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    price_52w_low = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    quote_currency = models.CharField(max_length=3, default='INR')
    change_7d_percent = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    ml_rnn_signal = models.CharField(max_length=20, blank=True, default='')
    ml_sparkline = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_price_update = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['symbol']
        indexes = [
            models.Index(fields=['symbol']),
            models.Index(fields=['sector']),
        ]

    def __str__(self) -> str:
        return f'{self.symbol} - {self.name}'


class Sentiment(models.Model):
    SENTIMENT_CHOICES = [
        ('bullish', 'Bullish'),
        ('neutral', 'Neutral'),
        ('bearish', 'Bearish'),
    ]

    stock = models.OneToOneField(Stock, on_delete=models.CASCADE, related_name='sentiment')
    overall_sentiment = models.DecimalField(max_digits=5, decimal_places=2, default=50)
    label = models.CharField(max_length=10, choices=SENTIMENT_CHOICES, default='neutral')
    news_sentiment = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    analyst_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sample_size = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f'{self.stock.symbol} - {self.label}'


class Forecast(models.Model):
    MODEL_TYPES = [
        ('linear', 'Linear Regression'),
        ('arima', 'ARIMA'),
        ('lstm', 'LSTM Neural Network'),
    ]
    FORECAST_DAYS = [(7, '7 Days'), (30, '1 Month'), (365, '1 Year')]

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='forecasts')
    model_type = models.CharField(max_length=20, choices=MODEL_TYPES)
    forecast_days = models.IntegerField(choices=FORECAST_DAYS)
    predicted_price = models.DecimalField(max_digits=14, decimal_places=4)
    confidence_upper = models.DecimalField(max_digits=14, decimal_places=4)
    confidence_lower = models.DecimalField(max_digits=14, decimal_places=4)
    accuracy_score = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('stock', 'model_type', 'forecast_days')]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.stock.symbol} - {self.model_type} ({self.forecast_days}d)'
