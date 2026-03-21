import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Common/Button';

const PAGE_SIZE = 20;

export type SortOption = 'symbol' | 'price' | 'changePct' | 'marketCap';

export interface StockListRow {
  symbol: string;
  company: string;
  sector: string;
  price: number;
  changePct: number;
  /** Crores, for sorting / display */
  marketCapCr: number;
}

const MOCK_STOCKS: StockListRow[] = [
  { symbol: 'TCS', company: 'Tata Consultancy Services Ltd.', sector: 'IT', price: 3842.5, changePct: 1.24, marketCapCr: 14020 },
  { symbol: 'RELIANCE', company: 'Reliance Industries Ltd.', sector: 'Energy', price: 2890, changePct: 0.55, marketCapCr: 19580 },
  { symbol: 'HDFCBANK', company: 'HDFC Bank Ltd.', sector: 'Banking', price: 1658, changePct: 0.88, marketCapCr: 11240 },
  { symbol: 'INFY', company: 'Infosys Ltd.', sector: 'IT', price: 1502.2, changePct: -1.05, marketCapCr: 6280 },
  { symbol: 'ICICIBANK', company: 'ICICI Bank Ltd.', sector: 'Banking', price: 1122, changePct: 0.32, marketCapCr: 7860 },
  { symbol: 'HINDUNILVR', company: 'Hindustan Unilever Ltd.', sector: 'FMCG', price: 2388, changePct: -0.18, marketCapCr: 5620 },
  { symbol: 'ITC', company: 'ITC Ltd.', sector: 'FMCG', price: 412.3, changePct: -0.42, marketCapCr: 5180 },
  { symbol: 'SBIN', company: 'State Bank of India', sector: 'Banking', price: 812.4, changePct: 1.12, marketCapCr: 7240 },
  { symbol: 'BHARTIARTL', company: 'Bharti Airtel Ltd.', sector: 'Telecom', price: 1188, changePct: 0.67, marketCapCr: 6890 },
  { symbol: 'KOTAKBANK', company: 'Kotak Mahindra Bank Ltd.', sector: 'Banking', price: 1756, changePct: -0.21, marketCapCr: 3480 },
  { symbol: 'LT', company: 'Larsen & Toubro Ltd.', sector: 'Infrastructure', price: 3422, changePct: 0.91, marketCapCr: 4780 },
  { symbol: 'WIPRO', company: 'Wipro Ltd.', sector: 'IT', price: 248.75, changePct: 0.56, marketCapCr: 2580 },
  { symbol: 'AXISBANK', company: 'Axis Bank Ltd.', sector: 'Banking', price: 1024, changePct: -0.65, marketCapCr: 3160 },
  { symbol: 'ASIANPAINT', company: 'Asian Paints Ltd.', sector: 'Materials', price: 3128, changePct: 0.14, marketCapCr: 2990 },
  { symbol: 'MARUTI', company: 'Maruti Suzuki India Ltd.', sector: 'Auto', price: 11890, changePct: -0.88, marketCapCr: 3590 },
];

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(cr: number): string {
  if (cr >= 10000) {
    return `₹${(cr / 10000).toFixed(2)}L Cr`;
  }
  return `₹${cr.toLocaleString('en-IN')} Cr`;
}

const SECTORS = ['All', ...Array.from(new Set(MOCK_STOCKS.map((s) => s.sector))).sort()];

export function StocksList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('symbol');
  const [page, setPage] = useState(1);

  const processed = useMemo(() => {
    let rows = [...MOCK_STOCKS];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q)
      );
    }
    if (sector !== 'All') {
      rows = rows.filter((r) => r.sector === sector);
    }
    rows.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'changePct':
          return b.changePct - a.changePct;
        case 'marketCap':
          return b.marketCapCr - a.marketCapCr;
        default:
          return a.symbol.localeCompare(b.symbol);
      }
    });
    return rows;
  }, [search, sector, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goDetail = (symbol: string) => {
    navigate(`/stocks/${symbol}`);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, symbol: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goDetail(symbol);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy dark:text-white sm:text-3xl">
            All Stocks
          </h1>
          <p className="mt-1 text-sm text-gray dark:text-gray">
            Search and explore listed names. Row opens detail.
          </p>
        </div>
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
              {pageSlice.map((row) => (
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
                    {formatInr(row.price)}
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
                    {formatMarketCap(row.marketCapCr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {processed.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray dark:text-gray">
            No stocks match your search.
          </p>
        ) : null}
      </div>

      {processed.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray dark:text-gray">
            Page {safePage} of {totalPages} · {processed.length} result{processed.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safePage >= totalPages}
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
