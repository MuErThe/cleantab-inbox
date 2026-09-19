/** Rupees in Indian digit grouping, paise only when there are paise. */
export function rupees(amount: number): string {
  const whole = Math.abs(amount % 1) < 0.005;
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount)}`;
}

/** Full month name, used in the plain-English flag reasons. */
export function monthName(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** "5 minutes", "2 hours" — the gap between two duplicate charges. */
export function gapInWords(earlier: string, later: string): string {
  const minutes = Math.round(
    (new Date(later).getTime() - new Date(earlier).getTime()) / 60000,
  );
  if (minutes < 1) return 'moments';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
