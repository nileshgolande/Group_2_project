"""
Bizmetric-style LR + PyTorch LSTM/CNN prediction series (daily stock / hourly commodities).
Adapted from github.com/nileshgolande/Nilesh_Bizmetric_project_stock_evaluation.
PyTorch is optional: without it, only linear-regression curves are returned.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from django.conf import settings
from django.core.cache import cache
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler

from .market_data import yf_symbol

logger = logging.getLogger(__name__)

COMMODITY_TICKERS = {'gold': 'GC=F', 'silver': 'SI=F', 'btc': 'BTC-USD'}

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim

    TORCH_AVAILABLE = True
except Exception:  # noqa: BLE001
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]
    optim = None  # type: ignore[assignment]
    TORCH_AVAILABLE = False


def _torch_epochs_stock() -> int:
    return int(getattr(settings, 'BIZMETRIC_TORCH_EPOCHS_STOCK', 12))


def _torch_epochs_commodity() -> int:
    return int(getattr(settings, 'BIZMETRIC_TORCH_EPOCHS_COMMODITY', 8))


if TORCH_AVAILABLE:

    class LSTMModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(1, 64, num_layers=2, batch_first=True, dropout=0.2)
            self.fc = nn.Linear(64, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.fc(out[:, -1, :])

    class CNNModel(nn.Module):
        def __init__(self, seq_length: int = 60):
            super().__init__()
            self.seq_length = seq_length
            self.conv1 = nn.Conv1d(1, 64, kernel_size=3, padding=1)
            self.conv2 = nn.Conv1d(64, 32, kernel_size=3, padding=1)
            self.relu = nn.ReLU()
            self.pool = nn.MaxPool1d(kernel_size=2)
            self.flatten = nn.Flatten()
            flat_dim = 32 * (seq_length // 2)
            self.fc1 = nn.Linear(flat_dim, 50)
            self.fc2 = nn.Linear(50, 1)

        def forward(self, x):
            x = x.permute(0, 2, 1)
            x = self.relu(self.conv1(x))
            x = self.pool(self.relu(self.conv2(x)))
            x = self.flatten(x)
            x = self.relu(self.fc1(x))
            return self.fc2(x)


def _train_torch_model(model, X_train, y_train, epochs: int, batch_size: int = 32):
    if not TORCH_AVAILABLE or model is None:
        return None
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    X_tensor = torch.tensor(X_train, dtype=torch.float32)
    y_tensor = torch.tensor(y_train, dtype=torch.float32).view(-1, 1)
    dataset = torch.utils.data.TensorDataset(X_tensor, y_tensor)
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
    model.train()
    for _ in range(epochs):
        for batch_X, batch_y in loader:
            optimizer.zero_grad()
            loss = criterion(model(batch_X), batch_y)
            loss.backward()
            optimizer.step()
    return model


def _predict_torch(model, X: np.ndarray) -> np.ndarray | None:
    if not TORCH_AVAILABLE or model is None:
        return None
    model.eval()
    with torch.no_grad():
        X_tensor = torch.tensor(X, dtype=torch.float32)
        return model(X_tensor).numpy()


def _predict_future_torch(model, last_sequence: np.ndarray, steps: list[int], scaler: MinMaxScaler, seq_length: int):
    if not TORCH_AVAILABLE or model is None:
        return [None] * len(steps)
    model.eval()
    predictions: list[float] = []
    curr = last_sequence.reshape(-1).copy()
    with torch.no_grad():
        for _ in range(max(steps)):
            X_tensor = torch.tensor(curr.reshape(1, seq_length, 1), dtype=torch.float32)
            pred = model(X_tensor).numpy()[0, 0]
            predictions.append(float(pred))
            curr = np.append(curr[1:], pred)
    arr = np.array([predictions[s - 1] for s in steps]).reshape(-1, 1)
    return scaler.inverse_transform(arr).flatten().tolist()


def get_stock_prediction_series(symbol: str, days: int = 7) -> tuple[list[dict[str, Any]] | None, str | None]:
    """
    Daily stock series: actual close + in-sample LR / LSTM / CNN + future horizon.
    """
    sym = (symbol or '').strip().upper()
    if not sym:
        return None, 'Symbol required'
    days = max(1, min(int(days), 30))

    cache_key = f'bizmetric_stock_series:{sym}:{days}'
    hit = cache.get(cache_key)
    if hit is not None:
        return hit, None

    try:
        t = yf.Ticker(yf_symbol(sym))
        df = t.history(period='1y', interval='1d', auto_adjust=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning('bizmetric stock fetch %s: %s', sym, exc)
        return None, str(exc)

    if df.empty or 'Close' not in df.columns:
        return None, 'No data for symbol'

    prices = df['Close'].astype(float).values
    dates = df.index
    if len(prices) < 60:
        return None, 'Need at least 60 trading days'

    seq_length = 60
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(prices.reshape(-1, 1)).flatten()

    X_list, y_list = [], []
    for i in range(seq_length, len(scaled)):
        X_list.append(scaled[i - seq_length : i])
        y_list.append(scaled[i])
    X = np.array(X_list).reshape(-1, seq_length, 1)
    y = np.array(y_list)

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    lr = LinearRegression()
    lr.fit(X_train.reshape(X_train.shape[0], -1), y_train)
    lr_train = lr.predict(X_train.reshape(X_train.shape[0], -1))
    lr_test = lr.predict(X_test.reshape(X_test.shape[0], -1))
    lr_all_scaled = np.concatenate([lr_train, lr_test])

    lstm_model = cnn_model = None
    lstm_all = cnn_all = None
    if TORCH_AVAILABLE:
        try:
            lstm_model = _train_torch_model(LSTMModel(), X_train, y_train, _torch_epochs_stock())
            cnn_model = _train_torch_model(CNNModel(seq_length), X_train, y_train, _torch_epochs_stock())
            if lstm_model is not None:
                lstm_all = _predict_torch(lstm_model, X)
            if cnn_model is not None:
                cnn_all = _predict_torch(cnn_model, X)
        except Exception as exc:  # noqa: BLE001
            logger.warning('bizmetric torch stock %s: %s', sym, exc)
            lstm_model = cnn_model = None
            lstm_all = cnn_all = None

    lr_price = scaler.inverse_transform(lr_all_scaled.reshape(-1, 1)).flatten()
    lstm_price = (
        scaler.inverse_transform(lstm_all.reshape(-1, 1)).flatten().tolist()
        if lstm_all is not None
        else None
    )
    cnn_price = (
        scaler.inverse_transform(cnn_all.reshape(-1, 1)).flatten().tolist()
        if cnn_all is not None
        else None
    )

    future_steps = list(range(1, days + 1))
    last_seq = scaled[-seq_length:].reshape(seq_length, 1)

    future_lr_scaled = []
    lr_seq = last_seq.copy().flatten()
    for _ in future_steps:
        nxt = lr.predict(lr_seq.reshape(1, -1))[0]
        future_lr_scaled.append(float(nxt))
        lr_seq = np.append(lr_seq[1:], nxt)
    future_lr = scaler.inverse_transform(np.array(future_lr_scaled).reshape(-1, 1)).flatten().tolist()

    future_lstm = (
        _predict_future_torch(lstm_model, last_seq, future_steps, scaler, seq_length)
        if lstm_model is not None
        else [None] * days
    )
    future_cnn = (
        _predict_future_torch(cnn_model, last_seq, future_steps, scaler, seq_length)
        if cnn_model is not None
        else [None] * days
    )

    dates_str = [d.strftime('%Y-%m-%d') for d in dates]
    results: list[dict[str, Any]] = []

    for i in range(seq_length, len(prices)):
        idx = i - seq_length
        results.append(
            {
                'date': dates_str[i],
                'actual_price': float(prices[i]),
                'lr_prediction': float(lr_price[idx]),
                'rnn_prediction': float(lstm_price[idx]) if lstm_price is not None and idx < len(lstm_price) else None,
                'cnn_prediction': float(cnn_price[idx]) if cnn_price is not None and idx < len(cnn_price) else None,
                'is_future': False,
            }
        )

    last_date = dates[-1]
    for i, step in enumerate(future_steps):
        results.append(
            {
                'date': (last_date + pd.Timedelta(days=step)).strftime('%Y-%m-%d'),
                'label': f'Day +{step}',
                'actual_price': None,
                'lr_prediction': float(future_lr[i]),
                'rnn_prediction': float(future_lstm[i]) if future_lstm[i] is not None else None,
                'cnn_prediction': float(future_cnn[i]) if future_cnn[i] is not None else None,
                'is_future': True,
            }
        )

    ttl = int(getattr(settings, 'BIZMETRIC_SERIES_CACHE_SECONDS', 3600))
    cache.set(cache_key, results, ttl)
    return results, None


def get_commodity_prediction_series(asset_key: str) -> tuple[list[dict[str, Any]] | None, str | None]:
    """
    Gold / Silver / BTC: hourly when available, else daily; same chart schema as Bizmetric frontend.
    """
    key = (asset_key or '').strip().lower()
    ticker = COMMODITY_TICKERS.get(key)
    if not ticker:
        return None, f'Invalid asset. Use one of: {", ".join(COMMODITY_TICKERS)}'

    cache_key = f'bizmetric_commodity:{key}'
    hit = cache.get(cache_key)
    if hit is not None:
        return hit, None

    try:
        t = yf.Ticker(ticker)
        df = t.history(period='1mo', interval='1h')
        if df.empty:
            df = t.history(period='1y')
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)

    if df.empty or 'Close' not in df.columns:
        return None, 'No commodity data'

    df = df.reset_index()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    prices = df['Close'].astype(float).values.flatten()
    date_col = 'Datetime' if 'Datetime' in df.columns else ('Date' if 'Date' in df.columns else df.columns[0])
    dates = df[date_col]

    dates_str = pd.to_datetime(dates).dt.strftime('%Y-%m-%dT%H:%M:%S').values

    X_lr = np.arange(len(prices)).reshape(-1, 1)
    lr_model = LinearRegression().fit(X_lr, prices)
    lr_preds = lr_model.predict(X_lr)

    future_steps = list(range(1, 49))
    last_idx = len(prices) - 1
    future_lr = lr_model.predict(np.array([last_idx + s for s in future_steps]).reshape(-1, 1))

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_col = scaler.fit_transform(prices.reshape(-1, 1))
    sp = scaled_col.flatten()
    seq_length = 60
    if len(sp) <= seq_length:
        seq_length = min(10, len(sp) - 1)
        if seq_length < 2:
            return None, 'Not enough data'

    X_dl, y_dl = [], []
    for i in range(len(sp) - seq_length):
        X_dl.append(sp[i : i + seq_length].reshape(seq_length, 1))
        y_dl.append(sp[i + seq_length])
    X_dl, y_dl = np.array(X_dl), np.array(y_dl)

    lstm_preds = cnn_preds = None
    future_rnn = future_cnn = [None] * len(future_steps)
    last_seq = sp[-seq_length:].reshape(seq_length, 1)

    if TORCH_AVAILABLE and len(X_dl) >= 8:
        try:
            lstm_m = _train_torch_model(LSTMModel(), X_dl, y_dl, _torch_epochs_commodity())
            cnn_m = _train_torch_model(CNNModel(seq_length=seq_length), X_dl, y_dl, _torch_epochs_commodity())
            if lstm_m is not None:
                p = _predict_torch(lstm_m, X_dl)
                if p is not None:
                    lstm_preds = scaler.inverse_transform(p.reshape(-1, 1)).flatten()
                future_rnn = _predict_future_torch(lstm_m, last_seq, future_steps, scaler, seq_length)
            if cnn_m is not None:
                p = _predict_torch(cnn_m, X_dl)
                if p is not None:
                    cnn_preds = scaler.inverse_transform(p.reshape(-1, 1)).flatten()
                future_cnn = _predict_future_torch(cnn_m, last_seq, future_steps, scaler, seq_length)
        except Exception as exc:  # noqa: BLE001
            logger.warning('bizmetric torch commodity %s: %s', key, exc)

    results: list[dict[str, Any]] = []
    for i in range(len(dates_str)):
        res: dict[str, Any] = {
            'date': str(dates_str[i]),
            'actual_price': float(prices[i]),
            'lr_prediction': float(lr_preds[i]),
            'rnn_prediction': None,
            'cnn_prediction': None,
            'is_future': False,
        }
        dl_idx = i - seq_length
        if lstm_preds is not None and 0 <= dl_idx < len(lstm_preds):
            res['rnn_prediction'] = float(lstm_preds[dl_idx])
        if cnn_preds is not None and 0 <= dl_idx < len(cnn_preds):
            res['cnn_prediction'] = float(cnn_preds[dl_idx])
        results.append(res)

    last_ts = pd.to_datetime(dates.iloc[-1] if hasattr(dates, 'iloc') else dates[-1])
    labels = {1: 'Next 1 Hour', 7: 'Next 7 Hours', 24: 'Next 1 Day', 48: 'Next 2 Days'}
    for i, step in enumerate(future_steps):
        results.append(
            {
                'date': (last_ts + pd.Timedelta(hours=step)).strftime('%Y-%m-%dT%H:%M:%S'),
                'label': labels.get(step),
                'actual_price': None,
                'lr_prediction': float(future_lr[i]),
                'rnn_prediction': float(future_rnn[i]) if future_rnn[i] is not None else None,
                'cnn_prediction': float(future_cnn[i]) if future_cnn[i] is not None else None,
                'is_future': True,
            }
        )

    ttl = int(getattr(settings, 'BIZMETRIC_COMMODITY_CACHE_SECONDS', 600))
    cache.set(cache_key, results, ttl)
    return results, None


def torch_enabled() -> bool:
    return TORCH_AVAILABLE
