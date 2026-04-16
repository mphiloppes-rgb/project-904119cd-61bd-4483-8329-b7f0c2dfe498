import { useState, useEffect } from "react";
import { Lock, LogOut } from "lucide-react";
import {
  isAuthEnabled,
  getCurrentUser,
  loginByPin,
  logout,
  getUsers,
} from "@/lib/auth";
import logo from "@/assets/logo.png";

export default function PinLock({ children }: { children: React.ReactNode }) {
  const [, setTick] = useState(0);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener("storage", handler);
    window.addEventListener("auth-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("auth-change", handler);
    };
  }, []);

  // Auto-attempt login at exact pin match
  useEffect(() => {
    if (pin.length >= 4) {
      const u = getUsers().find(x => x.pin === pin);
      if (u) {
        loginByPin(pin);
        setPin("");
        setError("");
        window.dispatchEvent(new Event("auth-change"));
        setTick(t => t + 1);
      }
    }
  }, [pin]);

  const enabled = isAuthEnabled();
  const user = getCurrentUser();
  const users = getUsers();

  if (!enabled) return <>{children}</>;
  if (users.length === 0) return <>{children}</>;
  if (user) return <>{children}</>;

  const tryLogin = () => {
    if (pin.length < 4) return;
    const u = loginByPin(pin);
    if (u) {
      setPin("");
      setError("");
      window.dispatchEvent(new Event("auth-change"));
      setTick(t => t + 1);
    } else {
      setError("PIN غير صحيح");
      setPin("");
    }
  };

  const press = (n: string) => {
    setError("");
    if (n === "C") { setPin(""); return; }
    if (n === "<") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 6) setPin(p => p + n);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 mb-3" style={{ borderColor: 'hsl(var(--primary))' }}>
            <img src={logo} alt="logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold">الراعي للعدد والآلات</h1>
          <p className="text-sm text-muted-foreground mt-1">أدخل كود PIN للدخول</p>
        </div>

        <div className="glass-modal rounded-3xl p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock size={18} className="text-primary" />
            <span className="font-bold">PIN ({pin.length}/6)</span>
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < pin.length ? "bg-primary border-primary scale-110" : "border-border"
                }`}
              />
            ))}
          </div>
          {error && <p className="text-center text-destructive font-bold text-sm mb-2">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9","C","0","<"].map(n => (
              <button
                key={n}
                onClick={() => press(n)}
                className="aspect-square rounded-2xl bg-accent hover:bg-primary hover:text-primary-foreground font-extrabold text-2xl transition-all active:scale-95"
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={tryLogin}
            disabled={pin.length < 4}
            className="w-full btn-primary py-3 mt-4 disabled:opacity-50"
          >
            دخول
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">المستخدمون المتاحون:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {users.map(u => (
              <span key={u.id} className="text-xs px-3 py-1 rounded-full bg-accent font-bold">
                {u.name} ({u.role === "admin" ? "مدير" : "كاشير"})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogoutButton() {
  if (!isAuthEnabled()) return null;
  const user = getCurrentUser();
  if (!user) return null;
  return (
    <button
      onClick={() => {
        logout();
        window.dispatchEvent(new Event("auth-change"));
      }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold transition-all"
    >
      <LogOut size={14} />
      خروج ({user.name})
    </button>
  );
}
