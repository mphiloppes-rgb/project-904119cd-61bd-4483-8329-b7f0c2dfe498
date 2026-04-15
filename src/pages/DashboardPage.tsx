import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { getTodayInvoices, getTodayExpenses, getLowStockProducts, getCustomersWithDebt } from "@/lib/store";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function DashboardPage() {
  const data = useMemo(() => {
    const todayInvoices = getTodayInvoices();
    const todayExpenses = getTodayExpenses();
    const lowStock = getLowStockProducts();
    const debtCustomers = getCustomersWithDebt();

    const totalSales = todayInvoices.reduce((s, i) => s + i.total, 0);
    const totalCost = todayInvoices.reduce(
      (s, i) => s + i.items.reduce((a, it) => a + it.costPrice * it.quantity, 0), 0
    );
    const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalSales - totalCost - totalExpenses;

    return { totalSales, totalExpenses, netProfit, lowStock, debtCustomers, invoiceCount: todayInvoices.length };
  }, []);

  const stats = [
    { label: "مبيعات اليوم", value: data.totalSales, icon: ShoppingCart, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "مصاريف اليوم", value: data.totalExpenses, icon: TrendingDown, gradient: "from-destructive/20 to-destructive/5", iconBg: "bg-destructive/10", iconColor: "text-destructive" },
    { label: "صافي الربح", value: data.netProfit, icon: TrendingUp, gradient: "from-success/20 to-success/5", iconBg: "bg-success/10", iconColor: "text-success" },
    { label: "عدد الفواتير", value: data.invoiceCount, icon: Receipt, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/10", iconColor: "text-primary", isCurrency: false },
  ];

  return (
    <div>
      {/* Welcome header */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
        <img src={logo} alt="Logo" className="w-14 h-14 rounded-2xl object-contain animate-float" />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">مرحباً بك في الراعي للعدد والآلات</h1>
          <p className="text-sm text-muted-foreground">لوحة التحكم - {new Date().toLocaleDateString("ar-EG", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={stat.label} className={`stat-card animate-fade-in-up stagger-${idx + 1}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={stat.iconColor} size={22} />
              </div>
              <span className="text-sm font-bold text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-extrabold">
              {stat.isCurrency === false ? stat.value : `${stat.value.toLocaleString()} ج.م`}
            </p>
          </div>
        ))}
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
