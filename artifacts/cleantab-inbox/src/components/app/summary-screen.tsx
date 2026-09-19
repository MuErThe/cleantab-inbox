import { useState } from 'react';
import { ChevronRight, RotateCcw, TriangleAlert } from 'lucide-react';
import type { Bill } from '@/lib/extract';
import type { Derived } from '@/lib/inbox';
import { Money, SectionTitle, Tile, formatDay, useCountUp } from './bits';

export function SummaryScreen({
  derived,
  justFetched,
  onOpenBill,
  onReset,
}: {
  derived: Derived;
  justFetched: boolean;
  onOpenBill: (id: string) => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { totals, byCategory, bills, flags } = derived;

  const spend = useCountUp(totals.spend, justFetched);
  const gst = useCountUp(totals.gst, justFetched);
  const atRisk = useCountUp(totals.atRisk, justFetched);
  const billCount = useCountUp(totals.bills, justFetched);

  const flagged = bills.filter((bill) => flags[bill.id]);
  const biggest = byCategory.length > 0 ? byCategory[0].total : 1;

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">
      <section aria-labelledby="at-risk-heading">
        <div className="rounded-2xl border-brutal bg-hero p-5 text-on-brand shadow-brutal dark:text-emerald-50">
          <p
            id="at-risk-heading"
            className="text-xs font-semibold tracking-widest uppercase"
          >
            At risk in these bills
          </p>
          <p className="mt-1 pb-3 text-[2.6rem] leading-none font-semibold">
            <Money amount={Math.round(atRisk)} />
          </p>
          <div className="flex items-baseline justify-between gap-3 border-t border-white/25 pt-3 text-xs font-bold">
            <span>
              {totals.duplicates} duplicate charge
              {totals.duplicates === 1 ? '' : 's'}
            </span>
            <span aria-hidden className="h-3 w-px bg-white/25" />
            <span>
              {totals.priceRises} price rise{totals.priceRises === 1 ? '' : 's'}
            </span>
            <span aria-hidden className="h-3 w-px bg-white/25" />
            <span>
              {totals.flagged} bill{totals.flagged === 1 ? '' : 's'} flagged
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="sr-only">
          What we found
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="Bills found">{Math.round(billCount)}</Tile>
          <Tile label="Total spend">
            <Money amount={Math.round(spend)} />
          </Tile>
          <Tile label="GST paid" note="Claimable where the GSTIN checks out">
            <Money amount={Math.round(gst)} />
          </Tile>
          <Tile label="Need a look" note="Flagged by the four rules">
            {totals.flagged}
          </Tile>
        </div>
      </section>

      {flagged.length > 0 ? (
        <section aria-labelledby="needs-a-look-heading">
          <h2
            id="needs-a-look-heading"
            className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/60 uppercase"
          >
            Needs a look
          </h2>
          <ul className="divide-y divide-dashed divide-rule overflow-hidden rounded-xl border-brutal bg-surface shadow-brutal-sm">
            {flagged.map((bill) => (
              <FlaggedRow
                key={bill.id}
                bill={bill}
                title={flags[bill.id][0].title}
                reason={flags[bill.id][0].reason}
                onOpen={() => onOpenBill(bill.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="by-category-heading">
        <h2
          id="by-category-heading"
          className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/60 uppercase"
        >
          Spend by category
        </h2>
        <div className="rounded-xl border-brutal bg-surface p-4 shadow-brutal-sm">
          <ul className="flex flex-col gap-3">
            {byCategory.map((row) => (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {row.category}
                  </span>
                  <Money
                    amount={Math.round(row.total)}
                    className="shrink-0 text-sm font-semibold"
                  />
                </div>
                <div
                  aria-hidden
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10"
                >
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(3, (row.total / biggest) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="px-1 pt-1">
        {confirming ? (
          <div className="rounded-xl border-brutal bg-sun/15 p-4 shadow-brutal-sm">
            <p className="text-sm font-semibold">Reset the demo?</p>
            <p className="mt-1 text-xs text-ink/70">
              This clears the bills you filed and anything you pasted, and takes
              you back to the start.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onReset}
                className="press flex-1 rounded-xl bg-brand-deep px-3 py-2.5 text-sm font-bold text-on-brand"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="press flex-1 rounded-xl border-brutal bg-surface px-3 py-2.5 text-sm font-bold"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="press flex items-center gap-1.5 text-xs font-semibold text-ink/50"
          >
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            Reset demo
          </button>
        )}
        <p className="mt-3 text-[11px] text-ink/45">
          Sample data — no mailbox is connected.
        </p>
      </footer>
    </div>
  );
}

function FlaggedRow({
  bill,
  title,
  reason,
  onOpen,
}: {
  bill: Bill;
  title: string;
  reason: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-brand-wash"
      >
        <TriangleAlert
          aria-hidden
          className="mt-0.5 h-5 w-5 shrink-0 text-coral"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{title}</span>
            <Money
              amount={bill.amount}
              paise
              className="shrink-0 text-[15px] font-semibold"
            />
          </span>
          <span className="mt-0.5 block text-xs text-ink/70">{reason}</span>
          <span className="mt-1 block text-[11px] text-ink/50">
            {bill.merchant} · {formatDay(bill.date)}
          </span>
        </span>
        <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" />
      </button>
    </li>
  );
}
