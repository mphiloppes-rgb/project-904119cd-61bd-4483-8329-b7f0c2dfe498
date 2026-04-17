import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  ShoppingCart,
  Receipt,
  Building2,
} from "lucide-react";
import { getTodayInvoices, getTodayExpenses, getLowStockProducts, getCustomersWithDebt } from "@/lib/store";
import { getSuppliersWithDebt } from "@/lib/suppliers";
import { Link } from "react-router-dom";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import logo from "@/assets/logo.png";

export default function DashboardPage() {
  const { refreshKey } = useStoreRefresh();

  const data = useMemo(() => {
    const todayInvoices = getTodayInvoices();
    const todayExpenses = getTodayExpenses();
    const lowStock = getLowStockProducts();
    const debtCustomers = getCustomersWithDebt();
    const debtSuppliers = getSuppliersWithDebt();
    const totalSupplierDebt = debtSuppliers.reduce((s, x) => s + Math.max(0, x.balance || 0), 0);
    const totalCustomerDebt = debtCustomers.reduce((s, c) => s + Math.max(0, c.balance || 0), 0);

    const totalSales = todayInvoices.reduce((s, i) => s + i.total, 0);
    const totalCost = todayInvoices.reduce(
      (s, i) => s + i.items.reduce((a, it) => a + it.costPrice * it.quantity, 0), 0
    );
    const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalSales - totalCost - totalExpenses;

    return { totalSales, totalExpenses, netProfit, lowStock, debtCustomers, debtSuppliers, totalSupplierDebt, totalCustomerDebt, invoiceCount: todayInvoices.length };
  }, [refreshKey]);

  const stats = [
    { label: "مبيعات اليوم", value: data.totalSales, icon: ShoppingCart, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "مصاريف اليوم", value: data.totalExpenses, icon: TrendingDown, gradient: "from-destructive/20 to-destructive/5", iconBg: "bg-destructive/10", iconColor: "text-destructive" },
    { label: "صافي الربح", value: data.netProfit, icon: TrendingUp, gradient: "from-success/20 to-success/5", iconBg: "bg-success/10", iconColor: "text-success" },
    { label: "عدد الفواتير", value: data.invoiceCount, icon: Receipt, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary", isCurrency: false },
  ];

  return (
    <div>
      {/* Hero welcome section with big logo */}
      <div className="liquid-glass p-8 mb-8 animate-fade-in-up relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.07] animate-spin-slow" style={{ background: 'radial-gradient(circle, hsl(200 85% 48%), transparent)' }} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, hsl(200 85% 60%), transparent)' }} />
        
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ background: 'hsla(200, 85%, 48%, 0.15)', transform: 'scale(1.15)' }} />
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 shadow-xl animate-float" style={{ borderColor: 'hsl(200, 85%, 48%)', boxShadow: '0 8px 40px hsla(200, 85%, 48%, 0.3)' }}>
              <img src={logo} alt="الراعي للعدد والآلات" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-1">الراعي للعدد والآلات</h1>
          <p className="text-sm text-primary font-bold mb-1">موزع معتمد Fit & Apt</p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("ar-EG", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats — uniform sized cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={stat.label} className={`stat-card animate-fade-in-up stagger-${idx + 1} flex flex-col h-full min-h-[130px]`}>
            <div className="flex items-center gap-3 mb-3 min-h-[44px]">
              <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={stat.iconColor} size={22} />
              </div>
              <span className="text-sm font-bold text-muted-foreground leading-tight line-clamp-2">{stat.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold mt-auto truncate">
              {stat.isCurrency === false ? stat.value : `${stat.value.toLocaleString()} ج.م`}
            </p>
          </div>
        ))}
      </div>

      {/* Debt summary — quick view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <Link to="/suppliers" className="stat-card flex items-center gap-3 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="text-destructive" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground mb-0.5">مديونية المحل للموردين</p>
            <p className="text-xl font-extrabold text-destructive truncate">{data.totalSupplierDebt.toLocaleString()} <span className="text-xs">ج.م</span></p>
          </div>
        </Link>
        <Link to="/customers" className="stat-card flex items-center gap-3 hover:scale-[1.01] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Users className="text-warning" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground mb-0.5">مديونية العملاء للمحل</p>
            <p className="text-xl font-extrabold text-warning truncate">{data.totalCustomerDebt.toLocaleString()} <span className="text-xs">ج.م</span></p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alert */}
        <div className="stat-card animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="text-warning" size={20} />
            </div>
            <h3 className="font-extrabold">منتجات أوشكت على النفاد</h3>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد منتجات منخفضة المخزون 👍</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.lowStock.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
                  <span className="text-sm font-bold">{p.name}</span>
                  <span className="text-sm font-extrabold text-destructive">{p.quantity} قطعة</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debt customers */}
        <div className="stat-card animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="text-primary" size={20} />
            </div>
            <h3 className="font-extrabold">عملاء لديهم مديونية</h3>
          </div>
          {data.debtCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مديونيات 👍</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.debtCustomers.map((c) => (
                <Link
                  key={c.id}
                  to="/customers"
                  className="flex justify-between items-center p-3 rounded-xl bg-accent/50 hover:bg-accent transition-all duration-200"
                >
                  <span className="text-sm font-bold">{c.name}</span>
                  <span className="text-sm font-extrabold text-destructive">{c.balance.toLocaleString()} ج.م</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
