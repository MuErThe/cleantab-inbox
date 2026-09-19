import { useCallback, useEffect, useMemo, useState } from 'react';
import rawEmails from '@/data/emails.json';
import type { RawEmail } from '@/lib/extract';
import {
  buildPastedEmail,
  deriveInbox,
  EMPTY_STATE,
  parseStoredState,
  STORAGE_KEY,
  type StoredState,
} from '@/lib/inbox';

export const SAMPLE_EMAILS = rawEmails as RawEmail[];

function load(): StoredState {
  try {
    return parseStoredState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_STATE;
  }
}

export function useInbox() {
  const [state, setState] = useState<StoredState>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A blocked or full store must not stop the demo.
    }
  }, [state]);

  const derived = useMemo(() => deriveInbox(SAMPLE_EMAILS, state), [state]);

  const markFetched = useCallback(() => {
    setState((current) => ({ ...current, fetched: true }));
  }, []);

  const setFiled = useCallback((id: string, filed: boolean) => {
    setState((current) => ({
      ...current,
      filedIds: filed
        ? [...new Set([...current.filedIds, id])]
        : current.filedIds.filter((filedId) => filedId !== id),
    }));
  }, []);

  const addPaste = useCallback((text: string) => {
    const email = buildPastedEmail(text, new Date());
    setState((current) => ({
      ...current,
      pastedEmails: [...current.pastedEmails, email],
    }));
    return email.id;
  }, []);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  return { state, derived, markFetched, setFiled, addPaste, reset };
}
