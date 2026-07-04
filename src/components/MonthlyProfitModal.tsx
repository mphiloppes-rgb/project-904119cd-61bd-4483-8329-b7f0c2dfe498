import { useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown, Calendar, GitCompare, Printer } from "lucide-react";
import { getMonthlyProfitBreakdown, type MonthlyProfitRow } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MonthlyProfitModal({ open, onClose }: Props) {
  const rows = useMemo(() => (open ? getMonthlyProfitBreakdown() : []), [open]);
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
              <h3 className="font-extrabold text-lg">صافي الربح شهر بشهر</h3>
              <p className="text-xs text-muted-foreground">من أول شهر فيه حركة لآخر شهر</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCompareMode(m => !m); setPicked([]); }}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${compareMode ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
            >
              <GitCompare size={14} /> {compareMode ? 'إنهاء المقارنة' : 'مقارنة شهرين'}
            </button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-muted text-xs font-extrabold flex items-center gap-1 hover:bg-accent">
              <Printer size={14} /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
          </div>
        </div>

        {rows.length === 0 ? (
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
              <div className="mb-4 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 animate-fade-in-up">
                <p className="text-xs font-extrabold text-primary mb-3 flex items-center gap-1"><GitCompare size={14} /> مقارنة</p>
                <div className="grid grid-cols-2 gap-3">
                  {compared.map(r => (
                    <div key={r.key} className="p-3 rounded-xl bg-card border border-border">
                      <p className="font-extrabold mb-2">{r.label}</p>
                      <MiniRow label="صافي المبيعات" value={r.sales} />
                      <MiniRow label="تكلفة المباع" value={-r.cost} />
                      <MiniRow label="مصاريف" value={-r.expenses} />
                      <MiniRow label="مرتجعات" value={r.returns} muted />
                      <div className="border-t border-border/50 mt-2 pt-2">
                        <MiniRow label="صافي الربح" value={r.profit} bold />
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const diff = compared[0].profit - compared[1].profit;
                  const better = diff >= 0 ? compared[0] : compared[1];
                  return (
                    <p className="mt-3 text-xs font-extrabold text-center">
                      فرق الربح: <span className={diff >= 0 ? 'text-success' : 'text-destructive'}>{Math.abs(diff).toLocaleString()} ج.م</span> — الأفضل: <span className="text-primary">{better.label}</span>
                    </p>
                  );
                })()}
              </div>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <MiniStat label="مبيعات" value={r.sales} tone="primary" />
                      <MiniStat label="تكلفة" value={r.cost} tone="warn" />
                      <MiniStat label="مصاريف" value={r.expenses} tone="destructive" />
                      <MiniStat label="مرتجعات" value={r.returns} tone="muted" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
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

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'warn' | 'destructive' | 'muted' }) {
  const map = { primary: 'text-primary', warn: 'text-warning', destructive: 'text-destructive', muted: 'text-muted-foreground' } as const;
  return (
    <div className="p-2 rounded-lg bg-muted/40">
      <p className="text-[10px] text-muted-foreground font-bold">{label}</p>
      <p className={`font-extrabold ${map[tone]}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function MiniRow({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between text-xs py-1">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={`${bold ? 'font-extrabold' : 'font-bold'} ${value < 0 ? 'text-destructive' : value > 0 ? 'text-success' : ''}`}>
        {value.toLocaleString()} ج.م
      </span>
    </div>
  );
}
