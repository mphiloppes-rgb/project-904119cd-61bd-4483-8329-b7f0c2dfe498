import type { Invoice } from "@/lib/store";
import logo from "@/assets/logo.png";

export default function InvoicePrint({ invoice }: { invoice: Invoice }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white p-4 print:p-0" dir="rtl" style={{ fontFamily: "Tajawal, sans-serif", color: '#000' }}>
      <div className="max-w-2xl mx-auto border border-black/10 rounded-xl overflow-hidden shadow-lg">
        {/* Header — MoonTech branding (black + steel + electric blue) */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #050914 0%, #0f172a 45%, #1e293b 100%)' }}>
          <div className="flex items-center justify-between p-5 text-white">
            <div className="flex items-center gap-4">
              <div style={{ width: 78, height: 78, borderRadius: '50%', overflow: 'hidden', border: '2px solid #3b82f6', boxShadow: '0 0 24px rgba(59,130,246,0.55)', background: '#000' }}>
                <img src={logo} alt="MoonTech" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wider" style={{ background: 'linear-gradient(90deg,#cbd5e1,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MOON TECH</h1>
                <p className="text-xs opacity-80">مون تك • نظام حسابات وكاشير للمحلات</p>
              </div>
            </div>
          </div>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #cbd5e1, #60a5fa, #3b82f6)' }} />
        </div>

        {/* Invoice meta */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center text-sm" style={{ color: '#000' }}>
          <div>
            <span className="font-extrabold">
              {(invoice as any).status === 'saved' ? 'فاتورة محفوظة / SAVED INVOICE' : 'فاتورة مبيعات / SALES INVOICE'}
            </span>
          </div>
          <div className="flex gap-6 text-xs">
            <span>الفاتورة: <b>{invoice.invoiceNumber || invoice.id?.slice(-6)}</b></span>
            <span>{new Date(invoice.createdAt).toLocaleDateString("ar-EG")}</span>
            <span>{new Date(invoice.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {invoice.customerName && (
          <div className="border-x border-b border-gray-200 px-5 py-2 text-sm bg-white">
            العميل: <strong>{invoice.customerName}</strong>
          </div>
        )}

        {/* Items table — black text on clean rows */}
        <table className="w-full text-sm border-collapse" style={{ color: '#000' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3 text-right">اسم المنتج</th>
              <th className="py-2.5 px-3 text-center">الكمية</th>
              <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-center">الخصم</th>
              <th className="py-2.5 px-3 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, idx: number) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f3f6fb', borderBottom: '1px solid #e5e7eb' }}>
                <td className="py-2.5 px-3 text-center font-bold" style={{ color: '#1d4ed8' }}>{idx + 1}</td>
                <td className="py-2.5 px-3 font-semibold">{item.productName}</td>
                <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                <td className="py-2.5 px-3 text-center">{item.unitPrice.toLocaleString()} ج.م</td>
                <td className="py-2.5 px-3 text-center" style={{ color: item.discount ? '#b45309' : '#999' }}>
                  {item.discount ? `- ${item.discount.toLocaleString()}` : '—'}
                </td>
                <td className="py-2.5 px-3 text-left font-extrabold">{item.total.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ color: '#000' }}>
          {(invoice as any).subtotal && (invoice as any).subtotal !== invoice.total && (
            <div className="flex justify-between items-center px-5 py-2 bg-white border-t border-gray-200 text-sm">
              <span className="font-bold">الإجمالي قبل الخصم / SUBTOTAL:</span>
              <span className="font-bold">{(invoice as any).subtotal.toLocaleString()} ج.م</span>
            </div>
          )}
          {(invoice as any).itemsDiscountTotal > 0 && (
            <div className="flex justify-between items-center px-5 py-2 bg-amber-50 border-t border-gray-200 text-sm">
              <span className="font-bold">خصم الأصناف / ITEMS DISCOUNT:</span>
              <span className="font-bold">- {(invoice as any).itemsDiscountTotal.toLocaleString()} ج.م</span>
            </div>
          )}
          {(invoice as any).invoiceDiscount > 0 && (
            <div className="flex justify-between items-center px-5 py-2 bg-amber-50 border-t border-gray-200 text-sm">
              <span className="font-bold">
                خصم الفاتورة / INVOICE DISCOUNT
                {(invoice as any).invoiceDiscountType === 'percent' && (invoice as any).invoiceDiscountValue ? ` (${(invoice as any).invoiceDiscountValue}%)` : ''}:
              </span>
              <span className="font-bold">- {(invoice as any).invoiceDiscount.toLocaleString()} ج.م</span>
            </div>
          )}
          <div className="flex justify-between items-center px-5 py-2.5 bg-gray-100 border-t border-gray-200">
            <span className="font-bold text-sm">الإجمالي / TOTAL:</span>
            <span className="font-extrabold text-base">{invoice.total.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between items-center px-5 py-2.5 bg-white border-t border-gray-200">
            <span className="font-bold text-sm">المدفوع / PAID:</span>
            <span className="font-extrabold text-sm" style={{ color: '#15803d' }}>{invoice.paid.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)' }}>
            <span className="font-extrabold text-sm text-white">المتبقي / REMAINING:</span>
            <span className="font-extrabold text-lg text-white">{invoice.remaining.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #0f172a)' }} />
            <span className="text-base font-extrabold" style={{ color: '#000' }}>شكراً لتعاملكم معنا</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #0f172a)' }} />
          </div>
          <p className="text-xs" style={{ color: '#666' }}>MOON TECH • مون تك POS</p>
        </div>
      </div>
    </div>
  );
}
