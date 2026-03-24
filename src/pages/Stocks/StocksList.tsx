import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Common/Button';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api';

const PAGE_SIZE = 20;

export type SortOption = 'symbol' | 'price' | 'changePct' | 'marketCap';

export interface StockListRow {
  symbol: string;
  company: string;
  sector: string;
  price: number;
  changePct: number;
  /** Crores (INR) or billions (USD) scaled for display — see formatMarketCap */
  marketCapRaw: number | null;
  quoteCurrency: string;
}

interface StockApiRow {
  symbol: string;
  name: string;
  sector: string;
  current_price: string | number | null;
  change_percent: string | number | null;
  market_cap: number | null;
  quote_currency?: string;
}

interface StocksApiResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: StockApiRow[];
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
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(mc: number | null, currency: string): string {
  if (mc == null || !Number.isFinite(mc) || mc <= 0) return '—';
  const c = (currency || 'INR').toUpperCase();
  if (c === 'USD') {
    const b = mc / 1e9;
    if (b >= 1) return `$${b.toFixed(2)}B`;
    const m = mc / 1e6;
    return `$${m.toFixed(2)}M`;
  }
  const cr = mc / 1e7;
  if (cr >= 10000) {
    return `₹${(cr / 10000).toFixed(2)}L Cr`;
  }
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function orderingParam(sort: SortOption): string {
  switch (sort) {
    case 'price':
      return '-current_price';
    case 'changePct':
      return '-change_percent';
    case 'marketCap':
      return '-market_cap';
    default:
      return 'symbol';
  }
}

export function StocksList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('symbol');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StockListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sectorOptions, setSectorOptions] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sector, sortBy]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<StocksApiResult>(API_ENDPOINTS.stocks.list, {
        params: { page_size: 200, ordering: 'sector' },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const set = new Set<string>();
        for (const r of data.results ?? []) {
          if (r.sector) set.add(r.sector);
        }
        setSectorOptions(['All', ...[...set].sort()]);
      })
      .catch(() => {
        if (!cancelled) setSectorOptions(['All']);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: PAGE_SIZE,
          ordering: orderingParam(sortBy),
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (sector !== 'All') params.sector = sector;
        const { data } = await apiClient.get<StocksApiResult>(API_ENDPOINTS.stocks.list, {
          params,
        });
        if (cancelled) return;
        const mapped: StockListRow[] = (data.results ?? []).map((r) => ({
          symbol: r.symbol,
          company: r.name,
          sector: r.sector || 'Uncategorized',
          price: toNum(r.current_price),
          changePct: toNum(r.change_percent),
          marketCapRaw: r.market_cap != null ? Number(r.market_cap) : null,
          quoteCurrency: r.quote_currency || 'INR',
        }));
        setRows(mapped);
        setTotalCount(data.count ?? mapped.length);
      } catch {
        if (!cancelled) {
          setError(
            'Could not load stocks. Start the Django API (e.g. port 8000) and set VITE_API_URL if needed.'
          );
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, sector, sortBy]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const goDetail = (symbol: string) => {
    navigate(`/stocks/${symbol}`);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, sym: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goDetail(sym);
    }
  };

  const SECTORS = useMemo(() => sectorOptions, [sectorOptions]);

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy dark:text-white sm:text-3xl">
            All Stocks
          </h1>
          <p className="mt-1 text-sm text-gray dark:text-gray">
            Live list from your Stratify API. Row opens detail.
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red dark:border-red/40 dark:bg-red/15">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <span className="sr-only">Search by symbol or company</span>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search symbol or company…"
              className="w-full rounded-xl border border-navy/15 bg-white px-4 py-2.5 text-sm text-navy placeholder:text-gray/80 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white dark:placeholder:text-gray"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-navy dark:text-white">
              <span className="whitespace-nowrap text-gray dark:text-gray">Sector</span>
              <select
                value={sector}
                onChange={(e) => {
                  setSector(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-navy dark:text-white">
              <span className="whitespace-nowrap text-gray dark:text-gray">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setPage(1);
                }}
                className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-navy dark:text-white"
              >
                <option value="symbol">Symbol (A–Z)</option>
                <option value="price">Price (high → low)</option>
                <option value="changePct">Change % (high → low)</option>
                <option value="marketCap">Market cap (high → low)</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-navy/10 bg-white shadow-md dark:border-white/10 dark:bg-navy">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 bg-navy/[0.04] dark:border-white/10 dark:bg-white/[0.06]">
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Symbol</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Company</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Sector</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Price</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Change %</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray dark:text-gray sm:px-5">
                    Loading stocks…
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.symbol}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${row.symbol} details`}
                    onClick={() => goDetail(row.symbol)}
                    onKeyDown={(e) => onRowKeyDown(e, row.symbol)}
                    className="cursor-pointer border-b border-navy/5 transition-colors hover:bg-emerald/5 last:border-0 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">
                      {row.symbol}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-navy/85 dark:text-white/80 sm:max-w-xs sm:px-5">
                      {row.company}
                    </td>
                    <td className="px-4 py-3 text-gray dark:text-gray sm:px-5">{row.sector}</td>
                    <td className="px-4 py-3 tabular-nums text-navy dark:text-white sm:px-5">
                      {formatMoney(row.price, row.quoteCurrency)}
                    </td>
                    <td
                      className={
                        row.changePct >= 0
                          ? 'px-4 py-3 font-medium tabular-nums text-green sm:px-5'
                          : 'px-4 py-3 font-medium tabular-nums text-red sm:px-5'
                      }
                    >
                      {row.changePct >= 0 ? '+' : ''}
                      {row.changePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 tabular-nums text-navy dark:text-gray sm:px-5">
                      {formatMarketCap(row.marketCapRaw, row.quoteCurrency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray dark:text-gray">
            No stocks in the database yet. Run a seed command in stratify-backend (e.g. seed_universe_100)
            or open a symbol on the detail page to create it via Yahoo.
          </p>
        ) : null}
      </div>

      {!loading && rows.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray dark:text-gray">
            Page {page} of {totalPages} · {totalCount} result{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
