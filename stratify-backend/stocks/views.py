from typing import Any

import numpy as np
import pandas as pd

from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .market_data import (
    forecast_payload_from_yfinance_history,
    get_or_create_stock_from_yfinance,
    list_refresh_delay,
    yf_symbol,
    refresh_page_if_stale,
    refresh_stock_price,
    sentiment_payload_from_yfinance,
    stock_is_stale,
)
from .models import Forecast, Sentiment, Stock
from .forecasting import forecast_three_models
from .indicators import build_technical_payload
from .serializers import StockDetailSerializer, StockListSerializer


class StockListView(ListAPIView):
    queryset = Stock.objects.all()
    serializer_class = StockListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['symbol', 'name']
    ordering_fields = ['symbol', 'current_price', 'change_percent', 'market_cap', 'change_7d_percent']

    def get_queryset(self):
        qs = super().get_queryset()
        univ = (self.request.query_params.get('universe') or '').lower().strip()
        if univ in ('in', 'india', 'indian'):
            qs = qs.filter(universe='IN')
        elif univ in ('us', 'usa', 'usd', 'american'):
            qs = qs.filter(universe='US')
        sector = self.request.query_params.get('sector')
        if sector:
            qs = qs.filter(sector__iexact=sector)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
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
        days_raw = request.query_params.get('days') or request.query_params.get('forecast_days') or '7'
        try:
            days = int(days_raw)
        except (TypeError, ValueError):
            days = 7
        if days not in (7, 30, 365):
            days = 7

        try:
            res = forecast_three_models(sym, days=days)
            models_out: dict[str, Any] = {}
            for k, v in res['models'].items():
                models_out[k] = {
                    'predicted_price': v.get('predicted_price'),
                    'confidence_upper': v.get('confidence_upper'),
                    'confidence_lower': v.get('confidence_lower'),
                    'rmse': v.get('rmse'),
                    'mape': v.get('mape'),
                    'forecast_series': v.get('forecast_series', []),
                    'confidence_upper_series': v.get('confidence_upper_series', []),
                    'confidence_lower_series': v.get('confidence_lower_series', []),
                }

            forecast_data = {
                'days': days,
                'best_model': res.get('best_model'),
                'source': 'ml_models_on_yahoo_history',
                'models': models_out,
            }
        except Exception as exc:
            # Fallback to the previous naive implementation.
            forecast_data = forecast_payload_from_yfinance_history(sym, model_type='linear')
            forecast_data['note'] = f'Fallback used: {exc}'

        return Response({'data': forecast_data, 'status_code': 200}, status=status.HTTP_200_OK)


class StockTechnicalView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response({'error': 'Stock not found', 'status_code': 404}, status=status.HTTP_404_NOT_FOUND)

        import yfinance as yf
        t = yf.Ticker(yf_symbol(sym))
        df = t.history(period='3y', interval='1d', auto_adjust=True)
        if df.empty:
            return Response({'data': {}, 'status_code': 200}, status=status.HTTP_200_OK)

        close = df['Close'].astype(float)
        payload = build_technical_payload(close)
        return Response({'data': payload, 'status_code': 200}, status=status.HTTP_200_OK)


class StockChartView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response({'error': 'Stock not found', 'status_code': 404}, status=status.HTTP_404_NOT_FOUND)

        import yfinance as yf
        t = yf.Ticker(yf_symbol(sym))
        df = t.history(period='1y', interval='1d', auto_adjust=False)
        if df.empty:
            return Response({'data': {'plot': None}, 'status_code': 200}, status=status.HTTP_200_OK)

        df = df.dropna(subset=['Open', 'High', 'Low', 'Close'])
        dates = [str(idx.date()) for idx in df.index]
        open_ = [float(x) for x in df['Open'].values]
        high = [float(x) for x in df['High'].values]
        low = [float(x) for x in df['Low'].values]
        close = [float(x) for x in df['Close'].values]

        close_s = pd.Series(close, dtype=float)
        ma20 = close_s.rolling(window=20, min_periods=20).mean().replace({np.nan: None}).tolist()
        ma50 = close_s.rolling(window=50, min_periods=50).mean().replace({np.nan: None}).tolist()

        plot = {
            'data': [
                {
                    'type': 'candlestick',
                    'x': dates,
                    'open': open_,
                    'high': high,
                    'low': low,
                    'close': close,
                    'name': 'Price',
                },
                {
                    'type': 'scatter',
                    'mode': 'lines',
                    'x': dates,
                    'y': ma20,
                    'name': 'MA20',
                    'line': {'width': 2},
                },
                {
                    'type': 'scatter',
                    'mode': 'lines',
                    'x': dates,
                    'y': ma50,
                    'name': 'MA50',
                    'line': {'width': 2},
                },
            ],
            'layout': {
                'title': f'{sym} Candlestick (MA20/MA50)',
                'margin': {'l': 30, 'r': 10, 't': 40, 'b': 20},
                'xaxis': {'rangeslider': {'visible': False}},
                'template': 'plotly_white',
            },
        }

        return Response({'data': {'plot': plot}, 'status_code': 200}, status=status.HTTP_200_OK)


