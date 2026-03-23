"""Live-ish prices from Yahoo via yfinance (history API — lighter than .info / quoteSummary)."""
from __future__ import annotations

import logging
import time
from decimal import Decimal

import yfinance as yf
from django.conf import settings
from django.utils import timezone

from .models import Stock
from .universe import quote_currency_for_db_symbol, yahoo_ticker_for_db_symbol

logger = logging.getLogger(__name__)


def _normalize_db_symbol(symbol: str) -> str:
    s = (symbol or '').upper().strip()
    for suf in ('.NS', '.BO'):
        if s.endswith(suf):
            s = s[: -len(suf)]
            break
    return s


def yf_symbol(symbol: str) -> str:
    s = (symbol or '').upper().strip()
    if s.endswith('.NS') or s.endswith('.BO'):
        return s
    return yahoo_ticker_for_db_symbol(_normalize_db_symbol(s))


def max_stale_seconds() -> int:
    return int(getattr(settings, 'STOCK_LIVE_MAX_STALE_SECONDS', 120))


def list_refresh_delay() -> float:
    return float(getattr(settings, 'STOCK_LIVE_REQUEST_DELAY_SECONDS', 0.15))


def list_max_refresh() -> int:
    return int(getattr(settings, 'STOCK_LIVE_LIST_MAX_REFRESH', 30))


def stock_is_stale(stock, max_seconds: int | None = None) -> bool:
    limit = max_seconds if max_seconds is not None else max_stale_seconds()
    if stock.last_price_update is None:
        return True
    age = (timezone.now() - stock.last_price_update).total_seconds()
    return age > limit


def refresh_stock_price(stock, *, throttle_sleep: float = 0.0) -> bool:
    """
    Pull latest daily close (and day-over-day % change) from Yahoo, persist, return True on success.
    """
    if throttle_sleep > 0:
        time.sleep(throttle_sleep)
    try:
        t = yf.Ticker(yf_symbol(stock.symbol))
        hist = t.history(period='5d', auto_adjust=True)
        if hist.empty:
            return False
        last = Decimal(str(float(hist['Close'].iloc[-1])))
        prev = Decimal(str(float(hist['Close'].iloc[-2]))) if len(hist) > 1 else last
        chg = ((last - prev) / prev * 100) if prev else Decimal('0')
        stock.current_price = last
        stock.change_percent = chg.quantize(Decimal('0.0001'))
        stock.last_price_update = timezone.now()
        stock.save()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning('yfinance refresh failed for %s: %s', stock.symbol, exc)
        return False


def get_or_create_stock_from_yfinance(symbol: str) -> Stock | None:
    """
    If the symbol is not in the DB, try Yahoo (NSE .NS) and create a row.
    Returns None if Yahoo has no data (invalid ticker / delisted / rate limit).
    """
    sym = _normalize_db_symbol(symbol)
    if not sym:
        return None
    existing = Stock.objects.filter(symbol=sym).first()
    if existing:
        return existing
    try:
        t = yf.Ticker(yf_symbol(sym))
        hist = t.history(period='5d', auto_adjust=True)
        if hist.empty:
            return None
        last = Decimal(str(float(hist['Close'].iloc[-1])))
        prev = Decimal(str(float(hist['Close'].iloc[-2]))) if len(hist) > 1 else last
        chg = ((last - prev) / prev * 100) if prev else Decimal('0')
        hist_1y = t.history(period='1y', auto_adjust=True)
        if hist_1y.empty:
            high_52, low_52 = last, last
        else:
            high_52 = Decimal(str(float(hist_1y['Close'].max())))
            low_52 = Decimal(str(float(hist_1y['Close'].min())))
        name, sector = sym, 'Unknown'
        try:
            info = t.info or {}
            name = (info.get('longName') or info.get('shortName') or sym)[:255]
            sector = (info.get('sector') or 'Unknown')[:100]
        except Exception:  # noqa: BLE001
            pass
        stock = Stock.objects.create(
            symbol=sym,
            name=name,
            sector=sector,
            current_price=last,
            change_percent=chg.quantize(Decimal('0.0001')),
            price_52w_high=high_52,
            price_52w_low=low_52,
            last_price_update=timezone.now(),
            quote_currency=quote_currency_for_db_symbol(sym),
        )
        return stock
    except Exception as exc:  # noqa: BLE001
        logger.warning('yfinance create failed for %s: %s', sym, exc)
        return None


