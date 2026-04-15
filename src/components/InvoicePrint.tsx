import type { Invoice } from "@/lib/store";
import logo from "@/assets/logo.png";

export default function InvoicePrint({ invoice }: { invoice: Invoice }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white p-4 print:p-0" dir="rtl" style={{ fontFamily: "Tajawal, sans-serif", color: '#1a2332' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header with dark blue banner */}
        <div className="relative overflow-hidden rounded-t-xl" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2a3a52 100%)' }}>
          <div className="flex items-center justify-between p-5 text-white">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1" />
              <div>
                <h1 className="text-xl font-extrabold">الراعي للعدد والآلات</h1>
                <p className="text-xs opacity-70">موزع معتمد: Fit & Apt</p>
                <p className="text-xs opacity-70">إدارة: أ/ مينا عيد</p>
                <p className="text-xs opacity-70" dir="ltr">📞 01210004358</p>
              </div>
            </div>
          </div>
          {/* Orange accent bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #e67e22, #f39c12, #e67e22)' }} />
        </div>

        {/* Invoice meta */}
        <div className="bg-gray-50 border-x border-gray-200 px-5 py-3 flex justify-between items-center text-sm">
          <div>
            <span className="font-bold" style={{ color: '#1a2332' }}>فاتورة مبيعات / SALES INVOICE</span>
          </div>
          <div className="flex gap-6 text-xs" style={{ color: '#666' }}>
            <span>الفاتورة: {invoice.id?.slice(-6)}</span>
            <span>{new Date(invoice.createdAt).toLocaleDateString("ar-EG")}</span>
            <span>{new Date(invoice.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {invoice.customerName && (
          <div className="border-x border-b border-gray-200 px-5 py-2 text-sm bg-white">
            العميل: <strong>{invoice.customerName}</strong>
          </div>
        )}

        {/* Items table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#1a2332', color: 'white' }}>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3 text-right">اسم المنتج</th>
              <th className="py-2.5 px-3 text-center">الكمية</th>
              <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td className="py-2.5 px-3 text-center font-bold" style={{ color: '#e67e22' }}>{idx + 1}</td>
                <td className="py-2.5 px-3 font-medium">{item.productName}</td>
                <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                <td className="py-2.5 px-3 text-center">{item.unitPrice.toLocaleString()} ج.م</td>
                <td className="py-2.5 px-3 text-left font-bold">{item.total.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border border-gray-200 rounded-b-xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="font-bold text-sm">الإجمالي / TOTAL:</span>
            <span className="font-extrabold text-base">{invoice.total.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between items-center px-5 py-2.5 bg-white border-b border-gray-200">
            <span className="font-bold text-sm">المدفوع / PAID:</span>
            <span className="font-bold text-sm" style={{ color: '#27ae60' }}>{invoice.paid.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between items-center px-5 py-2.5" style={{ background: 'linear-gradient(135deg, #e67e22, #f39c12)' }}>
            <span className="font-extrabold text-sm text-white">المتبقي / REMAINING:</span>
            <span className="font-extrabold text-lg text-white">{invoice.remaining.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #e67e22)' }} />
            <span className="text-lg font-extrabold" style={{ color: '#1a2332' }}>شكراً لتعاملكم معنا</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #e67e22)' }} />
          </div>
          <p className="text-xs" style={{ color: '#999' }}>Fit & Apt</p>
        </div>
      </div>
    </div>
  );
}
