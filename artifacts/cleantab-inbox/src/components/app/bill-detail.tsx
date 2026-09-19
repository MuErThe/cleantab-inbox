import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, CircleCheck, Loader2 } from 'lucide-react';
import type { Bill } from '@/lib/extract';
import type { Flag } from '@/lib/flags';
import { Money, formatDay, formatDayTime, gstinVerdict } from './bits';

export function BillDetail({
  bill,
  flags,
  filed,
  onBack,
  onFile,
}: {
  bill: Bill;
  flags: Flag[];
  filed: boolean;
  onBack: () => void;
  onFile: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [sending, setSending] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const verdict = gstinVerdict(bill.gstin);
  const atRisk = flags.reduce((sum, flag) => sum + flag.atRisk, 0);

  useEffect(() => {
    heading.current?.focus();
    setSending(false);
    setShowSource(false);
  }, [bill.id]);

  const send = () => {
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      onFile();
    }, 620);
  };

  return (
    <div className="float-up flex min-h-0 flex-1 flex-col bg-paper">
      <header className="flex items-center gap-2 border-b border-rule bg-paper px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="press -ml-1 flex size-9 items-center justify-center"
        >
          <ArrowLeft aria-hidden className="h-5 w-5" />
          <span className="sr-only">Back to the inbox</span>
        </button>
        <h2
          ref={heading}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate font-display text-base font-semibold outline-none"
        >
          {bill.merchant}
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4 pb-4">
          <div className="rounded-2xl border-brutal bg-surface p-5 shadow-brutal">
            <p className="text-xs font-semibold tracking-widest text-ink/60 uppercase">
              Total charged
            </p>
            <p className="mt-1 pb-3 text-4xl font-semibold rule-strong">
              <Money amount={bill.amount} paise />
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 pt-3">
              <Field label="Merchant" value={bill.merchant} />
              <Field label="Invoice date" value={formatDay(bill.date)} />
              <Field
                label="GST charged"
                value={bill.gst > 0 ? `₹${bill.gst.toFixed(2)}` : 'None'}
              />
              <Field
                label="Invoice number"
                value={bill.invoiceNumber ?? 'Not stated'}
                mono
              />
              <Field label="Category" value={bill.category} />
              <Field label="Purpose" value={bill.purpose} />
              <Field label="Billing" value={bill.frequency} />
              <Field label="From" value={bill.source.fromEmail || 'Pasted in'} />
            </dl>
          </div>

          <div className="rounded-xl border-brutal bg-surface p-4 shadow-brutal-sm">
            <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
              GSTIN
            </p>
            <p className="mt-1 font-mono text-sm font-medium break-all">
              {bill.gstin ?? 'Not shown on this bill'}
            </p>
            <p
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                verdict.tone === 'good'
                  ? 'bg-brand-wash text-brand-deep'
                  : verdict.tone === 'bad'
                    ? 'bg-coral/20 text-ink'
                    : 'bg-ink/5 text-ink/70'
              }`}
            >
              <verdict.Icon aria-hidden className="h-3.5 w-3.5" />
              {verdict.label}
            </p>
          </div>

          {flags.length > 0 ? (
            <section aria-labelledby={`flags-${bill.id}`}>
              <h3
                id={`flags-${bill.id}`}
                className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/60 uppercase"
              >
                {flags.length === 1 ? 'One thing to check' : `${flags.length} things to check`}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {flags.map((flag) => (
                  <li
                    key={flag.rule}
                    className="rounded-xl border-brutal bg-coral/20 p-4"
                  >
                    <p className="text-sm font-bold">{flag.title}</p>
                    <p className="mt-1 text-sm font-medium text-ink/80">
                      {flag.reason}
                    </p>
                    <p className="mt-2.5 flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[11px] text-ink/60">
                        Rule: {flag.rule}
                      </span>
                      {flag.atRisk > 0 ? (
                        <span className="text-xs font-bold">
                          <Money amount={flag.atRisk} paise /> at risk
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-ink/60">
                          Counted on the later bill
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              {atRisk > 0 ? (
                <p className="mt-2 px-1 text-[11px] text-ink/55">
                  Left alone, this bill costs you{' '}
                  <Money amount={atRisk} paise className="font-semibold" />.
                </p>
              ) : null}
            </section>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border-brutal bg-surface p-4 text-sm font-medium text-ink/70 shadow-brutal-sm">
              <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-brand-deep" />
              Nothing to query on this one.
            </p>
          )}

          <div className="overflow-hidden rounded-xl border-brutal bg-surface shadow-brutal-sm">
            <button
              type="button"
              aria-expanded={showSource}
              onClick={() => setShowSource((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="text-sm font-bold">The email it came from</span>
              <ChevronDown
                aria-hidden
                className={`h-4 w-4 shrink-0 text-ink/50 transition-transform ${
                  showSource ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showSource ? (
              <div className="border-t border-dashed border-rule px-4 py-3">
                <p className="text-xs font-semibold">{bill.source.subject || 'Pasted text'}</p>
                <p className="mt-0.5 text-[11px] text-ink/55">
                  {bill.source.from || 'Unknown sender'} ·{' '}
                  {formatDayTime(bill.source.receivedAt)}
                </p>
                <pre className="mt-2.5 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink/75">
                  {bill.source.body}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-rule bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {filed ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-brand-wash px-4 py-3.5 text-sm font-bold text-brand-deep">
            <CircleCheck aria-hidden className="h-4 w-4" />
            Filed to CleanTab
          </p>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="press w-full rounded-xl bg-brand-deep px-4 py-4 text-base font-bold text-on-brand shadow-brutal disabled:opacity-60"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : (
              'Send to CleanTab'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-sm font-semibold ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
