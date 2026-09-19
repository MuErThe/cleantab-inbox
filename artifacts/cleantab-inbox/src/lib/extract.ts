/* One extractor, used for both the sample emails and anything pasted in.
   Plain string work only — no dependencies, so the logic is testable on its
   own. */

export type Purpose = 'Business' | 'Personal';
export type Frequency = 'Recurring' | 'One-off';

export type RawEmail = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  body: string;
};

export type Bill = {
  id: string;
  merchant: string;
  /** Invoice date where the email states one, otherwise when it arrived. */
  date: string;
  /** The total actually charged, in rupees. */
  amount: number;
  gst: number;
  gstin: string | null;
  category: string;
  purpose: Purpose;
  frequency: Frequency;
  invoiceNumber: string | null;
  source: RawEmail;
};

type MerchantEntry = {
  tokens: string[];
  name: string;
  category: string;
  purpose: Purpose;
};

/* Ordered: the first match wins, so narrower names come before broader ones
   ("amazon web services" ahead of "amazon business"). */
const MERCHANTS: MerchantEntry[] = [
  { tokens: ['aws', 'amazon web services'], name: 'Amazon Web Services', category: 'Cloud', purpose: 'Business' },
  { tokens: ['amazon business', 'amazon seller services'], name: 'Amazon Business', category: 'Office supplies', purpose: 'Business' },
  { tokens: ['zoho'], name: 'Zoho', category: 'Software', purpose: 'Business' },
  { tokens: ['makemytrip', 'make my trip'], name: 'MakeMyTrip', category: 'Travel', purpose: 'Business' },
  { tokens: ['indigo', 'goindigo', 'interglobe aviation'], name: 'IndiGo', category: 'Travel', purpose: 'Business' },
  { tokens: ['uber'], name: 'Uber', category: 'Transport', purpose: 'Business' },
  { tokens: ['olacabs', 'ola cabs', 'ani technologies'], name: 'Ola', category: 'Transport', purpose: 'Business' },
  { tokens: ['swiggy', 'bundl technologies'], name: 'Swiggy', category: 'Food', purpose: 'Personal' },
  { tokens: ['bigbasket', 'supermarket grocery'], name: 'BigBasket', category: 'Groceries', purpose: 'Personal' },
  { tokens: ['netflix'], name: 'Netflix', category: 'Entertainment', purpose: 'Personal' },
  { tokens: ['icloud', 'apple'], name: 'Apple', category: 'Entertainment', purpose: 'Personal' },
  { tokens: ['airtel'], name: 'Airtel', category: 'Telecom', purpose: 'Business' },
  { tokens: ['google workspace', 'google cloud', 'payments-noreply@google'], name: 'Google Workspace', category: 'Software', purpose: 'Business' },
  { tokens: ['notion'], name: 'Notion', category: 'Software', purpose: 'Business' },
  { tokens: ['adobe'], name: 'Adobe', category: 'Software', purpose: 'Business' },
  { tokens: ['zoom'], name: 'Zoom', category: 'Software', purpose: 'Business' },
  { tokens: ['hostinger'], name: 'Hostinger', category: 'Cloud', purpose: 'Business' },
  { tokens: ['razorpay'], name: 'Razorpay', category: 'Payments', purpose: 'Business' },
  { tokens: ['cleartax', 'defmacro'], name: 'ClearTax', category: 'Finance', purpose: 'Business' },
  { tokens: ['wework'], name: 'WeWork India', category: 'Coworking', purpose: 'Business' },
  { tokens: ['bescom', 'bangalore electricity'], name: 'BESCOM', category: 'Utilities', purpose: 'Business' },
  { tokens: ['the park', 'apeejay surrendra'], name: 'The Park Bengaluru', category: 'Travel', purpose: 'Business' },
];

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/\b(coworking|co-working|hot desk|day pass|meeting room)\b/, 'Coworking'],
  [/\b(print|printing|stationery|toner|cartridge|business cards)\b/, 'Office supplies'],
  [/\b(flight|airline|boarding|hotel|check-in|itinerary)\b/, 'Travel'],
  [/\b(cab|ride|taxi|trip fare|auto fare)\b/, 'Transport'],
  [/\b(hosting|server|compute|storage|bandwidth|cloud)\b/, 'Cloud'],
  [/\b(broadband|electricity|water bill|units consumed)\b/, 'Utilities'],
  [/\b(restaurant|food order|delivery partner|grocer)\b/, 'Food'],
  [/\b(subscription|licence|license|seats|plan renews)\b/, 'Software'],
];

