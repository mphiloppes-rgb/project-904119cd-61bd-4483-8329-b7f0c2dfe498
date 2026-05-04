import { useState, useMemo, useRef } from "react";
import { BarChart3, TrendingUp, TrendingDown, Receipt, Star, Download, RotateCcw, ShoppingBag, Wallet, Banknote, AlertCircle, Users, Package, Crown, Boxes, Coins, FileText, Calculator } from "lucide-react";
import { getReport, getStaleProductsByDays } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { exportReportToExcel } from "@/lib/excel-export";
import { exportElementToPDF } from "@/lib/pdf-export";
import { isCashier } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import ReportCalculator, { DebtReport } from "@/components/ReportCalculator";
import ReportsIndex from "@/components/ReportsIndex";
import { HourlyPerformance, ProfitMargins, SupplierBreakdown, CustomerAnalytics } from "@/components/ReportAnalytics";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const periods: { key: Period; label: string }[] = [
  { key: "daily", label: "يومي" },
  { key: "weekly", label: "أسبوعي" },
  { key: "monthly", label: "شهري" },
  { key: "yearly", label: "سنوي" },
];

type Tab = "summary" | "financial" | "inventory" | "calculator" | "debt" | "sales" | "returns" | "expenses" | "purchases" | "supplierPayments" | "products" | "bestCustomers" | "staleProducts" | "hourly" | "margins" | "supplierBreakdown" | "customerAnalytics";
type StaleDays = 30 | 60 | 90 | 180;

