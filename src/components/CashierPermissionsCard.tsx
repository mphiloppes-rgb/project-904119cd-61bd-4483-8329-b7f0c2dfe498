import { Shield, Check, X as Deny, AlertTriangle } from "lucide-react";
import { CASHIER_PERMISSIONS } from "@/lib/pos-safe";

export default function CashierPermissionsCard() {
  return (
    <div className="stat-card animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="text-primary" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">صلاحيات الكاشير</h3>
          <p className="text-xs text-muted-foreground">ملخص ما يستطيع/لا يستطيع المستخدم بدور "كاشير" فعله</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* مسموح */}
        <div className="p-4 rounded-2xl bg-success/5 border-2 border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
              <Check className="text-success" size={18} />
            </div>
            <h4 className="font-extrabold text-success">يقدر يعمل</h4>
          </div>
          <ul className="space-y-2">
            {CASHIER_PERMISSIONS.allowed.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-success/5">
                <span className="text-base flex-shrink-0">{p.icon}</span>
                <span className="font-bold">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ممنوع */}
        <div className="p-4 rounded-2xl bg-destructive/5 border-2 border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
              <Deny className="text-destructive" size={18} />
            </div>
            <h4 className="font-extrabold text-destructive">ممنوع منه</h4>
          </div>
          <ul className="space-y-2">
            {CASHIER_PERMISSIONS.denied.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-destructive/5">
                <span className="text-base flex-shrink-0">{p.icon}</span>
                <span className="font-bold">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2">
        <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={16} />
        <div className="text-xs">
          <p className="font-extrabold text-warning mb-1">الحماية مطبقة على مستويين:</p>
          <ul className="text-muted-foreground space-y-0.5 list-disc pr-4">
            <li>إخفاء الروابط من القائمة الجانبية للكاشير.</li>
            <li>حماية URL مباشر — لو حاول يفتح صفحة ممنوعة بالـ URL، يتحول لـ POS.</li>
            <li>تجريد الحقول الحساسة (سعر الشراء/الكميات) من البيانات قبل العرض.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
