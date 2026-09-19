/* The four rules. Every flag carries a plain-English reason with the
   specifics in it, and the rupees the freelancer stands to lose. */

import type { Bill } from './extract.ts';
import { checkGstin } from './gstin.ts';
import { gapInWords, monthName, rupees } from './money.ts';

export type FlagRule =
  | 'duplicate-charge'
  | 'price-rise'
  | 'gstin-invalid'
  | 'gst-without-gstin';

export type Flag = {
  rule: FlagRule;
  title: string;
  reason: string;
  /** Rupees at stake. Counted once per finding, never on both halves of a pair. */
  atRisk: number;
};

export type FlagMap = Record<string, Flag[]>;

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function byDate(a: Bill, b: Bill): number {
  return (
    new Date(a.date).getTime() - new Date(b.date).getTime() ||
    new Date(a.source.receivedAt).getTime() -
      new Date(b.source.receivedAt).getTime()
  );
}

function groupBy(bills: Bill[], key: (bill: Bill) => string): Bill[][] {
  const groups = new Map<string, Bill[]>();
  bills.forEach((bill) => {
    const id = key(bill);
    const existing = groups.get(id);
    if (existing) existing.push(bill);
    else groups.set(id, [bill]);
  });
  return [...groups.values()];
}

function invoiceRef(bill: Bill): string {
  return bill.invoiceNumber ? ` (invoice ${bill.invoiceNumber})` : '';
}

/** Same merchant, same total, either minutes apart or dated the same day. */
function duplicateCharges(bills: Bill[], add: (id: string, flag: Flag) => void): void {
  groupBy(bills, (bill) => `${bill.merchant}|${bill.amount.toFixed(2)}`).forEach(
    (group) => {
      if (group.length < 2 || group[0].amount <= 0) return;
      const sorted = [...group].sort(
        (a, b) =>
          new Date(a.source.receivedAt).getTime() -
          new Date(b.source.receivedAt).getTime(),
      );
      for (let i = 1; i < sorted.length; i += 1) {
        const earlier = sorted[i - 1];
        const later = sorted[i];
        const gap =
          new Date(later.source.receivedAt).getTime() -
          new Date(earlier.source.receivedAt).getTime();
        const close = gap <= DAY_MS || sameDay(earlier.date, later.date);
        if (!close) continue;

        const money = rupees(later.amount);
        const when =
          gap <= DAY_MS
            ? `${gapInWords(earlier.source.receivedAt, later.source.receivedAt)} earlier`
            : 'on the same invoice date';
        add(later.id, {
          rule: 'duplicate-charge',
          title: 'Looks like a duplicate charge',
          reason: `Same ${money} charge from ${earlier.merchant} ${when}${invoiceRef(earlier)}.`,
          atRisk: later.amount,
        });
        add(earlier.id, {
          rule: 'duplicate-charge',
          title: 'Charged twice',
          reason: `${later.merchant} billed the same ${money} again${invoiceRef(later)}, so one of the two needs cancelling.`,
          atRisk: 0,
        });
      }
    },
  );
}

/** A recurring bill that quietly went up between one month and the next. */
function priceRises(bills: Bill[], add: (id: string, flag: Flag) => void): void {
  const recurring = bills.filter((bill) => bill.frequency === 'Recurring');
  groupBy(recurring, (bill) => bill.merchant).forEach((group) => {
    if (group.length < 2) return;
    const sorted = [...group].sort(byDate);
    for (let i = 1; i < sorted.length; i += 1) {
      const before = sorted[i - 1];
      const after = sorted[i];
      const rise = after.amount - before.amount;
      const gap = new Date(after.date).getTime() - new Date(before.date).getTime();
      if (rise < 20 || rise < before.amount * 0.02) continue;
      if (gap < 20 * DAY_MS || gap > 70 * DAY_MS) continue;
      add(after.id, {
        rule: 'price-rise',
        title: 'Price went up',
        reason: `Went from ${rupees(before.amount)} in ${monthName(before.date)} to ${rupees(after.amount)} in ${monthName(after.date)} — ${rupees(rise)} more each month.`,
        atRisk: rise,
      });
    }
  });
}

/** A GSTIN that is printed but cannot be real. */
function invalidGstins(bills: Bill[], add: (id: string, flag: Flag) => void): void {
  bills.forEach((bill) => {
    if (!bill.gstin) return;
    const result = checkGstin(bill.gstin);
    if (result.ok) return;
    const fault =
      result.why === 'check digit'
        ? 'fails the check digit'
        : 'is not a valid GSTIN shape';
    add(bill.id, {
      rule: 'gstin-invalid',
      title: 'GSTIN does not check out',
      reason: `GSTIN ${bill.gstin} ${fault}, so input credit on ${rupees(bill.gst)} GST may be refused.`,
      atRisk: bill.gst,
    });
  });
}

/** GST charged with nothing to claim it against. */
function gstWithoutGstin(bills: Bill[], add: (id: string, flag: Flag) => void): void {
  bills.forEach((bill) => {
    if (bill.gst <= 0 || bill.gstin) return;
    add(bill.id, {
      rule: 'gst-without-gstin',
      title: 'GST charged with no GSTIN',
      reason: `Charges ${rupees(bill.gst)} GST but shows no GSTIN, so that GST cannot be claimed.`,
      atRisk: bill.gst,
    });
  });
}

/** Recomputed over every bill each time one is added, so pasted bills flag live. */
export function computeFlags(bills: Bill[]): FlagMap {
  const map: FlagMap = {};
  const add = (id: string, flag: Flag) => {
    const list = map[id];
    if (list) list.push(flag);
    else map[id] = [flag];
  };

  duplicateCharges(bills, add);
  priceRises(bills, add);
  invalidGstins(bills, add);
  gstWithoutGstin(bills, add);
  return map;
}

export function totalAtRisk(flags: FlagMap): number {
  return Object.values(flags)
    .flat()
    .reduce((sum, flag) => sum + flag.atRisk, 0);
}

export function countRule(flags: FlagMap, rule: FlagRule): number {
  return Object.values(flags)
    .flat()
    .filter((flag) => flag.rule === rule && flag.atRisk > 0).length;
}
