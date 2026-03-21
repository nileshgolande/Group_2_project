import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Skeleton } from '../../components/Common/Skeleton';

export interface StockDetailMock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  high52w: number;
  low52w: number;
}

const TCS_MOCK: StockDetailMock = {
  symbol: 'TCS',
  name: 'Tata Consultancy Services',
  sector: 'IT',
  price: 3240,
  change: 2.3,
  high52w: 3890,
  low52w: 2890,
};

const EXTRA_MOCKS: Record<string, Omit<StockDetailMock, 'symbol'>> = {
  ITC: {
    name: 'ITC Limited',
    sector: 'FMCG',
    price: 412.3,
    change: -0.42,
    high52w: 480,
    low52w: 390,
  },
  HDFC: {
    name: 'HDFC Bank Limited',
    sector: 'Banking',
    price: 1658,
    change: 0.88,
    high52w: 1790,
    low52w: 1420,
  },
  INFY: {
    name: 'Infosys Limited',
    sector: 'IT',
    price: 1502.2,
    change: -1.05,
    high52w: 1620,
    low52w: 1320,
  },
  WIPRO: {
    name: 'Wipro Limited',
    sector: 'IT',
    price: 248.75,
    change: 0.56,
    high52w: 285,
    low52w: 210,
  },
};

type DetailTab = 'overview' | 'analytics' | 'technical' | 'forecast' | 'sentiment';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'technical', label: 'Technical' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'sentiment', label: 'Sentiment' },
];

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getMockStock(symbolParam: string | undefined): StockDetailMock {
  const key = (symbolParam ?? 'TCS').toUpperCase();
  if (key === 'TCS') {
    return TCS_MOCK;
  }
  const extra = EXTRA_MOCKS[key];
  if (extra) {
    return { symbol: key, ...extra };
  }
  return {
    symbol: key,
    name: `${key} Limited`,
    sector: '—',
    price: 1000,
    change: 0,
    high52w: 1100,
    low52w: 900,
  };
}

function changeInrFromPercent(price: number, changePct: number): number {
  const prev = price / (1 + changePct / 100);
  return price - prev;
}

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('overview');

  useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, [symbol]);

  const stock = useMemo(() => getMockStock(symbol), [symbol]);
  const changeInr = changeInrFromPercent(stock.price, stock.change);
  const changePositive = stock.change >= 0;

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
                  {stock.sector}
                </span>
              </div>
              <p className="text-lg text-navy/80 dark:text-white/80">{stock.name}</p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-4xl font-semibold tabular-nums text-navy dark:text-white sm:text-5xl">
                {formatInr(stock.price)}
              </p>
              <p
                className={
                  changePositive
                    ? 'mt-1 text-lg font-medium tabular-nums text-green'
                    : 'mt-1 text-lg font-medium tabular-nums text-red'
                }
              >
                {changePositive ? '+' : ''}
                {stock.change.toFixed(1)}% ({changePositive ? '+' : ''}
                {formatInr(changeInr)})
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6 dark:border-white/10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                52W High
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-navy dark:text-white">
                {formatInr(stock.high52w)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                52W Low
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-navy dark:text-white">
                {formatInr(stock.low52w)}
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

        <div
          role="tabpanel"
          id={`stock-panel-${tab}`}
          aria-labelledby={`stock-tab-${tab}`}
        >
          {tab === 'overview' && <OverviewPanel symbol={stock.symbol} />}
          {tab === 'analytics' && <PlaceholderPanel text="Fundamental data here" />}
          {tab === 'technical' && <PlaceholderPanel text="Chart here" />}
          {tab === 'forecast' && <PlaceholderPanel text="Models here" />}
          {tab === 'sentiment' && <PlaceholderPanel text="Gauge here" />}
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

function OverviewPanel({ symbol }: { symbol: string }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-navy dark:text-white">Company overview</h2>
      <p className="mt-3 text-sm leading-relaxed text-navy/80 dark:text-white/75">
        {symbol} is a leading listed company in its sector. This overview is mock content for Morpheus —
        connect your data source for filings, KPIs, and narrative summaries.
      </p>
      <h3 className="mt-6 text-sm font-semibold text-navy dark:text-white">Key metrics</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Market cap', value: '₹12.4L Cr' },
          { label: 'P/E (TTM)', value: '28.4' },
          { label: 'EPS (TTM)', value: formatInr(114.2) },
          { label: 'Div. yield', value: '1.2%' },
          { label: 'Beta', value: '0.92' },
          { label: 'ROE', value: '43.2%' },
        ].map((m) => (
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

function PlaceholderPanel({ text }: { text: string }) {
  return (
    <Card>
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm text-gray dark:text-gray">{text}</p>
      </div>
    </Card>
  );
}
