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
    { label: "إجمالي المبيعات", value: report.totalSales, icon: BarChart3, color: "text-primary" },
    { label: "تكلفة المشتريات", value: report.totalCost, icon: TrendingDown, color: "text-warning" },
    { label: "إجمالي المصاريف", value: report.totalExpenses, icon: TrendingDown, color: "text-destructive" },
    { label: "صافي الربح", value: report.netProfit, icon: TrendingUp, color: report.netProfit >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div>
      <h1 className="page-header">التقارير</h1>

      {/* Period selector */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <button
          onClick={() => exportReportToExcel(period)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-success text-success-foreground hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> تصدير Excel
        </button>
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
              period === p.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={s.color} size={22} />
            </div>
            <p className="text-2xl font-bold">{s.value.toLocaleString()} ج.م</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice count */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="text-primary" size={20} />
            <h3 className="font-semibold">عدد الفواتير</h3>
          </div>
          <p className="text-3xl font-bold">{report.invoiceCount}</p>
        </div>

        {/* Best selling */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-warning" size={20} />
            <h3 className="font-semibold">أفضل المنتجات مبيعاً</h3>
          </div>
          {report.bestSelling.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {report.bestSelling.map((p, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">{p.qty} قطعة</p>
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
