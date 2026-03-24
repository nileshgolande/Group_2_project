import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PredictionSeriesChart, type PredictionRow } from '../../components/Charts/PredictionSeriesChart';
import { Card } from '../../components/Common/Card';
import { Skeleton } from '../../components/Common/Skeleton';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';

interface EdaPayload {
  symbol: string;
  current_price: number;
  returns_percentage: { '3_month': number | null; '6_month': number | null; '1_year': number };
  volatility_30d_percentage: number | null;
  daily_returns_percentage: { best: number | null; worst: number | null };
  maximum_drawdown: { percentage: number | null; date: string | null };
  market_capitalization: { value: number; category: string };
  trend_graph: { date: string; close: number }[];
}

export function AnalyticsTab({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [eda, setEda] = useState<EdaPayload | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await apiClient.get<{ data?: EdaPayload }>(API_ENDPOINTS.ml.analytics(symbol));
        if (c) return;
        setEda(data?.data ?? null);
      } catch {
        if (!c) setErr('Could not load EDA analytics.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }
  if (err || !eda) {
    return (
      <Card>
        <p className="text-sm text-gray dark:text-gray">{err ?? 'No analytics.'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-navy dark:text-white">Risk &amp; returns (1Y)</h2>
        <p className="mt-1 text-xs text-gray dark:text-gray">From Yahoo history — same idea as Bizmetric EDA.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: '3M return', v: eda.returns_percentage['3_month'], suffix: '%' },
            { k: '6M return', v: eda.returns_percentage['6_month'], suffix: '%' },
            { k: '1Y return', v: eda.returns_percentage['1_year'], suffix: '%' },
            { k: '30d vol (ann.)', v: eda.volatility_30d_percentage, suffix: '%' },
            { k: 'Max drawdown', v: eda.maximum_drawdown.percentage, suffix: '%' },
            { k: 'Cap category', v: eda.market_capitalization.category, suffix: '' },
          ].map((row) => (
            <div
              key={row.k}
              className="rounded-lg border border-navy/10 bg-navy/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <p className="text-xs text-gray dark:text-gray">{row.k}</p>
              <p className="font-semibold tabular-nums text-navy dark:text-white">
                {row.v == null ? '—' : `${row.v}${row.suffix}`}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-navy dark:text-white">Price trend (sampled)</h2>
        <div className="mt-4 h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eda.trend_graph} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-navy/10 dark:stroke-white/10" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="close" name="Close" stroke="#0d9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

interface TechnicalPayload {
  rsi: number | null;
  macd: { macd_line: number | null; signal_line: number | null; histogram: number | null };
  moving_averages: { ma20: number | null; ma50: number | null; ma200: number | null };
  bollinger_bands: { upper: number | null; lower: number | null; width_pct: number | null };
  analysis: { rsi_signal: string; trend: string; bollinger: string };
}

export function TechnicalTab({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [p, setP] = useState<TechnicalPayload | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await apiClient.get<{ data?: TechnicalPayload }>(
          API_ENDPOINTS.stocks.technical(symbol)
        );
        if (c) return;
        setP(data?.data ?? null);
      } catch {
        if (!c) setErr('Could not load technical indicators.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }
  if (err || !p) {
    return (
      <Card>
        <p className="text-sm text-gray dark:text-gray">{err ?? 'No data.'}</p>
      </Card>
    );
  }

  const rows = [
    { label: 'RSI (14)', value: p.rsi != null ? p.rsi.toFixed(2) : '—', hint: p.analysis.rsi_signal },
    { label: 'MACD', value: p.macd.macd_line != null ? p.macd.macd_line.toFixed(4) : '—', hint: '' },
    { label: 'Signal', value: p.macd.signal_line != null ? p.macd.signal_line.toFixed(4) : '—', hint: '' },
    { label: 'Histogram', value: p.macd.histogram != null ? p.macd.histogram.toFixed(4) : '—', hint: '' },
    { label: 'MA20 / MA50 / MA200', value: [p.moving_averages.ma20, p.moving_averages.ma50, p.moving_averages.ma200].map((x) => (x != null ? x.toFixed(2) : '—')).join(' / '), hint: p.analysis.trend },
    { label: 'Bollinger width %', value: p.bollinger_bands.width_pct != null ? String(p.bollinger_bands.width_pct) : '—', hint: p.analysis.bollinger },
  ];

  return (
    <Card>
      <h2 className="text-base font-semibold text-navy dark:text-white">Technical snapshot</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex flex-col gap-0.5 border-b border-navy/5 pb-3 last:border-0 dark:border-white/10"
          >
            <span className="text-xs font-medium text-gray dark:text-gray">{r.label}</span>
            <span className="font-mono text-sm text-navy dark:text-white">{r.value}</span>
            {r.hint ? <span className="text-xs text-emerald dark:text-emerald">{r.hint}</span> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ForecastTab({ symbol, currency }: { symbol: string; currency: string }) {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<PredictionRow[]>([]);
  const [forecastNote, setForecastNote] = useState<string | null>(null);
  const [best, setBest] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [fcRes, mlRes] = await Promise.all([
          apiClient.get<{ data?: { best_model?: string; models?: Record<string, { rmse?: number }> } }>(
            API_ENDPOINTS.stocks.forecast(symbol),
            { params: { days: 7 } }
          ),
          apiClient.get<{ data?: PredictionRow[]; meta?: { torch?: boolean } }>(
            API_ENDPOINTS.ml.stockSeries(symbol),
            { params: { days: 7 } }
          ),
        ]);
        if (c) return;
        const fd = fcRes.data?.data;
        if (fd?.best_model) setBest(fd.best_model);
        if (fd?.models) {
          const bits = Object.entries(fd.models)
            .map(([k, v]) => `${k}: RMSE ${v.rmse != null ? v.rmse.toFixed(4) : '—'}`)
            .join(' · ');
          setForecastNote(bits || null);
        }
        setSeries(mlRes.data?.data ?? []);
        setTorch(Boolean(mlRes.data?.meta?.torch));
      } catch {
        if (!c) {
          setSeries([]);
          setForecastNote('Forecast or ML series failed to load.');
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <Skeleton className="h-24 w-full" />
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-navy dark:text-white">Stratify multi-model forecast (7d)</h2>
        <p className="mt-1 text-sm text-gray dark:text-gray">
          Best model (lowest RMSE on recent window):{' '}
          <span className="font-medium text-navy dark:text-white">{best ?? '—'}</span>
        </p>
        {forecastNote ? <p className="mt-2 text-xs text-gray dark:text-gray">{forecastNote}</p> : null}
      </Card>
      <PredictionSeriesChart
        data={series}
        currency={currency}
        title="Bizmetric-style curves (LR + optional PyTorch LSTM/CNN)"
        subtitle={
          torch
            ? 'PyTorch is enabled on the server for LSTM/CNN tracks.'
            : 'Install PyTorch on the API host for LSTM/CNN; linear regression always available.'
        }
      />
    </div>
  );
}

interface SentimentPayload {
  sentiment_score: number | null;
  label: string;
  breakdown?: { news: number | null; analyst: number | null };
  sample_size?: number;
  source?: string;
  note?: string | null;
}

export function SentimentTab({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<SentimentPayload | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await apiClient.get<{ data?: SentimentPayload }>(API_ENDPOINTS.stocks.sentiment(symbol));
        if (c) return;
        setS(data?.data ?? null);
      } catch {
        if (!c) setErr('Could not load sentiment.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-28 w-full" />
      </Card>
    );
  }
  if (err || !s) {
    return (
      <Card>
        <p className="text-sm text-gray dark:text-gray">{err ?? 'No sentiment.'}</p>
      </Card>
    );
  }

  const score = s.sentiment_score;
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 50;

  return (
    <Card>
      <h2 className="text-base font-semibold text-navy dark:text-white">Sentiment</h2>
      <p className="mt-1 text-xs text-gray dark:text-gray">Source: {s.source ?? 'API'}</p>
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray dark:text-gray">Bearish</span>
          <span className="font-semibold capitalize text-navy dark:text-white">{s.label}</span>
          <span className="text-gray dark:text-gray">Bullish</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red via-amber to-green transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {score != null ? (
          <p className="mt-2 text-center text-sm tabular-nums text-navy dark:text-white">Score: {score.toFixed(1)}</p>
        ) : null}
        {s.breakdown?.analyst != null ? (
          <p className="mt-2 text-sm text-gray dark:text-gray">Analyst component: {s.breakdown.analyst.toFixed(1)}</p>
        ) : null}
        {s.sample_size != null ? (
          <p className="text-sm text-gray dark:text-gray">Sample (analysts): {s.sample_size}</p>
        ) : null}
        {s.note ? <p className="mt-3 text-xs text-gray dark:text-gray">{s.note}</p> : null}
      </div>
    </Card>
  );
}
