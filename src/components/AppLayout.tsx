import { useState, useEffect } from "react";
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
  Truck,
  PackagePlus,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { LogoutButton } from "./PinLock";
import { isCashier, isAuthEnabled, getCurrentUser } from "@/lib/auth";

interface NavItem { path: string; label: string; icon: any; cashierAllowed?: boolean; }
const navItems: NavItem[] = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/pos", label: "نقطة البيع", icon: ShoppingCart, cashierAllowed: true },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/customers", label: "العملاء", icon: Users, cashierAllowed: true },
  { path: "/suppliers", label: "الموردين", icon: Truck },
  { path: "/purchases", label: "فواتير الشراء", icon: PackagePlus },
  { path: "/invoices", label: "الفواتير", icon: Receipt, cashierAllowed: true },
  { path: "/expenses", label: "المصاريف", icon: Wallet },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener("auth-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("auth-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const cashier = isCashier();
  const visibleNav = navItems.filter(it => !cashier || it.cashierAllowed);
  const currentUser = getCurrentUser();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, hsl(200 85% 48%), transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, hsl(200 85% 60%), transparent)' }} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden animate-fade-in-up" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[270px] bg-sidebar text-sidebar-foreground transition-transform duration-500 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
        style={{ boxShadow: '-10px 0 40px hsla(215 30% 10% / 0.3)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="p-5 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: 'hsl(200, 85%, 48%)' }}>
                <img src={logo} alt="الراعي للعدد والآلات" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-sidebar-primary-foreground leading-tight">
                  الراعي للعدد والآلات
                </h1>
                <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">موزع معتمد Fit & Apt</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNav.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 animate-slide-in ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-[-4px]"
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <item.icon size={20} className={isActive ? "animate-float" : ""} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="mr-auto w-2 h-2 rounded-full bg-sidebar-primary-foreground animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/40 space-y-2">
            {currentUser && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sidebar-foreground/80 font-extrabold">
                  {currentUser.name} • {currentUser.role === 'admin' ? 'مدير' : 'كاشير'}
                </span>
                <LogoutButton />
              </div>
            )}
            <p className="font-bold">إدارة: أ/ مينا عيد</p>
            <p dir="ltr">📞 01210004358</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen relative">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 glass-card rounded-none border-x-0 border-t-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'hsl(200, 85%, 48%)' }}>
              <img src={logo} alt="الراعي" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-extrabold text-primary">الراعي للعدد والآلات</h2>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className="p-3 sm:p-4 md:p-6 animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
