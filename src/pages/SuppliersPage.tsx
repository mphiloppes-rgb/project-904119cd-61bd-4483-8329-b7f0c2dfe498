import { useState, useMemo } from "react";
import { Truck, Plus, Search, Edit2, Trash2, Banknote, Eye, Phone } from "lucide-react";
import {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  paySupplierDebt,
  getPurchaseInvoicesBySupplier,
  type Supplier,
} from "@/lib/suppliers";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import StatementView from "@/components/StatementView";
import { FileText } from "lucide-react";

export default function SuppliersPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const suppliers = useMemo(() => getSuppliers(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  const [payOpen, setPayOpen] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const [viewOpen, setViewOpen] = useState<Supplier | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const s = search.toLowerCase();
    return suppliers.filter((x) => x.name.toLowerCase().includes(s) || x.phone?.includes(search));
  }, [suppliers, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", notes: "" });
    setShowForm(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone || "", notes: s.notes || "" });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    if (editing) {
      updateSupplier(editing.id, { name: form.name, phone: form.phone, notes: form.notes });
      toast({ title: "تم ✅", description: "تم تعديل المورد" });
    } else {
      addSupplier({ name: form.name, phone: form.phone, notes: form.notes });
      toast({ title: "تم ✅", description: "تمت إضافة المورد" });
    }
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
    deleteSupplier(id);
    toast({ title: "تم الحذف" });
    refresh();
  };

  const handlePay = () => {
    if (!payOpen || payAmount <= 0) return;
    paySupplierDebt(payOpen.id, Math.min(payAmount, payOpen.balance));
    toast({ title: "تم الدفع ✅", description: `تم تسديد ${payAmount.toLocaleString()} ج.م` });
    setPayOpen(null);
    setPayAmount(0);
    refresh();
  };

  const totalDebt = suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0);

  return (
    <div>
      {statementSupplierId && <StatementView type="supplier" entityId={statementSupplierId} onClose={() => setStatementSupplierId(null)} />}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Truck className="text-primary" size={22} />
        </div>
        <h1 className="page-header mb-0">الموردين ({suppliers.length})</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm font-bold text-muted-foreground mb-1">عدد الموردين</p>
          <p className="text-2xl font-extrabold">{suppliers.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-bold text-muted-foreground mb-1">إجمالي مديونية المحل</p>
          <p className="text-2xl font-extrabold text-destructive">{totalDebt.toLocaleString()} ج.م</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-bold text-muted-foreground mb-1">موردين بدون مديونية</p>
          <p className="text-2xl font-extrabold text-success">{suppliers.filter((x) => x.balance <= 0).length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pr-10"
          />
        </div>
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 whitespace-nowrap">
          <Plus size={18} /> إضافة مورد
        </button>
      </div>

      {/* Cards on mobile, table on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
        {filtered.map((s) => (
          <div key={s.id} className="stat-card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-extrabold">{s.name}</p>
                {s.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone size={12} /> {s.phone}
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-extrabold ${s.balance > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                {s.balance > 0 ? `${s.balance.toLocaleString()} ج.م` : "مسدد"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => setViewOpen(s)} className="flex-1 text-xs py-2 rounded-lg bg-accent font-bold flex items-center justify-center gap-1">
                <Eye size={14} /> عرض
              </button>
              {s.balance > 0 && (
                <button onClick={() => { setPayOpen(s); setPayAmount(s.balance); }} className="flex-1 text-xs py-2 rounded-lg bg-success/20 text-success font-bold flex items-center justify-center gap-1">
                  <Banknote size={14} /> دفع
                </button>
              )}
              <button onClick={() => openEdit(s)} className="text-xs py-2 px-3 rounded-lg bg-muted font-bold">
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDelete(s.id)} className="text-xs py-2 px-3 rounded-lg bg-destructive/15 text-destructive font-bold">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block glass-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-right p-4 font-extrabold">الاسم</th>
              <th className="text-right p-4 font-extrabold">الهاتف</th>
              <th className="text-right p-4 font-extrabold">ملاحظات</th>
              <th className="text-center p-4 font-extrabold">المديونية</th>
              <th className="text-center p-4 font-extrabold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                <td className="p-4 font-bold">{s.name}</td>
                <td className="p-4">{s.phone || "-"}</td>
                <td className="p-4 text-muted-foreground">{s.notes || "-"}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-lg text-xs font-extrabold ${s.balance > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                    {s.balance > 0 ? `${s.balance.toLocaleString()} ج.م` : "مسدد"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setViewOpen(s)} className="p-2 rounded-lg bg-accent hover:bg-accent/80" title="عرض">
                      <Eye size={16} />
                    </button>
                    {s.balance > 0 && (
                      <button onClick={() => { setPayOpen(s); setPayAmount(s.balance); }} className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30" title="دفع">
                        <Banknote size={16} />
                      </button>
                    )}
                    <button onClick={() => openEdit(s)} className="p-2 rounded-lg bg-muted hover:bg-border" title="تعديل">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  لا يوجد موردين
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up p-4">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <h3 className="font-extrabold text-lg mb-4">{editing ? "تعديل المورد" : "إضافة مورد جديد"}</h3>
            <div className="space-y-3">
              <input className="input-field w-full" placeholder="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input-field w-full" placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea className="input-field w-full min-h-[80px]" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={submit} className="btn-primary py-3">حفظ</button>
              <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold hover:opacity-90">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Dialog */}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up p-4">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-sm animate-scale-in">
            <h3 className="font-extrabold text-lg mb-2 flex items-center gap-2">
              <Banknote size={20} className="text-success" /> دفع للمورد
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{payOpen.name}</p>
            <div className="bg-accent/50 rounded-xl p-3 mb-3 flex justify-between text-sm">
              <span>المديونية الحالية</span>
              <span className="font-extrabold text-destructive">{payOpen.balance.toLocaleString()} ج.م</span>
            </div>
            <input type="number" className="input-field w-full mb-3" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} placeholder="المبلغ" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePay} className="btn-primary py-3">دفع</button>
              <button onClick={() => setPayOpen(null)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* View Supplier Details */}
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up p-4">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-lg">{viewOpen.name}</h3>
                {viewOpen.phone && <p className="text-sm text-muted-foreground">{viewOpen.phone}</p>}
              </div>
              <button onClick={() => setViewOpen(null)} className="p-2 hover:bg-muted rounded-xl">✕</button>
            </div>
            <div className="bg-accent/50 rounded-xl p-3 mb-4 flex justify-between">
              <span className="font-bold">المديونية</span>
              <span className={`font-extrabold ${viewOpen.balance > 0 ? "text-destructive" : "text-success"}`}>
                {viewOpen.balance.toLocaleString()} ج.م
              </span>
            </div>
            <h4 className="font-extrabold mb-2">سجل المشتريات</h4>
            <div className="space-y-2">
              {getPurchaseInvoicesBySupplier(viewOpen.id).map((inv) => (
                <div key={inv.id} className="flex justify-between items-center p-3 bg-accent/40 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">#{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleString("ar-EG")}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold">{inv.total.toLocaleString()} ج.م</p>
                    {inv.remaining > 0 && <p className="text-xs text-destructive">باقي: {inv.remaining.toLocaleString()}</p>}
                  </div>
                </div>
              ))}
              {getPurchaseInvoicesBySupplier(viewOpen.id).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">لا توجد فواتير شراء</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