const PERSONAL_KEYWORDS =
  /\b(netflix|spotify|hotstar|icloud|prime video|grocer|food order|personal use)\b/;

const RECURRING_KEYWORDS =
  /\b(subscription|renewal|renews|recurring|monthly|billing period|billing cycle|next billing|auto-?pay|autopay|postpaid)\b/;

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

/* A line that closes the bill. Anything matching this is a total, never a tax
   line, which is what stops "Total paid (incl. GST): ₹499" being read as GST. */
const TOTAL_LABELS: [RegExp, number][] = [
  [/\b(grand total|total paid|total payable|amount charged|amount payable|amount paid|net payable|total due|charged to (?:your|the) card|total amount)\b/, 3],
  [/\btotal\b/, 2],
];

const NOT_A_TOTAL =
  /\b(sub-?total|total before|total excluding|taxable value|total savings|total items|running total)\b/;

const MONEY = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;

/** Every 15-character block that could be a GSTIN, valid or not. */
const GSTIN_CANDIDATE = /\b[0-9A-Z]{15}\b/g;
const GSTIN_SHAPE = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/;
const GSTIN_LABEL = /\bgstin\b|\bgst\s*(?:no\.?|number|reg(?:istration)?)\b/i;

function moneyOn(line: string): number[] {
  const found: number[] = [];
  for (const m of line.matchAll(MONEY)) {
    found.push(Number(m[1].replace(/,/g, '')));
  }
  return found;
}

function isTotalLine(lower: string): number {
  if (NOT_A_TOTAL.test(lower)) return 0;
  for (const [re, weight] of TOTAL_LABELS) {
    if (re.test(lower)) return weight;
  }
  return 0;
}

/** The total actually charged: the best-labelled money line, latest wins. */
function findAmount(lines: string[]): number {
  let best = 0;
  let bestWeight = 0;
  lines.forEach((line) => {
    const weight = isTotalLine(line.toLowerCase());
    if (weight === 0) return;
    const values = moneyOn(line);
    if (values.length === 0) return;
    if (weight >= bestWeight) {
      bestWeight = weight;
      // First figure on the line: a trailing bracket may hold a conversion rate.
      best = values[0];
    }
  });
  if (best > 0) return best;
  // Nothing labelled: fall back to the largest rupee figure in the email.
  const all = lines.flatMap(moneyOn);
  return all.length > 0 ? Math.max(...all) : 0;
}

/** GST actually charged. Percentages and GSTIN digits are stripped first. */
function findGst(lines: string[]): number {
  const split: number[] = [];
  const igst: number[] = [];
  const plain: number[] = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (isTotalLine(lower) > 0) return;
    const cleaned = line
      .replace(GSTIN_CANDIDATE, ' ')
      .replace(/[0-9]+(?:\.[0-9]+)?\s*%/g, ' ');
    const values = moneyOn(cleaned);
    if (values.length === 0) return;
    const value = values[0];
    if (/\b(cgst|sgst|utgst)\b/.test(lower)) split.push(value);
    else if (/\bigst\b/.test(lower)) igst.push(value);
    else if (/\bgst\b/.test(lower) && !/\bgstin\b/.test(lower)) plain.push(value);
  });

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  if (split.length > 0) return sum(split) + sum(igst);
  if (igst.length > 0) return sum(igst);
  return sum(plain);
}

/** The GSTIN as printed, however mangled — validating it is a separate job. */
function findGstin(lines: string[], body: string): string | null {
  for (const line of lines) {
    if (!GSTIN_LABEL.test(line)) continue;
    const match = line.toUpperCase().match(GSTIN_CANDIDATE);
    if (match) return match[0];
  }
  const loose = body.toUpperCase().match(GSTIN_SHAPE);
  return loose ? loose[0] : null;
}

