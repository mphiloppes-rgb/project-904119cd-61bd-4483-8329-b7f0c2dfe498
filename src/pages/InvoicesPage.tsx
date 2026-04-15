import { useState, useMemo } from "react";
import { Search, Eye, Printer, Receipt } from "lucide-react";
import { getInvoices, type Invoice } from "@/lib/store";
import InvoicePrint from "@/components/InvoicePrint";

export default function InvoicesPage() {
  const invoices = useMemo(() => getInvoices().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), []);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (search.trim()) { const s = search.toLowerCase(); if (!inv.customerName?.toLowerCase().includes(s) && !inv.id.includes(s)) return false; }
      if (dateFrom && inv.createdAt < dateFrom) return false;
      if (dateTo && inv.createdAt > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [invoices, search, dateFrom, dateTo]);

  const handlePrint = (inv: Invoice) => { setPrintInvoice(inv); setTimeout(() => { window.print(); setPrintInvoice(null); }, 300); };

  return (
    <>
      {printInvoice && <InvoicePrint invoice={printInvoice} />}
      <div className="no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="text-primary" size={22} /></div>
          <h1 className="page-header mb-0">الفواتير ({invoices.length})</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-fade-in-up">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالعميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-full pr-10" />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
        </div>

        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">تفاصيل الفاتورة</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">✕</button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">رقم: {selectedInvoice.id.slice(-6)}</p>
              <p className="text-sm text-muted-foreground mb-1">{new Date(selectedInvoice.createdAt).toLocaleString("ar-EG")}</p>
              {selectedInvoice.customerName && <p className="text-sm mb-4">العميل: <strong>{selectedInvoice.customerName}</strong></p>}
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b"><th className="text-right py-2 font-extrabold">المنتج</th><th className="text-center py-2 font-extrabold">الكمية</th><th className="text-center py-2 font-extrabold">السعر</th><th className="text-left py-2 font-extrabold">الإجمالي</th></tr></thead>
                <tbody>{selectedInvoice.items.map((item, i) => (<tr key={i} className="border-b"><td className="py-2 font-bold">{item.productName}</td><td className="text-center">{item.quantity}</td><td className="text-center">{item.unitPrice.toLocaleString()}</td><td className="text-left font-bold">{item.total.toLocaleString()}</td></tr>))}</tbody>
              </table>
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between font-extrabold"><span>الإجمالي</span><span>{selectedInvoice.total.toLocaleString()} ج.م</span></div>
                <div className="flex justify-between"><span>المدفوع</span><span className="text-success font-bold">{selectedInvoice.paid.toLocaleString()} ج.م</span></div>
                <div className="flex justify-between font-extrabold text-destructive"><span>المتبقي</span><span>{selectedInvoice.remaining.toLocaleString()} ج.م</span></div>
              </div>
              <button onClick={() => handlePrint(selectedInvoice)} className="w-full mt-4 btn-primary py-3"><Printer size={18} /> طباعة</button>
            </div>
          </div>
        )}

        <div className="glass-table animate-fade-in-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-right p-3 font-extrabold">الرقم</th>
                <th className="text-right p-3 font-extrabold">التاريخ</th>
                <th className="text-right p-3 font-extrabold">العميل</th>
                <th className="text-right p-3 font-extrabold">الإجمالي</th>
                <th className="text-right p-3 font-extrabold">المدفوع</th>
                <th className="text-right p-3 font-extrabold">المتبقي</th>
                <th className="text-center p-3 font-extrabold">عرض</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => (
                <tr key={inv.id} className="border-b hover:bg-muted/20 cursor-pointer transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }} onClick={() => setSelectedInvoice(inv)}>
                  <td className="p-3 font-mono text-xs">{inv.id.slice(-6)}</td>
                  <td className="p-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                  <td className="p-3 font-bold">{inv.customerName || "بدون عميل"}</td>
                  <td className="p-3 font-extrabold">{inv.total.toLocaleString()}</td>
                  <td className="p-3">{inv.paid.toLocaleString()}</td>
                  <td className={`p-3 font-extrabold ${inv.remaining > 0 ? "text-destructive" : "text-success"}`}>{inv.remaining.toLocaleString()}</td>
                  <td className="p-3 text-center"><Eye size={16} className="inline text-muted-foreground" /></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد فواتير</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
