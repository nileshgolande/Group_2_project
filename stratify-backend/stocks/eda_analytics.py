"""
Exploratory analytics on Yahoo history (ported from Bizmetric eda/services.py).
"""
from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import yfinance as yf
from django.core.cache import cache

from .market_data import yf_symbol

logger = logging.getLogger(__name__)

EDA_CACHE_TTL_SECONDS = 600


def analyze_stock_eda(symbol: str) -> dict:
    sym = (symbol or '').strip().upper()
    if not sym:
        return {}

    cache_key = f'eda_analysis:{sym}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(yf_symbol(sym))
        df = t.history(period='1y')
    except Exception as exc:  # noqa: BLE001
        logger.debug('eda yfinance failed %s: %s', sym, exc)
        return {}

    if df.empty:
        return {}

    trend_df = df[['Close']].copy().reset_index()
    date_col = trend_df.columns[0]
    trend_df[date_col] = pd.to_datetime(trend_df[date_col], errors='coerce').dt.strftime('%Y-%m-%d')
    trend_df = trend_df.dropna(subset=[date_col, 'Close'])

    max_trend_points = 90
    if len(trend_df) > max_trend_points:
        step = int(np.ceil(len(trend_df) / max_trend_points))
        sampled = trend_df.iloc[::step].copy()
        trend_df = pd.concat([sampled, trend_df.tail(1)], ignore_index=True)
        trend_df = trend_df.drop_duplicates(subset=[date_col], keep='last')

    trend_df = trend_df.sort_values(by=date_col)
    trend_graph = [
        {'date': row[date_col], 'close': round(float(row['Close']), 2)} for _, row in trend_df.iterrows()
    ]

    df = df.copy()
    df['Daily_Return'] = df['Close'].pct_change()
    current_price = float(df['Close'].iloc[-1])

    def period_return(days_back: int):
        if len(df) > days_back:
            past_price = float(df['Close'].iloc[-(days_back + 1)])
            return (current_price - past_price) / past_price
        return None

    return_3m = period_return(63)
    return_6m = period_return(126)
    return_1y = (current_price - float(df['Close'].iloc[0])) / float(df['Close'].iloc[0])

    volatility_30d = df['Daily_Return'].tail(30).std() * np.sqrt(252)
    best_daily_return = df['Daily_Return'].max()
    worst_daily_return = df['Daily_Return'].min()

    rolling_peak = df['Close'].cummax()
    drawdown = (df['Close'] - rolling_peak) / rolling_peak
    max_drawdown = float(drawdown.min()) if len(drawdown) else None
    max_drawdown_date = None
    if max_drawdown is not None and np.isfinite(max_drawdown):
        max_drawdown_date = drawdown.idxmin().strftime('%Y-%m-%d')

    try:
        info = t.info or {}
    except Exception:  # noqa: BLE001
        info = {}
    market_cap = info.get('marketCap') or 0
    try:
        market_cap = int(market_cap) if market_cap else 0
    except (TypeError, ValueError):
        market_cap = 0

    if market_cap >= 200_000_000_000:
        cap_category = 'Mega Cap'
    elif market_cap >= 10_000_000_000:
        cap_category = 'Large Cap'
    elif market_cap >= 2_000_000_000:
        cap_category = 'Mid Cap'
    elif market_cap >= 300_000_000:
        cap_category = 'Small Cap'
    elif market_cap > 0:
        cap_category = 'Micro/Nano Cap'
    else:
        cap_category = 'Unknown'

    results = {
        'symbol': sym,
        'current_price': round(current_price, 2),
        'returns_percentage': {
            '3_month': round(return_3m * 100, 2) if return_3m is not None else None,
            '6_month': round(return_6m * 100, 2) if return_6m is not None else None,
            '1_year': round(return_1y * 100, 2),
        },
        'volatility_30d_percentage': round(float(volatility_30d) * 100, 2)
        if pd.notnull(volatility_30d)
        else None,
        'daily_returns_percentage': {
            'best': round(float(best_daily_return) * 100, 2) if pd.notnull(best_daily_return) else None,
            'worst': round(float(worst_daily_return) * 100, 2) if pd.notnull(worst_daily_return) else None,
        },
        'maximum_drawdown': {
            'percentage': round(max_drawdown * 100, 2) if max_drawdown is not None else None,
            'date': max_drawdown_date,
        },
        'market_capitalization': {'value': market_cap, 'category': cap_category},
        'trend_graph': trend_graph,
        'source': 'yfinance_eda',
    }

    cache.set(cache_key, results, EDA_CACHE_TTL_SECONDS)
    return results
