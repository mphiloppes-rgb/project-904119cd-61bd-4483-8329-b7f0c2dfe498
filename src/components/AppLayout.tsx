import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/pos", label: "نقطة البيع", icon: ShoppingCart },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/customers", label: "العملاء", icon: Users },
  { path: "/invoices", label: "الفواتير", icon: Receipt },
  { path: "/expenses", label: "المصاريف", icon: Wallet },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-lg font-bold text-sidebar-primary-foreground leading-relaxed">
              الراعي للعدد والآلات
            </h1>
            <p className="text-xs text-sidebar-foreground/60 mt-1">موزع معتمد Fit & Apt</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
            <p>إدارة: أ/ مينا عيد</p>
            <p className="mt-1" dir="ltr">📞 01210004358</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b">
          <h2 className="font-bold text-primary">الراعي للعدد والآلات</h2>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
