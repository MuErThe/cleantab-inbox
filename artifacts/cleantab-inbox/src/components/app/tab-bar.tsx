import { Inbox, PieChart, Plus } from 'lucide-react';

export type Tab = 'summary' | 'inbox' | 'add';

const TABS: { id: Tab; label: string; Icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', Icon: Inbox },
  { id: 'summary', label: 'Summary', Icon: PieChart },
  { id: 'add', label: 'Add', Icon: Plus },
];

export function TabBar({
  tab,
  onChange,
  flaggedCount,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  flaggedCount: number;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex items-stretch border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={
              id === 'inbox' && flaggedCount > 0
                ? `Inbox, ${flaggedCount} bills need a look`
                : undefined
            }
            onClick={() => onChange(id)}
            className={`press flex flex-1 flex-col items-center justify-center gap-1 py-2.5 ${
              active ? 'text-brand-deep' : 'text-ink/55 hover:text-ink'
            }`}
          >
            <span className="relative">
              <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
              {id === 'inbox' && flaggedCount > 0 ? (
                <span className="absolute -top-1 -right-2 rounded-full bg-coral px-1 text-[10px] leading-4 font-bold text-white">
                  {flaggedCount}
                </span>
              ) : null}
            </span>
            <span
              className={`text-[11px] leading-none tracking-tight ${
                active ? 'font-bold' : 'font-medium'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
