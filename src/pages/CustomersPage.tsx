import { useState } from "react";
import { Plus, Trash2, X, Check, Eye, Edit2, Users } from "lucide-react";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getInvoicesByCustomer, type Customer, type Invoice } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import InvoicePrint from "@/components/InvoicePrint";

export default function CustomersPage() {
  const [customers, setCustomers] = useState(() => getCustomers());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", balance: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const openAdd = () => { setForm({ name: "", phone: "", balance: 0 }); setEditId(null); setShowForm(true); };
  const openEdit = (c: Customer) => { setForm({ name: c.name, phone: c.phone || "", balance: c.balance }); setEditId(c.id); setShowForm(true); };
  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" }); return; }
    if (editId) { updateCustomer(editId, form); toast({ title: "تم التحديث ✅" }); }
    else { addCustomer(form); toast({ title: "تمت الإضافة ✅" }); }
    setCustomers(getCustomers()); setShowForm(false);
  };
  const handleDelete = (id: string) => { if (confirm("هل تريد حذف هذا العميل؟")) { deleteCustomer(id); setCustomers(getCustomers()); } };
  const viewHistory = (customerId: string) => { setSelectedCustomer(customerId); setCustomerInvoices(getInvoicesByCustomer(customerId)); };
  const handlePrintInvoice = (inv: Invoice) => { setPrintInvoice(inv); setTimeout(() => { window.print(); setPrintInvoice(null); }, 300); };

  return (
    <>
      {printInvoice && <InvoicePrint invoice={printInvoice} />}
      <div className="no-print">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="text-primary" size={22} /></div>
            <h1 className="page-header mb-0">العملاء ({customers.length})</h1>
          </div>
          <button onClick={openAdd} className="btn-primary"><Plus size={18} /> إضافة عميل</button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">{editId ? "تعديل العميل" : "إضافة عميل"}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-sm font-bold text-muted-foreground">الاسم *</label><input className="input-field w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="text-sm font-bold text-muted-foreground">الهاتف</label><input className="input-field w-full mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="text-sm font-bold text-muted-foreground">الرصيد (مديونية)</label><input type="number" className="input-field w-full mt-1" value={form.balance || ""} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} /></div>
              </div>
              <button onClick={handleSave} className="w-full mt-4 btn-primary py-3"><Check size={18} /> {editId ? "تحديث" : "إضافة"}</button>
            </div>
          </div>
        )}

        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">فواتير {customers.find(c => c.id === selectedCustomer)?.name}</h3>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
              </div>
              {customerInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد فواتير</p>
              ) : (
                <div className="space-y-3">
                  {customerInvoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-accent/50 rounded-xl flex justify-between items-center hover:bg-accent transition-colors">
                      <div>
                        <p className="font-bold text-sm">{new Date(inv.createdAt).toLocaleDateString("ar-EG")} - {new Date(inv.createdAt).toLocaleTimeString("ar-EG")}</p>
                        <p className="text-sm text-muted-foreground">{inv.items.length} منتج | الإجمالي: {inv.total.toLocaleString()} ج.م</p>
                        {inv.remaining > 0 && <p className="text-xs text-destructive font-extrabold">متبقي: {inv.remaining.toLocaleString()} ج.م</p>}
                      </div>
                      <button onClick={() => handlePrintInvoice(inv)} className="p-2 hover:bg-muted rounded-xl transition-colors"><Eye size={18} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c, idx) => (
            <div key={c.id} className="stat-card animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-lg">{c.name}</h3>
                  {c.phone && <p className="text-sm text-muted-foreground" dir="ltr">{c.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-muted transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className={`text-lg font-extrabold ${c.balance > 0 ? "text-destructive" : "text-success"}`}>
                  {c.balance > 0 ? `عليه ${c.balance.toLocaleString()} ج.م` : "لا مديونية"}
                </span>
                <button onClick={() => viewHistory(c.id)} className="text-sm text-primary font-bold hover:underline">كشف حساب</button>
              </div>
            </div>
          ))}
          {customers.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا يوجد عملاء</p>}
        </div>
      </div>
    </>
  );
}
