import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Receipt, Star, Download, RotateCcw, ShoppingBag, Wallet, Banknote, AlertCircle, Users, Package, Crown } from "lucide-react";
import { getReport } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { exportReportToExcel } from "@/lib/excel-export";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const periods: { key: Period; label: string }[] = [
  { key: "daily", label: "يومي" },
  { key: "weekly", label: "أسبوعي" },
  { key: "monthly", label: "شهري" },
  { key: "yearly", label: "سنوي" },
];

type Tab = "summary" | "financial" | "sales" | "returns" | "expenses" | "purchases" | "supplierPayments" | "products";

export default function ReportsPage() {
  const { refreshKey } = useStoreRefresh();
  const [period, setPeriod] = useState<Period>("daily");
  const [tab, setTab] = useState<Tab>("summary");
  const report = useMemo(() => getReport(period), [period, refreshKey]);

  const stats = [
    { label: "إجمالي المبيعات (صافي)", value: report.totalSales, icon: BarChart3, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "تكلفة المبيعات", value: report.totalCost, icon: TrendingDown, iconBg: "bg-warning/10", iconColor: "text-warning" },
    { label: "المرتجعات", value: report.totalReturns, icon: RotateCcw, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    { label: "المصاريف", value: report.totalExpenses, icon: Wallet, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
    { label: "فواتير الشراء", value: report.totalPurchases, icon: ShoppingBag, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    { label: "صافي الربح", value: report.netProfit, icon: TrendingUp, iconBg: report.netProfit >= 0 ? "bg-success/10" : "bg-destructive/10", iconColor: report.netProfit >= 0 ? "text-success" : "text-destructive" },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "ملخص" },
    { key: "sales", label: `المبيعات (${report.salesDetails.length})` },
    { key: "returns", label: `المرتجعات (${report.returnsDetails.length})` },
    { key: "expenses", label: `المصاريف (${report.expensesDetails.length})` },
    { key: "purchases", label: `المشتريات (${report.purchaseDetails.length})` },
    { key: "products", label: `ربح المنتجات (${report.productProfits.length})` },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="text-primary" size={22} />
        </div>
        <h1 className="page-header mb-0">التقارير</h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={() => exportReportToExcel(period)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-success text-success-foreground hover:opacity-90 transition-all">
          <Download size={16} /> تصدير Excel
        </button>
        {periods.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${period === p.key ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats — uniform sized cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {stats.map((s, idx) => (
          <div key={s.label} className={`stat-card animate-fade-in-up stagger-${(idx % 4) + 1} flex flex-col h-full min-h-[120px]`}>
            <div className="flex items-center gap-2 mb-2 min-h-[40px]">
              <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={s.iconColor} size={18} />
              </div>
              <span className="text-xs font-bold text-muted-foreground line-clamp-2 leading-tight">{s.label}</span>
            </div>
            <p className="text-lg sm:text-xl font-extrabold mt-auto truncate">{s.value.toLocaleString()} <span className="text-xs">ج.م</span></p>
          </div>
        ))}
      </div>

      {/* Quick debt overview — current snapshot (live, not period-bound) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="stat-card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="text-destructive" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground mb-0.5">مديونية المحل للموردين (الآن)</p>
            <p className="text-xl font-extrabold text-destructive truncate">{report.currentSupplierDebt.toLocaleString()} <span className="text-xs">ج.م</span></p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Users className="text-warning" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground mb-0.5">مديونية العملاء للمحل (الآن)</p>
            <p className="text-xl font-extrabold text-warning truncate">{report.currentCustomerDebt.toLocaleString()} <span className="text-xs">ج.م</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="stat-card animate-fade-in-up">
        {tab === "summary" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="text-primary" size={20} />
              <h3 className="font-extrabold">ملخص الفترة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SummaryRow label="عدد فواتير المبيعات" value={`${report.invoiceCount}`} />
              <SummaryRow label="عدد المرتجعات" value={`${report.returnsDetails.length}`} />
              <SummaryRow label="إجمالي المبيعات (قبل المرتجعات)" value={`${(report.totalSales + report.totalReturns).toLocaleString()} ج.م`} />
              <SummaryRow label="قيمة المرتجعات المخصومة" value={`-${report.totalReturns.toLocaleString()} ج.م`} variant="warn" />
              <SummaryRow label="صافي المبيعات" value={`${report.totalSales.toLocaleString()} ج.م`} variant="primary" />
              <SummaryRow label="تكلفة البضاعة المباعة" value={`-${report.totalCost.toLocaleString()} ج.م`} />
              <SummaryRow label="المصاريف" value={`-${report.totalExpenses.toLocaleString()} ج.م`} />
              <SummaryRow label="صافي الربح" value={`${report.netProfit.toLocaleString()} ج.م`} variant={report.netProfit >= 0 ? "success" : "destructive"} />
            </div>

            <h4 className="font-extrabold mt-6 mb-3 flex items-center gap-2"><Star className="text-warning" size={18} /> أفضل 10 منتجات</h4>
            {report.bestSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {report.bestSelling.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-accent/50 rounded-xl">
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
        )}

        {tab === "financial" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Banknote className="text-success" size={20} />
              <h3 className="font-extrabold">الموقف المالي الكامل</h3>
            </div>

            {/* Section: Operations */}
            <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">📊 الأرباح التشغيلية (الفترة الحالية)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <SummaryRow label="صافي المبيعات" value={`${report.totalSales.toLocaleString()} ج.م`} variant="primary" />
              <SummaryRow label="تكلفة البضاعة المباعة" value={`-${report.totalCost.toLocaleString()} ج.م`} />
              <SummaryRow label="مصاريف تشغيلية" value={`-${report.totalExpenses.toLocaleString()} ج.م`} />
              <SummaryRow label="صافي الربح" value={`${report.netProfit.toLocaleString()} ج.م`} variant={report.netProfit >= 0 ? "success" : "destructive"} />
            </div>

            {/* Section: Suppliers */}
            <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">🏭 الموردين (الفترة الحالية)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <SummaryRow label="إجمالي فواتير الشراء" value={`${report.totalPurchases.toLocaleString()} ج.م`} />
              <SummaryRow label="مدفوع للموردين على الفواتير" value={`${report.totalPurchasesPaid.toLocaleString()} ج.م`} variant="success" />
              <SummaryRow label="متبقي على فواتير الفترة" value={`${report.totalPurchasesRemaining.toLocaleString()} ج.م`} variant="warn" />
              <SummaryRow label="مدفوعات سداد ديون قديمة" value={`${report.totalSupplierPayments.toLocaleString()} ج.م`} variant="success" />
            </div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-5 flex items-center justify-between">
              <span className="text-sm font-bold text-destructive">⚠️ مديونية المحل الكلية للموردين (الآن)</span>
              <span className="text-xl font-extrabold text-destructive">{report.currentSupplierDebt.toLocaleString()} ج.م</span>
            </div>

            {/* Section: Customers */}
            <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">👥 العملاء (الفترة الحالية)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <SummaryRow label="مدفوعات سداد ديون عملاء" value={`${report.totalCustomerPayments.toLocaleString()} ج.م`} variant="success" />
              <SummaryRow label="عدد فواتير البيع" value={`${report.invoiceCount}`} />
            </div>
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl mb-5 flex items-center justify-between">
              <span className="text-sm font-bold text-warning">💰 مديونية العملاء للمحل (الآن)</span>
              <span className="text-xl font-extrabold text-warning">{report.currentCustomerDebt.toLocaleString()} ج.م</span>
            </div>

            {/* Section: Cash Flow */}
            <h4 className="font-extrabold text-sm mb-2 text-muted-foreground">💵 السيولة (Cash Flow الفترة)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <SummaryRow label="نقدية داخلة (مبيعات + سداد عملاء)" value={`+${report.cashIn.toLocaleString()} ج.م`} variant="success" />
              <SummaryRow label="نقدية خارجة (شراء + سداد موردين + مصاريف)" value={`-${report.cashOut.toLocaleString()} ج.م`} variant="destructive" />
            </div>
            <div className={`p-4 rounded-xl flex items-center justify-between border ${report.cashFlow >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <span className={`text-sm font-bold ${report.cashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {report.cashFlow >= 0 ? '✅ صافي تدفق نقدي موجب' : '🔻 صافي تدفق نقدي سالب'}
              </span>
              <span className={`text-xl font-extrabold ${report.cashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {report.cashFlow.toLocaleString()} ج.م
              </span>
            </div>

            {/* Net position */}
            <div className="mt-5 p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
              <p className="text-xs font-bold text-muted-foreground mb-2">صافي مركز المحل (Net Position)</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">مديونية العملاء − مديونية الموردين</span>
                <span className={`text-2xl font-extrabold ${(report.currentCustomerDebt - report.currentSupplierDebt) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(report.currentCustomerDebt - report.currentSupplierDebt).toLocaleString()} ج.م
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(report.currentCustomerDebt - report.currentSupplierDebt) >= 0
                  ? 'لو حصّلت كل ديونك ودفعت كل اللي عليك، هتفضل بفارق موجب.'
                  : 'لو حصّلت كل ديونك ودفعت كل اللي عليك، هيبقى عليك فرق سالب — لازم سيولة إضافية.'}
              </p>
            </div>
          </div>
        )}

        {tab === "sales" && (
          <DataTable
            title="تفاصيل فواتير المبيعات"
            empty="لا توجد فواتير"
            headers={["#", "التاريخ", "العميل", "الإجمالي", "المدفوع", "المتبقي", "حالة"]}
            rows={report.salesDetails.map((s) => [
              s.invoiceNumber,
              new Date(s.createdAt).toLocaleString("ar-EG"),
              s.customerName,
              `${s.total.toLocaleString()} ج.م`,
              `${s.paid.toLocaleString()} ج.م`,
              `${s.remaining.toLocaleString()} ج.م`,
              s.isReturned ? "مرتجع" : "نشط",
            ])}
          />
        )}

        {tab === "returns" && (
          <DataTable
            title="تفاصيل المرتجعات"
            empty="لا توجد مرتجعات"
            headers={["فاتورة", "المنتج", "الكمية", "القيمة", "تاريخ المرتجع"]}
            rows={report.returnsDetails.map((r) => [
              r.invoiceNumber,
              r.productName,
              `${r.quantity}`,
              `${r.total.toLocaleString()} ج.م`,
              new Date(r.returnedAt).toLocaleString("ar-EG"),
            ])}
            footer={`إجمالي المرتجعات: ${report.totalReturns.toLocaleString()} ج.م`}
          />
        )}

        {tab === "expenses" && (
          <DataTable
            title="تفاصيل المصاريف"
            empty="لا توجد مصاريف"
            headers={["الاسم", "النوع", "المبلغ", "التاريخ"]}
            rows={report.expensesDetails.map((e: any) => [
              e.name,
              e.type,
              `${e.amount.toLocaleString()} ج.م`,
              e.date,
            ])}
            footer={`إجمالي المصاريف: ${report.totalExpenses.toLocaleString()} ج.م`}
          />
        )}

        {tab === "purchases" && (
          <DataTable
            title="تفاصيل فواتير الشراء"
            empty="لا توجد فواتير شراء"
            headers={["#", "المورد", "التاريخ", "الإجمالي", "المدفوع", "المتبقي"]}
            rows={report.purchaseDetails.map((p: any) => [
              p.invoiceNumber,
              p.supplierName,
              new Date(p.createdAt).toLocaleString("ar-EG"),
              `${p.total.toLocaleString()} ج.م`,
              `${p.paid.toLocaleString()} ج.م`,
              `${p.remaining.toLocaleString()} ج.م`,
            ])}
            footer={`إجمالي المشتريات: ${report.totalPurchases.toLocaleString()} ج.م`}
          />
        )}

        {tab === "supplierPayments" && (
          <DataTable
            title="مدفوعات سداد الموردين (سداد ديون قديمة)"
            empty="لا يوجد مدفوعات سداد للموردين في هذه الفترة"
            headers={["المورد", "المبلغ", "ملاحظة", "التاريخ"]}
            rows={report.supplierPaymentsDetails.map((p: any) => [
              p.supplierName,
              `${(p.amount || 0).toLocaleString()} ج.م`,
              p.note || '—',
              new Date(p.date).toLocaleString("ar-EG"),
            ])}
            footer={`إجمالي المدفوعات: ${report.totalSupplierPayments.toLocaleString()} ج.م`}
          />
        )}

        {tab === "products" && (
          <DataTable
            title="ربح كل منتج"
            empty="لا توجد مبيعات"
            headers={["المنتج", "الكمية", "الإيراد", "التكلفة", "الربح"]}
            rows={report.productProfits.map((p) => [
              p.name,
              `${p.qty}`,
              `${p.revenue.toLocaleString()} ج.م`,
              `${p.cost.toLocaleString()} ج.م`,
              `${p.profit.toLocaleString()} ج.م`,
            ])}
          />
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, variant }: { label: string; value: string; variant?: "primary" | "success" | "destructive" | "warn" }) {
  const colorClass =
    variant === "primary" ? "text-primary" :
    variant === "success" ? "text-success" :
    variant === "destructive" ? "text-destructive" :
    variant === "warn" ? "text-amber-500" : "";
  return (
    <div className="flex justify-between items-center p-3 bg-accent/40 rounded-xl">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className={`text-sm font-extrabold ${colorClass}`}>{value}</span>
    </div>
  );
}

function DataTable({ title, headers, rows, empty, footer }: { title: string; headers: string[]; rows: (string | number)[][]; empty: string; footer?: string }) {
  return (
    <div>
      <h3 className="font-extrabold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid grid-cols-1 sm:hidden gap-2">
            {rows.map((r, i) => (
              <div key={i} className="bg-accent/40 rounded-xl p-3 space-y-1">
                {r.map((cell, ci) => (
                  <div key={ci} className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-bold">{headers[ci]}</span>
                    <span className="font-extrabold text-left">{cell}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {headers.map((h, i) => (
                    <th key={i} className="text-right p-3 font-extrabold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-accent/30">
                    {r.map((cell, ci) => (
                      <td key={ci} className="p-3 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer && (
            <p className="mt-3 p-3 bg-primary/10 rounded-xl text-sm font-extrabold text-primary text-center">{footer}</p>
          )}
        </>
      )}
    </div>
  );
}
