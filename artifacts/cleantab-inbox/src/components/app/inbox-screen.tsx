import { useMemo, useState } from 'react';
import { CircleCheck, Search, TriangleAlert } from 'lucide-react';
import type { Bill } from '@/lib/extract';
import type { Derived } from '@/lib/inbox';
import { Money, formatDay } from './bits';

type Filter = 'all' | 'flagged' | 'unfiled' | 'filed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'unfiled', label: 'Unfiled' },
  { id: 'filed', label: 'Filed' },
];

export function InboxScreen({
  derived,
  onOpenBill,
}: {
  derived: Derived;
  onOpenBill: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { bills, flags, filed } = derived;

  const counts = useMemo(
    () => ({
      all: bills.length,
      flagged: bills.filter((bill) => flags[bill.id]).length,
      unfiled: bills.filter((bill) => !filed.includes(bill.id)).length,
      filed: bills.filter((bill) => filed.includes(bill.id)).length,
    }),
    [bills, flags, filed],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bills
      .filter((bill) => {
        if (filter === 'flagged' && !flags[bill.id]) return false;
        if (filter === 'unfiled' && filed.includes(bill.id)) return false;
        if (filter === 'filed' && !filed.includes(bill.id)) return false;
        if (!needle) return true;
        return (
          bill.merchant.toLowerCase().includes(needle) ||
          bill.category.toLowerCase().includes(needle) ||
          (bill.invoiceNumber ?? '').toLowerCase().includes(needle) ||
          bill.source.subject.toLowerCase().includes(needle)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.source.receivedAt).getTime() -
          new Date(a.source.receivedAt).getTime(),
      );
  }, [bills, flags, filed, filter, query]);

  const clear = () => {
    setQuery('');
    setFilter('all');
  };

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div>
        <label htmlFor="inbox-search" className="sr-only">
          Search bills by merchant, category or invoice number
        </label>
        <div className="flex items-center gap-2 rounded-xl border-brutal bg-surface px-3 py-2.5 shadow-brutal-sm">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-ink/45" />
          <input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Merchant, category, invoice number"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter bills"
        className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5"
      >
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(id)}
              className={`press shrink-0 rounded-md border-brutal px-3 py-1.5 text-sm font-bold transition ${
                active
                  ? 'bg-brand-deep text-on-brand'
                  : 'bg-surface text-ink/70 hover:bg-brand-wash'
              }`}
            >
              {label}{' '}
              <span className="font-semibold tabular-nums opacity-70">
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/25 p-6 text-center">
          <p className="font-display text-base font-semibold">
            Nothing matches that
          </p>
          <p className="mt-1 text-sm font-medium text-ink/60">
            Try a different merchant, or clear the search and filters to see all{' '}
            {bills.length} bills.
          </p>
          <button
            type="button"
            onClick={clear}
            className="press mt-4 rounded-full border-brutal bg-surface px-4 py-2 text-sm font-bold"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-dashed divide-rule overflow-hidden rounded-xl border-brutal bg-surface shadow-brutal-sm">
          {shown.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              flagCount={derived.flags[bill.id]?.length ?? 0}
              filed={filed.includes(bill.id)}
              onOpen={() => onOpenBill(bill.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BillRow({
  bill,
  flagCount,
  filed,
  onOpen,
}: {
  bill: Bill;
  flagCount: number;
  filed: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-brand-wash"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-sm font-bold text-ink/70"
        >
          {bill.merchant.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">
              {bill.merchant}
            </span>
            <Money
              amount={bill.amount}
              paise
              className="shrink-0 text-[15px] font-semibold"
            />
          </span>
          <span className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-ink/55">
            <span className="truncate">
              {bill.category} · {bill.purpose}
            </span>
            <span className="shrink-0">{formatDay(bill.date)}</span>
          </span>
          {flagCount > 0 || filed ? (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {flagCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-coral/20 px-2 py-0.5 text-[11px] font-bold text-ink">
                  <TriangleAlert aria-hidden className="h-3 w-3" />
                  {flagCount} to check
                </span>
              ) : null}
              {filed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2 py-0.5 text-[11px] font-bold text-brand-deep">
                  <CircleCheck aria-hidden className="h-3 w-3" />
                  Filed
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
