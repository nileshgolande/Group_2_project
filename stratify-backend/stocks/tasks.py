from celery import shared_task

from .market_data import list_refresh_delay, refresh_stock_price
from .models import Stock


@shared_task
def update_stock_prices():
    updated = 0
    delay = list_refresh_delay()
    for i, stock in enumerate(Stock.objects.all()[:100]):
        if refresh_stock_price(stock, throttle_sleep=delay if i else 0.0):
            updated += 1
    return f'updated_{updated}'


@shared_task
def generate_forecasts():
    """
    Deprecated: forecasts are computed from Yahoo history on demand in the API.
    Kept as a no-op so old Celery beat configs do not fail if still referenced.
    """
    return 'skipped_forecasts_use_yfinance_api'
