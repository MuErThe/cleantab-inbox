import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { usePrefersReducedMotion } from './bits';

type Step = { label: string; counts: boolean };

const STEPS: Step[] = [
  { label: 'Connecting to your mailbox', counts: false },
  { label: 'Reading receipt emails', counts: true },
  { label: 'Extracting the bill from each one', counts: false },
  { label: 'Validating every GSTIN', counts: false },
  { label: 'Checking for duplicates and price rises', counts: false },
];

const STEP_MS = 440;

export function FetchingScreen({
  emailCount,
  onDone,
  onSkip,
}: {
  emailCount: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [read, setRead] = useState(0);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    skip.current?.focus();
    const timers: number[] = [];
    STEPS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => setStep(index + 1), STEP_MS * (index + 1)),
      );
    });
    for (let i = 1; i <= emailCount; i += 1) {
      timers.push(
        window.setTimeout(
          () => setRead(i),
          STEP_MS + (STEP_MS * 1.6 * i) / emailCount,
        ),
      );
    }
    timers.push(window.setTimeout(onDone, STEP_MS * STEPS.length + 320));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced, emailCount, onDone]);

  const done = Math.min(step, STEPS.length);
  const percent = Math.round((done / STEPS.length) * 100);

  return (
    <div className="flex min-h-full flex-col justify-between gap-6 p-5">
      <div>
        <p className="text-xs font-semibold tracking-widest text-ink/60 uppercase">
          Reading your inbox
        </p>
        <p className="mt-1 font-display text-2xl font-semibold">
          {percent}% done
        </p>

        <div
          aria-hidden
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="relative mt-5 overflow-hidden rounded-2xl border-brutal bg-surface shadow-brutal-sm">
          {step > 0 && step < STEPS.length ? (
            <span aria-hidden className="scan-line" />
          ) : null}
          {STEPS.map((item, index) => {
            const finished = index < done;
            const active = index === done;
            return (
              <li
                key={item.label}
                className="flex items-center gap-3 border-b border-dashed border-rule px-4 py-3 last:border-b-0"
              >
                <span aria-hidden className="w-5 shrink-0">
                  {finished ? (
                    <Check className="h-5 w-5 text-brand-deep" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin text-ink/45" />
                  ) : (
                    <span className="block h-2 w-2 translate-x-1.5 rounded-full bg-ink/20" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    finished || active
                      ? 'font-semibold text-ink'
                      : 'font-medium text-ink/45'
                  }`}
                >
                  {item.label}
                  {item.counts ? (
                    <span className="ml-1 font-normal text-ink/55 tabular-nums">
                      — {finished ? emailCount : read} of {emailCount} read
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        <p aria-live="polite" className="mt-3 px-1 text-xs text-ink/60">
          {done === 0
            ? 'Starting.'
            : done >= STEPS.length
              ? 'Done. Showing what we found.'
              : `Step ${done} of ${STEPS.length}: ${STEPS[done - 1].label}.`}
        </p>
      </div>

      <div>
        <button
          ref={skip}
          type="button"
          onClick={onSkip}
          className="press w-full rounded-xl border-brutal bg-surface px-4 py-3 text-sm font-bold text-brand-deep shadow-brutal-sm"
        >
          Skip to the results
        </button>
        <p className="mt-3 text-center text-[11px] text-ink/50">
          Sample data — no mailbox is connected.
        </p>
      </div>
    </div>
  );
}
