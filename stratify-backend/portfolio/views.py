from datetime import datetime

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from stocks.models import Stock

from .models import Holding, Portfolio
from .serializers import HoldingSerializer


class PortfolioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        portfolio, _ = Portfolio.objects.get_or_create(user=request.user)
        portfolio.calculate_totals()
        holdings = portfolio.holdings.select_related('stock').all()
        return Response(
            {
                'data': HoldingSerializer(holdings, many=True).data,
                'summary': {
                    'total_value': float(portfolio.total_value),
                    'total_invested': float(portfolio.total_invested),
                    'total_gain_loss': float(portfolio.total_gain_loss),
                    'total_return_percentage': float(portfolio.total_return_percentage),
                },
                'status_code': 200,
            },
            status=status.HTTP_200_OK,
        )


class AddHoldingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.headers.get('X-MPin-Token'):
            return Response(
                {'error': 'MPin verification required', 'status_code': 403},
                status=status.HTTP_403_FORBIDDEN,
            )

        symbol = (request.data.get('symbol') or '').upper().strip()
        try:
            quantity = int(request.data.get('quantity'))
            purchase_price = float(request.data.get('purchase_price'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid quantity or price', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchase_date_raw = request.data.get('purchase_date')
        if not purchase_date_raw:
            return Response(
                {'error': 'purchase_date required', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            purchase_date = datetime.strptime(str(purchase_date_raw)[:10], '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'purchase_date must be YYYY-MM-DD', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0 or purchase_price <= 0:
            return Response(
                {'error': 'Invalid quantity or price', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stock = get_object_or_404(Stock, symbol=symbol)
        portfolio, _ = Portfolio.objects.get_or_create(user=request.user)

        if Holding.objects.filter(portfolio=portfolio, stock=stock).exists():
            return Response(
                {'error': 'Stock already in portfolio', 'status_code': 400},
                status=status.HTTP_400_BAD_REQUEST,
            )

        holding = Holding.objects.create(
            portfolio=portfolio,
            stock=stock,
            quantity=quantity,
            purchase_price=purchase_price,
            purchase_date=purchase_date,
        )
        holding.calculate_values()
        portfolio.calculate_totals()

        return Response(
            {
                'data': HoldingSerializer(holding).data,
                'message': 'Stock added successfully',
                'status_code': 201,
            },
            status=status.HTTP_201_CREATED,
        )


class RemoveHoldingView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, holding_id):
        if not request.headers.get('X-MPin-Token'):
            return Response(
                {'error': 'MPin verification required', 'status_code': 403},
                status=status.HTTP_403_FORBIDDEN,
            )

        holding = get_object_or_404(Holding, id=holding_id, portfolio__user=request.user)
        portfolio = holding.portfolio
        holding.delete()
        portfolio.calculate_totals()
        return Response(status=status.HTTP_204_NO_CONTENT)
