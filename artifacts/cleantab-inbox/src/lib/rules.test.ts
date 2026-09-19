import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { extractBill, parseEmailText, type RawEmail } from './extract.ts';
import { computeFlags, type FlagRule } from './flags.ts';
import { checkGstin } from './gstin.ts';
import {
  deriveInbox,
  EMPTY_STATE,
  parseStoredState,
  SAMPLE_PASTE,
} from './inbox.ts';

const emails: RawEmail[] = JSON.parse(
  readFileSync(new URL('../data/emails.json', import.meta.url), 'utf8'),
);

const bills = emails.map(extractBill);
const flags = computeFlags(bills);

const PLANTED_INVALID_GSTIN = '29AAFCP7719L1Z9';

const EXPECTED: Record<FlagRule, string[]> = {
  'duplicate-charge': ['em_006', 'em_007'],
  'price-rise': ['em_004'],
  'gstin-invalid': ['em_008'],
  'gst-without-gstin': ['em_009'],
};

function fired(rule: FlagRule): string[] {
  return Object.entries(flags)
    .filter(([, list]) => list.some((flag) => flag.rule === rule))
    .map(([id]) => id)
    .sort();
}

function billById(id: string) {
  const bill = bills.find((item) => item.id === id);
  assert.ok(bill, `expected a bill with id ${id}`);
  return bill;
}

test('the sample inbox holds exactly 30 emails with unique ids', () => {
  assert.equal(emails.length, 30);
  assert.equal(new Set(emails.map((email) => email.id)).size, 30);
});

test('the validator accepts known-good GSTINs', () => {
  assert.deepEqual(checkGstin('27AADCA4146P1ZD'), { ok: true });
  assert.deepEqual(checkGstin('33AAACZ2417K1ZE'), { ok: true });
  assert.deepEqual(checkGstin('07AAECM5681R1ZO'), { ok: true });
  // Spacing and lower case are tolerated.
  assert.deepEqual(checkGstin('27aadca4146p1zd'), { ok: true });
});

test('the validator rejects the planted GSTIN on its check digit', () => {
  assert.deepEqual(checkGstin(PLANTED_INVALID_GSTIN), {
    ok: false,
    why: 'check digit',
  });
});

test('the validator rejects malformed GSTINs on shape', () => {
  assert.deepEqual(checkGstin('99XX'), { ok: false, why: 'format' });
  assert.deepEqual(checkGstin('00AADCA4146P1ZD'), { ok: false, why: 'format' });
});

test('every GSTIN in the samples validates, bar the planted one', () => {
  bills.forEach((bill) => {
    if (!bill.gstin) return;
    if (bill.gstin === PLANTED_INVALID_GSTIN) {
      assert.equal(bill.id, 'em_008');
      return;
    }
    assert.deepEqual(
      checkGstin(bill.gstin),
      { ok: true },
      `${bill.id} carries an invalid GSTIN: ${bill.gstin}`,
    );
  });
});

test('each rule fires for exactly the intended bills', () => {
  (Object.keys(EXPECTED) as FlagRule[]).forEach((rule) => {
    assert.deepEqual(fired(rule), [...EXPECTED[rule]].sort(), `rule ${rule}`);
  });
});

test('no other bill carries a flag', () => {
  const expectedIds = new Set(Object.values(EXPECTED).flat());
  assert.deepEqual(Object.keys(flags).sort(), [...expectedIds].sort());
});

test('the duplicate is counted once, on the later of the two bills', () => {
  const later = flags.em_007.find((flag) => flag.rule === 'duplicate-charge');
  const earlier = flags.em_006.find((flag) => flag.rule === 'duplicate-charge');
  assert.equal(later?.atRisk, 8925);
  assert.equal(earlier?.atRisk, 0);
  assert.match(later?.reason ?? '', /MMT-FL-1002/);
});

test('the price rise names both months and the monthly difference', () => {
  const flag = flags.em_004.find((item) => item.rule === 'price-rise');
  assert.equal(flag?.atRisk, 150);
  assert.match(flag?.reason ?? '', /₹499 in July to ₹649 in August/);
});

test('the invalid GSTIN and missing GSTIN both risk the GST amount', () => {
  assert.equal(
    flags.em_008.find((flag) => flag.rule === 'gstin-invalid')?.atRisk,
    576,
  );
  assert.equal(
    flags.em_009.find((flag) => flag.rule === 'gst-without-gstin')?.atRisk,
    1800,
  );
});

test('a percentage in the GST label is not read as the GST amount', () => {
  const bill = extractBill({
    id: 'one',
    from: 'AWS Billing',
    fromEmail: 'no-reply-aws@amazon.com',
    subject: 'Invoice',
    receivedAt: '2026-08-03T00:00:00.000Z',
    body: 'Total before tax: ₹12,450.00\nGST (18%): ₹2,241.00\nTotal: ₹14,691.00',
  });
  assert.equal(bill.gst, 2241);
  assert.equal(bill.amount, 14691);
});

