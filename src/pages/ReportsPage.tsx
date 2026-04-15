import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Receipt, Star, Download } from "lucide-react";
import { getReport } from "@/lib/store";
import { exportReportToExcel } from "@/lib/excel-export";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const periods: { key: Period; label: string }[] = [
  { key: "daily", label: "يومي" },
  { key: "weekly", label: "أسبوعي" },
  { key: "monthly", label: "شهري" },
  { key: "yearly", label: "سنوي" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const report = useMemo(() => getReport(period), [period]);

  const stats = [
    { label: "إجمالي المبيعات", value: report.totalSales, icon: BarChart3, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "تكلفة المشتريات", value: report.totalCost, icon: TrendingDown, iconBg: "bg-warning/10", iconColor: "text-warning" },
    { label: "إجمالي المصاريف", value: report.totalExpenses, icon: TrendingDown, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
    { label: "صافي الربح", value: report.netProfit, icon: TrendingUp, iconBg: report.netProfit >= 0 ? "bg-success/10" : "bg-destructive/10", iconColor: report.netProfit >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BarChart3 className="text-primary" size={22} /></div>
        <h1 className="page-header mb-0">التقارير</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap items-center animate-fade-in-up">
        <button onClick={() => exportReportToExcel(period)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-success text-success-foreground hover:opacity-90 transition-all duration-200" style={{ boxShadow: '0 4px 15px hsla(152 60% 45% / 0.3)' }}>
          <Download size={16} /> تصدير Excel
        </button>
        {periods.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${period === p.key ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, idx) => (
          <div key={s.label} className={`stat-card animate-fade-in-up stagger-${idx + 1}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                <s.icon className={s.iconColor} size={22} />
              </div>
              <span className="text-sm font-bold text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-extrabold">{s.value.toLocaleString()} ج.م</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="text-primary" size={20} /></div>
            <h3 className="font-extrabold">عدد الفواتير</h3>
          </div>
          <p className="text-4xl font-extrabold mr-13">{report.invoiceCount}</p>
        </div>

        <div className="stat-card animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Star className="text-warning" size={20} /></div>
            <h3 className="font-extrabold">أفضل المنتجات مبيعاً</h3>
          </div>
          {report.bestSelling.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {report.bestSelling.map((p, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-accent/50 rounded-xl hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-extrabold">{i + 1}</span>
                    <span className="text-sm font-bold">{p.name}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold">{p.qty} قطعة</p>
                    <p className="text-xs text-muted-foreground">{p.revenue.toLocaleString()} ج.م</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
