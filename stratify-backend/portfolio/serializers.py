from rest_framework import serializers

from stocks.serializers import StockListSerializer

from .models import Holding, Portfolio


class HoldingSerializer(serializers.ModelSerializer):
    stock = StockListSerializer(read_only=True)
    stock_id = serializers.IntegerField(source='stock.id', read_only=True)

    class Meta:
        model = Holding
        fields = (
            'id',
            'stock',
            'stock_id',
            'quantity',
            'purchase_price',
            'purchase_date',
            'current_value',
            'gain_loss',
            'gain_loss_percentage',
            'invested_value',
            'updated_at',
        )


class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = (
            'total_value',
            'total_invested',
            'total_gain_loss',
            'total_return_percentage',
            'updated_at',
        )
