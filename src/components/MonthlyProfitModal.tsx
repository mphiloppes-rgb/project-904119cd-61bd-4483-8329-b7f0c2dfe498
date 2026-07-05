import { useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown, Calendar, GitCompare, Printer, Wallet, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  getMonthlyProfitBreakdown,
  getMonthlySupplierDebtBreakdown,
  type MonthlyProfitRow,
  type MonthlyDebtRow,
} from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

type ViewTab = "profit" | "debt";

export default function MonthlyProfitModal({ open, onClose }: Props) {
  const rows = useMemo(() => (open ? getMonthlyProfitBreakdown() : []), [open]);
  const debtRows = useMemo(() => (open ? getMonthlySupplierDebtBreakdown() : []), [open]);
  const [tab, setTab] = useState<ViewTab>("profit");
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (!open) return null;

  const togglePick = (key: string) => {
    setPicked(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const compared = picked
    .map(k => rows.find(r => r.key === k))
    .filter(Boolean) as MonthlyProfitRow[];

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const bestMonth = rows.reduce<MonthlyProfitRow | null>((best, r) => (!best || r.profit > best.profit ? r : best), null);
  const worstMonth = rows.reduce<MonthlyProfitRow | null>((worst, r) => (!worst || r.profit < worst.profit ? r : worst), null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-success/15 flex items-center justify-center">
              <TrendingUp className="text-success" size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">التحليل الشهري</h3>
              <p className="text-xs text-muted-foreground">صافي الربح وديون المحل شهر بشهر</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tab === "profit" && (
              <button
                onClick={() => { setCompareMode(m => !m); setPicked([]); }}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${compareMode ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
              >
                <GitCompare size={14} /> {compareMode ? 'إنهاء المقارنة' : 'مقارنة شهرين'}
              </button>
            )}
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-muted text-xs font-extrabold flex items-center gap-1 hover:bg-accent">
              <Printer size={14} /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          <TabBtn active={tab === "profit"} onClick={() => setTab("profit")} icon={<TrendingUp size={14} />} label="صافي الربح" />
          <TabBtn active={tab === "debt"} onClick={() => setTab("debt")} icon={<Wallet size={14} />} label="ديون المحل" />
        </div>

        {tab === "profit" && (
          rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">مفيش حركات مسجلة لحد دلوقتي</p>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <SummaryTile label="إجمالي أرباح كل الشهور" value={totalProfit} icon={<TrendingUp size={16} />} tone={totalProfit >= 0 ? 'success' : 'destructive'} />
                {bestMonth && <SummaryTile label={`أفضل شهر: ${bestMonth.label}`} value={bestMonth.profit} icon={<TrendingUp size={16} />} tone="success" />}
                {worstMonth && <SummaryTile label={`أسوأ شهر: ${worstMonth.label}`} value={worstMonth.profit} icon={<TrendingDown size={16} />} tone={worstMonth.profit >= 0 ? 'primary' : 'destructive'} />}
              </div>

              {/* Compare view */}
              {compareMode && compared.length === 2 && (
                <CompareBlock a={compared[0]} b={compared[1]} />
              )}
              {compareMode && compared.length < 2 && (
                <p className="text-xs text-center text-muted-foreground mb-3">اختار شهرين من القائمة تحت للمقارنة ({compared.length}/2)</p>
              )}

              {/* Monthly rows */}
              <div className="space-y-2">
                {rows.map(r => {
                  const isPicked = picked.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      onClick={() => compareMode && togglePick(r.key)}
                      disabled={!compareMode}
                      className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${
                        isPicked
                          ? 'border-primary bg-primary/10 shadow-md scale-[1.01]'
                          : 'border-border/50 bg-card hover:bg-accent/40'
                      } ${!compareMode ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground" size={16} />
                          <span className="font-extrabold">{r.label}</span>
                          <span className="text-[11px] text-muted-foreground">({r.invoiceCount} فاتورة)</span>
                        </div>
                        <span className={`text-lg font-extrabold ${r.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {r.profit >= 0 ? '+' : ''}{r.profit.toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                        <MiniStat label="مبيعات" value={r.sales} tone="primary" />
                        <MiniStat label="تكلفة" value={r.cost} tone="warn" />
                        <MiniStat label="مصاريف" value={r.expenses} tone="destructive" />
                        <MiniStat label="مرتجعات" value={r.returns} tone="muted" />
                        <MiniStat label="مشتريات" value={r.purchases} tone="purple" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )
        )}

        {tab === "debt" && (
          debtRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">مفيش فواتير شراء أو مدفوعات لموردين</p>
          ) : (
            <>
              <div className="mb-3 p-3 rounded-xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">إزاي بنحسب؟</strong> رصيد أول الشهر + دين جديد من فواتير الشراء − اللي دفعته للموردين خلال الشهر = رصيد آخر الشهر. الحساب بيبدأ من تاريخ بداية التقارير لو ضبطته.
              </div>
              <div className="space-y-2">
                {debtRows.map(r => {
                  const change = r.closing - r.opening;
                  return (
                    <div key={r.key} className="p-4 rounded-2xl border-2 border-border/50 bg-card">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground" size={16} />
                          <span className="font-extrabold">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${change > 0 ? 'text-destructive' : change < 0 ? 'text-success' : 'text-muted-foreground'} flex items-center gap-1`}>
                            {change > 0 ? <ArrowUp size={12} /> : change < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                            {change === 0 ? 'بدون تغيير' : `${Math.abs(change).toLocaleString()} ج.م`}
                          </span>
                          <span className={`text-lg font-extrabold ${r.closing > 0 ? 'text-destructive' : 'text-success'}`}>
                            {r.closing.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <MiniStat label="أول الشهر" value={r.opening} tone="muted" />
                        <MiniStat label="دين جديد" value={r.added} tone="destructive" />
                        <MiniStat label="مدفوع للموردين" value={r.paid} tone="primary" />
                        <MiniStat label="إجمالي فواتير الشرا" value={r.purchaseTotal} tone="purple" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-extrabold flex items-center gap-1.5 border-b-2 transition-all -mb-[1px] ${
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function CompareBlock({ a, b }: { a: MonthlyProfitRow; b: MonthlyProfitRow }) {
  const rowsCfg: { key: keyof MonthlyProfitRow; label: string; goodWhenHigher: boolean }[] = [
    { key: 'sales', label: 'صافي المبيعات', goodWhenHigher: true },
    { key: 'cost', label: 'تكلفة المباع', goodWhenHigher: false },
    { key: 'expenses', label: 'المصاريف', goodWhenHigher: false },
    { key: 'returns', label: 'المرتجعات', goodWhenHigher: false },
    { key: 'purchases', label: 'فواتير الشرا', goodWhenHigher: false },
    { key: 'profit', label: 'صافي الربح', goodWhenHigher: true },
  ];
  return (
    <div className="mb-4 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 animate-fade-in-up">
      <p className="text-xs font-extrabold text-primary mb-3 flex items-center gap-1">
        <GitCompare size={14} /> مقارنة تفصيلية: {a.label} vs {b.label}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right p-2 font-extrabold">البند</th>
              <th className="text-right p-2 font-extrabold">{a.label}</th>
              <th className="text-right p-2 font-extrabold">{b.label}</th>
              <th className="text-right p-2 font-extrabold">الفرق</th>
            </tr>
          </thead>
          <tbody>
            {rowsCfg.map(cfg => {
              const av = Number(a[cfg.key]) || 0;
              const bv = Number(b[cfg.key]) || 0;
              const diff = av - bv;
              const winnerA = cfg.goodWhenHigher ? diff > 0 : diff < 0;
              const winnerB = cfg.goodWhenHigher ? diff < 0 : diff > 0;
              const pct = bv !== 0 ? (diff / Math.abs(bv)) * 100 : 0;
              return (
                <tr key={cfg.key} className="border-b border-border/40">
                  <td className="p-2 font-bold">{cfg.label}</td>
                  <td className={`p-2 font-extrabold ${winnerA ? 'text-success' : winnerB ? 'text-muted-foreground' : ''}`}>
                    {av.toLocaleString()}
                  </td>
                  <td className={`p-2 font-extrabold ${winnerB ? 'text-success' : winnerA ? 'text-muted-foreground' : ''}`}>
                    {bv.toLocaleString()}
                  </td>
                  <td className="p-2">
                    <span className={`font-extrabold flex items-center gap-1 ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''}`}>
                      {diff > 0 ? <ArrowUp size={11} /> : diff < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                      {Math.abs(diff).toLocaleString()}
                      {bv !== 0 && <span className="text-[10px] opacity-70">({pct >= 0 ? '+' : ''}{pct.toFixed(0)}%)</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(() => {
        const diff = a.profit - b.profit;
        const better = diff >= 0 ? a : b;
        return (
          <p className="mt-3 text-xs font-extrabold text-center">
            {diff === 0 ? 'الشهرين متساويين في الربح' : (
              <>الأفضل ربحًا: <span className="text-primary">{better.label}</span> بفرق <span className={diff >= 0 ? 'text-success' : 'text-destructive'}>{Math.abs(diff).toLocaleString()} ج.م</span></>
            )}
          </p>
        );
      })()}
    </div>
  );
}

function SummaryTile({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'success' | 'destructive' | 'primary' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-primary';
  const bg = tone === 'success' ? 'bg-success/10 border-success/25' : tone === 'destructive' ? 'bg-destructive/10 border-destructive/25' : 'bg-primary/10 border-primary/25';
  return (
    <div className={`p-3 rounded-2xl border ${bg}`}>
      <div className={`flex items-center gap-1 text-[11px] font-bold ${color} mb-1`}>{icon}<span>{label}</span></div>
      <p className={`text-xl font-extrabold ${color}`}>{value.toLocaleString()} ج.م</p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'warn' | 'destructive' | 'muted' | 'purple' }) {
  const map = {
    primary: 'text-primary',
    warn: 'text-warning',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
    purple: 'text-purple-500',
  } as const;
  return (
    <div className="p-2 rounded-lg bg-muted/40">
      <p className="text-[10px] text-muted-foreground font-bold">{label}</p>
      <p className={`font-extrabold ${map[tone]}`}>{value.toLocaleString()}</p>
    </div>
  );
}