class StockForecastChartView(APIView):
    def get(self, request, symbol):
        sym = symbol.upper().strip()
        stock = get_or_create_stock_from_yfinance(sym)
        if not stock:
            return Response({'error': 'Stock not found', 'status_code': 404}, status=status.HTTP_404_NOT_FOUND)

        days_raw = request.query_params.get('days') or request.query_params.get('forecast_days') or '7'
        try:
            days = int(days_raw)
        except (TypeError, ValueError):
            days = 7
        if days not in (7, 30, 365):
            days = 7

        try:
            res = forecast_three_models(sym, days=days)
        except Exception as exc:
            return Response({'data': {'plot': None, 'error': str(exc)}, 'status_code': 200}, status=status.HTTP_200_OK)

        # Current price baseline
        import yfinance as yf
        t = yf.Ticker(yf_symbol(sym))
        df = t.history(period='5d', interval='1d', auto_adjust=True)
        cur = float(df['Close'].astype(float).iloc[-1]) if not df.empty else 0.0

        x = list(range(1, days + 1))
        colors = {'linear': '#0EA5E9', 'arima': '#8B5CF6', 'lstm': '#10B981'}

        traces = [
            {
                'type': 'scatter',
                'mode': 'lines',
                'x': x,
                'y': [cur] * days,
                'name': 'Current',
                'line': {'dash': 'dot'},
            }
        ]

        for model_key, model_data in res['models'].items():
            y_pred = model_data.get('forecast_series', [])
            y_upper = model_data.get('confidence_upper_series', [])
            y_lower = model_data.get('confidence_lower_series', [])
            if not y_pred:
                continue
            traces.append(
                {
                    'type': 'scatter',
                    'mode': 'lines',
                    'x': x,
                    'y': y_pred,
                    'name': model_key.upper(),
                    'line': {'width': 2, 'color': colors.get(model_key, None)},
                }
            )
            # Confidence band as two lines (keeps payload small and predictable).
            if y_upper and y_lower and len(y_upper) == len(y_lower) == days:
                traces.append(
                    {
                        'type': 'scatter',
                        'mode': 'lines',
                        'x': x,
                        'y': y_upper,
                        'name': f'{model_key.upper()} CI+',
                        'line': {'width': 1, 'color': colors.get(model_key, None), 'dash': 'dash'},
                        'opacity': 0.5,
                    }
                )
                traces.append(
                    {
                        'type': 'scatter',
                        'mode': 'lines',
                        'x': x,
                        'y': y_lower,
                        'name': f'{model_key.upper()} CI-',
                        'line': {'width': 1, 'color': colors.get(model_key, None), 'dash': 'dash'},
                        'opacity': 0.5,
                    }
                )

        plot = {
            'data': traces,
            'layout': {
                'title': f'{sym} Forecast Comparison ({days} days)',
                'margin': {'l': 30, 'r': 10, 't': 40, 'b': 20},
                'template': 'plotly_white',
            },
        }

        return Response(
            {'data': {'plot': plot, 'best_model': res.get('best_model'), 'models': res.get('models', {})}, 'status_code': 200},
            status=status.HTTP_200_OK,
        )


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


class SectorPortfoliosView(APIView):
    """
    Return sector-wise "portfolio compositions" without writing to DB.

    Because current DB has only one Portfolio per user (OneToOne), we expose the
    generated lists first. Frontend/DB persistence can be added later.
    """

    DEFAULT_SECTORS = [
        'Nifty Auto',
        'Nifty Bank',
        'Nifty Commodities',
        'Nifty CPSE',
        'Nifty Energy',
        'Nifty FMCG',
        'Nifty IT',
        'Nifty Media',
        'Nifty Metal',
        'Nifty MNC',
        'Nifty Pharma',
        'Nifty PSE',
        'Nifty PSU Bank',
        'Nifty Realty',
    ]

    def get(self, request):
        universe_raw = (request.query_params.get('universe') or '').lower().strip()
        univ = None
        if universe_raw in ('in', 'india', 'indian'):
            univ = 'IN'
        elif universe_raw in ('us', 'usa', 'usd', 'american'):
            univ = 'US'

        top_raw = (request.query_params.get('top') or '5').strip()
        try:
            top = int(top_raw)
        except (TypeError, ValueError):
            top = 5
        top = max(1, min(top, 50))

        sectors_param = (request.query_params.get('sectors') or '').strip()
        sectors = self.DEFAULT_SECTORS if not sectors_param else [s.strip() for s in sectors_param.split(',') if s.strip()]

        out = []
        for sector in sectors:
            qs = Stock.objects.all()
            if univ:
                qs = qs.filter(universe=univ)
            qs = qs.filter(sector__iexact=sector)
            qs = qs.order_by('-change_percent', '-current_price')[:top]

            holdings = []
            # Keep response small/explicit rather than reusing serializers with many fields.
            for st in qs:
                holdings.append(
                    {
                        'symbol': st.symbol,
                        'name': st.name,
                        'price': float(st.current_price or 0),
                        'change_percent': float(st.change_percent or 0),
                        'rnn_signal': (st.ml_rnn_signal or '').lower() or 'hold',
                        'weight': 1.0 / top,
                    }
                )

            out.append({'sector': sector, 'holdings': holdings})

        return Response({'data': out, 'status_code': 200}, status=status.HTTP_200_OK)
