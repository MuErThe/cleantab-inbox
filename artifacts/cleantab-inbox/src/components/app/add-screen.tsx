import { useRef, useState } from 'react';
import { CircleAlert, Sparkles } from 'lucide-react';
import { extractBill, parseEmailText } from '@/lib/extract';
import { SAMPLE_PASTE } from '@/lib/inbox';

export function AddScreen({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError(
        'There is nothing to read yet. Paste the text of a receipt email into the box, then try again.',
      );
      field.current?.focus();
      return;
    }
    const preview = extractBill(parseEmailText(trimmed, 'preview', new Date().toISOString()));
    if (preview.amount <= 0) {
      setError(
        'No rupee total found in that text. Check the email includes a line such as "Total: ₹1,234.00", then try again.',
      );
      field.current?.focus();
      return;
    }
    setError('');
    setText('');
    onAdd(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-4 pb-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Add a bill by hand</h2>
        <p className="mt-1 text-sm font-medium text-ink/70">
          Paste a receipt email and CleanTab reads it the same way it read your
          inbox, then checks it against everything already filed.
        </p>
      </div>

      <div>
        <label
          htmlFor="paste-email"
          className="block text-sm font-bold"
        >
          Receipt email text
        </label>
        <p id="paste-help" className="mt-1 text-xs text-ink/60">
          The whole email is fine, headers and all. Plain text only.
        </p>
        <textarea
          id="paste-email"
          ref={field}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={9}
          aria-describedby={error ? 'paste-help paste-error' : 'paste-help'}
          aria-invalid={error ? true : undefined}
          className="mt-2 w-full resize-y rounded-xl border-brutal bg-surface p-3 font-mono text-xs leading-relaxed shadow-brutal-sm"
        />
        {error ? (
          <p
            id="paste-error"
            className="mt-2 flex items-start gap-2 rounded-xl bg-coral/20 px-3 py-2 text-xs font-medium"
          >
            <CircleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="press w-full rounded-xl bg-brand-deep px-4 py-3.5 text-base font-bold text-on-brand shadow-brutal"
        >
          Read this bill
        </button>
        <button
          type="button"
          onClick={() => {
            setText(SAMPLE_PASTE);
            setError('');
            field.current?.focus();
          }}
          className="press flex w-full items-center justify-center gap-2 rounded-xl border-brutal bg-surface px-4 py-3 text-sm font-bold text-brand-deep shadow-brutal-sm"
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Try a sample
        </button>
      </div>

      <p className="text-[11px] text-ink/50">
        Nothing leaves this device. The sample is a second copy of an invoice
        already in the inbox, so you can watch a rule fire.
      </p>
    </form>
  );
}
