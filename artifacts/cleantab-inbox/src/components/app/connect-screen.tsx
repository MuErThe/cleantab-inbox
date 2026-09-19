import { useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { Logomark } from './logo';

/* Enough to show there is something in there, without giving away the
   analysis — the numbers are the payoff. */
const TEASER = [
  'Amazon Web Services',
  'MakeMyTrip',
  'Zoho',
  'Swiggy',
  'WeWork India',
  'Airtel',
  'IndiGo',
  'Razorpay',
];

export function ConnectScreen({
  emailCount,
  onFetch,
}: {
  emailCount: number;
  onFetch: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <div className="flex min-h-full flex-col justify-between gap-6 p-5">
      <div>
        <Logomark className="h-14 w-auto rounded-xl" alt="CleanTab" />

        <h1 className="mt-5 font-display text-[1.7rem] leading-tight font-semibold">
          The bills you never
          <br />
          get round to snapping
        </h1>
        <p className="mt-2.5 text-sm font-medium text-ink/70">
          Most receipts are never photographed. They sit unread in your email,
          and the GST on them goes unclaimed. CleanTab can read them for you.
        </p>

        <div className="mt-5 rounded-2xl border-brutal bg-surface p-4 shadow-brutal-sm">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden className="h-4 w-4 text-brand-deep" />
            {emailCount} receipt emails waiting
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {TEASER.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1.5 rounded-full bg-ink/5 py-1 pr-2.5 pl-1"
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/10 text-[10px] font-bold text-ink/60"
                >
                  {name.charAt(0)}
                </span>
                <span className="text-xs font-medium text-ink/50">{name}</span>
              </li>
            ))}
            <li className="flex items-center rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/45">
              and {emailCount - TEASER.length} more
            </li>
          </ul>
        </div>
      </div>

      <div>
        <button
          ref={button}
          type="button"
          onClick={onFetch}
          className="press w-full rounded-xl bg-brand-deep px-4 py-4 text-base font-bold text-on-brand shadow-brutal"
        >
          Fetch from my inbox
        </button>
        <p className="mt-3 text-center text-[11px] text-ink/50">
          Sample data — no mailbox is connected.
        </p>
      </div>
    </div>
  );
}
