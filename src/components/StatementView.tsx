import { useMemo, useState } from "react";
import { X, Receipt, Banknote, TrendingUp, TrendingDown, Eye, RotateCcw } from "lucide-react";
import { getInvoicesByCustomer, getCustomerPayments, getCustomers, getSupplierPayments, getInvoiceInitialPaid, getInvoiceOriginalTotal, getInvoiceReturnedTotal, getInvoiceNetTotal, type Invoice } from "@/lib/store";
import { getPurchaseInvoicesBySupplier, getSuppliers } from "@/lib/suppliers";

type Props = {
  type: 'customer' | 'supplier';
  entityId: string;
  onClose: () => void;
};

interface Entry {
  date: string;
  type: 'invoice' | 'payment' | 'return';
  ref: string;
  description: string;
  debit: number;
  credit: number;
  invoice?: Invoice | any;
}

export default function StatementView({ type, entityId, onClose }: Props) {
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);

  const data = useMemo(() => {
    if (type === 'customer') {
      const customer = getCustomers().find(c => c.id === entityId);
      const invoices = getInvoicesByCustomer(entityId);
      const payments = getCustomerPayments(entityId);
      const entries: Entry[] = [];
      invoices.forEach(inv => {
        const ip = getInvoiceInitialPaid(inv);
        entries.push({
          date: inv.createdAt,
          type: 'invoice',
          ref: `#${inv.invoiceNumber}`,
          description: `فاتورة بيع${inv.isReturned ? ' (مرتجعة بالكامل)' : ''}`,
          debit: getInvoiceOriginalTotal(inv),
          credit: ip,
          invoice: inv,
        });
        (inv.returnedItems || []).forEach(ret => entries.push({
          date: ret.returnedAt,
          type: 'return',
          ref: `#${inv.invoiceNumber}`,
          description: `مرتجع: ${ret.productName} × ${ret.quantity}`,
          debit: 0,
          credit: ret.total,
          invoice: inv,
        }));
      });
      payments.forEach(p => {
        entries.push({
          date: p.date, type: 'payment', ref: '—',
          description: p.note || 'تسديد مديونية',
          debit: 0, credit: p.amount,
        });
      });
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { name: customer?.name || '', balance: customer?.balance || 0, entries };
    } else {
      const supplier = getSuppliers().find(s => s.id === entityId);
      const invoices = getPurchaseInvoicesBySupplier(entityId);
      const payments = getSupplierPayments(entityId);
      const entries: Entry[] = [];
      invoices.forEach((inv: any) => {
        const ip = inv.initialPaid != null ? inv.initialPaid : inv.paid;
        entries.push({
          date: inv.createdAt, type: 'invoice', ref: `#${inv.invoiceNumber}`,
          description: 'فاتورة شراء', debit: inv.total, credit: ip, invoice: inv,
        });
      });
      payments.forEach(p => {
        entries.push({
          date: p.date, type: 'payment', ref: '—',
          description: p.note || 'دفع للمورد', debit: 0, credit: p.amount,
        });
      });
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { name: supplier?.name || '', balance: supplier?.balance || 0, entries };
    }
  }, [type, entityId]);

  let running = 0;
  const rows = data.entries.map(e => {
    running += e.debit - e.credit;
    return { ...e, balance: running };
  });

  const totalDebit = data.entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = data.entries.reduce((s, e) => s + e.credit, 0);
  const label = type === 'customer' ? 'كشف حساب عميل' : 'كشف حساب مورد';
  const debitLabel = type === 'customer' ? 'مبيعات أصلية' : 'مشتريات';
  const totalReturns = type === 'customer' ? data.entries.filter(e => e.type === 'return').reduce((s, e) => s + e.credit, 0) : 0;

  return (
    <div className="modal-overlay">
      <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2"><Receipt size={20} className="text-primary" /> {label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{data.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-accent/40 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"><TrendingUp size={12} /> {debitLabel}</div>
            <p className="font-extrabold">{totalDebit.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-accent/40 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"><TrendingDown size={12} /> مدفوعات</div>
            <p className="font-extrabold text-success">{(totalCredit - totalReturns).toLocaleString()} ج.م</p>
          </div>
          {type === 'customer' && (
            <div className="bg-warning/10 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"><RotateCcw size={12} /> المرتجعات</div>
              <p className="font-extrabold text-warning">{totalReturns.toLocaleString()} ج.م</p>
            </div>
          )}
          <div className={`rounded-xl p-3 text-center ${data.balance > 0 ? 'bg-destructive/10' : data.balance < 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1"><Banknote size={12} /> الرصيد</div>
            <p className={`font-extrabold ${data.balance > 0 ? 'text-destructive' : data.balance < 0 ? 'text-warning' : 'text-success'}`}>{Math.abs(data.balance).toLocaleString()} ج.م</p>
            <p className="text-[10px] text-muted-foreground">{data.balance > 0 ? 'على العميل' : data.balance < 0 ? 'للعميل' : 'صافي'}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد حركات</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="bg-accent/40 rounded-xl p-3 text-xs">
                  <div className="flex justify-between mb-1 items-center gap-2">
                    <span className={`font-bold ${r.type === 'return' ? 'text-warning' : ''}`}>{r.description} {r.ref}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">{new Date(r.date).toLocaleDateString("ar-EG")}</span>
                      {r.invoice && (
                        <button onClick={() => setDetailInvoice(r.invoice)} className="p-1 rounded-md bg-primary/10 text-primary"><Eye size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-border/30">
                    <div><p className="text-muted-foreground">عليه</p><p className="font-extrabold">{r.debit ? r.debit.toLocaleString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">له</p><p className={`font-extrabold ${r.type === 'return' ? 'text-warning' : 'text-success'}`}>{r.credit ? r.credit.toLocaleString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">الرصيد</p><p className={`font-extrabold ${r.balance > 0 ? 'text-destructive' : 'text-success'}`}>{r.balance.toLocaleString()}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 font-extrabold">التاريخ</th>
                    <th className="text-right p-2 font-extrabold">البيان</th>
                    <th className="text-right p-2 font-extrabold">المرجع</th>
                    <th className="text-center p-2 font-extrabold">عليه</th>
                    <th className="text-center p-2 font-extrabold">له</th>
                    <th className="text-center p-2 font-extrabold">الرصيد</th>
                    <th className="text-center p-2 font-extrabold">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-accent/20">
                      <td className="p-2 text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("ar-EG")}</td>
                      <td className={`p-2 font-bold ${r.type === 'return' ? 'text-warning' : ''}`}>{r.description}</td>
                      <td className="p-2 text-xs">{r.ref}</td>
                      <td className="p-2 text-center">{r.debit ? r.debit.toLocaleString() : '—'}</td>
                      <td className={`p-2 text-center font-bold ${r.type === 'return' ? 'text-warning' : 'text-success'}`}>{r.credit ? r.credit.toLocaleString() : '—'}</td>
                      <td className={`p-2 text-center font-extrabold ${r.balance > 0 ? 'text-destructive' : 'text-success'}`}>{r.balance.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        {r.invoice ? (
                          <button onClick={() => setDetailInvoice(r.invoice)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20">
                            <Eye size={14} /> عرض
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* مودال تفاصيل الفاتورة */}
      {detailInvoice && (
        <div className="modal-overlay" onClick={() => setDetailInvoice(null)}>
          <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-extrabold text-lg">تفاصيل فاتورة #{detailInvoice.invoiceNumber}</h4>
                <p className="text-xs text-muted-foreground">{new Date(detailInvoice.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <button onClick={() => setDetailInvoice(null)} className="p-2 hover:bg-muted rounded-xl"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
              <div className="bg-accent/40 p-2 rounded-lg"><p className="text-muted-foreground">قبل المرتجع</p><p className="font-extrabold">{getInvoiceOriginalTotal(detailInvoice).toLocaleString()} ج.م</p></div>
              <div className="bg-warning/10 p-2 rounded-lg"><p className="text-muted-foreground">المرتجع</p><p className="font-extrabold text-warning">{getInvoiceReturnedTotal(detailInvoice).toLocaleString()} ج.م</p></div>
              <div className="bg-success/10 p-2 rounded-lg"><p className="text-muted-foreground">الصافي</p><p className="font-extrabold text-success">{getInvoiceNetTotal(detailInvoice).toLocaleString()} ج.م</p></div>
              <div className={`p-2 rounded-lg ${Number(detailInvoice.remaining||0) > 0 ? 'bg-destructive/10' : 'bg-muted/40'}`}><p className="text-muted-foreground">المتبقي</p><p className={`font-extrabold ${Number(detailInvoice.remaining||0) > 0 ? 'text-destructive' : ''}`}>{Number(detailInvoice.remaining||0).toLocaleString()} ج.م</p></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 font-extrabold">المنتج</th>
                    <th className="text-center p-2 font-extrabold">الكمية</th>
                    <th className="text-center p-2 font-extrabold">سعر الوحدة</th>
                    <th className="text-center p-2 font-extrabold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailInvoice.items || []).map((it: any, i: number) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="p-2 font-bold">{it.productName}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-center">{Number(it.unitPrice||0).toLocaleString()}</td>
                      <td className="p-2 text-center font-extrabold">{Number(it.total||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailInvoice.returnedItems && detailInvoice.returnedItems.length > 0 && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-xl">
                <p className="text-xs font-extrabold text-amber-600 mb-2">⚠️ أصناف مرتجعة:</p>
                {detailInvoice.returnedItems.map((r: any, i: number) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span>{r.productName} × {r.quantity}</span>
                    <span className="font-bold">{Number(r.total||0).toLocaleString()} ج.م</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
