import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';
import { checkGstin } from '@/lib/gstin';

/** Amounts are set in Fraunces; the ₹ sign is not in that face, so it is
    set in the sans beside the figures. */
export function Money({
  amount,
  className = '',
  paise = false,
}: {
  amount: number;
  className?: string;
  paise?: boolean;
}) {
  const digits = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: paise ? 2 : 0,
    maximumFractionDigits: paise ? 2 : 0,
  }).format(amount);
  return (
    <span className={`inline-flex items-baseline gap-[0.15em] ${className}`}>
      <span className="font-sans text-[0.72em] font-medium opacity-60">₹</span>
      <span className="font-amount">{digits}</span>
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-ink/60 uppercase">
      {children}
    </h2>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-widest text-ink/60 uppercase">
      {children}
    </p>
  );
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function formatDayTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Counts a headline number into place. Instant for reduced motion. */
export function useCountUp(target: number, run: boolean): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced || !run ? target : 0);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced || !run) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 720;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, run, reduced]);

  return value;
}

export type GstinVerdict = {
  tone: 'good' | 'bad' | 'missing';
  label: string;
  Icon: typeof CircleCheck;
};

export function gstinVerdict(gstin: string | null): GstinVerdict {
  if (!gstin) {
    return { tone: 'missing', label: 'Not provided', Icon: CircleHelp };
  }
  const result = checkGstin(gstin);
  if (result.ok) return { tone: 'good', label: 'Valid', Icon: CircleCheck };
  return {
    tone: 'bad',
    label: result.why === 'format' ? 'Invalid shape' : 'Invalid check digit',
    Icon: CircleAlert,
  };
}

export function Tile({
  label,
  children,
  note,
}: {
  label: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-xl border-brutal bg-surface p-3 shadow-brutal-sm">
      <p className="text-[11px] font-semibold tracking-wider text-ink/55 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{children}</p>
      {note ? <p className="mt-0.5 text-[11px] text-ink/50">{note}</p> : null}
    </div>
  );
}
