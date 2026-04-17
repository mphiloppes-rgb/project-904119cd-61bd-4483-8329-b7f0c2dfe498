import { useState, useMemo } from "react";
import { Plus, Trash2, X, Check, Wallet } from "lucide-react";
import { getExpenses, addExpense, deleteExpense, type Expense } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";

const expenseTypes = ["كهرباء", "مياه", "إيجار", "مواصلات", "صيانة", "أخرى"];

export default function ExpensesPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const expenses = useMemo(() => getExpenses(), [refreshKey]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: 0, type: "أخرى", customType: "", date: new Date().toISOString().split("T")[0] });

  const handleSave = () => {
    const finalName = form.type === "أخرى" && form.customType.trim()
      ? form.customType.trim()
      : form.name.trim();
    
    if (!finalName || !form.amount) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    
    const typeLabel = form.type === "أخرى" && form.customType.trim()
      ? `أخرى: ${form.customType.trim()}`
      : form.type;

    addExpense({ name: finalName, amount: form.amount, type: typeLabel, date: form.date });
    refresh();
    setShowForm(false);
    setForm({ name: "", amount: 0, type: "أخرى", customType: "", date: new Date().toISOString().split("T")[0] });
    toast({ title: "تمت الإضافة ✅" });
  };

  const handleDelete = (id: string) => {
    if (confirm("حذف هذا المصروف؟")) {
      deleteExpense(id);
      refresh();
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Wallet className="text-destructive" size={22} /></div>
          <h1 className="page-header mb-0">المصاريف ({expenses.length})</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
          <Plus size={18} /> إضافة مصروف
        </button>
      </div>

      <div className="stat-card mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Wallet className="text-destructive" size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">إجمالي المصاريف</p>
            <p className="text-2xl font-extrabold text-destructive">{totalExpenses.toLocaleString()} ج.م</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">إضافة مصروف</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-sm font-bold text-muted-foreground">الاسم</label><input className="input-field w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div><label className="text-sm font-bold text-muted-foreground">المبلغ</label><input type="number" className="input-field w-full mt-1" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground">النوع</label>
                  <select className="input-field w-full mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.type === "أخرى" && (
                  <div className="animate-fade-in-up">
                    <label className="text-sm font-bold text-muted-foreground">وصف المصروف</label>
                    <input className="input-field w-full mt-1" placeholder="اكتب نوع المصروف هنا..." value={form.customType} onChange={(e) => setForm({ ...form, customType: e.target.value })} />
                  </div>
                )}
                <div><label className="text-sm font-bold text-muted-foreground">التاريخ</label><input type="date" className="input-field w-full mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={handleSave} className="btn-primary py-3"><Check size={18} /> إضافة</button>
                <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold hover:opacity-90 transition-all">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-3">
        {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e) => (
          <div key={e.id} className="stat-card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-extrabold">{e.name}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-accent rounded-lg text-xs font-bold">{e.type}</span>
              </div>
              <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
            </div>
            <div className="flex justify-between items-end mt-2 pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("ar-EG")}</span>
              <span className="font-extrabold text-destructive">{e.amount.toLocaleString()} ج.م</span>
            </div>
          </div>
        ))}
        {expenses.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا توجد مصاريف</p>}
      </div>

      <div className="hidden md:block glass-table overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-right p-3 font-extrabold">الاسم</th>
              <th className="text-right p-3 font-extrabold">النوع</th>
              <th className="text-right p-3 font-extrabold">المبلغ</th>
              <th className="text-right p-3 font-extrabold">التاريخ</th>
              <th className="text-center p-3 font-extrabold">حذف</th>
            </tr>
          </thead>
          <tbody>
            {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e, idx) => (
              <tr key={e.id} className="border-b hover:bg-muted/20 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                <td className="p-3 font-bold">{e.name}</td>
                <td className="p-3"><span className="px-3 py-1 bg-accent rounded-lg text-xs font-bold">{e.type}</span></td>
                <td className="p-3 font-extrabold text-destructive">{e.amount.toLocaleString()} ج.م</td>
                <td className="p-3 text-muted-foreground">{new Date(e.date).toLocaleDateString("ar-EG")}</td>
                <td className="p-3 text-center">
                  <button onClick={() => handleDelete(e.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مصاريف</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
