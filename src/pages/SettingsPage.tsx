import { useRef, useState, useMemo, useEffect } from "react";
import { Download, Upload, FileSpreadsheet, Database, AlertTriangle, Settings, Shield, UserPlus, Trash2, Edit2, Hash, Grid3x3, X, Check, History, RotateCcw, Clock, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { exportAllDataToExcel, exportProductsToExcel, exportCustomersToExcel, exportInvoicesToExcel, exportExpensesToExcel } from "@/lib/excel-export";
import {
  getSnapshots, restoreSnapshot, deleteSnapshot, takeSnapshot,
  getAutoBackupInterval, setAutoBackupInterval, diffSnapshotWithCurrent,
  type Snapshot, type SnapshotDiffRow,
} from "@/lib/auto-backup";
import { getPriceHistory, clearPriceHistory, revertToOldCost, exportPriceHistoryCSV, type PriceChange } from "@/lib/price-history";
import { Search as SearchIcon, RotateCw } from "lucide-react";
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
            <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-lg">
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

        {/* Auto Snapshots */}
        <SnapshotsCard />

        {/* Price changes log */}
        {admin && <PriceHistoryCard />}

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

function SnapshotsCard() {
  const [snaps, setSnaps] = useState<Snapshot[]>(() => getSnapshots());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [diffRows, setDiffRows] = useState<SnapshotDiffRow[] | null>(null);
  const [intervalMs, setIntervalMsState] = useState<number>(() => getAutoBackupInterval());

  const reload = () => setSnaps(getSnapshots());

  useEffect(() => {
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, []);

  const handleManual = () => {
    const s = takeSnapshot('حفظ يدوي');
    if (s) {
      toast({ title: "تم حفظ لقطة جديدة ✅" });
      reload();
    } else {
      toast({ title: "مفيش تغييرات جديدة لحفظها" });
    }
  };

  const openConfirm = (id: string) => {
    setConfirmId(id);
    setDiffRows(diffSnapshotWithCurrent(id));
  };

  const handleRestore = () => {
    if (!confirmId) return;
    const ok = restoreSnapshot(confirmId);
    if (ok) {
      toast({ title: "تم استرجاع البيانات ✅", description: "هيتم تحديث الصفحة" });
      setTimeout(() => window.location.reload(), 1200);
    } else {
      toast({ title: "فشل الاسترجاع", variant: "destructive" });
    }
    setConfirmId(null);
    setDiffRows(null);
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    reload();
    toast({ title: "تم حذف اللقطة" });
  };

  const intervals: { label: string; value: number }[] = [
    { label: '15 ثانية', value: 15_000 },
    { label: '30 ثانية', value: 30_000 },
    { label: '1 دقيقة', value: 60_000 },
    { label: '5 دقايق', value: 300_000 },
    { label: '15 دقيقة', value: 900_000 },
  ];

  const applyInterval = (ms: number) => {
    setAutoBackupInterval(ms);
    setIntervalMsState(ms);
    toast({ title: '✅ تم تعديل تكرار الحفظ التلقائي' });
  };

  return (
    <div className="stat-card animate-fade-in-up stagger-2 sm:col-span-2">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><History className="text-success" size={22} /></div>
          <div>
            <h3 className="font-extrabold text-lg">الحفظ التلقائي (Offline)</h3>
            <p className="text-xs text-muted-foreground">آخر {snaps.length} لقطة محفوظة محلياً • أي عملية بتُحفظ فوراً</p>
          </div>
        </div>
        <button onClick={handleManual} className="btn-primary text-xs px-3 py-2">
          <Clock size={14} /> حفظ لقطة الآن
        </button>
      </div>

      {/* Interval picker */}
      <div className="bg-accent/30 rounded-xl p-3 mb-4">
        <p className="text-xs font-extrabold mb-2">⏱️ تكرار الحفظ التلقائي</p>
        <div className="flex flex-wrap gap-2">
          {intervals.map(opt => (
            <button
              key={opt.value}
              onClick={() => applyInterval(opt.value)}
              className={`text-xs font-extrabold px-3 py-2 rounded-lg transition-all ${
                intervalMs === opt.value
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : 'bg-background border border-border hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {snaps.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground bg-accent/30 rounded-xl">
          لا توجد لقطات بعد. هتتسجل تلقائياً مع أي عملية.
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-2">
          {snaps.map((s, idx) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-3 bg-accent/40 rounded-xl hover:bg-accent transition-all">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-extrabold w-7 h-7 rounded-lg bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold truncate">{s.trigger}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString("ar-EG")} • {(s.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openConfirm(s.id)}
                  className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  title="معاينة الفروقات واسترجاع"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 p-3 bg-success/10 rounded-xl flex items-start gap-2">
        <Database className="text-success shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-muted-foreground font-bold">
          النظام بيحفظ لقطة كل {intervals.find(i => i.value === intervalMs)?.label || 'فترة'} + بعد كل عملية + قبل قفل البرنامج. أقصى 30 لقطة.
        </p>
      </div>

      {/* Compare & restore confirmation */}
      {confirmId && (
        <div className="modal-overlay">
          <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-warning" size={24} />
              <h3 className="font-extrabold text-lg">معاينة الفروقات قبل الاسترجاع</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ده مقارنة بين البيانات الحالية واللقطة اللى هترجعها. الأرقام بتعد العناصر في كل قسم.
            </p>

            {diffRows && (
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-right p-3 font-extrabold">القسم</th>
                      <th className="text-center p-3 font-extrabold">الحالى</th>
                      <th className="text-center p-3 font-extrabold">في اللقطة</th>
                      <th className="text-center p-3 font-extrabold">الفرق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map(r => (
                      <tr key={r.key} className="border-t border-border/50">
                        <td className="p-3 font-bold">{r.label}</td>
                        <td className="p-3 text-center">{r.before.toLocaleString()}</td>
                        <td className="p-3 text-center">{r.after.toLocaleString()}</td>
                        <td className={`p-3 text-center font-extrabold ${
                          r.delta > 0 ? 'text-success' : r.delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {r.delta > 0 ? `+${r.delta}` : r.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-4 text-xs text-foreground">
              ⚠️ هيتم استبدال كل البيانات الحالية. هتتحفظ لقطة سلامة من الوضع الحالي قبل التغيير عشان تقدر ترجع لها.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleRestore} className="btn-primary py-3">تأكيد الاسترجاع</button>
              <button onClick={() => { setConfirmId(null); setDiffRows(null); }} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceHistoryCard() {
  const [tick, setTick] = useState(0);
  const history = useMemo(() => getPriceHistory(), [tick]);
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all');
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (filter !== 'all' && h.direction !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!h.productName.toLowerCase().includes(q) && !(h.userReason || '').toLowerCase().includes(q) && !h.reason.toLowerCase().includes(q)) return false;
      }
      const t = new Date(h.date).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate && t > new Date(toDate).getTime() + 24 * 3600 * 1000) return false;
      return true;
    });
  }, [history, filter, query, fromDate, toDate]);

  const ups = history.filter(h => h.direction === 'up').length;
  const downs = history.filter(h => h.direction === 'down').length;

  const handleClear = () => {
    if (!confirm('مسح كل سجل تغييرات الأسعار؟')) return;
    clearPriceHistory();
    setTick(t => t + 1);
    toast({ title: 'تم المسح' });
  };

  const handleRevert = async (change: PriceChange) => {
    const msg = `⚠️ تأكيد إرجاع السعر\n\nالمنتج: ${change.productName}\nمن: ${change.newCost.toLocaleString()} ج.م\nإلى: ${change.oldCost.toLocaleString()} ج.م\n\nهيتم تحديث سعر المنتج في المخزون فوراً وتسجيل العملية في السجل. هل تريد المتابعة؟`;
    if (!confirm(msg)) return;
    const res = await revertToOldCost(change.id);
    toast({ title: res.ok ? '✅ تم إرجاع السعر' : 'تعذر', description: res.message, variant: res.ok ? 'default' : 'destructive' });
    if (res.ok) { setTick(t => t + 1); window.dispatchEvent(new Event('store-changed')); }
  };

  return (
    <div className="stat-card animate-fade-in-up stagger-3 sm:col-span-2">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center"><TrendingUp className="text-warning" size={22} /></div>
          <div>
            <h3 className="font-extrabold text-lg">سجل تغييرات أسعار الشراء</h3>
            <p className="text-xs text-muted-foreground">
              {history.length} تغيير • <span className="text-destructive font-extrabold">{ups} رفع</span> • <span className="text-success font-extrabold">{downs} تخفيض</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {history.length > 0 && (
            <>
              <button onClick={() => exportPriceHistoryCSV(filtered)} className="text-xs px-3 py-2 rounded-xl bg-success/15 text-success font-extrabold">
                <Download size={14} className="inline ml-1" /> تصدير CSV
              </button>
              <button onClick={() => window.print()} className="text-xs px-3 py-2 rounded-xl bg-primary/15 text-primary font-extrabold">
                🖨️ طباعة
              </button>
              <button onClick={handleClear} className="text-xs px-3 py-2 rounded-xl bg-destructive/15 text-destructive font-extrabold">
                <Trash2 size={14} className="inline ml-1" /> مسح
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search + date filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <div className="relative md:col-span-1">
          <SearchIcon className="absolute right-3 top-3 text-muted-foreground" size={16} />
          <input
            className="input-field w-full pr-9 text-sm"
            placeholder="بحث باسم منتج أو سبب..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">من</label>
          <input type="date" className="input-field w-full text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">إلى</label>
          <input type="date" className="input-field w-full text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {([
          { key: 'all', label: `الكل (${history.length})` },
          { key: 'up', label: `↑ ارتفاع (${ups})` },
          { key: 'down', label: `↓ انخفاض (${downs})` },
        ] as const).map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all ${
              filter === opt.key ? 'bg-primary text-primary-foreground shadow-md' : 'bg-accent hover:bg-accent/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {(query || fromDate || toDate) && (
          <button
            onClick={() => { setQuery(""); setFromDate(""); setToDate(""); }}
            className="text-xs font-extrabold px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70"
          >
            مسح الفلاتر ✕
          </button>
        )}
        <span className="text-xs text-muted-foreground mr-auto">عرض {filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground bg-accent/30 rounded-xl">
          {history.length === 0
            ? 'لا يوجد تغييرات في الأسعار. أي فاتورة شراء بسعر مختلف هتتسجل هنا تلقائياً.'
            : 'مفيش نتائج للفلتر ده'}
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto space-y-2">
          {filtered.map(p => (
            <PriceChangeRow key={p.id} change={p} onRevert={handleRevert} />
          ))}
        </div>
      )}
    </div>
  );
}

function PriceChangeRow({ change, onRevert }: { change: PriceChange; onRevert: (c: PriceChange) => void }) {
  const isUp = change.direction === 'up';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isUp ? 'text-destructive' : 'text-success';
  const bg = isUp ? 'bg-destructive/10' : 'bg-success/10';
  const note = isUp
    ? `⚠️ السعر ارتفع بنسبة ${Math.abs(change.percent).toFixed(1)}٪ — راجع سعر البيع`
    : `✅ السعر انخفض بنسبة ${Math.abs(change.percent).toFixed(1)}٪ — فرصة كويسة للربح`;

  return (
    <div className={`p-3 rounded-xl border border-border/50 ${bg}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className={color} size={18} />
          <div className="min-w-0">
            <p className="font-extrabold text-sm truncate">{change.productName}</p>
            <p className="text-[11px] text-muted-foreground">{change.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground line-through">{change.oldCost.toLocaleString()}</span>
          <ArrowRight size={14} className="text-muted-foreground" />
          <span className={`text-sm font-extrabold ${color}`}>{change.newCost.toLocaleString()} ج.م</span>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${color} ${bg}`}>
            {change.diff > 0 ? '+' : ''}{change.diff.toFixed(2)} ({change.percent > 0 ? '+' : ''}{change.percent.toFixed(1)}٪)
          </span>
          <button
            onClick={() => onRevert(change)}
            title={`إرجاع للسعر القديم ${change.oldCost.toLocaleString()}`}
            className="text-xs font-extrabold px-2 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-all flex items-center gap-1"
          >
            <RotateCw size={12} /> إرجاع
          </button>
        </div>
      </div>
      {change.userReason && (
        <p className="text-[11px] mt-1.5 bg-card/60 px-2 py-1 rounded-lg">
          📝 <span className="font-bold">السبب:</span> {change.userReason}
        </p>
      )}
      <p className={`text-[11px] mt-2 font-bold ${color}`}>{note}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{new Date(change.date).toLocaleString('ar-EG')}</p>
      {change.userName && (
        <p className="text-[10px] text-muted-foreground mt-0.5">👤 بواسطة: <span className="font-bold">{change.userName}</span></p>
      )}
    </div>
  );
}

