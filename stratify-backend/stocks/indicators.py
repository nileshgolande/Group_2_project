"""Pure technical-indicator calculations on daily OHLC/close series."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd


def _as_series(values) -> pd.Series:
    if isinstance(values, pd.Series):
        return values
    return pd.Series(values)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index (Wilder's smoothing approximation)."""
    c = close.astype(float)
    delta = c.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)

    # Wilder smoothing: EWMA with alpha=1/period
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def ema(series: pd.Series, span: int) -> pd.Series:
    return series.astype(float).ewm(span=span, adjust=False).mean()


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict[str, pd.Series]:
    c = close.astype(float)
    macd_line = ema(c, fast) - ema(c, slow)
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return {'macd_line': macd_line, 'signal_line': signal_line, 'histogram': histogram}


def moving_averages(close: pd.Series, windows=(20, 50, 200)) -> dict[int, pd.Series]:
    out: dict[int, pd.Series] = {}
    for w in windows:
        out[int(w)] = close.astype(float).rolling(window=w, min_periods=w).mean()
    return out


def bollinger_bands(close: pd.Series, window: int = 20, num_std: float = 2.0) -> dict[str, pd.Series]:
    c = close.astype(float)
    mid = c.rolling(window=window, min_periods=window).mean()
    sd = c.rolling(window=window, min_periods=window).std(ddof=0)
    upper = mid + num_std * sd
    lower = mid - num_std * sd
    width = (upper - lower) / mid * 100.0
    return {'middle': mid, 'upper': upper, 'lower': lower, 'width': width}


def interpret_trend(close: pd.Series) -> str:
    ma = moving_averages(close)
    ma20 = ma.get(20)
    ma50 = ma.get(50)
    if ma20 is None or ma50 is None or ma20.dropna().empty or ma50.dropna().empty:
        return 'neutral'
    last20 = float(ma20.dropna().iloc[-1])
    last50 = float(ma50.dropna().iloc[-1])
    if last20 > last50:
        return 'uptrend'
    if last20 < last50:
        return 'downtrend'
    return 'neutral'


def interpret_bollinger(close: pd.Series) -> dict[str, Any]:
    bb = bollinger_bands(close)
    w = bb['width'].dropna()
    if w.empty:
        return {'width_pct': None, 'volatility': 'unavailable'}
    last_w = float(w.iloc[-1])
    if last_w > 10:
        v = 'high'
    elif last_w < 5:
        v = 'low'
    else:
        v = 'medium'
    return {'width_pct': round(last_w, 2), 'volatility': v}


def build_technical_payload(close: pd.Series) -> dict[str, Any]:
    close = close.astype(float)

    r = rsi(close)
    m = macd(close)
    mas = moving_averages(close)
    bb = bollinger_bands(close)

    trend = interpret_trend(close)
    bb_info = interpret_bollinger(close)

    # Latest values only (frontend can render charts separately if needed).
    r_last = r.dropna()
    rsi_val = round(float(r_last.iloc[-1]), 2) if not r_last.empty else None

    hist = m['histogram'].dropna()
    macd_val = round(float(m['macd_line'].dropna().iloc[-1]), 6) if not m['macd_line'].dropna().empty else None
    signal_val = (
        round(float(m['signal_line'].dropna().iloc[-1]), 6) if not m['signal_line'].dropna().empty else None
    )
    hist_val = round(float(hist.iloc[-1]), 6) if not hist.empty else None

    def last_ma(w: int):
        s = mas[w].dropna()
        return round(float(s.iloc[-1]), 6) if not s.empty else None

    boll_upper = round(float(bb['upper'].dropna().iloc[-1]), 6) if not bb['upper'].dropna().empty else None
    boll_lower = round(float(bb['lower'].dropna().iloc[-1]), 6) if not bb['lower'].dropna().empty else None
    boll_width = round(float(bb['width'].dropna().iloc[-1]), 2) if not bb['width'].dropna().empty else None

    analysis = {
        'rsi_signal': 'overbought' if rsi_val is not None and rsi_val >= 70 else 'oversold' if rsi_val is not None and rsi_val <= 30 else 'neutral',
        'trend': trend,
        'bollinger': bb_info.get('volatility', 'unavailable'),
    }

    return {
        'rsi': rsi_val,
        'macd': {
            'macd_line': macd_val,
            'signal_line': signal_val,
            'histogram': hist_val,
        },
        'moving_averages': {
            'ma20': last_ma(20),
            'ma50': last_ma(50),
            'ma200': last_ma(200),
        },
        'bollinger_bands': {
            'upper': boll_upper,
            'lower': boll_lower,
            'width_pct': boll_width,
        },
        'analysis': analysis,
    }

