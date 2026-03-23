from rest_framework import serializers

from .ml_rnn import avg_discount_from_high_pct, valuation_from_52w
from .models import Forecast, Sentiment, Stock


class StockListSerializer(serializers.ModelSerializer):
    valuation = serializers.SerializerMethodField()
    avg_52w_discount_pct = serializers.SerializerMethodField()
    trend_7d_pct = serializers.SerializerMethodField()
    rnn_signal = serializers.SerializerMethodField()
    rnn_signal_label = serializers.SerializerMethodField()
    ai_direction = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id',
            'symbol',
            'name',
            'sector',
            'current_price',
            'change_percent',
            'market_cap',
            'pe_ratio',
            'pb_ratio',
            'price_52w_high',
            'price_52w_low',
            'quote_currency',
            'change_7d_percent',
            'valuation',
            'avg_52w_discount_pct',
            'trend_7d_pct',
            'rnn_signal',
            'rnn_signal_label',
            'ai_direction',
        ]

    def get_valuation(self, obj: Stock) -> str:
        return valuation_from_52w(
            float(obj.current_price or 0),
            float(obj.price_52w_high or 0),
            float(obj.price_52w_low or 0),
        )

    def get_avg_52w_discount_pct(self, obj: Stock):
        v = avg_discount_from_high_pct(float(obj.current_price or 0), float(obj.price_52w_high or 0))
        return round(v, 2) if v is not None else None

    def get_trend_7d_pct(self, obj: Stock):
        if obj.change_7d_percent is None:
            return None
        return float(obj.change_7d_percent)

    def get_rnn_signal(self, obj: Stock) -> str:
        s = (obj.ml_rnn_signal or '').strip().lower()
        if s in ('sell', 'hold', 'strong_buy'):
            return s
        return 'hold'

    def get_rnn_signal_label(self, obj: Stock) -> str:
        key = self.get_rnn_signal(obj)
        return {'strong_buy': 'Strong Buy', 'hold': 'Hold', 'sell': 'Sell'}.get(key, 'Hold')

    def get_ai_direction(self, obj: Stock):
        return obj.ml_sparkline if isinstance(obj.ml_sparkline, list) else []


class StockDetailSerializer(serializers.ModelSerializer):
    sentiment = serializers.SerializerMethodField()
    forecasts = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = '__all__'

    def get_sentiment(self, obj: Stock):
        try:
            s = obj.sentiment
        except Sentiment.DoesNotExist:
            return None
        return {
            'score': float(s.overall_sentiment),
            'label': s.label,
            'news': float(s.news_sentiment) if s.news_sentiment is not None else None,
            'analyst': float(s.analyst_rating) if s.analyst_rating is not None else None,
        }

    def get_forecasts(self, obj: Stock):
        qs = Forecast.objects.filter(stock=obj).order_by('-created_at')[:5]
        return [
            {
                'model': f.model_type,
                'days': f.forecast_days,
                'predicted_price': float(f.predicted_price),
                'confidence_upper': float(f.confidence_upper),
                'confidence_lower': float(f.confidence_lower),
            }
            for f in qs
        ]