def daily_close_history(symbol: str, days: int = 60) -> list[float]:
    """Recent adjusted daily closes from Yahoo (no synthetic values)."""
    sym = _normalize_db_symbol(symbol)
    if not sym:
        return []
    try:
        t = yf.Ticker(yf_symbol(sym))
        hist = t.history(period=f'{max(int(days), 5)}d', auto_adjust=True)
        if hist.empty:
            return []
        return [float(x) for x in hist['Close'].tolist()]
    except Exception as exc:  # noqa: BLE001
        logger.debug('daily_close_history failed for %s: %s', sym, exc)
        return []


def forecast_payload_from_yfinance_history(symbol: str, model_type: str) -> dict:
    """Last ~10 closes + naive one-step extrapolation from last daily return."""
    closes = daily_close_history(symbol, 60)
    if len(closes) < 2:
        return {
            'model': model_type,
            'source': 'yfinance',
            'predictions': [],
            'predicted_price': None,
            'confidence_interval': {'upper': None, 'lower': None},
            'accuracy_score': None,
            'note': 'Insufficient Yahoo price history for this symbol.',
        }
    predictions = [round(x, 4) for x in closes[-10:]]
    current = closes[-1]
    prev = closes[-2]
    last_ret = (current - prev) / prev if prev else 0.0
    naive_next = current * (1 + last_ret)
    window = closes[-10:]
    hi = max(window)
    lo = min(window)
    return {
        'model': model_type,
        'source': 'yfinance_close_history',
        'predictions': predictions,
        'predicted_price': round(naive_next, 4),
        'confidence_interval': {
            'upper': round(hi * 1.01, 4),
            'lower': round(lo * 0.99, 4),
        },
        'accuracy_score': None,
        'note': 'Naive extrapolation from historical closes only; not a forecast model.',
    }


def sentiment_payload_from_yfinance(symbol: str) -> dict:
    """Analyst consensus fields from Yahoo `info` when present."""
    sym = _normalize_db_symbol(symbol)
    info: dict = {}
    try:
        t = yf.Ticker(yf_symbol(sym))
        info = t.info or {}
    except Exception as exc:  # noqa: BLE001
        logger.debug('sentiment info failed for %s: %s', sym, exc)
    rec_mean = info.get('recommendationMean')
    rec_key = (info.get('recommendationKey') or '').lower()
    n_analyst = info.get('numberOfAnalystOpinions') or 0
    target_mean = info.get('targetMeanPrice')

    analyst_score = None
    if rec_mean is not None:
        try:
            analyst_score = (float(rec_mean) - 1.0) / 4.0 * 100.0
        except (TypeError, ValueError):
            analyst_score = None

    label = 'unavailable'
    if rec_key in ('strong_buy', 'buy'):
        label = 'bullish'
    elif rec_key in ('strong_sell', 'sell'):
        label = 'bearish'
    elif rec_key == 'hold':
        label = 'neutral'
    elif analyst_score is not None:
        label = 'bullish' if analyst_score > 60 else 'bearish' if analyst_score < 40 else 'neutral'

    overall = analyst_score

    return {
        'sentiment_score': round(overall, 1) if overall is not None else None,
        'label': label,
        'breakdown': {
            'news': None,
            'analyst': round(analyst_score, 1) if analyst_score is not None else None,
        },
        'sample_size': int(n_analyst) if n_analyst else 0,
        'source': 'yfinance',
        'recommendation_key': rec_key or None,
        'target_mean_price': float(target_mean) if target_mean is not None else None,
        'note': None
        if analyst_score is not None or rec_key
        else 'No analyst recommendation fields returned by Yahoo for this symbol.',
    }


def refresh_page_if_stale(stocks) -> None:
    """Refresh up to list_max_refresh() symbols that are stale; delay between calls to ease rate limits."""
    delay = list_refresh_delay()
    cap = list_max_refresh()
    done = 0
    for st in stocks:
        if done >= cap:
            break
        if stock_is_stale(st):
            if refresh_stock_price(st, throttle_sleep=delay if done else 0.0):
                done += 1
            elif delay:
                time.sleep(delay)
