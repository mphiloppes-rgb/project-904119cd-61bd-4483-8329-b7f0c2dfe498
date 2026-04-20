import { useRef, useState, useMemo, useEffect } from "react";
import { Download, Upload, FileSpreadsheet, Database, AlertTriangle, Settings, Shield, UserPlus, Trash2, Edit2, Hash, Grid3x3, X, Check } from "lucide-react";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { exportAllDataToExcel, exportProductsToExcel, exportCustomersToExcel, exportInvoicesToExcel, exportExpensesToExcel } from "@/lib/excel-export";
import { toast } from "@/hooks/use-toast";
import {
  isAuthEnabled, setAuthEnabled, getUsers, addUser, updateUser, deleteUser,
  isAdmin, getAuditLog, type AppUser, type Role, type AuthMode,
  getCurrentUser,
} from "@/lib/auth";
import PatternLock from "@/components/PatternLock";

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  // Auth state
  const authEnabled = isAuthEnabled();
  const admin = isAdmin();
  const users = useMemo(() => getUsers(), [authEnabled]);

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<Role>("cashier");
  const [formMode, setFormMode] = useState<AuthMode>("pin");
  const [formPin, setFormPin] = useState("");
  const [formPattern, setFormPattern] = useState("");
  const [resetTick, setResetTick] = useState(0);

  const openAdd = () => {
    setEditingUser(null); setFormName(""); setFormRole("cashier"); setFormMode("pin");
    setFormPin(""); setFormPattern(""); setShowUserForm(true);
  };
  const openEdit = (u: AppUser) => {
    setEditingUser(u); setFormName(u.name); setFormRole(u.role);
    setFormMode(u.authMode || "pin");
    setFormPin(u.authMode === "pattern" ? "" : u.pin);
    setFormPattern(u.authMode === "pattern" ? u.pin : "");
    setShowUserForm(true);
  };

  const saveUser = () => {
    if (!formName.trim()) { toast({ title: "اسم المستخدم مطلوب", variant: "destructive" }); return; }
    const credential = formMode === "pin" ? formPin : formPattern;
    if (formMode === "pin" && credential.length < 4) { toast({ title: "PIN لازم 4 أرقام على الأقل", variant: "destructive" }); return; }
    if (formMode === "pattern" && credential.split(",").filter(Boolean).length < 4) { toast({ title: "النمط لازم 4 نقط على الأقل", variant: "destructive" }); return; }
    // Check duplicate credential
    const dup = getUsers().find(u => u.pin === credential && u.id !== editingUser?.id);
    if (dup) { toast({ title: "في مستخدم تاني له نفس الكود", variant: "destructive" }); return; }
    if (editingUser) {
      updateUser(editingUser.id, { name: formName.trim(), role: formRole, authMode: formMode, pin: credential });
      toast({ title: "تم التحديث ✅" });
    } else {
      addUser({ name: formName.trim(), role: formRole, authMode: formMode, pin: credential });
      toast({ title: "تمت إضافة المستخدم ✅" });
    }
    setShowUserForm(false); refresh();
  };

  const handleDelete = (u: AppUser) => {
    if (!confirm(`حذف المستخدم "${u.name}"؟`)) return;
    deleteUser(u.id); refresh(); toast({ title: "تم الحذف" });
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const counts = await restoreBackup(file);
      toast({ title: "تم استعادة البيانات بنجاح ✅", description: `${counts.products} منتج، ${counts.customers} عميل، ${counts.invoices} فاتورة، ${counts.expenses} مصروف` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setRestoring(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const excelExports = [
    { label: "المنتجات", action: exportProductsToExcel },
    { label: "العملاء", action: exportCustomersToExcel },
    { label: "الفواتير", action: exportInvoicesToExcel },
    { label: "المصاريف", action: exportExpensesToExcel },
    { label: "جميع البيانات", action: exportAllDataToExcel },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings className="text-primary" size={22} /></div>
        <h1 className="page-header mb-0">الإعدادات</h1>
      </div>

      {/* User form modal */}
      {showUserForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">{editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h3>
                <button onClick={() => setShowUserForm(false)} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-muted-foreground">الاسم *</label>
                  <input className="input-field w-full mt-1" value={formName} onChange={e => setFormName(e.target.value)} autoFocus maxLength={30} />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground">الصلاحية *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setFormRole("admin")} className={`py-2.5 rounded-xl font-bold text-sm ${formRole === "admin" ? "bg-primary text-primary-foreground shadow-lg" : "bg-accent"}`}>👑 مدير (كل الصلاحيات)</button>
                    <button onClick={() => setFormRole("cashier")} className={`py-2.5 rounded-xl font-bold text-sm ${formRole === "cashier" ? "bg-primary text-primary-foreground shadow-lg" : "bg-accent"}`}>🛒 كاشير (بيع + ديون فقط)</button>
                  </div>
                  {formRole === "cashier" && (
                    <p className="text-xs text-warning mt-2 bg-warning/10 p-2 rounded-lg">
                      ⚠️ الكاشير يقدر فقط: يبيع، يضيف عملاء، يسجل ديون، يسترجع فواتير. مش هيشوف سعر الشراء أو الأرباح أو التقارير.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground">طريقة الدخول *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setFormMode("pin")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm ${formMode === "pin" ? "bg-primary text-primary-foreground shadow-lg" : "bg-accent"}`}>
                      <Hash size={14} /> PIN رقمي
                    </button>
                    <button onClick={() => setFormMode("pattern")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm ${formMode === "pattern" ? "bg-primary text-primary-foreground shadow-lg" : "bg-accent"}`}>
                      <Grid3x3 size={14} /> نمط
                    </button>
                  </div>
                </div>

                {formMode === "pin" ? (
                  <div>
                    <label className="text-sm font-bold text-muted-foreground">PIN (4-6 أرقام) *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="input-field w-full mt-1 text-center text-2xl tracking-widest font-extrabold"
                      value={formPin}
                      onChange={e => setFormPin(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="••••"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-bold text-muted-foreground block mb-2">ارسم النمط (4 نقط على الأقل) *</label>
                    <PatternLock onChange={setFormPattern} reset={resetTick} size={220} />
                    <button onClick={() => { setFormPattern(""); setResetTick(t => t + 1); }} className="text-xs mt-2 text-muted-foreground underline">مسح وإعادة الرسم</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={saveUser} className="btn-primary py-3"><Check size={18} /> {editingUser ? "تحديث" : "إضافة"}</button>
                <button onClick={() => setShowUserForm(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Auth & Users */}
        {admin && (
          <div className="stat-card animate-fade-in-up stagger-1 lg:col-span-2">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="text-primary" size={22} /></div>
                <div>
                  <h3 className="font-extrabold text-lg">المستخدمين والصلاحيات</h3>
                  <p className="text-xs text-muted-foreground">إدارة دخول المدير والكاشير بـ PIN أو نمط</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer bg-accent px-3 py-2 rounded-xl">
                  <input
                    type="checkbox"
                    checked={authEnabled}
                    onChange={e => {
                      if (e.target.checked && getUsers().length === 0) {
                        toast({ title: "لازم تضيف مستخدم مدير الأول", variant: "destructive" });
                        return;
                      }
                      setAuthEnabled(e.target.checked);
                      window.dispatchEvent(new Event("auth-change"));
                      refresh();
                      toast({ title: e.target.checked ? "✅ الحماية مفعلة" : "🔓 الحماية متوقفة" });
                    }}
                  />
                  <span className="text-sm font-extrabold">{authEnabled ? "الحماية مفعلة" : "بدون حماية"}</span>
                </label>
                <button onClick={openAdd} className="btn-primary py-2 px-4 text-sm"><UserPlus size={16} /> مستخدم جديد</button>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 bg-accent/30 rounded-xl">
                <p className="text-sm text-muted-foreground">مفيش مستخدمين. أضف أول مستخدم (مدير) عشان تفعّل الحماية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map(u => (
                  <div key={u.id} className="bg-accent/40 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"}`}>
                          {u.role === "admin" ? "👑 مدير" : "🛒 كاشير"}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.authMode === "pattern" ? "نمط" : "PIN"}</span>
                      </div>
                      <p className="font-extrabold truncate">{u.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-xl hover:bg-muted"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(u)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="stat-card animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="text-primary" size={22} /></div>
            <h3 className="font-extrabold text-lg">النسخ الاحتياطي</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">احفظ نسخة من جميع بياناتك أو استعد بيانات سابقة</p>
          <div className="space-y-3">
            <button onClick={downloadBackup} className="w-full btn-primary py-3"><Download size={18} /> تحميل نسخة احتياطية</button>
            <button onClick={() => fileRef.current?.click()} disabled={restoring} className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-xl font-extrabold hover:opacity-90 transition-all duration-200">
              <Upload size={18} /> {restoring ? "جاري الاستعادة..." : "استعادة نسخة احتياطية"}
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </div>
          <div className="mt-4 p-3 bg-warning/10 rounded-xl flex items-start gap-2">
            <AlertTriangle className="text-warning shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-muted-foreground font-bold">استعادة النسخة الاحتياطية ستحل محل جميع البيانات الحالية</p>
          </div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><FileSpreadsheet className="text-success" size={22} /></div>
            <h3 className="font-extrabold text-lg">تصدير إلى Excel</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">صدّر بياناتك إلى ملف Excel لعرضها أو طباعتها</p>
          <div className="space-y-2">
            {excelExports.map((item) => (
              <button key={item.label} onClick={item.action} className="w-full flex items-center justify-between p-3 bg-accent/50 rounded-xl hover:bg-accent transition-all duration-200 font-bold text-sm">
                <span>{item.label}</span>
                <Download size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit log */}
      {admin && authEnabled && (
        <div className="stat-card mt-4 animate-fade-in-up">
          <h3 className="font-extrabold text-lg mb-3">سجل العمليات (آخر 20)</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {getAuditLog().slice(0, 20).map(e => (
              <div key={e.id} className="flex justify-between items-center text-xs p-2 bg-accent/30 rounded-lg">
                <div>
                  <span className="font-extrabold">{e.userName}</span>
                  <span className="text-muted-foreground"> • {e.action}</span>
                  {e.details && <span className="text-muted-foreground"> — {e.details}</span>}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleString("ar-EG")}</span>
              </div>
            ))}
            {getAuditLog().length === 0 && <p className="text-center text-sm text-muted-foreground py-4">لا يوجد سجل</p>}
          </div>
        </div>
      )}
    </div>
  );
}
