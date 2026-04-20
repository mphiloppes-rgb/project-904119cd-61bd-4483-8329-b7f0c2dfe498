import { useState, useMemo } from "react";
import { Search, Eye, Printer, Receipt, RotateCcw, UserPlus, Banknote } from "lucide-react";
import { getInvoices, getCustomers, returnInvoiceFull, returnInvoiceItem, assignInvoiceToCustomer, payInvoice, type Invoice } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import InvoicePrint from "@/components/InvoicePrint";

export default function InvoicesPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const invoices = useMemo(() => getInvoices().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [refreshKey]);
  const customers = useMemo(() => getCustomers(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // Return dialogs
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [returnType, setReturnType] = useState<'full' | 'partial'>('full');
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [confirmReturn, setConfirmReturn] = useState(false);

  // Assign dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignInvoice, setAssignInvoice] = useState<Invoice | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState("");
  const [confirmAssign, setConfirmAssign] = useState(false);

  // Payment dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [confirmPay, setConfirmPay] = useState(false);

  const [invoiceNumSearch, setInvoiceNumSearch] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!inv.customerName?.toLowerCase().includes(s) && !inv.id.includes(s) && !inv.invoiceNumber?.includes(s)) return false;
      }
      if (invoiceNumSearch.trim()) {
        if (!inv.invoiceNumber?.includes(invoiceNumSearch.trim())) return false;
      }
      if (dateFrom && inv.createdAt < dateFrom) return false;
      if (dateTo && inv.createdAt > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [invoices, search, invoiceNumSearch, dateFrom, dateTo]);

  const handlePrint = (inv: Invoice) => { setPrintInvoice(inv); setTimeout(() => { window.print(); setPrintInvoice(null); }, 300); };

  const openReturnDialog = (inv: Invoice) => {
    setReturnInvoice(inv);
    setReturnType('full');
    setReturnProductId(inv.items[0]?.productId || "");
    setReturnQty(1);
    setConfirmReturn(false);
    setShowReturnDialog(true);
  };

  const handleReturn = () => {
    if (!confirmReturn) { setConfirmReturn(true); return; }
    if (!returnInvoice) return;
    
    let success = false;
    if (returnType === 'full') {
      success = returnInvoiceFull(returnInvoice.id);
    } else {
      success = returnInvoiceItem(returnInvoice.id, returnProductId, returnQty);
    }

    if (success) {
      toast({ title: "تم المرتجع ✅", description: returnType === 'full' ? "تم ارتجاع الفاتورة بالكامل وتحديث المخزون" : `تم ارتجاع ${returnQty} قطعة وتحديث المخزون` });
      setShowReturnDialog(false);
      setSelectedInvoice(null);
      refresh();
    } else {
      toast({ title: "خطأ", description: "لم يتم إتمام المرتجع - تحقق من الكمية", variant: "destructive" });
    }
    setConfirmReturn(false);
  };

  const openAssignDialog = (inv: Invoice) => {
    setAssignInvoice(inv);
    setAssignCustomerId("");
    setConfirmAssign(false);
    setShowAssignDialog(true);
  };

  const handleAssign = () => {
    if (!confirmAssign) { setConfirmAssign(true); return; }
    if (!assignInvoice || !assignCustomerId) return;
    assignInvoiceToCustomer(assignInvoice.id, assignCustomerId);
    toast({ title: "تم ✅", description: "تم إسناد الفاتورة للعميل بنجاح" });
    setShowAssignDialog(false);
    setSelectedInvoice(null);
    refresh();
    setConfirmAssign(false);
  };

  const openPayDialog = (inv: Invoice) => {
    setPayInv(inv);
    setPayAmount(0);
    setConfirmPay(false);
    setShowPayDialog(true);
  };

  const handlePayInvoice = () => {
    if (!confirmPay) { setConfirmPay(true); return; }
    if (!payInv || payAmount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      setConfirmPay(false);
      return;
    }
    payInvoice(payInv.id, payAmount);
    toast({ title: "تم الدفع ✅", description: `تم تسجيل دفع ${payAmount.toLocaleString()} ج.م` });
    setShowPayDialog(false);
    setSelectedInvoice(null);
    setConfirmPay(false);
    refresh();
  };

  const getReturnableQty = (inv: Invoice, productId: string) => {
    const item = inv.items.find(it => it.productId === productId);
    if (!item) return 0;
    const alreadyReturned = (inv.returnedItems || []).filter(r => r.productId === productId).reduce((s, r) => s + r.quantity, 0);
    return item.quantity - alreadyReturned;
  };

  return (
    <>
      {printInvoice && <InvoicePrint invoice={printInvoice} />}
      <div className="no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="text-primary" size={22} /></div>
          <h1 className="page-header mb-0">الفواتير ({invoices.length})</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 animate-fade-in-up">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالعميل أو رقم الفاتورة..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-full pr-10" />
          </div>
          <input type="text" placeholder="بحث برقم الفاتورة (6 أرقام)..." value={invoiceNumSearch} onChange={(e) => setInvoiceNumSearch(e.target.value)} className="input-field" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-lg">تفاصيل الفاتورة</h3>
                  <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">✕</button>
                </div>
                <p className="text-sm text-muted-foreground mb-1">رقم الفاتورة: <span className="font-mono font-bold text-primary">{selectedInvoice.invoiceNumber}</span></p>
                <p className="text-sm text-muted-foreground mb-1">{new Date(selectedInvoice.createdAt).toLocaleString("ar-EG")}</p>
                {selectedInvoice.customerName && <p className="text-sm mb-2">العميل: <strong>{selectedInvoice.customerName}</strong></p>}
                {selectedInvoice.isReturned && <p className="text-sm text-destructive font-extrabold mb-2">⚠️ تم ارتجاع هذه الفاتورة</p>}
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-4 min-w-[400px]">
                    <thead><tr className="border-b"><th className="text-right py-2 font-extrabold">المنتج</th><th className="text-center py-2 font-extrabold">الكمية</th><th className="text-center py-2 font-extrabold">السعر</th><th className="text-left py-2 font-extrabold">الإجمالي</th></tr></thead>
                    <tbody>{selectedInvoice.items.map((item, i) => {
                      const retQty = (selectedInvoice.returnedItems || []).filter(r => r.productId === item.productId).reduce((s, r) => s + r.quantity, 0);
                      return (
                        <tr key={i} className="border-b">
                          <td className="py-2 font-bold">{item.productName}</td>
                          <td className="text-center">{item.quantity} {retQty > 0 && <span className="text-destructive text-xs">(مرتجع: {retQty})</span>}</td>
                          <td className="text-center">{item.unitPrice.toLocaleString()}</td>
                          <td className="text-left font-bold">{item.total.toLocaleString()}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between font-extrabold"><span>الإجمالي</span><span>{selectedInvoice.total.toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between"><span>المدفوع</span><span className="text-success font-bold">{selectedInvoice.paid.toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between font-extrabold text-destructive"><span>المتبقي</span><span>{selectedInvoice.remaining.toLocaleString()} ج.م</span></div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => handlePrint(selectedInvoice)} className="btn-primary py-2.5 text-sm flex-1 min-w-[100px]"><Printer size={16} /> طباعة</button>
                  {!selectedInvoice.isReturned && (
                    <button onClick={() => openReturnDialog(selectedInvoice)} className="flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-500 py-2.5 px-4 rounded-xl font-extrabold text-sm hover:bg-amber-500/30 transition-all flex-1 min-w-[100px]"><RotateCcw size={16} /> مرتجع</button>
                  )}
                  {!selectedInvoice.customerId && (
                    <button onClick={() => openAssignDialog(selectedInvoice)} className="flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-500 py-2.5 px-4 rounded-xl font-extrabold text-sm hover:bg-emerald-500/30 transition-all flex-1 min-w-[100px]"><UserPlus size={16} /> إسناد</button>
                  )}
                  {selectedInvoice.remaining > 0 && (
                    <button onClick={() => openPayDialog(selectedInvoice)} className="flex items-center justify-center gap-1.5 bg-success/20 text-success py-2.5 px-4 rounded-xl font-extrabold text-sm hover:bg-success/30 transition-all flex-1 min-w-[100px]"><Banknote size={16} /> دفع</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Dialog */}
        {showReturnDialog && returnInvoice && (
          <div className="modal-overlay" style={{ zIndex: 60 }}>
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-lg">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2"><RotateCcw size={20} className="text-amber-500" /> مرتجع فاتورة #{returnInvoice.invoiceNumber}</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button onClick={() => { setReturnType('full'); setConfirmReturn(false); }} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all ${returnType === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>مرتجع كامل</button>
                    <button onClick={() => { setReturnType('partial'); setConfirmReturn(false); }} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all ${returnType === 'partial' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>مرتجع جزئي</button>
                  </div>

                  {returnType === 'partial' && (
                    <>
                      <select value={returnProductId} onChange={(e) => { setReturnProductId(e.target.value); setConfirmReturn(false); }} className="input-field w-full">
                        {returnInvoice.items.map(item => {
                          const avail = getReturnableQty(returnInvoice, item.productId);
                          return <option key={item.productId} value={item.productId} disabled={avail === 0}>{item.productName} (متاح: {avail})</option>;
                        })}
                      </select>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-bold min-w-[60px]">الكمية</label>
                        <input type="number" min={1} max={getReturnableQty(returnInvoice, returnProductId)} value={returnQty} onChange={(e) => { setReturnQty(Number(e.target.value)); setConfirmReturn(false); }} className="input-field flex-1" />
                      </div>
                    </>
                  )}

                  {confirmReturn && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
                      <p className="text-sm font-extrabold text-destructive">⚠️ هل أنت متأكد؟ سيتم تحديث المخزون تلقائياً</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleReturn} className="flex items-center justify-center gap-1.5 bg-amber-500 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-amber-600 transition-all">
                      {confirmReturn ? "تأكيد المرتجع" : "مرتجع"}
                    </button>
                    <button onClick={() => { setShowReturnDialog(false); setConfirmReturn(false); }} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">إلغاء</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Dialog */}
        {showAssignDialog && assignInvoice && (
          <div className="modal-overlay" style={{ zIndex: 60 }}>
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-md">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2"><UserPlus size={20} className="text-emerald-500" /> إسناد فاتورة لعميل</h3>
                <p className="text-sm text-muted-foreground mb-4">فاتورة رقم: <span className="font-mono font-bold">{assignInvoice.invoiceNumber}</span></p>
                
                <select value={assignCustomerId} onChange={(e) => { setAssignCustomerId(e.target.value); setConfirmAssign(false); }} className="input-field w-full mb-4">
                  <option value="">اختر عميل...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `- ${c.phone}` : ''}</option>)}
                </select>

                {confirmAssign && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center mb-4">
                    <p className="text-sm font-extrabold text-emerald-500">هل أنت متأكد من إسناد الفاتورة لهذا العميل؟</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleAssign} disabled={!assignCustomerId} className="btn-primary py-3 text-sm disabled:opacity-50">
                    {confirmAssign ? "تأكيد الإسناد" : "إسناد"}
                  </button>
                  <button onClick={() => { setShowAssignDialog(false); setConfirmAssign(false); }} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Dialog */}
        {showPayDialog && payInv && (
          <div className="modal-overlay" style={{ zIndex: 60 }}>
            <div className="modal-content">
              <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-md">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2"><Banknote size={20} className="text-success" /> تسجيل دفع</h3>
                <div className="bg-accent/50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>فاتورة رقم</span><span className="font-mono font-bold">{payInv.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span>الإجمالي</span><span className="font-extrabold">{payInv.total.toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between"><span>المدفوع</span><span className="font-extrabold text-success">{payInv.paid.toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between"><span>المتبقي</span><span className="font-extrabold text-destructive">{payInv.remaining.toLocaleString()} ج.م</span></div>
                </div>
                <div className="mb-3">
                  <label className="text-sm font-bold text-muted-foreground">المبلغ</label>
                  <input type="number" className="input-field w-full mt-1" value={payAmount || ""} onChange={(e) => { setPayAmount(Number(e.target.value)); setConfirmPay(false); }} placeholder="0" autoFocus />
                </div>
                <button onClick={() => { setPayAmount(payInv.remaining); setConfirmPay(false); }} className="w-full mb-3 text-sm py-2 rounded-xl bg-accent hover:bg-accent/80 font-bold transition-all">
                  دفع كامل المتبقي ({payInv.remaining.toLocaleString()} ج.م)
                </button>
                {confirmPay && (
                  <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center mb-3">
                    <p className="text-sm font-extrabold text-success">هل أنت متأكد من تسجيل دفع {payAmount.toLocaleString()} ج.م؟</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handlePayInvoice} disabled={payAmount <= 0} className="btn-primary py-3 text-sm disabled:opacity-50">
                    {confirmPay ? "تأكيد الدفع" : "دفع"}
                  </button>
                  <button onClick={() => { setShowPayDialog(false); setConfirmPay(false); }} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile + tablet: cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="stat-card cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-extrabold text-primary">#{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</p>
                </div>
                {inv.isReturned ? <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-lg font-bold whitespace-nowrap">مرتجع</span>
                  : (inv as any).status === 'saved' ? <span className="text-xs bg-sky-500/20 text-sky-500 px-2 py-1 rounded-lg font-bold whitespace-nowrap">محفوظة</span>
                  : inv.remaining > 0 ? <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-lg font-bold whitespace-nowrap">عليها باقي</span>
                  : <span className="text-xs bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-lg font-bold whitespace-nowrap">مكتملة</span>}
              </div>
              <p className="text-sm font-bold mb-2 truncate">{inv.customerName || "بدون عميل"}</p>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/50">
                <div><p className="text-[10px] text-muted-foreground">إجمالي</p><p className="font-extrabold text-sm">{inv.total.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">مدفوع</p><p className="font-extrabold text-sm text-success">{inv.paid.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">متبقي</p><p className={`font-extrabold text-sm ${inv.remaining > 0 ? "text-destructive" : "text-success"}`}>{inv.remaining.toLocaleString()}</p></div>
              </div>
              <div className="flex gap-1 mt-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setSelectedInvoice(inv)} className="flex-1 p-1.5 hover:bg-muted rounded-lg transition-colors flex items-center justify-center"><Eye size={14} className="text-muted-foreground" /></button>
                {!inv.isReturned && <button onClick={() => openReturnDialog(inv)} className="flex-1 p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center justify-center"><RotateCcw size={14} className="text-amber-500" /></button>}
                {inv.remaining > 0 && <button onClick={() => openPayDialog(inv)} className="flex-1 p-1.5 hover:bg-success/10 rounded-lg transition-colors flex items-center justify-center"><Banknote size={14} className="text-success" /></button>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا توجد فواتير</p>}
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block glass-table animate-fade-in-up overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-right p-3 font-extrabold whitespace-nowrap">رقم الفاتورة</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">التاريخ</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">العميل</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">الإجمالي</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">المدفوع</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">المتبقي</th>
                <th className="text-right p-3 font-extrabold whitespace-nowrap">الحالة</th>
                <th className="text-center p-3 font-extrabold whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => (
                <tr key={inv.id} className="border-b hover:bg-muted/20 cursor-pointer transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td className="p-3 font-mono font-bold text-primary whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>{inv.invoiceNumber}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                  <td className="p-3 font-bold whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>{inv.customerName || "بدون عميل"}</td>
                  <td className="p-3 font-extrabold whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>{inv.total.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>{inv.paid.toLocaleString()}</td>
                  <td className={`p-3 font-extrabold whitespace-nowrap ${inv.remaining > 0 ? "text-destructive" : "text-success"}`} onClick={() => setSelectedInvoice(inv)}>{inv.remaining.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap" onClick={() => setSelectedInvoice(inv)}>
                    {inv.isReturned ? <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-lg font-bold">مرتجع</span>
                      : (inv as any).status === 'saved' ? <span className="text-xs bg-sky-500/20 text-sky-500 px-2 py-1 rounded-lg font-bold">محفوظة</span>
                      : inv.remaining > 0 ? <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-lg font-bold">عليها باقي</span>
                      : <span className="text-xs bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-lg font-bold">مكتملة</span>}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Eye size={15} className="text-muted-foreground" /></button>
                      {!inv.isReturned && <button onClick={(e) => { e.stopPropagation(); openReturnDialog(inv); }} className="p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors"><RotateCcw size={15} className="text-amber-500" /></button>}
                      {inv.remaining > 0 && <button onClick={(e) => { e.stopPropagation(); openPayDialog(inv); }} className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"><Banknote size={15} className="text-success" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد فواتير</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
