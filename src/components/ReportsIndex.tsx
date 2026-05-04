import {
  BarChart3, Banknote, Boxes, Calculator, AlertCircle, Receipt,
  RotateCcw, Wallet, ShoppingBag, Package, Users, Crown, Star,
  TrendingUp, Clock, Truck, Percent
} from "lucide-react";

export type ReportCategory = {
  key: string;
  title: string;
  color: string; // tailwind text color class
  bg: string;    // tailwind bg color class
  items: { key: string; label: string; desc: string; icon: any }[];
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: "overview",
    title: "نظرة عامة",
    color: "text-primary",
    bg: "bg-primary/10",
    items: [
      { key: "summary",   label: "ملخص الفترة", desc: "أهم الأرقام: مبيعات، تكلفة، مرتجعات، أرباح، وأفضل 10 منتجات.", icon: Receipt },
      { key: "financial", label: "الموقف المالي", desc: "تحليل كامل لأرباح الفترة، الموردين، العملاء، والسيولة.", icon: Banknote },
    ],
  },
  {
    key: "sales",
    title: "المبيعات والعملاء",
    color: "text-success",
    bg: "bg-success/10",
    items: [
      { key: "sales",        label: "فواتير المبيعات", desc: "كل فواتير الفترة بالتفصيل: عميل، إجمالي، مدفوع، متبقي.", icon: BarChart3 },
      { key: "hourly",       label: "أداء يومي/ساعي", desc: "توزيع المبيعات على الساعات وأيام الأسبوع لمعرفة أوقات الذروة.", icon: Clock },
      { key: "bestCustomers",label: "أفضل العملاء", desc: "ترتيب العملاء حسب الإنفاق وعدد الفواتير في الفترة.", icon: Crown },
      { key: "customerAnalytics", label: "تحليل العملاء", desc: "متوسط فاتورة العميل، عدد فواتير، وعملاء جدد مقابل دائمين.", icon: Users },
      { key: "returns",      label: "المرتجعات", desc: "كل المنتجات اللي رجعت من العملاء وقيمتها.", icon: RotateCcw },
    ],
  },
  {
    key: "purchases",
    title: "المشتريات والموردين",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    items: [
      { key: "purchases",        label: "فواتير الشراء", desc: "كل فواتير الشراء بالتفصيل: المورد، الإجمالي، المتبقي.", icon: ShoppingBag },
      { key: "supplierBreakdown",label: "تجميع حسب المورد", desc: "مجموع المشتريات والمدفوع والمتبقي لكل مورد.", icon: Truck },
      { key: "supplierPayments", label: "سداد الموردين", desc: "مدفوعات سداد الديون القديمة للموردين خلال الفترة.", icon: Wallet },
    ],
  },
  {
    key: "debts",
    title: "المديونية",
    color: "text-warning",
    bg: "bg-warning/10",
    items: [
      { key: "debt", label: "تقرير المديونية", desc: "مديونية العملاء بفلاتر للعميل والفترة وتجميع/تفصيل وتصدير CSV/PDF.", icon: AlertCircle },
    ],
  },
  {
    key: "inventory",
    title: "المخزون والمنتجات",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    items: [
      { key: "inventory",     label: "المخزون والكاش", desc: "قيمة المخزون بالتكلفة والبيع، السيولة، وتنبيهات الكميات.", icon: Boxes },
      { key: "products",      label: "ربح كل منتج", desc: "إيراد، تكلفة، وربح كل منتج خلال الفترة.", icon: Package },
      { key: "margins",       label: "هامش الربح %", desc: "نسبة الربح لكل منتج لمعرفة الأعلى ربحية والأقل.", icon: Percent },
      { key: "staleProducts", label: "المنتجات الراكدة", desc: "اللي ملهاش مبيعات من 30/60/90/180 يوم وقيمتها المتجمدة.", icon: Package },
    ],
  },
  {
    key: "expenses",
    title: "المصاريف والحاسبة",
    color: "text-destructive",
    bg: "bg-destructive/10",
    items: [
      { key: "expenses",   label: "المصاريف", desc: "كل المصاريف الإدارية والتشغيلية في الفترة.", icon: Wallet },
      { key: "calculator", label: "حاسبة البنود", desc: "اختار أي بنود (مخزون/كاش/ديون/...) واجمعها أو شوف كل بند لوحده.", icon: Calculator },
    ],
  },
];

export default function ReportsIndex({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="mb-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card to-accent/30 border border-border shadow-sm animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="text-primary" size={20} />
        </div>
        <div>
          <h2 className="font-extrabold text-lg">📑 دليل التقارير</h2>
          <p className="text-xs text-muted-foreground">اختار التقرير اللي تحبه — كل تقرير ليه شرح مختصر</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-2xl border border-border bg-card/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${cat.bg} flex items-center justify-center`}>
                <Star className={cat.color} size={14} />
              </div>
              <h3 className={`font-extrabold text-sm ${cat.color}`}>{cat.title}</h3>
            </div>
            <div className="space-y-1.5">
              {cat.items.map((it) => {
                const Icon = it.icon;
                const isActive = active === it.key;
                return (
                  <button
                    key={it.key}
                    onClick={() => onSelect(it.key)}
                    className={`w-full text-right p-2.5 rounded-xl border transition-all hover:scale-[1.01] ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-transparent bg-accent/30 hover:bg-accent/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon size={14} className={isActive ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-extrabold ${isActive ? "text-primary" : ""}`}>{it.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{it.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
