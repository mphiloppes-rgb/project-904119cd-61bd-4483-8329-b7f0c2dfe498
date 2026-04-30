import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { isCashier } from "@/lib/auth";

/**
 * يحمي الراوت من الكاشير. لو حاول يفتح صفحة مدير من URL مباشرة
 * يتحول لـ POS مع رسالة. ده شرط ثاني فوق إخفاء الـ nav.
 */
export default function RequireAdmin({ children, redirect = "/pos" }: { children: React.ReactNode; redirect?: string }) {
  if (isCashier()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Lock className="text-destructive" size={32} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">صفحة محظورة 🔒</h2>
        <p className="text-sm text-muted-foreground mb-4">دي صفحة للمدير فقط. الكاشير ميقدرش يفتحها.</p>
        <Navigate to={redirect} replace />
      </div>
    );
  }
  return <>{children}</>;
}
