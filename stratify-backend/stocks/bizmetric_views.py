"""REST views for Bizmetric-style ML series + EDA (integrated from Nilesh_Bizmetric_project)."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .bizmetric_predictions import get_commodity_prediction_series, get_stock_prediction_series, torch_enabled
from .eda_analytics import analyze_stock_eda


class StockMlPredictionSeriesView(APIView):
    """
    GET /api/ml/predictions/stock/<symbol>/?days=7
    Chart-friendly rows: actual, lr_prediction, rnn_prediction (LSTM), cnn_prediction, is_future.
    """

    def get(self, request, symbol):
        days_raw = request.query_params.get('days', '7')
        try:
            days = int(days_raw)
        except (TypeError, ValueError):
            days = 7
        series, err = get_stock_prediction_series(symbol, days=days)
        if err:
            return Response(
                {'error': err, 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                'data': series,
                'status_code': 200,
                'meta': {
                    'torch': torch_enabled(),
                    'days': days,
                    'note': 'RNN = PyTorch LSTM when torch is installed; else nulls.',
                },
            },
            status=status.HTTP_200_OK,
        )


class CommodityMlPredictionView(APIView):
    """
    GET /api/ml/predictions/asset/<asset>/
    asset: gold | silver | btc (case-insensitive)
    """

    def get(self, request, asset):
        series, err = get_commodity_prediction_series(asset)
        if err:
            return Response(
                {'error': err, 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                'data': series,
                'status_code': 200,
                'meta': {'torch': torch_enabled(), 'asset': asset.lower().strip()},
            },
            status=status.HTTP_200_OK,
        )


class StockEdaAnalyticsView(APIView):
    """GET /api/ml/analytics/<symbol>/ — returns trend_graph + risk/return stats."""

    def get(self, request, symbol):
        out = analyze_stock_eda(symbol)
        if not out:
            return Response(
                {'error': 'No data for symbol', 'status_code': 404},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'data': out, 'status_code': 200}, status=status.HTTP_200_OK)
