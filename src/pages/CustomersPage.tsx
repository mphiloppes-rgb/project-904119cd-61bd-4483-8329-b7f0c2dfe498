import { useState, useMemo } from "react";
import { Plus, Trash2, X, Check, Eye, Edit2, Users, Banknote, FileText, UserPlus } from "lucide-react";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getInvoicesByCustomer, payCustomerDebt, type Customer, type Invoice } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import InvoicePrint from "@/components/InvoicePrint";
import StatementView from "@/components/StatementView";

type CustomerTab = 'regular' | 'oneTime';

export default function CustomersPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const allCustomers = useMemo(() => getCustomers(), [refreshKey]);
  const [tab, setTab] = useState<CustomerTab>('regular');
  const customers = useMemo(
    () => allCustomers.filter(c => tab === 'oneTime' ? c.oneTime : !c.oneTime),
    [allCustomers, tab]
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", balance: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // Payment dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [confirmPay, setConfirmPay] = useState(false);

  const openAdd = () => { setForm({ name: "", phone: "", balance: 0 }); setEditId(null); setShowForm(true); };
  const openEdit = (c: Customer) => { setForm({ name: c.name, phone: c.phone || "", balance: c.balance }); setEditId(c.id); setShowForm(true); };
  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" }); return; }
    if (editId) { updateCustomer(editId, form); toast({ title: "تم التحديث ✅" }); }
    else { addCustomer({ ...form, oneTime: tab === 'oneTime' || undefined }); toast({ title: "تمت الإضافة ✅" }); }
    refresh(); setShowForm(false);
  };
  const handleDelete = (id: string) => {
    if (confirm("هل تريد حذف هذا العميل؟")) {
      deleteCustomer(id);
      refresh();
      toast({ title: "تم الحذف ✅" });
    }
  };
  const viewHistory = (customerId: string) => { setSelectedCustomer(customerId); setCustomerInvoices(getInvoicesByCustomer(customerId)); };
  const handlePrintInvoice = (inv: Invoice) => { setPrintInvoice(inv); setTimeout(() => { window.print(); setPrintInvoice(null); }, 300); };

  const openPayDialog = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(0);
    setConfirmPay(false);
    setShowPayDialog(true);
  };

  const handlePay = () => {
    if (!confirmPay) { setConfirmPay(true); return; }
    if (!payCustomer || payAmount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      setConfirmPay(false);
      return;
    }
    payCustomerDebt(payCustomer.id, payAmount);
    toast({ title: "تم الدفع ✅", description: `تم تسجيل دفع ${payAmount.toLocaleString()} ج.م` });
    setShowPayDialog(false);
    setConfirmPay(false);
    refresh();
  };

  return (
    <>
      {printInvoice && <InvoicePrint invoice={printInvoice} />}
      {statementCustomerId && <StatementView type="customer" entityId={statementCustomerId} onClose={() => setStatementCustomerId(null)} />}
      <div className="no-print">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="text-primary" size={22} /></div>
            <h1 className="page-header mb-0">العملاء</h1>
          </div>
          <button onClick={openAdd} className="btn-primary"><Plus size={18} /> {tab === 'oneTime' ? 'إضافة عميل لمرة واحدة' : 'إضافة عميل'}</button>
        </div>

        {/* Tabs: regular vs one-time */}
        <div className="flex gap-2 mb-6 rounded-2xl bg-muted/50 p-1">
          <button
            onClick={() => setTab('regular')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${tab === 'regular' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent'}`}
          >
            <Users size={16} /> عملاء دائمين ({allCustomers.filter(c => !c.oneTime).length})
          </button>
          <button
            onClick={() => setTab('oneTime')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${tab === 'oneTime' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent'}`}
          >
            <UserPlus size={16} /> عملاء لمرة واحدة ({allCustomers.filter(c => c.oneTime).length})
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-lg">{editId ? "تعديل العميل" : "إضافة عميل"}</h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  <div><label className="text-sm font-bold text-muted-foreground">الاسم *</label><input className="input-field w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                  <div><label className="text-sm font-bold text-muted-foreground">الهاتف</label><input className="input-field w-full mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><label className="text-sm font-bold text-muted-foreground">الرصيد (مديونية)</label><input type="number" className="input-field w-full mt-1" value={form.balance || ""} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={handleSave} className="btn-primary py-3"><Check size={18} /> {editId ? "تحديث" : "إضافة"}</button>
                  <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold hover:opacity-90 transition-all">إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Dialog */}
        {showPayDialog && payCustomer && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-lg flex items-center gap-2"><Banknote size={20} className="text-success" /> تسديد مديونية</h3>
                  <button onClick={() => { setShowPayDialog(false); setConfirmPay(false); }} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
                </div>
                <div className="bg-accent/50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>العميل</span><span className="font-extrabold">{payCustomer.name}</span></div>
                  <div className="flex justify-between"><span>المديونية الحالية</span><span className="font-extrabold text-destructive">{payCustomer.balance.toLocaleString()} ج.م</span></div>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-bold text-muted-foreground">المبلغ المدفوع</label>
                  <input type="number" className="input-field w-full mt-1" value={payAmount || ""} onChange={(e) => { setPayAmount(Number(e.target.value)); setConfirmPay(false); }} placeholder="0" max={payCustomer.balance} autoFocus />
                </div>
                <button onClick={() => { setPayAmount(payCustomer.balance); setConfirmPay(false); }} className="w-full mb-3 text-sm py-2 rounded-xl bg-accent hover:bg-accent/80 font-bold transition-all">
                  تسديد كامل المبلغ ({payCustomer.balance.toLocaleString()} ج.م)
                </button>
                {confirmPay && (
                  <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center mb-3">
                    <p className="text-sm font-extrabold text-success">هل أنت متأكد من تسجيل دفع {payAmount.toLocaleString()} ج.م؟</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handlePay} disabled={payAmount <= 0} className="btn-primary py-3 text-sm disabled:opacity-50">
                    {confirmPay ? "تأكيد الدفع" : "دفع"}
                  </button>
                  <button onClick={() => { setShowPayDialog(false); setConfirmPay(false); }} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedCustomer && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl">
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
                          <p className="font-bold text-sm">فاتورة #{inv.invoiceNumber} - {new Date(inv.createdAt).toLocaleDateString("ar-EG")}</p>
                          <p className="text-sm text-muted-foreground">{inv.items.length} منتج | الإجمالي: {inv.total.toLocaleString()} ج.م</p>
                          {inv.remaining > 0 && <p className="text-xs text-destructive font-extrabold">متبقي: {inv.remaining.toLocaleString()} ج.م</p>}
                          {inv.isReturned && <p className="text-xs text-amber-500 font-extrabold">مرتجع</p>}
                        </div>
                        <button onClick={() => handlePrintInvoice(inv)} className="p-2 hover:bg-muted rounded-xl transition-colors"><Eye size={18} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c, idx) => (
            <div key={c.id} className="stat-card animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg truncate">{c.name}</h3>
                    {c.oneTime && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-extrabold whitespace-nowrap">لمرة واحدة</span>}
                  </div>
                  {c.phone && <p className="text-sm text-muted-foreground" dir="ltr">{c.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-muted transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-3">
                <span className={`text-lg font-extrabold ${c.balance > 0 ? "text-destructive" : "text-success"}`}>
                  {c.balance > 0 ? `عليه ${c.balance.toLocaleString()} ج.م` : "لا مديونية"}
                </span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button onClick={() => setStatementCustomerId(c.id)} className="flex-1 text-xs text-primary font-bold py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all flex items-center justify-center gap-1">
                  <FileText size={14} /> كشف حساب
                </button>
                <button onClick={() => viewHistory(c.id)} className="text-xs font-bold py-2 px-3 rounded-xl bg-accent hover:bg-accent/80 transition-all">فواتير</button>
                {c.balance > 0 && (
                  <button onClick={() => openPayDialog(c)} className="flex-1 text-xs font-bold py-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all flex items-center justify-center gap-1">
                    <Banknote size={14} /> تسديد
                  </button>
                )}
              </div>
            </div>
          ))}
          {customers.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">{tab === 'oneTime' ? 'لا يوجد عملاء لمرة واحدة بعد — هيتسجلوا تلقائياً من نقطة البيع' : 'لا يوجد عملاء دائمين'}</p>}
        </div>
      </div>
    </>
  );
}
