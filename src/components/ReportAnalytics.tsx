import { useMemo } from "react";
import { Clock } from "lucide-react";

export function HourlyPerformance({ salesDetails }: { salesDetails: any[] }) {
  const { byHour, byDay, peakHour, peakDay } = useMemo(() => {
    const byHour = Array(24).fill(0).map((_, h) => ({ hour: h, count: 0, total: 0 }));
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const byDay = dayNames.map((name) => ({ name, count: 0, total: 0 }));
    for (const s of salesDetails) {
      const d = new Date(s.createdAt);
      byHour[d.getHours()].count += 1;
      byHour[d.getHours()].total += s.total || 0;
      byDay[d.getDay()].count += 1;
      byDay[d.getDay()].total += s.total || 0;
    }
    const peakHour = [...byHour].sort((a, b) => b.total - a.total)[0];
    const peakDay = [...byDay].sort((a, b) => b.total - a.total)[0];
    return { byHour, byDay, peakHour, peakDay };
  }, [salesDetails]);

  const maxHour = Math.max(...byHour.map((h) => h.total), 1);
  const maxDay = Math.max(...byDay.map((d) => d.total), 1);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Clock className="text-primary" size={20} />
        <h3 className="font-extrabold">أداء يومي/ساعي</h3>
      </div>

      {salesDetails.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">لا توجد بيانات في الفترة</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <p className="text-xs font-bold text-muted-foreground">⏰ ساعة الذروة</p>
              <p className="text-2xl font-extrabold text-primary mt-1">
                {peakHour.hour}:00 - {peakHour.hour + 1}:00
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {peakHour.count} فاتورة • {peakHour.total.toLocaleString()} ج.م
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
              <p className="text-xs font-bold text-muted-foreground">📅 أفضل يوم في الأسبوع</p>
              <p className="text-2xl font-extrabold text-success mt-1">{peakDay.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {peakDay.count} فاتورة • {peakDay.total.toLocaleString()} ج.م
              </p>
            </div>
          </div>

          <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">توزيع المبيعات على الساعات</h4>
          <div className="space-y-1.5 mb-5">
            {byHour.filter((h) => h.total > 0).map((h) => (
              <div key={h.hour} className="flex items-center gap-2">
                <span className="text-xs font-bold w-16 text-muted-foreground">{h.hour}:00</span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-primary to-primary/60 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${(h.total / maxHour) * 100}%` }}
                  >
                    <span className="text-[10px] font-extrabold text-primary-foreground whitespace-nowrap">
                      {h.total.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs w-12 text-left text-muted-foreground">{h.count}</span>
              </div>
            ))}
          </div>

          <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">توزيع المبيعات على أيام الأسبوع</h4>
          <div className="space-y-1.5">
            {byDay.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="text-xs font-bold w-16 text-muted-foreground">{d.name}</span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-success to-success/60 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${(d.total / maxDay) * 100}%` }}
                  >
                    <span className="text-[10px] font-extrabold text-primary-foreground whitespace-nowrap">
                      {d.total.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs w-12 text-left text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ProfitMargins({ productProfits }: { productProfits: any[] }) {
  const rows = useMemo(() => {
    return productProfits
      .map((p) => ({
        ...p,
        margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.margin - a.margin);
  }, [productProfits]);

  return (
    <div>
      <h3 className="font-extrabold mb-3">📊 هامش الربح لكل منتج</h3>
      <p className="text-xs text-muted-foreground mb-3">مرتب من الأعلى ربحية للأقل — لتحديد المنتجات الأكثر فائدة للمحل.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مبيعات</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right p-3 font-extrabold">المنتج</th>
                <th className="text-right p-3 font-extrabold">الكمية</th>
                <th className="text-right p-3 font-extrabold">الإيراد</th>
                <th className="text-right p-3 font-extrabold">الربح</th>
                <th className="text-right p-3 font-extrabold">الهامش %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const color =
                  p.margin >= 30 ? "text-success" : p.margin >= 15 ? "text-primary" : p.margin >= 0 ? "text-warning" : "text-destructive";
                return (
                  <tr key={i} className="border-b border-border/30 hover:bg-accent/30">
                    <td className="p-3 font-bold">{p.name}</td>
                    <td className="p-3">{p.qty}</td>
                    <td className="p-3">{p.revenue.toLocaleString()} ج.م</td>
                    <td className={`p-3 font-extrabold ${p.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {p.profit.toLocaleString()} ج.م
                    </td>
                    <td className={`p-3 font-extrabold ${color}`}>{p.margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SupplierBreakdown({ purchaseDetails }: { purchaseDetails: any[] }) {
  const rows = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; paid: number; remaining: number }> = {};
    for (const p of purchaseDetails) {
      const key = p.supplierName || "—";
      if (!map[key]) map[key] = { name: key, count: 0, total: 0, paid: 0, remaining: 0 };
      map[key].count += 1;
      map[key].total += p.total || 0;
      map[key].paid += p.paid || 0;
      map[key].remaining += p.remaining || 0;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [purchaseDetails]);

  return (
    <div>
      <h3 className="font-extrabold mb-3">🏭 تجميع المشتريات حسب المورد</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">لا توجد فواتير شراء</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right p-3 font-extrabold">المورد</th>
                <th className="text-right p-3 font-extrabold">عدد الفواتير</th>
                <th className="text-right p-3 font-extrabold">الإجمالي</th>
                <th className="text-right p-3 font-extrabold">المدفوع</th>
                <th className="text-right p-3 font-extrabold">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="p-3 font-bold">{r.name}</td>
                  <td className="p-3">{r.count}</td>
                  <td className="p-3 font-extrabold">{r.total.toLocaleString()} ج.م</td>
                  <td className="p-3 text-success">{r.paid.toLocaleString()} ج.م</td>
                  <td className={`p-3 font-extrabold ${r.remaining > 0 ? "text-destructive" : "text-success"}`}>
                    {r.remaining.toLocaleString()} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CustomerAnalytics({ salesDetails, bestCustomers }: { salesDetails: any[]; bestCustomers: any[] }) {
  const stats = useMemo(() => {
    const total = salesDetails.reduce((s, x) => s + (x.total || 0), 0);
    const count = salesDetails.length;
    const avg = count > 0 ? total / count : 0;
    const uniqueCustomers = new Set(salesDetails.map((s) => s.customerName || "كاش")).size;
    const avgPerCustomer = uniqueCustomers > 0 ? total / uniqueCustomers : 0;
    const topCustomer = bestCustomers[0];
    return { total, count, avg, uniqueCustomers, avgPerCustomer, topCustomer };
  }, [salesDetails, bestCustomers]);

  return (
    <div>
      <h3 className="font-extrabold mb-3">👥 تحليل العملاء</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <p className="text-xs font-bold text-muted-foreground">عدد العملاء النشطين</p>
          <p className="text-2xl font-extrabold text-primary mt-1">{stats.uniqueCustomers}</p>
        </div>
        <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
          <p className="text-xs font-bold text-muted-foreground">متوسط قيمة الفاتورة</p>
          <p className="text-2xl font-extrabold text-success mt-1">{stats.avg.toFixed(0)} ج.م</p>
        </div>
        <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20">
          <p className="text-xs font-bold text-muted-foreground">متوسط إنفاق العميل</p>
          <p className="text-2xl font-extrabold text-warning mt-1">{stats.avgPerCustomer.toFixed(0)} ج.م</p>
        </div>
      </div>
      {stats.topCustomer && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-bold text-muted-foreground">👑 أفضل عميل في الفترة</p>
          <p className="text-xl font-extrabold mt-1">{stats.topCustomer.name}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-card font-bold">{stats.topCustomer.invoiceCount} فاتورة</span>
            <span className="px-2 py-1 rounded-lg bg-card font-bold text-primary">
              أنفق {stats.topCustomer.totalSpent.toLocaleString()} ج.م
            </span>
            {stats.topCustomer.totalRemaining > 0 && (
              <span className="px-2 py-1 rounded-lg bg-card font-bold text-destructive">
                متبقي {stats.topCustomer.totalRemaining.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
