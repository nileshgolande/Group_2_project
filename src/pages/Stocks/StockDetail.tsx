import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Skeleton } from '../../components/Common/Skeleton';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';
import { AnalyticsTab, ForecastTab, SentimentTab, TechnicalTab } from './StockDetailTabs';

type DetailTab = 'overview' | 'analytics' | 'technical' | 'forecast' | 'sentiment';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'technical', label: 'Technical' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'sentiment', label: 'Sentiment' },
];

export interface StockDetailPayload {
  symbol: string;
  name: string;
  sector: string;
  current_price: string | number | null;
  change_percent: string | number | null;
  price_52w_high: string | number | null;
  price_52w_low: string | number | null;
  market_cap: number | null;
  pe_ratio: string | number | null;
  pb_ratio: string | number | null;
  dividend_yield: string | number | null;
  description?: string | null;
  quote_currency?: string;
}

function toNum(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: number, currency: string): string {
  const c = (currency || 'INR').toUpperCase();
  if (c === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(mc: number | null, currency: string): string {
  if (mc == null || !Number.isFinite(mc) || mc <= 0) return '—';
  const c = (currency || 'INR').toUpperCase();
  if (c === 'USD') {
    const b = mc / 1e9;
    if (b >= 1) return `$${b.toFixed(2)}B`;
    return `$${(mc / 1e6).toFixed(2)}M`;
  }
  const cr = mc / 1e7;
  if (cr >= 10000) return `₹${(cr / 10000).toFixed(2)}L Cr`;
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function changeAbsFromPercent(price: number, changePct: number): number {
  const prev = price / (1 + changePct / 100);
  return price - prev;
}

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<StockDetailPayload | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');

  useEffect(() => {
    setTab('overview');
  }, [symbol]);

  useEffect(() => {
    const sym = symbol?.trim();
    if (!sym) {
      setStock(null);
      setError('Missing symbol');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<{ data?: StockDetailPayload; status_code?: number }>(
          API_ENDPOINTS.stocks.detail(sym)
        );
        if (cancelled) return;
        const payload = data?.data;
        if (!payload || typeof payload !== 'object') {
          setError('Unexpected response from the API.');
          setStock(null);
          return;
        }
        setStock(payload as StockDetailPayload);
      } catch {
        if (!cancelled) {
          setError(
            'Could not load this symbol. Check the API is running, the symbol exists, or try again.'
          );
          setStock(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(260px,300px)] lg:items-start">
        <div className="space-y-6">
          <Card>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-4 h-4 w-3/4 max-w-md" />
            <Skeleton className="mt-6 h-14 w-48" />
          </Card>
          <Card>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-40 w-full" />
          </Card>
        </div>
        <Card className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="space-y-4 pb-8">
        <nav className="text-sm text-gray dark:text-gray">
          <Link to="/stocks" className="font-medium text-emerald hover:underline">
            Stocks
          </Link>
        </nav>
        <Card>
          <p className="text-sm text-navy dark:text-white">{error ?? 'Stock not found.'}</p>
          <p className="mt-2 text-sm text-gray dark:text-gray">
            Ensure Django is running at <code className="rounded bg-navy/5 px-1 dark:bg-white/10">VITE_API_URL</code>{' '}
            (default <code className="rounded bg-navy/5 px-1 dark:bg-white/10">http://localhost:8000/api</code>).
          </p>
        </Card>
      </div>
    );
  }

  const currency = stock.quote_currency || 'INR';
  const price = toNum(stock.current_price);
  const changePct = toNum(stock.change_percent);
  const changeAbs = changeAbsFromPercent(price, changePct);
  const changePositive = changePct >= 0;

  return (
    <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-[1fr_minmax(260px,300px)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <nav className="text-sm text-gray dark:text-gray">
          <Link to="/stocks" className="font-medium text-emerald hover:underline">
            Stocks
          </Link>
          <span className="mx-2 text-gray/50">/</span>
          <span className="text-navy dark:text-white">{stock.symbol}</span>
        </nav>

        <Card>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-navy dark:text-white sm:text-4xl">
                  {stock.symbol}
                </h1>
                <span className="rounded-md bg-navy/5 px-2 py-0.5 text-sm font-medium text-gray dark:bg-white/10 dark:text-gray">
                  {stock.sector || '—'}
                </span>
              </div>
              <p className="text-lg text-navy/80 dark:text-white/80">{stock.name}</p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-4xl font-semibold tabular-nums text-navy dark:text-white sm:text-5xl">
                {formatMoney(price, currency)}
              </p>
              <p
                className={
                  changePositive
                    ? 'mt-1 text-lg font-medium tabular-nums text-green'
                    : 'mt-1 text-lg font-medium tabular-nums text-red'
                }
              >
                {changePositive ? '+' : ''}
                {changePct.toFixed(2)}% ({changePositive ? '+' : ''}
                {formatMoney(Math.abs(changeAbs), currency)})
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6 dark:border-white/10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                52W High
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-navy dark:text-white">
                {formatMoney(toNum(stock.price_52w_high), currency)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                52W Low
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-navy dark:text-white">
                {formatMoney(toNum(stock.price_52w_low), currency)}
              </p>
            </div>
          </div>
        </Card>

        <div
          role="tablist"
          aria-label="Stock detail sections"
          className="flex gap-1 overflow-x-auto border-b border-navy/10 pb-px dark:border-white/10"
        >
          {TABS.map(({ id, label }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`stock-tab-${id}`}
                aria-controls={`stock-panel-${id}`}
                onClick={() => setTab(id)}
                className={[
                  'whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  selected
                    ? 'bg-emerald/15 text-emerald dark:bg-emerald/20 dark:text-emerald'
                    : 'text-gray hover:bg-navy/5 hover:text-navy dark:hover:bg-white/5 dark:hover:text-white',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`stock-panel-${tab}`} aria-labelledby={`stock-tab-${tab}`}>
          {tab === 'overview' && <OverviewPanel stock={stock} />}
          {tab === 'analytics' && <AnalyticsTab symbol={stock.symbol} />}
          {tab === 'technical' && <TechnicalTab symbol={stock.symbol} />}
          {tab === 'forecast' && <ForecastTab symbol={stock.symbol} currency={currency} />}
          {tab === 'sentiment' && <SentimentTab symbol={stock.symbol} />}
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <Card className="flex flex-col gap-3">
          <Button variant="primary" type="button" className="w-full">
            Add to Portfolio
          </Button>
          <Button variant="secondary" type="button" className="w-full">
            Add to Watchlist
          </Button>
          <Button variant="secondary" type="button" className="w-full">
            Set Price Alert
          </Button>
          <Button variant="ghost" type="button" className="w-full">
            Compare Stocks
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function OverviewPanel({ stock }: { stock: StockDetailPayload }) {
  const currency = stock.quote_currency || 'INR';
  const pe = stock.pe_ratio != null && stock.pe_ratio !== '' ? toNum(stock.pe_ratio) : null;
  const pb = stock.pb_ratio != null && stock.pb_ratio !== '' ? toNum(stock.pb_ratio) : null;
  const divYield = stock.dividend_yield != null && stock.dividend_yield !== '' ? toNum(stock.dividend_yield) : null;
  const blurb =
    (stock.description && stock.description.trim()) ||
    `${stock.name} (${stock.symbol}) — overview data from your Stratify API.`;

  const metrics: { label: string; value: string }[] = [
    { label: 'Market cap', value: formatMarketCap(stock.market_cap != null ? Number(stock.market_cap) : null, currency) },
    { label: 'P/E (TTM)', value: pe != null && pe > 0 ? pe.toFixed(2) : '—' },
    { label: 'P/B', value: pb != null && pb > 0 ? pb.toFixed(2) : '—' },
    { label: 'Div. yield', value: divYield != null && divYield > 0 ? `${divYield.toFixed(2)}%` : '—' },
  ];

  return (
    <Card>
      <h2 className="text-base font-semibold text-navy dark:text-white">Company overview</h2>
      <p className="mt-3 text-sm leading-relaxed text-navy/80 dark:text-white/75">{blurb}</p>
      <h3 className="mt-6 text-sm font-semibold text-navy dark:text-white">Key metrics</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-navy/10 bg-navy/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <p className="text-xs font-medium text-gray dark:text-gray">{m.label}</p>
            <p className="mt-1 font-semibold tabular-nums text-navy dark:text-white">{m.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
