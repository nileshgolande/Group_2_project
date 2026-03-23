"""3-model forecasting (linear regression, ARIMA, LSTM) on daily close series.

Returns forecast series + predicted end price + MAPE/RMSE + simple confidence intervals.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from django.utils.dateparse import parse_datetime
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.arima.model import ARIMA

import tensorflow as tf

from .market_data import yf_symbol


def mape_percent(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    denom = np.clip(np.abs(y_true), 1e-12, None)
    return float(np.mean(np.abs((y_true - y_pred) / denom))) * 100.0


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def _fetch_close_series(symbol: str) -> tuple[np.ndarray, list[str]]:
    import yfinance as yf

    t = yf.Ticker(yf_symbol(symbol))
    df = t.history(period='3y', interval='1d', auto_adjust=True)
    if df.empty:
        return np.array([]), []
    close = df['Close'].astype(float).values
    # Plotly wants strings or datetimes; keep as ISO date strings.
    x = [str(idx.date()) for idx in df.index]
    return close, x


def _forecast_linear(closes: np.ndarray, days: int, test_len: int) -> dict[str, Any]:
    # Work in log space for stability.
    y = np.log(np.clip(closes, 1e-9, None)).astype(float)
    n = len(y)

    test_len = min(test_len, max(5, n // 5))
    train_end = n - test_len
    x_train = np.arange(train_end).reshape(-1, 1)
    y_train = y[:train_end]

    model = LinearRegression()
    model.fit(x_train, y_train)

    # Backtest metrics: predict the next test_len points using the same linear trend.
    x_test = np.arange(train_end, n).reshape(-1, 1)
    yhat_test = model.predict(x_test)
    yhat_test_price = np.exp(yhat_test)
    y_test_price = np.exp(y[train_end:])
    mape = mape_percent(y_test_price, yhat_test_price)
    _rmse = rmse(y_test_price, yhat_test_price)

    # Confidence: residual std on log scale for test segment.
    resid = (y[train_end:] - yhat_test)
    resid_std = float(np.std(resid)) if resid.size else 0.0
    ci = 1.96 * resid_std

    # Final forecast from full series.
    x_full = np.arange(n).reshape(-1, 1)
    model_full = LinearRegression()
    model_full.fit(x_full, y)
    x_future = np.arange(n, n + days).reshape(-1, 1)
    yhat_future = model_full.predict(x_future)
    yhat_future_price = np.exp(yhat_future)

    upper_price = np.exp(yhat_future + ci)
    lower_price = np.exp(yhat_future - ci)

    return {
        'model': 'linear',
        'predicted_price': float(yhat_future_price[-1]),
        'confidence_upper': float(upper_price[-1]),
        'confidence_lower': float(lower_price[-1]),
        'rmse': _rmse,
        'mape': mape,
        'forecast_series': [float(x) for x in yhat_future_price],
        'confidence_upper_series': [float(x) for x in upper_price],
        'confidence_lower_series': [float(x) for x in lower_price],
    }


def _select_arima_order(y: np.ndarray) -> tuple[int, int, int]:
    # Very small grid search to keep runtime bounded.
    best = None
    for p in (1, 2, 3):
        for d in (0, 1):
            for q in (0, 1, 2):
                try:
                    m = ARIMA(y, order=(p, d, q))
                    r = m.fit()
                    aic = float(r.aic)
                    if best is None or aic < best[0]:
                        best = (aic, (p, d, q))
                except Exception:
                    continue
    if best is None:
        return (2, 1, 2)
    return best[1]


def _forecast_arima(closes: np.ndarray, days: int, test_len: int) -> dict[str, Any]:
    y = np.log(np.clip(closes, 1e-9, None)).astype(float)
    n = len(y)
    test_len = min(test_len, max(5, n // 5))
    train_end = n - test_len

    order = _select_arima_order(y[:train_end])

    # Backtest metrics
    try:
        model_bt = ARIMA(y[:train_end], order=order)
        res_bt = model_bt.fit()
        fc_bt = res_bt.get_forecast(steps=test_len)
        yhat_test = fc_bt.predicted_mean
        ci_bt = fc_bt.conf_int()
        _ = ci_bt  # not used in metrics
    except Exception:
        # Fallback: use last value persistence
        yhat_test = np.repeat(y[train_end - 1], test_len)

    yhat_test_price = np.exp(np.asarray(yhat_test, dtype=float))
    y_test_price = np.exp(y[train_end:])
    mape = mape_percent(y_test_price, yhat_test_price)
    _rmse = rmse(y_test_price, yhat_test_price)

    # Final forecast from full series
    model_full = ARIMA(y, order=order)
    res_full = model_full.fit()
    fc = res_full.get_forecast(steps=days)
    yhat_future_log = np.asarray(fc.predicted_mean, dtype=float)
    ci = fc.conf_int()
    # ci columns depend on statsmodels version; take first two.
    ci_low = np.asarray(ci.iloc[:, 0], dtype=float)
    ci_high = np.asarray(ci.iloc[:, 1], dtype=float)

    yhat_future_price = np.exp(yhat_future_log)
    upper_price = np.exp(ci_high)
    lower_price = np.exp(ci_low)

    return {
        'model': 'arima',
        'predicted_price': float(yhat_future_price[-1]),
        'confidence_upper': float(upper_price[-1]),
        'confidence_lower': float(lower_price[-1]),
        'rmse': _rmse,
        'mape': mape,
        'forecast_series': [float(x) for x in yhat_future_price],
        'confidence_upper_series': [float(x) for x in upper_price],
        'confidence_lower_series': [float(x) for x in lower_price],
    }


def _make_lstm_model(seq_len: int) -> tf.keras.Model:
    return tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(seq_len, 1)),
            tf.keras.layers.LSTM(48, return_sequences=False),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(1),
        ]
    )


def _iterative_predict_lstm(model: tf.keras.Model, scaler: MinMaxScaler, seq: np.ndarray, steps: int) -> np.ndarray:
    """Predict next `steps` values iteratively given the last `seq_len` values."""
    cur = seq.copy()
    preds_scaled: list[float] = []
    for _ in range(steps):
        x = cur.reshape(1, cur.shape[0], 1)
        yhat_scaled = float(model.predict(x, verbose=0)[0, 0])
        preds_scaled.append(yhat_scaled)
        # append to sequence
        cur = np.concatenate([cur[1:], np.array([yhat_scaled])], axis=0)
    preds_scaled_arr = np.array(preds_scaled, dtype=float).reshape(-1, 1)
    preds = scaler.inverse_transform(preds_scaled_arr).reshape(-1)
    return preds


def _forecast_lstm(closes: np.ndarray, days: int, test_len: int) -> dict[str, Any]:
    # LSTM is expensive; keep it small.
    y_price = np.asarray(closes, dtype=float)
    y_log = np.log(np.clip(y_price, 1e-9, None))
    n = len(y_log)

    seq_len = 60
    if n < seq_len + 10:
        # Not enough data for seq model.
        yhat_future = np.repeat(y_price[-1], days)
        return {
            'model': 'lstm',
            'predicted_price': float(yhat_future[-1]),
            'confidence_upper': float(yhat_future[-1]),
            'confidence_lower': float(yhat_future[-1]),
            'rmse': None,
            'mape': None,
            'forecast_series': [float(x) for x in yhat_future],
            'confidence_upper_series': [float(x) for x in yhat_future],
            'confidence_lower_series': [float(x) for x in yhat_future],
        }

    test_len = min(test_len, max(5, n // 5))
    train_end = n - test_len

    scaler = MinMaxScaler(feature_range=(0, 1))
    y_train_log = y_log[:train_end].reshape(-1, 1)
    scaler.fit(y_train_log)

    # Prepare sequences from train only for backtest metrics.
    def make_sequences(y_scaled: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        X: list[np.ndarray] = []
        Y: list[float] = []
        for i in range(seq_len, len(y_scaled)):
            X.append(y_scaled[i - seq_len : i])
            Y.append(y_scaled[i])
        return np.array(X, dtype=float), np.array(Y, dtype=float)

    y_train_scaled = scaler.transform(y_log[:train_end].reshape(-1, 1))
    X_train, Y_train = make_sequences(y_train_scaled)

    tf.keras.utils.set_random_seed(42)
    model = _make_lstm_model(seq_len)
    model.compile(optimizer='adam', loss='mse')

    # Backtest training epochs kept low for bounded runtime.
    model.fit(X_train, Y_train, epochs=4, batch_size=32, validation_split=0.1, verbose=0)

    # Backtest predictions: use last seq_len from train, then iterative for test_len.
    last_seq_scaled = y_log[train_end - seq_len : train_end]
    # scale last_seq using the train scaler:
    last_seq_scaled = scaler.transform(last_seq_scaled.reshape(-1, 1)).reshape(-1)
    preds_test_log = _iterative_predict_lstm(model, scaler, last_seq_scaled, test_len)
    preds_test_price = np.exp(preds_test_log)
    y_test_price = y_price[train_end:]
    _mape = mape_percent(y_test_price, preds_test_price)
    _rmse = rmse(y_test_price, preds_test_price)

    resid = np.log(np.clip(y_test_price, 1e-9, None)) - np.log(np.clip(preds_test_price, 1e-9, None))
    resid_std = float(np.std(resid)) if resid.size else 0.0
    ci = 1.96 * resid_std

    # Final forecast from full data: train on all available points quickly.
    y_log_full = y_log.reshape(-1, 1)
    scaler_full = MinMaxScaler(feature_range=(0, 1))
    scaler_full.fit(y_log_full)
    y_full_scaled = scaler_full.transform(y_log_full).reshape(-1)
    # Build sequences on full:
    X_full, Y_full = make_sequences(scaler_full.transform(y_log_full))
    model_full = _make_lstm_model(seq_len)
    model_full.compile(optimizer='adam', loss='mse')
    model_full.fit(X_full, Y_full, epochs=3, batch_size=32, validation_split=0.05, verbose=0)

    seq_scaled_full = y_log_full[-seq_len:].reshape(-1, 1)
    seq_scaled_full = scaler_full.transform(seq_scaled_full).reshape(-1)
    preds_future_log = _iterative_predict_lstm(model_full, scaler_full, seq_scaled_full, days)
    preds_future_price = np.exp(preds_future_log)
    upper_price = np.exp(preds_future_log + ci)
    lower_price = np.exp(preds_future_log - ci)

    return {
        'model': 'lstm',
        'predicted_price': float(preds_future_price[-1]),
        'confidence_upper': float(upper_price[-1]),
        'confidence_lower': float(lower_price[-1]),
        'rmse': _rmse,
        'mape': _mape,
        'forecast_series': [float(x) for x in preds_future_price],
        'confidence_upper_series': [float(x) for x in upper_price],
        'confidence_lower_series': [float(x) for x in lower_price],
    }


def forecast_three_models(symbol: str, *, days: int = 7) -> dict[str, Any]:
    closes, x = _fetch_close_series(symbol)
    if closes.size < 250:
        raise RuntimeError(f'Not enough Yahoo history for {symbol}')

    # Backtest on roughly last 60 trading days, bounded.
    test_len = min(60, max(20, len(closes) // 10))

    out = {}
    out['linear'] = _forecast_linear(closes, days, test_len)
    out['arima'] = _forecast_arima(closes, days, test_len)
    out['lstm'] = _forecast_lstm(closes, days, test_len)

    best = min(
        ('linear', out['linear']),
        ('arima', out['arima']),
        ('lstm', out['lstm']),
        key=lambda kv: float('inf') if kv[1].get('rmse') is None else float(kv[1]['rmse']),
    )[0]

    return {
        'symbol': symbol.upper().strip(),
        'days': days,
        'best_model': best,
        'models': out,
    }

