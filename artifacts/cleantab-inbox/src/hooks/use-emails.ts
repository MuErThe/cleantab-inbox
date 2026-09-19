import { useState, useEffect } from 'react';
import { INITIAL_EMAILS, ReceiptEmail, validateGSTIN } from '../data';

const STORAGE_KEY = 'cleantab_emails_v2';

export function useEmails() {
  const [emails, setEmails] = useState<ReceiptEmail[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved emails', e);
      }
    }
    return INITIAL_EMAILS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  }, [emails]);

  const markFiled = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, filed: true } : e));
  };

  const resetDemo = () => {
    setEmails(INITIAL_EMAILS);
  };

  const addEmail = (rawText: string) => {
    // Deterministic parsing heuristics
    // Looking for: merchant, date, amount, gst, gstin, etc.
    const lowerText = rawText.toLowerCase();
    
    // Merchant guessing
    let merchant = "Unknown Merchant";
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) merchant = lines[0]; // naive assumption: first line is merchant or subject
    
    // Amount & GST guessing
    // Look for ₹ or Rs. followed by numbers
    const amountMatch = rawText.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
    let amount = 0;
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    
    const gstMatch = rawText.match(/gst[^0-9]*([\d,]+(?:\.\d{1,2})?)/i);
    let gst = 0;
    if (gstMatch) {
      gst = parseFloat(gstMatch[1].replace(/,/g, ''));
    }
    
    // GSTIN guessing: Look for 15 char alphanumeric starting with 2 digits
    const gstinMatch = rawText.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/);
    const gstin = gstinMatch ? gstinMatch[1] : null;
    
    let flags: string[] = [];
    if (gst > 0 && !gstin) {
      flags.push("Invoice charges GST but no GSTIN provided");
    } else if (gstin) {
      const validation = validateGSTIN(gstin);
      if (!validation.ok) {
        flags.push("Invalid GSTIN format or check digit");
      }
    }
    
    const newEmail: ReceiptEmail = {
      id: `rec_pasted_${Date.now()}`,
      sender: "Pasted Receipt",
      senderEmail: "pasted@local",
      subject: "Pasted Receipt Data",
      body: rawText,
      merchant,
      date: new Date().toISOString(),
      amount,
      gst,
      gstin,
      category: "Uncategorized",
      purpose: "Business",
      frequency: "One-off",
      flags,
      filed: false,
      invoiceNumber: `PST-${Math.floor(Math.random()*1000)}`
    };
    
    setEmails(prev => [newEmail, ...prev]);
    return newEmail.id;
  };

  return { emails, markFiled, resetDemo, addEmail };
}
