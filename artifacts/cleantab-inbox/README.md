# CleanTab Inbox

A module for CleanTab, the Indian receipts-and-tax app for freelancers. It
reads receipt emails, pulls the bill out of each one, validates every GSTIN and
flags duplicate charges, quiet price rises and invoices whose GST cannot be
claimed.

Everything is sample data held in this repo. No mailbox is connected, nothing
is sent anywhere, and there are no API keys or backend calls.

## Running it

The Vite config requires `PORT` and `BASE_PATH`, which Replit injects for you.
Locally, set them on the command line:

```sh
pnpm install
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/cleantab-inbox run dev
```

In Replit, import the repo, let it install, then run the artifact's `web`
service — `.replit-artifact/artifact.toml` already sets `PORT` and
`BASE_PATH`, so nothing else is needed.

Other commands:

```sh
pnpm --filter @workspace/cleantab-inbox run test        # logic tests, bare Node
pnpm --filter @workspace/cleantab-inbox run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/cleantab-inbox run build
```

The tests use `node --test` and import nothing outside Node's standard library,
so the rules stay testable without installing anything.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/data/emails.json` | The 30 raw receipt emails. Sender, subject, arrival time and body only — no pre-extracted fields |
| `src/lib/gstin.ts` | The GSTIN check-digit algorithm, plus typed wrappers |
| `src/lib/extract.ts` | The one parser: merchant, invoice date, total, GST, GSTIN, category, purpose, billing frequency, invoice number |
| `src/lib/flags.ts` | The four rules: `duplicate-charge`, `price-rise`, `gstin-invalid`, `gst-without-gstin` |
| `src/lib/inbox.ts` | Everything derived from the emails, plus the saved-state shape |
| `src/lib/rules.test.ts` | The logic tests |
| `src/components/app/` | The screens: connect, fetching, summary, inbox, bill detail, add |

Bills and flags are never stored. Only `{ fetched, filedIds, pastedEmails }`
goes into `localStorage`, under `cleantab_inbox_v3`; the rest is recomputed on
every load, so a pasted bill is judged against the whole inbox.

## The demo

First load shows a connect screen. Fetching starts on a click, takes about two
and a half seconds and can be skipped. The summary then reveals what was found,
including the four planted anomalies. "Reset demo" in the summary footer takes
it back to the connect screen, so the fetch can be performed again live.
