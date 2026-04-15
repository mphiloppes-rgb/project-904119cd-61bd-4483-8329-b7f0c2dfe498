import { useState } from "react";
import { Plus, Trash2, X, Check, Wallet } from "lucide-react";
import { getExpenses, addExpense, deleteExpense, type Expense } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const expenseTypes = ["كهرباء", "مياه", "إيجار", "مواصلات", "صيانة", "أخرى"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(() => getExpenses());
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
    setExpenses(getExpenses());
    setShowForm(false);
    setForm({ name: "", amount: 0, type: "أخرى", customType: "", date: new Date().toISOString().split("T")[0] });
    toast({ title: "تمت الإضافة ✅" });
  };

  const handleDelete = (id: string) => {
    if (confirm("حذف هذا المصروف؟")) {
      deleteExpense(id);
      setExpenses(getExpenses());
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-header mb-0">المصاريف</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg">إضافة مصروف</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-bold text-muted-foreground">الاسم</label><input className="input-field w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
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
                  <input
                    className="input-field w-full mt-1"
                    placeholder="اكتب نوع المصروف هنا..."
                    value={form.customType}
                    onChange={(e) => setForm({ ...form, customType: e.target.value })}
                  />
                </div>
              )}
              <div><label className="text-sm font-bold text-muted-foreground">التاريخ</label><input type="date" className="input-field w-full mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <button onClick={handleSave} className="w-full mt-4 btn-primary py-3">
              <Check size={18} /> إضافة
            </button>
          </div>
        </div>
      )}

      <div className="glass-table">
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
