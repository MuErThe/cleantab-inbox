import { useState, useMemo, FormEvent, ElementType } from 'react';
import { useEmails } from '@/hooks/use-emails';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatINR, formatDate, formatDateTime } from '@/lib/utils';
import { ReceiptEmail } from '@/data';
import { 
  AlertCircle,
  ArrowRight,
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  IndianRupee, 
  Mail, 
  RefreshCcw, 
  Search, 
  ShieldAlert, 
  TrendingUp, 
  Plus,
  Building2,
  Calendar,
  Tag,
  Receipt
} from 'lucide-react';

export default function Home() {
  const { emails, markFiled, resetDemo, addEmail } = useEmails();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'flagged'|'unfiled'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [pasteText, setPasteText] = useState('');
  const [showPasteSuccess, setShowPasteSuccess] = useState(false);

  // Metrics calculation
  const metrics = useMemo(() => {
    let spend = 0;
    let gst = 0;
    let flagged = 0;
    let priceRises = 0;
    const dupFlags = new Set<string>();

    emails.forEach(e => {
      spend += e.amount;
      gst += e.gst;
      if (e.flags.length > 0) flagged++;
      
      e.flags.forEach((f: string) => {
        if (f.toLowerCase().includes('price increased')) priceRises++;
        if (f.toLowerCase().includes('duplicate')) {
          dupFlags.add(f);
        }
      });
    });

    return {
      billsFound: emails.length,
      spend,
      gst,
      flagged,
      priceRises,
      duplicates: dupFlags.size
    };
  }, [emails]);

  const filteredEmails = useMemo(() => {
    return emails.filter(e => {
      if (filter === 'flagged' && e.flags.length === 0) return false;
      if (filter === 'unfiled' && e.filed) return false;
      
      if (search) {
        const q = search.toLowerCase();
        return (
          e.merchant.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.sender.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [emails, search, filter]);

  const selectedEmail = emails.find(e => e.id === selectedId);

  const handlePasteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    const newId = addEmail(pasteText);
    setPasteText('');
    setSelectedId(newId);
    setShowPasteSuccess(true);
    setTimeout(() => setShowPasteSuccess(false), 3000);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Receipt className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-serif font-semibold tracking-tight">CleanTab Inbox</h1>
        </div>
        <Button variant="outline" size="sm" onClick={resetDemo} className="gap-2 text-muted-foreground hover:text-foreground">
          <RefreshCcw className="w-4 h-4" />
          Reset Demo
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Dashboard Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard title="Bills Found" value={metrics.billsFound.toString()} icon={FileText} />
          <MetricCard title="Total Spend" value={formatINR(metrics.spend)} icon={IndianRupee} highlight />
          <MetricCard title="GST Paid" value={formatINR(metrics.gst)} icon={Building2} />
          <MetricCard title="Flagged Bills" value={metrics.flagged.toString()} icon={ShieldAlert} alert={metrics.flagged > 0} />
          <MetricCard title="Price Rises" value={metrics.priceRises.toString()} icon={TrendingUp} alert={metrics.priceRises > 0} />
          <MetricCard title="Duplicates" value={metrics.duplicates.toString()} icon={AlertCircle} alert={metrics.duplicates > 0} />
        </section>

        {/* Workspace */}
        <section className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-260px)] min-h-[600px]">
          
          {/* Inbox List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-card rounded-xl border border-card-border overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search merchant or subject..." 
                  className="pl-9 bg-background/50 border-border focus-visible:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <FilterTab label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterTab label="Flagged" active={filter === 'flagged'} onClick={() => setFilter('flagged')} count={metrics.flagged} />
                <FilterTab label="Unfiled" active={filter === 'unfiled'} onClick={() => setFilter('unfiled')} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No receipts found matching your criteria.
                </div>
              ) : (
                filteredEmails.map(email => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all duration-200 border",
                      selectedId === email.id 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate pr-2">{email.merchant}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(email.date)}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{formatINR(email.amount)}</div>
                    <div className="text-xs text-muted-foreground truncate mb-2">{email.subject}</div>
                    <div className="flex flex-wrap gap-1">
                      {email.flags.length > 0 && (
                        <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                          {email.flags.length} Flag{email.flags.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {email.filed ? (
                        <Badge variant="success" className="px-1.5 py-0 text-[10px]">Filed</Badge>
                      ) : (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Unfiled</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/30">
              <Button 
                variant="outline" 
                className="w-full bg-background gap-2"
                onClick={() => setSelectedId(null)}
              >
                <Plus className="w-4 h-4" />
                Paste New Receipt
              </Button>
            </div>
          </div>

          {/* Detail View / Paste View */}
          <div className="w-full lg:w-2/3 bg-card rounded-xl border border-card-border flex flex-col overflow-hidden shadow-sm">
            {selectedEmail ? (
              <EmailDetail 
                email={selectedEmail} 
                onFile={() => markFiled(selectedEmail.id)} 
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col p-8 items-center justify-center text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-serif font-semibold mb-2">Import a Receipt</h2>
                <p className="text-muted-foreground text-sm mb-8">
                  Paste raw email text below. CleanTab's heuristic engine will automatically extract the merchant, amount, GSTIN, and flag anomalies.
                </p>
                
                {showPasteSuccess && (
                  <div className="w-full mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Receipt parsed and imported successfully!
                  </div>
                )}
                
                <form onSubmit={handlePasteSubmit} className="w-full flex flex-col gap-4">
                  <Textarea 
                    placeholder="Paste email content here... (e.g. 'Your Swiggy order total: ₹450...')"
                    className="min-h-[200px] resize-none focus-visible:ring-primary/20"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <Button type="submit" className="w-full gap-2">
                    Parse & Import Receipt
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, highlight, alert }: { title: string, value: string, icon: ElementType, highlight?: boolean, alert?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border flex flex-col gap-3 transition-colors",
      alert ? "bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900" : 
      highlight ? "bg-primary/5 border-primary/10" : "bg-card border-card-border"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className={cn("w-4 h-4", alert ? "text-red-500" : "text-primary/60")} />
      </div>
      <div className={cn("text-2xl font-semibold", alert && "text-red-600 dark:text-red-400")}>
        {value}
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick, count }: { label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
        active 
          ? "bg-foreground text-background" 
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[10px]",
          active ? "bg-background/20" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmailDetail({ email, onFile, onClose }: { email: ReceiptEmail, onFile: () => void, onClose: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Detail Header */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{email.merchant}</h2>
            {email.filed ? (
              <Badge variant="success">Filed</Badge>
            ) : (
              <Badge variant="secondary">Unfiled</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDateTime(email.date)}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="text-2xl font-semibold tracking-tight">{formatINR(email.amount)}</div>
          {!email.filed ? (
            <Button onClick={onFile} className="gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              Send to CleanTab
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2 bg-emerald-50/50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Sent & Filed
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Flags Section */}
        {email.flags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Anomalies Detected
            </h3>
            <ul className="space-y-2">
              {email.flags.map((flag, i) => (
                <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Extracted Data Grid */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" /> Extracted Data
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DataField label="GST Amount" value={email.gst > 0 ? formatINR(email.gst) : '₹0.00'} />
            <DataField label="GSTIN" value={email.gstin || 'Not Provided'} valueClass={!email.gstin ? 'text-muted-foreground italic' : 'font-mono'} />
            <DataField label="Invoice No" value={email.invoiceNumber} valueClass="font-mono text-xs" />
            <DataField label="Category" value={email.category} />
            <DataField label="Purpose" value={email.purpose} />
            <DataField label="Frequency" value={email.frequency} />
          </div>
        </div>

        {/* Raw Email */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Source Email
          </h3>
          <div className="bg-muted/30 border border-border rounded-lg p-5">
            <div className="mb-4 pb-4 border-b border-border/50 text-sm space-y-1">
              <div className="flex"><span className="w-16 text-muted-foreground">From:</span> <span className="font-medium">{email.sender} &lt;{email.senderEmail}&gt;</span></div>
              <div className="flex"><span className="w-16 text-muted-foreground">Subject:</span> <span className="font-medium">{email.subject}</span></div>
            </div>
            <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
              {email.body}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function DataField({ label, value, valueClass }: { label: string, value: string, valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", valueClass)}>{value}</span>
    </div>
  );
}