test('a GSTIN line before the GST line does not pollute the GST amount', () => {
  const bill = extractBill({
    id: 'two',
    from: 'Vendor',
    fromEmail: 'billing@vendor.in',
    subject: 'Invoice',
    receivedAt: '2026-08-03T00:00:00.000Z',
    body:
      'GSTIN: 27AADCA4146P1ZD\nTaxable value: ₹3,200.00\n' +
      'GST @18%: ₹576.00\nTotal payable: ₹3,776.00',
  });
  assert.equal(bill.gstin, '27AADCA4146P1ZD');
  assert.equal(bill.gst, 576);
  assert.equal(bill.amount, 3776);
});

test('the total is picked over the subtotal', () => {
  const bill = extractBill({
    id: 'three',
    from: 'Shop',
    fromEmail: 'orders@shop.in',
    subject: 'Receipt',
    receivedAt: '2026-08-03T00:00:00.000Z',
    body: 'Subtotal: ₹875.00\nGST @18%: ₹157.50\nGrand total: ₹1,032.50',
  });
  assert.equal(bill.amount, 1032.5);
});

test('CGST and SGST are summed', () => {
  assert.equal(billById('em_018').gst, 900);
  assert.equal(billById('em_029').gst, 450);
});

test('a foreign-currency bill with no GST raises nothing', () => {
  const bill = billById('em_010');
  assert.equal(bill.gst, 0);
  assert.equal(bill.gstin, null);
  assert.equal(bill.amount, 1776.4);
  assert.equal(flags[bill.id], undefined);
});

test('pasted text works with or without header lines', () => {
  const withHeaders = parseEmailText(
    'From: Zoho Billing <billing@zohocorp.com>\nSubject: Renewal\n\nTotal paid: ₹649.00',
    'p1',
    '2026-09-19T00:00:00.000Z',
  );
  assert.equal(withHeaders.fromEmail, 'billing@zohocorp.com');
  assert.equal(withHeaders.subject, 'Renewal');
  assert.equal(extractBill(withHeaders).merchant, 'Zoho');

  const bare = parseEmailText('Uber trip\nTotal: ₹412.65', 'p2', '2026-09-19T00:00:00.000Z');
  assert.equal(bare.subject, '');
  assert.equal(extractBill(bare).amount, 412.65);
});

test('pasting a copy of an existing bill flags a duplicate', () => {
  const pasted = parseEmailText(SAMPLE_PASTE, 'em_pasted_1', '2026-09-19T10:00:00.000Z');
  const withPaste = computeFlags([...bills, extractBill(pasted)]);
  const duplicate = withPaste.em_pasted_1?.find(
    (flag) => flag.rule === 'duplicate-charge',
  );
  assert.ok(duplicate, 'the pasted copy should be flagged as a duplicate');
  assert.equal(duplicate?.atRisk, 14278);
  assert.match(duplicate?.reason ?? '', /AWSIN-2026-08-4712/);
  // The original is flagged too, but the money is only counted once.
  assert.equal(
    withPaste.em_002?.find((flag) => flag.rule === 'duplicate-charge')?.atRisk,
    0,
  );
});

test('nothing is derived until the inbox has been fetched', () => {
  const before = deriveInbox(emails, EMPTY_STATE);
  assert.equal(before.bills.length, 0);
  assert.deepEqual(before.flags, {});
  assert.equal(before.totals.spend, 0);
  assert.equal(before.totals.atRisk, 0);
});

test('after fetching there are 30 bills and the four flag groups', () => {
  const after = deriveInbox(emails, { ...EMPTY_STATE, fetched: true });
  assert.equal(after.bills.length, 30);
  assert.equal(after.totals.bills, 30);
  assert.equal(Object.keys(after.flags).length, 5);
  assert.equal(after.totals.duplicates, 1);
  assert.equal(after.totals.priceRises, 1);
  assert.equal(after.totals.atRisk, 11451);
  const rules = new Set(
    Object.values(after.flags)
      .flat()
      .map((flag) => flag.rule),
  );
  assert.deepEqual(
    [...rules].sort(),
    ['duplicate-charge', 'gst-without-gstin', 'gstin-invalid', 'price-rise'],
  );
});

test('a missing or malformed saved value falls back to a fresh demo', () => {
  assert.deepEqual(parseStoredState(null), EMPTY_STATE);
  assert.deepEqual(parseStoredState('not json at all'), EMPTY_STATE);
  assert.deepEqual(parseStoredState('"a string"'), EMPTY_STATE);
  assert.deepEqual(
    parseStoredState('{"fetched":"yes","filedIds":"nope","pastedEmails":[{"id":1}]}'),
    EMPTY_STATE,
  );
  assert.deepEqual(
    parseStoredState('{"fetched":true,"filedIds":["em_001",7],"pastedEmails":[]}'),
    { fetched: true, filedIds: ['em_001'], pastedEmails: [] },
  );
});

test('spend and GST add up to the figures the summary shows', () => {
  const after = deriveInbox(emails, { ...EMPTY_STATE, fetched: true });
  assert.equal(after.totals.spend.toFixed(2), '117689.72');
  assert.equal(after.totals.gst.toFixed(2), '13996.75');
});
