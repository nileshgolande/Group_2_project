from django.conf import settings
from django.core.cache import cache
from django.db.models import Case, IntegerField, When
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .market_data import (
    forecast_payload_from_yfinance_history,
    get_or_create_stock_from_yfinance,
    list_refresh_delay,
    refresh_page_if_stale,
    refresh_stock_price,
    sentiment_payload_from_yfinance,
    stock_is_stale,
)
from .models import Forecast, Sentiment, Stock
from .serializers import StockDetailSerializer, StockListSerializer
from .universe import UNIVERSE_DB_SYMBOLS


class StockListView(ListAPIView):
    queryset = Stock.objects.filter(symbol__in=UNIVERSE_DB_SYMBOLS)
    serializer_class = StockListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['symbol', 'name']
    ordering_fields = ['symbol', 'current_price', 'change_percent', 'market_cap', 'change_7d_percent']

    def get_queryset(self):
        qs = super().get_queryset()
        sector = self.request.query_params.get('sector')
        if sector:
            qs = qs.filter(sector__iexact=sector)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        ordering_param = request.query_params.get('ordering')
        if not ordering_param:
            preserved = Case(
                *[When(symbol=s, then=pos) for pos, s in enumerate(UNIVERSE_DB_SYMBOLS)],
                output_field=IntegerField(),
            )
            queryset = queryset.order_by(preserved)

        force_live = request.query_params.get('live', '').lower() in ('1', 'true', 'yes')
        page = self.paginate_queryset(queryset)
        delay = list_refresh_delay()
        if page is not None:
            if force_live:
                for i, st in enumerate(page):
                    refresh_stock_price(st, throttle_sleep=delay if i else 0)
                    st.refresh_from_db()
            else:
                refresh_page_if_stale(page)
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        if force_live:
            for i, st in enumerate(queryset):
                refresh_stock_price(st, throttle_sleep=delay if i else 0)
        else:
            refresh_page_if_stale(queryset)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class StockDetailView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        cache_key = f'stock_detail_json_{sym}'
        force_live = request.query_params.get('live', '').lower() in ('1', 'true', 'yes')
        cache_ttl = int(getattr(settings, 'STOCK_DETAIL_CACHE_SECONDS', 45))

        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response(
                {'error': 'Stock not found', 'status_code': 404},
                status=status.HTTP_404_NOT_FOUND,
            )
        if force_live or stock_is_stale(stock):
            refresh_stock_price(stock)
            stock.refresh_from_db()
            cache.delete(cache_key)
        elif cache_ttl > 0:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response({'data': cached, 'status_code': 200}, status=status.HTTP_200_OK)

        data = StockDetailSerializer(stock).data
        if cache_ttl > 0:
            cache.set(cache_key, data, cache_ttl)
        return Response({'data': data, 'status_code': 200}, status=status.HTTP_200_OK)


class StockForecastView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response(
                {'error': 'Stock not found', 'status_code': 404},
                status=status.HTTP_404_NOT_FOUND,
            )
        model_type = request.query_params.get('model', 'linear')

        forecasts = Forecast.objects.filter(stock=stock, model_type=model_type).order_by('-forecast_days')

        if forecasts.exists():
            f = forecasts.first()
            forecast_data = {
                'model': f.model_type,
                'source': 'database',
                'predicted_price': float(f.predicted_price),
                'confidence_upper': float(f.confidence_upper),
                'confidence_lower': float(f.confidence_lower),
                'accuracy_score': float(f.accuracy_score) if f.accuracy_score is not None else None,
            }
        else:
            forecast_data = forecast_payload_from_yfinance_history(sym, model_type)

        return Response({'data': forecast_data, 'status_code': 200}, status=status.HTTP_200_OK)


class StockSentimentView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response(
                {'error': 'Stock not found', 'status_code': 404},
                status=status.HTTP_404_NOT_FOUND,
            )
        sentiment = Sentiment.objects.filter(stock=stock).first()

        if sentiment:
            sentiment_data = {
                'sentiment_score': float(sentiment.overall_sentiment),
                'label': sentiment.label,
                'source': 'database',
                'breakdown': {
                    'news': float(sentiment.news_sentiment) if sentiment.news_sentiment is not None else None,
                    'analyst': float(sentiment.analyst_rating) if sentiment.analyst_rating is not None else None,
                },
                'sample_size': sentiment.sample_size,
            }
        else:
            sentiment_data = sentiment_payload_from_yfinance(sym)

        return Response({'data': sentiment_data, 'status_code': 200}, status=status.HTTP_200_OK)
