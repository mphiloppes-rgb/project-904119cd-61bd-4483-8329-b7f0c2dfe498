import { useMemo } from "react";
import { X, Receipt, Banknote, TrendingUp, TrendingDown } from "lucide-react";
import { getInvoicesByCustomer, getCustomerPayments, getCustomers, getSupplierPayments } from "@/lib/store";
import { getPurchaseInvoicesBySupplier, getSuppliers } from "@/lib/suppliers";

type Props = {
  type: 'customer' | 'supplier';
  entityId: string;
  onClose: () => void;
};

interface Entry {
  date: string;
  type: 'invoice' | 'payment';
  ref: string;
  description: string;
  debit: number; // عليه (زيادة المديونية)
  credit: number; // له (دفع/تخفيض)
}

export default function StatementView({ type, entityId, onClose }: Props) {
  const data = useMemo(() => {
    if (type === 'customer') {
      const customer = getCustomers().find(c => c.id === entityId);
      const invoices = getInvoicesByCustomer(entityId);
      const payments = getCustomerPayments(entityId);
      const entries: Entry[] = [];
      invoices.forEach(inv => {
        entries.push({
          date: inv.createdAt,
          type: 'invoice',
          ref: `#${inv.invoiceNumber}`,
          description: `فاتورة بيع${inv.isReturned ? ' (مرتجعة)' : ''}`,
          debit: inv.total,
          credit: inv.paid,
        });
      });
      payments.forEach(p => {
        entries.push({
          date: p.date,
          type: 'payment',
          ref: '—',
          description: p.note || 'تسديد مديونية',
          debit: 0,
          credit: p.amount,
        });
      });
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { name: customer?.name || '', balance: customer?.balance || 0, entries };
    } else {
      const supplier = getSuppliers().find(s => s.id === entityId);
      const invoices = getPurchaseInvoicesBySupplier(entityId);
      const payments = getSupplierPayments(entityId);
      const entries: Entry[] = [];
      invoices.forEach(inv => {
        entries.push({
          date: inv.createdAt,
          type: 'invoice',
          ref: `#${inv.invoiceNumber}`,
          description: 'فاتورة شراء',
          debit: inv.total,
          credit: inv.paid,
        });
      });
      payments.forEach(p => {
        entries.push({
          date: p.date,
          type: 'payment',
          ref: '—',
          description: p.note || 'دفع للمورد',
          debit: 0,
          credit: p.amount,
        });
      });
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { name: supplier?.name || '', balance: supplier?.balance || 0, entries };
    }
  }, [type, entityId]);

  // Compute running balance
  let running = 0;
  const rows = data.entries.map(e => {
    running += e.debit - e.credit;
    return { ...e, balance: running };
  });

  const totalDebit = data.entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = data.entries.reduce((s, e) => s + e.credit, 0);
  const label = type === 'customer' ? 'كشف حساب عميل' : 'كشف حساب مورد';
  const debitLabel = type === 'customer' ? 'مبيعات' : 'مشتريات';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up p-4">
      <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2"><Receipt size={20} className="text-primary" /> {label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{data.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-accent/40 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp size={12} /> {debitLabel}
            </div>
            <p className="font-extrabold">{totalDebit.toLocaleString()} ج.م</p>
          </div>
          <div className="bg-accent/40 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingDown size={12} /> مدفوعات
            </div>
            <p className="font-extrabold text-success">{totalCredit.toLocaleString()} ج.م</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${data.balance > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Banknote size={12} /> الرصيد
            </div>
            <p className={`font-extrabold ${data.balance > 0 ? 'text-destructive' : 'text-success'}`}>
              {Math.abs(data.balance).toLocaleString()} ج.م
            </p>
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
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{r.description} {r.ref}</span>
                    <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-border/30">
                    <div><p className="text-muted-foreground">عليه</p><p className="font-extrabold">{r.debit ? r.debit.toLocaleString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">له</p><p className="font-extrabold text-success">{r.credit ? r.credit.toLocaleString() : '—'}</p></div>
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-accent/20">
                      <td className="p-2 text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("ar-EG")}</td>
                      <td className="p-2 font-bold">{r.description}</td>
                      <td className="p-2 text-xs">{r.ref}</td>
                      <td className="p-2 text-center">{r.debit ? r.debit.toLocaleString() : '—'}</td>
                      <td className="p-2 text-center text-success font-bold">{r.credit ? r.credit.toLocaleString() : '—'}</td>
                      <td className={`p-2 text-center font-extrabold ${r.balance > 0 ? 'text-destructive' : 'text-success'}`}>{r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