export default function ReportsPage() {
  const { refreshKey } = useStoreRefresh();
  const [period, setPeriod] = useState<Period>("daily");
  const [tab, setTab] = useState<Tab>("summary");
  const [staleDays, setStaleDays] = useState<StaleDays>(30);
  const [exportingPDF, setExportingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const report = useMemo(() => getReport(period), [period, refreshKey]);
  const staleByDays = useMemo(() => getStaleProductsByDays(staleDays), [staleDays, refreshKey]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPDF(true);
    try {
      const periodLabel = periods.find(p => p.key === period)?.label || '';
      await exportElementToPDF(
        reportRef.current,
        `تقرير_${periodLabel}_${new Date().toISOString().split('T')[0]}.pdf`,
        `تقرير ${periodLabel} — الراعي للعدد والآلات`
      );
      toast({ title: "تم تصدير PDF ✅" });
    } catch (e: any) {
      toast({ title: "فشل التصدير", description: e?.message || 'حصل خطأ', variant: "destructive" });
    } finally {
      setExportingPDF(false);
    }
  };

  // الكاشير ميقدرش يدخل التقارير
  if (isCashier()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BarChart3 size={56} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-extrabold mb-2">مفيش صلاحية</h2>
        <p className="text-sm text-muted-foreground">صفحة التقارير للمدير فقط</p>
      </div>
    );
  }

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
    { key: "financial", label: "💰 الموقف المالي" },
    { key: "inventory", label: "📦 المخزون والكاش" },
    { key: "calculator", label: "🧮 حاسبة بنود" },
    { key: "debt", label: "📋 تقرير المديونية" },
    { key: "sales", label: `المبيعات (${report.salesDetails.length})` },
    { key: "bestCustomers", label: `أفضل العملاء (${report.bestCustomers.length})` },
    { key: "staleProducts", label: `منتجات راكدة` },
    { key: "returns", label: `المرتجعات (${report.returnsDetails.length})` },
    { key: "expenses", label: `المصاريف (${report.expensesDetails.length})` },
    { key: "purchases", label: `المشتريات (${report.purchaseDetails.length})` },
    { key: "supplierPayments", label: `سداد موردين (${report.supplierPaymentsDetails.length})` },
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
        <button onClick={() => exportReportToExcel(period)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-success text-success-foreground hover:opacity-90 transition-all hover:scale-105">
          <Download size={16} /> تصدير Excel
        </button>
        <button onClick={handleExportPDF} disabled={exportingPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all hover:scale-105 disabled:opacity-50">
          <FileText size={16} /> {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all hover:scale-105">
          🖨️ طباعة
        </button>
        {periods.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${period === p.key ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* المنطقة القابلة للتصدير/الطباعة */}
      <div ref={reportRef}>

      {/* Stats — uniform sized cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {stats.map((s, idx) => (
          <div key={s.label} className={`stat-card animate-fade-in-up stagger-${(idx % 4) + 1} flex flex-col h-full min-h-[130px]`}>
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

      {/* === صافي ثروة المحل (Net Worth Snapshot) — الكل في كارت واحد === */}
      {(() => {
        const inventoryAtCost = report.currentInventoryValueCost;
        const cash = report.cashOnHand;
        const owedToShop = report.currentCustomerDebt;
        const owedByShop = report.currentSupplierDebt;
        const grandTotal = inventoryAtCost + cash + owedToShop - owedByShop;
        const positive = grandTotal >= 0;
        return (
          <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-success/5 to-primary/5 border-2 border-primary/20 shadow-lg animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md animate-float">
                <Crown className="text-primary-foreground" size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl">📊 صافي ثروة المحل (الوضع الكلي الآن)</h3>
                <p className="text-xs text-muted-foreground">صورة لحظية بكل أصول والتزامات المحل</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="p-4 rounded-2xl bg-card/80 border border-primary/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-1">
                  <Boxes className="text-primary" size={16} />
                  <span className="text-[11px] font-bold text-muted-foreground">قيمة المخزون</span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-primary">+{inventoryAtCost.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">بسعر التكلفة</p>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-emerald-500/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="text-emerald-600" size={16} />
                  <span className="text-[11px] font-bold text-muted-foreground">كاش في المحل</span>
                </div>
                <p className={`text-lg sm:text-xl font-extrabold ${cash >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {cash >= 0 ? '+' : ''}{cash.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">تقديري تراكمي</p>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-warning/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="text-warning" size={16} />
                  <span className="text-[11px] font-bold text-muted-foreground">ديون ليّا (عند العملاء)</span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-warning">+{owedToShop.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">هتدخل المحل</p>
              </div>

              <div className="p-4 rounded-2xl bg-card/80 border border-destructive/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="text-destructive" size={16} />
                  <span className="text-[11px] font-bold text-muted-foreground">ديون عليّ (للموردين)</span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-destructive">−{owedByShop.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">واجبة الدفع</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 mb-3 text-xs sm:text-sm font-bold text-center text-muted-foreground overflow-x-auto whitespace-nowrap">
              <span className="text-primary">{inventoryAtCost.toLocaleString()}</span>
              <span className="mx-2">+</span>
              <span className="text-emerald-600">{cash.toLocaleString()}</span>
              <span className="mx-2">+</span>
              <span className="text-warning">{owedToShop.toLocaleString()}</span>
              <span className="mx-2">−</span>
              <span className="text-destructive">{owedByShop.toLocaleString()}</span>
              <span className="mx-2">=</span>
              <span className={positive ? 'text-success' : 'text-destructive'}>{grandTotal.toLocaleString()}</span>
            </div>

            <div className={`p-5 rounded-2xl border-2 ${positive ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'} flex items-center justify-between flex-wrap gap-3`}>
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">💎 إجمالي صافي ثروة المحل</p>
                <p className="text-[10px] text-muted-foreground">مخزون + كاش + ديون ليّا − ديون عليّ</p>
              </div>
              <p className={`text-2xl sm:text-3xl font-extrabold ${positive ? 'text-success' : 'text-destructive'}`}>
                {grandTotal.toLocaleString()} <span className="text-base">ج.م</span>
              </p>
            </div>
          </div>
        );
      })()}

      {/* Reports Index — categorized with descriptions */}
      <ReportsIndex active={tab} onSelect={(k) => setTab(k as Tab)} />


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

        {tab === "inventory" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Boxes className="text-primary" size={20} />
              <h3 className="font-extrabold">المخزون والكاش (الوضع الحالي)</h3>
            </div>

            {/* Hero KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Boxes className="text-primary" size={18} />
                  <p className="text-xs font-extrabold text-muted-foreground">قيمة المخزون (تكلفة)</p>
                </div>
                <p className="text-2xl font-extrabold text-primary">{report.currentInventoryValueCost.toLocaleString()} <span className="text-sm">ج.م</span></p>
                <p className="text-xs text-muted-foreground mt-1">{report.totalUnitsInStock.toLocaleString()} قطعة • {report.totalSKUs} منتج</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-success" size={18} />
                  <p className="text-xs font-extrabold text-muted-foreground">قيمة المخزون (بيع)</p>
                </div>
                <p className="text-2xl font-extrabold text-success">{report.currentInventoryValueSell.toLocaleString()} <span className="text-sm">ج.م</span></p>
                <p className="text-xs text-muted-foreground mt-1">لو بعت كل اللي في المخزن</p>
              </div>

              <div className={`p-4 rounded-2xl bg-gradient-to-br border-2 ${report.cashOnHand >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className={report.cashOnHand >= 0 ? 'text-emerald-600' : 'text-destructive'} size={18} />
                  <p className="text-xs font-extrabold text-muted-foreground">الكاش الحالي (تقديري)</p>
                </div>
                <p className={`text-2xl font-extrabold ${report.cashOnHand >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {report.cashOnHand.toLocaleString()} <span className="text-sm">ج.م</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">داخل {report.lifetimeCashIn.toLocaleString()} − خارج {report.lifetimeCashOut.toLocaleString()}</p>
              </div>
            </div>

            {/* Profit forecast from stock */}
            <div className="p-4 rounded-2xl bg-accent/40 mb-5">
              <p className="text-sm font-extrabold mb-2">📈 الربح المتوقع من تصريف المخزون الحالي</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">قيمة بيع - قيمة شراء</span>
                <span className={`text-2xl font-extrabold ${report.expectedGrossProfitFromStock >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {report.expectedGrossProfitFromStock.toLocaleString()} ج.م
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ده الـ Gross Profit المتوقع لو بعت كل المخزون بسعر القطاعي العادي (مش بالجملة).
              </p>
            </div>

            {/* Stock alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs font-bold text-muted-foreground">منتجات قاربت تخلص (low stock)</p>
                <p className="text-2xl font-extrabold text-warning mt-1">{report.lowStockCount}</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-bold text-muted-foreground">منتجات نفدت (out of stock)</p>
                <p className="text-2xl font-extrabold text-destructive mt-1">{report.outOfStockCount}</p>
              </div>
            </div>

            {/* Equation walkthrough */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-border">
              <p className="text-sm font-extrabold mb-3">🧮 إزاي طلعت الأرقام دي؟</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-accent/30 rounded-lg">
                  <span>+ كل اللي قبضته (مدفوع على فواتير + سداد عملاء)</span>
                  <span className="font-extrabold text-success">+{report.lifetimeCashIn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 bg-accent/30 rounded-lg">
                  <span>− مدفوعات للموردين (شراء + سداد)</span>
                  <span className="font-extrabold text-destructive">-{(report.lifetimeCashOut - 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 bg-accent/30 rounded-lg border-t-2 border-primary/30 mt-1">
                  <span className="font-extrabold">= الكاش المتاح حاليًا</span>
                  <span className={`font-extrabold ${report.cashOnHand >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{report.cashOnHand.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 مفهوم: لما تشتري بضاعة وتدفع كاش، الفلوس بتتحول لـ "مخزون" مش بتختفي — كل اللي اشتريته متراكم في قيمة المخزون الحالية.
              </p>
            </div>
          </div>
        )}

        {tab === "calculator" && (
          <ReportCalculator
            inventoryAtCost={report.currentInventoryValueCost}
            inventoryAtSell={report.currentInventoryValueSell}
            cashOnHand={report.cashOnHand}
            customerDebt={report.currentCustomerDebt}
            supplierDebt={report.currentSupplierDebt}
            netProfit={report.netProfit}
            totalSales={report.totalSales}
            totalExpenses={report.totalExpenses}
          />
        )}

        {tab === "debt" && <DebtReport />}

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

        {tab === "bestCustomers" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-amber-500" size={20} />
              <h3 className="font-extrabold">العملاء الأكثر شراءً (في الفترة)</h3>
            </div>
            {report.bestCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">لا توجد بيانات في هذه الفترة</p>
            ) : (
              <>
                {/* Top 3 highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {report.bestCustomers.slice(0, 3).map((c, i) => (
                    <div key={i} className={`stat-card flex flex-col h-full min-h-[120px] ${i === 0 ? 'border-2 border-amber-500/30' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500 font-extrabold">{i + 1}</span>
                        <span className="text-sm font-extrabold truncate flex-1">{c.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.invoiceCount} فاتورة</p>
                      <p className="text-lg font-extrabold text-primary mt-auto truncate">{c.totalSpent.toLocaleString()} ج.م</p>
                      {c.totalRemaining > 0 && (
                        <p className="text-xs text-destructive font-bold mt-1">متبقي عليه: {c.totalRemaining.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
                <DataTable
                  title=""
                  empty=""
                  headers={["#", "العميل", "عدد الفواتير", "الإجمالي", "المدفوع", "المتبقي"]}
                  rows={report.bestCustomers.map((c, i) => [
                    `${i + 1}`,
                    c.name,
                    `${c.invoiceCount}`,
                    `${c.totalSpent.toLocaleString()} ج.م`,
                    `${c.totalPaid.toLocaleString()} ج.م`,
                    `${c.totalRemaining.toLocaleString()} ج.م`,
                  ])}
                />
              </>
            )}
          </div>
        )}

        {tab === "staleProducts" && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Package className="text-warning" size={20} />
                <h3 className="font-extrabold">المنتجات الراكدة (مفيش مبيعات منذ {staleDays}+ يوم)</h3>
              </div>
              <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
                {([30, 60, 90, 180] as StaleDays[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setStaleDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${staleDays === d ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    {d === 180 ? "6 شهور" : `${d} يوم`}
                  </button>
                ))}
              </div>
            </div>
            {staleByDays.staleProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">🎉 ممتاز! كل المنتجات اللي عندك مخزون منها بيعت في آخر {staleDays} يوم.</p>
            ) : (
              <>
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">قيمة المخزون الراكد (تكلفة)</p>
                    <p className="text-xl font-extrabold text-warning">{staleByDays.totalStaleValue.toLocaleString()} ج.م</p>
                  </div>
                  <p className="text-xs text-muted-foreground sm:text-left">رأس مال متجمد — فكّر في تخفيضات أو إرجاعها للموردين</p>
                </div>
                <DataTable
                  title=""
                  empty=""
                  headers={["المنتج", "الكود", "الكمية", "قيمة المخزون", "آخر بيع", "أيام بدون بيع"]}
                  rows={staleByDays.staleProducts.map((p) => [
                    p.name,
                    p.code,
                    `${p.quantity}`,
                    `${p.stockValue.toLocaleString()} ج.م`,
                    p.lastSale ? new Date(p.lastSale).toLocaleDateString("ar-EG") : "لم يُبَع أبدًا",
                    p.daysSinceLastSale !== null ? `${p.daysSinceLastSale} يوم` : "—",
                  ])}
                />
              </>
            )}
          </div>
        )}
      </div>
      {/* end report ref wrapper */}
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
