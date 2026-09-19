/* Everything derived from the sample emails plus whatever the user has
   pasted. Nothing here is stored: bills and flags are recomputed each time,
   so a new paste re-judges the whole inbox. */

import { extractBill, parseEmailText, type Bill, type RawEmail } from './extract.ts';
import {
  computeFlags,
  countRule,
  totalAtRisk,
  type FlagMap,
} from './flags.ts';

export const STORAGE_KEY = 'cleantab_inbox_v3';

export type StoredState = {
  /** The inbox is only read once the user asks for it. */
  fetched: boolean;
  filedIds: string[];
  pastedEmails: RawEmail[];
};

export const EMPTY_STATE: StoredState = {
  fetched: false,
  filedIds: [],
  pastedEmails: [],
};

export type CategoryTotal = { category: string; total: number };

export type Derived = {
  bills: Bill[];
  flags: FlagMap;
  filed: string[];
  totals: {
    bills: number;
    spend: number;
    gst: number;
    flagged: number;
    priceRises: number;
    duplicates: number;
    atRisk: number;
  };
  byCategory: CategoryTotal[];
};

const EMPTY_DERIVED: Derived = {
  bills: [],
  flags: {},
  filed: [],
  totals: {
    bills: 0,
    spend: 0,
    gst: 0,
    flagged: 0,
    priceRises: 0,
    duplicates: 0,
    atRisk: 0,
  },
  byCategory: [],
};

function isRawEmail(value: unknown): value is RawEmail {
  if (typeof value !== 'object' || value === null) return false;
  const email = value as Record<string, unknown>;
  return (
    typeof email.id === 'string' &&
    typeof email.from === 'string' &&
    typeof email.fromEmail === 'string' &&
    typeof email.subject === 'string' &&
    typeof email.receivedAt === 'string' &&
    typeof email.body === 'string'
  );
}

/** Reads what was saved last time, discarding anything the wrong shape. */
export function parseStoredState(raw: string | null): StoredState {
  if (!raw) return EMPTY_STATE;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_STATE;
  }
  if (typeof value !== 'object' || value === null) return EMPTY_STATE;
  const saved = value as Record<string, unknown>;
  const filedIds = Array.isArray(saved.filedIds)
    ? saved.filedIds.filter((id): id is string => typeof id === 'string')
    : [];
  const pastedEmails = Array.isArray(saved.pastedEmails)
    ? saved.pastedEmails.filter(isRawEmail)
    : [];
  return { fetched: saved.fetched === true, filedIds, pastedEmails };
}

export function deriveInbox(samples: RawEmail[], state: StoredState): Derived {
  if (!state.fetched) return EMPTY_DERIVED;

  const emails = [...samples, ...state.pastedEmails];
  const bills = emails.map(extractBill);
  const flags = computeFlags(bills);

  const spend = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const gst = bills.reduce((sum, bill) => sum + bill.gst, 0);

  const categories = new Map<string, number>();
  bills.forEach((bill) => {
    categories.set(bill.category, (categories.get(bill.category) ?? 0) + bill.amount);
  });

  return {
    bills,
    flags,
    filed: state.filedIds,
    totals: {
      bills: bills.length,
      spend,
      gst,
      flagged: Object.keys(flags).length,
      priceRises: countRule(flags, 'price-rise'),
      duplicates: countRule(flags, 'duplicate-charge'),
      atRisk: totalAtRisk(flags),
    },
    byCategory: [...categories.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Turns pasted text into an email that can be appended to the state. */
export function buildPastedEmail(text: string, now: Date): RawEmail {
  return parseEmailText(text, `em_pasted_${now.getTime()}`, now.toISOString());
}

/* The email behind "Try a sample": a second copy of an AWS invoice that is
   already in the inbox, so the duplicate rule fires in front of an audience. */
export const SAMPLE_PASTE = `From: AWS Billing <no-reply-aws@amazon.com>
Subject: Your AWS invoice for August 2026 is available

Amazon Web Services India Private Limited
9th Floor, Block E, Prestige Tech Park, Bengaluru 560103
GSTIN: 27AADCA4146P1ZD

Invoice number: AWSIN-2026-08-5519
Invoice date: 03 Sep 2026
Account: 8841-2290-4417

Total before tax: Rs. 12,100.00
IGST @18%: Rs. 2,178.00
Total for this invoice: Rs. 14,278.00

AWS Billing`;
