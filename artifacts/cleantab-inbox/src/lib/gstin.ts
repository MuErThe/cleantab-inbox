// @ts-nocheck
/* The GSTIN check-digit algorithm, kept exactly as supplied. Type checking is
   off for this file only; the typed wrappers at the bottom are what the rest
   of the app imports. */

const C = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RE = /^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function checkDigit(g14) {
  let f = 2, s = 0;
  for (let i = 13; i >= 0; i--) {
    const d = f * C.indexOf(g14[i]);
    f = f === 2 ? 1 : 2;
    s += Math.floor(d / 36) + (d % 36);
  }
  return C[(36 - (s % 36)) % 36];
}
function validateGSTIN(raw) {
  const g = raw.toUpperCase().replace(/\s/g, "");
  if (!RE.test(g)) return { ok: false, why: "format" };
  return checkDigit(g.slice(0, 14)) === g[14]
    ? { ok: true } : { ok: false, why: "check digit" };
}

export type GstinCheck =
  | { ok: true; why?: undefined }
  | { ok: false; why: 'format' | 'check digit' };

/** Judges a GSTIN candidate: right shape, then right check digit. */
export const checkGstin: (raw: string) => GstinCheck = validateGSTIN;

/** The 15th character a valid GSTIN ending in these 14 would carry. */
export const gstinCheckDigit: (first14: string) => string = checkDigit;