function findInvoiceNumber(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(
      /\b(?:invoice|bill|receipt|order|reference|txn|transaction)\s*(?:no\.?|number|id|#)?\s*[:#]\s*([A-Za-z0-9][A-Za-z0-9/_-]{3,})/i,
    );
    if (match) return match[1];
  }
  return null;
}

function toIsoDay(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month, day));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDateValue(value: string): string | null {
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return toIsoDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) return toIsoDay(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const dMonY = value.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (dMonY) {
    const month = MONTHS.indexOf(dMonY[2].slice(0, 3).toLowerCase());
    return toIsoDay(Number(dMonY[3]), month, Number(dMonY[1]));
  }

  const monDY = value.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monDY) {
    const month = MONTHS.indexOf(monDY[1].slice(0, 3).toLowerCase());
    return toIsoDay(Number(monDY[3]), month, Number(monDY[2]));
  }
  return null;
}

function findDate(lines: string[], fallback: string): string {
  const labelled = /\b(invoice date|bill date|billing date|date of issue|issue date|statement date|order date|paid on|charged on|date)\b\s*[:-]?\s*(.+)$/i;
  for (const line of lines) {
    const match = line.match(labelled);
    if (!match) continue;
    const parsed = parseDateValue(match[2]);
    if (parsed) return parsed;
  }
  return fallback;
}

function findMerchant(email: RawEmail): MerchantEntry | null {
  const haystack =
    `${email.fromEmail} ${email.from} ${email.subject} ${email.body}`.toLowerCase();
  for (const entry of MERCHANTS) {
    if (entry.tokens.some((token) => haystack.includes(token))) return entry;
  }
  return null;
}

function fallbackMerchant(email: RawEmail, lines: string[]): string {
  if (email.from.trim()) return email.from.trim();
  const domain = email.fromEmail.split('@')[1];
  if (domain) {
    const label = domain.split('.')[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return lines[0]?.slice(0, 40) ?? 'Unknown sender';
}

/** Keyword fallback, used only when the sender is not a known merchant. */
function classify(text: string, fallback: string): string {
  for (const [re, category] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return fallback;
}

/** Turns pasted text into an email, with or without header lines. */
export function parseEmailText(text: string, id: string, now: string): RawEmail {
  const lines = text.split(/\r?\n/);
  let from = '';
  let fromEmail = '';
  let subject = '';
  let receivedAt = now;

  lines.slice(0, 12).forEach((line) => {
    const header = line.match(/^\s*(from|sender|subject|date|sent|received)\s*:\s*(.+)$/i);
    if (!header) return;
    const key = header[1].toLowerCase();
    const value = header[2].trim();
    if (key === 'from' || key === 'sender') {
      const address = value.match(/<([^>]+)>/) ?? value.match(/([\w.+-]+@[\w.-]+)/);
      if (address) fromEmail = address[1].trim();
      from = value.replace(/<[^>]*>/, '').replace(/"/g, '').trim() || fromEmail;
    } else if (key === 'subject') {
      subject = value;
    } else {
      const parsed = parseDateValue(value);
      if (parsed) receivedAt = parsed;
    }
  });

  return { id, from, fromEmail, subject, receivedAt, body: text };
}

export function extractBill(email: RawEmail): Bill {
  const lines = email.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const searchable = `${email.subject} ${email.body}`.toLowerCase();

  const entry = findMerchant(email);
  const gstin = findGstin(lines, email.body);

  return {
    id: email.id,
    merchant: entry ? entry.name : fallbackMerchant(email, lines),
    date: findDate(lines, email.receivedAt),
    amount: findAmount(lines),
    gst: findGst(lines),
    gstin,
    category: entry ? entry.category : classify(searchable, 'Uncategorised'),
    purpose: entry
      ? entry.purpose
      : PERSONAL_KEYWORDS.test(searchable)
        ? 'Personal'
        : 'Business',
    frequency: RECURRING_KEYWORDS.test(searchable) ? 'Recurring' : 'One-off',
    invoiceNumber: findInvoiceNumber(lines),
    source: email,
  };
}
