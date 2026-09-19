import { useCallback, useEffect, useRef, useState } from 'react';
import { useInbox, SAMPLE_EMAILS } from '@/hooks/use-inbox';
import { useMediaQuery } from '@/components/app/bits';
import { Logomark } from '@/components/app/logo';
import { TabBar, type Tab } from '@/components/app/tab-bar';
import { ConnectScreen } from '@/components/app/connect-screen';
import { FetchingScreen } from '@/components/app/fetching-screen';
import { SummaryScreen } from '@/components/app/summary-screen';
import { InboxScreen } from '@/components/app/inbox-screen';
import { AddScreen } from '@/components/app/add-screen';
import { BillDetail } from '@/components/app/bill-detail';

type Toast = { message: string; action?: { label: string; run: () => void } };

export default function Home() {
  const { state, derived, markFetched, setFiled, addPaste, reset } = useInbox();
  const compact = useMediaQuery('(max-width: 639px)');

  const [fetching, setFetching] = useState(false);
  const [justFetched, setJustFetched] = useState(false);
  const [tab, setTab] = useState<Tab>('summary');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const phase = state.fetched ? 'app' : fetching ? 'fetching' : 'connect';

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* Announce a pasted bill once the recomputed flags are in. */
  useEffect(() => {
    if (!pendingId) return;
    const bill = derived.bills.find((item) => item.id === pendingId);
    if (!bill) return;
    const count = derived.flags[bill.id]?.length ?? 0;
    setAnnouncement(
      `Bill read: ${bill.merchant}, ₹${bill.amount.toFixed(2)}. ${
        count === 0
          ? 'Nothing flagged.'
          : `${count} thing${count === 1 ? '' : 's'} to check.`
      }`,
    );
    setPendingId(null);
  }, [pendingId, derived]);

  const finishFetch = useCallback(() => {
    setFetching(false);
    setJustFetched(true);
    setTab('summary');
    markFetched();
  }, [markFetched]);

  const openBill = (id: string) => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpenId(id);
  };

  const closeBill = () => {
    setOpenId(null);
    requestAnimationFrame(() => opener.current?.focus());
  };

  const fileBill = (id: string) => {
    setFiled(id, true);
    setToast({
      message: 'Filed to CleanTab.',
      action: { label: 'Undo', run: () => setFiled(id, false) },
    });
  };

  const handleAdd = (text: string) => {
    const id = addPaste(text);
    setTab('inbox');
    setPendingId(id);
    openBill(id);
  };

  const handleReset = () => {
    reset();
    setFetching(false);
    setJustFetched(false);
    setTab('summary');
    setOpenId(null);
    setToast(null);
    setAnnouncement('');
  };

  const openBillRecord = openId
    ? derived.bills.find((bill) => bill.id === openId)
    : undefined;

  const app = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-paper text-ink">
      <header className="flex items-center gap-2 border-b border-rule bg-paper px-4 py-3">
        <Logomark className="h-7 w-auto rounded-md" />
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight">
          CleanTab Inbox
        </h1>
        {phase === 'app' ? (
          <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink/60">
            {derived.totals.bills} bills
          </span>
        ) : null}
      </header>

      {openBillRecord ? (
        <BillDetail
          bill={openBillRecord}
          flags={derived.flags[openBillRecord.id] ?? []}
          filed={derived.filed.includes(openBillRecord.id)}
          onBack={closeBill}
          onFile={() => fileBill(openBillRecord.id)}
        />
      ) : (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto">
            {phase === 'connect' ? (
              <ConnectScreen
                emailCount={SAMPLE_EMAILS.length}
                onFetch={() => setFetching(true)}
              />
            ) : phase === 'fetching' ? (
              <FetchingScreen
                emailCount={SAMPLE_EMAILS.length}
                onDone={finishFetch}
                onSkip={finishFetch}
              />
            ) : tab === 'summary' ? (
              <SummaryScreen
                derived={derived}
                justFetched={justFetched}
                onOpenBill={openBill}
                onReset={handleReset}
              />
            ) : tab === 'inbox' ? (
              <InboxScreen derived={derived} onOpenBill={openBill} />
            ) : (
              <AddScreen onAdd={handleAdd} />
            )}
          </main>

          {phase === 'app' ? (
            <TabBar
              tab={tab}
              onChange={(next) => {
                setTab(next);
                setJustFetched(false);
              }}
              flaggedCount={derived.totals.flagged}
            />
          ) : null}
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {toast ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex justify-center px-4"
        >
          <p className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-brutal">
            {toast.message}
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
                className="shrink-0 font-bold underline underline-offset-2"
              >
                {toast.action.label}
              </button>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );

  if (compact) {
    return <div className="h-[100dvh] overflow-hidden bg-paper">{app}</div>;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-paper p-8 lg:flex-row lg:gap-12">
      <div className="max-w-sm">
        <Logomark className="h-12 w-auto rounded-xl" alt="CleanTab" />
        <h2 className="mt-4 font-display text-3xl leading-tight font-semibold">
          CleanTab Inbox
        </h2>
        <p className="mt-2 text-base font-medium text-ink/70">
          Today we taught it to read the receipts you never see.
        </p>
        <p className="mt-4 max-w-prose text-sm text-ink/60">
          It reads receipt emails, pulls out the bill, validates every GSTIN and
          flags duplicates, price rises and invoices you cannot claim against.
        </p>
        <p className="mt-4 text-xs text-ink/50">
          Sample data — no mailbox is connected.
        </p>
      </div>

      <div
        className="relative shrink-0 rounded-[2.75rem] bg-[#2b271f] p-[10px] dark:bg-[#0b0a07]"
        style={{ boxShadow: 'var(--shadow-device)' }}
      >
        <div
          className="relative w-[min(430px,78vw)] overflow-hidden rounded-[2.25rem] bg-paper"
          style={{ height: 'min(932px, calc(100dvh - 7rem))' }}
        >
          {app}
        </div>
      </div>
    </div>
  );
}
