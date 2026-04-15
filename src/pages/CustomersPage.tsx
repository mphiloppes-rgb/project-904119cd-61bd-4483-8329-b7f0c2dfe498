import { useState, useMemo } from "react";
import { Plus, Trash2, X, Check, Eye, Edit2 } from "lucide-react";
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

  const handleDelete = (id: string) => {
    if (confirm("هل تريد حذف هذا العميل؟")) { deleteCustomer(id); setCustomers(getCustomers()); }
  };

  const viewHistory = (customerId: string) => {
    setSelectedCustomer(customerId);
    setCustomerInvoices(getInvoicesByCustomer(customerId));
  };

  const handlePrintInvoice = (inv: Invoice) => {
    setPrintInvoice(inv);
    setTimeout(() => { window.print(); setPrintInvoice(null); }, 300);
  };

  return (
    <>
      {printInvoice && <InvoicePrint invoice={printInvoice} />}
      <div className="no-print">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-header mb-0">العملاء ({customers.length})</h1>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90">
            <Plus size={18} /> إضافة عميل
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
            <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{editId ? "تعديل العميل" : "إضافة عميل"}</h3>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-sm text-muted-foreground">الاسم *</label><input className="input-field w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="text-sm text-muted-foreground">الهاتف</label><input className="input-field w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="text-sm text-muted-foreground">الرصيد (مديونية)</label><input type="number" className="input-field w-full" value={form.balance || ""} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} /></div>
              </div>
              <button onClick={handleSave} className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90">
                <Check size={18} /> {editId ? "تحديث" : "إضافة"}
              </button>
            </div>
          </div>
        )}

        {/* Customer invoices modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
            <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">فواتير {customers.find(c => c.id === selectedCustomer)?.name}</h3>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-muted rounded"><X size={20} /></button>
              </div>
              {customerInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد فواتير</p>
              ) : (
                <div className="space-y-3">
                  {customerInvoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-accent rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{new Date(inv.createdAt).toLocaleDateString("ar-EG")} - {new Date(inv.createdAt).toLocaleTimeString("ar-EG")}</p>
                        <p className="text-sm text-muted-foreground">{inv.items.length} منتج | الإجمالي: {inv.total.toLocaleString()} ج.م</p>
                        {inv.remaining > 0 && <p className="text-xs text-destructive font-bold">متبقي: {inv.remaining.toLocaleString()} ج.م</p>}
                      </div>
                      <button onClick={() => handlePrintInvoice(inv)} className="p-2 hover:bg-muted rounded"><Eye size={18} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customers grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div key={c.id} className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  {c.phone && <p className="text-sm text-muted-foreground" dir="ltr">{c.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className={`text-lg font-bold ${c.balance > 0 ? "text-destructive" : "text-success"}`}>
                  {c.balance > 0 ? `عليه ${c.balance.toLocaleString()} ج.م` : "لا مديونية"}
                </span>
                <button onClick={() => viewHistory(c.id)} className="text-sm text-primary hover:underline">كشف حساب</button>
              </div>
            </div>
          ))}
          {customers.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا يوجد عملاء</p>}
        </div>
      </div>
    </>
  );
}
