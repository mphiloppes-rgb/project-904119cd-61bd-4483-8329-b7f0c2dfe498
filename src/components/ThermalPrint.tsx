import type { Invoice } from "@/lib/store";

// قالب طباعة حراري 80mm - بسيط وواضح للطابعات الصغيرة
export default function ThermalPrint({ invoice }: { invoice: Invoice }) {
  const date = new Date(invoice.createdAt);
  return (
    <div className="fixed inset-0 z-[9999] bg-white p-2 print:p-0" dir="rtl" style={{ fontFamily: "monospace, Tajawal", color: "#000" }}>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { width: 80mm; }
        }
      `}</style>
      <div style={{ width: "76mm", margin: "0 auto", fontSize: "12px", lineHeight: 1.4 }}>
        <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: 6, marginBottom: 6 }}>
          <h1 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>الراعي للعدد والآلات</h1>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>موزع معتمد Fit & Apt</p>
          <p style={{ margin: "2px 0", fontSize: "11px" }} dir="ltr">📞 01210004358</p>
        </div>

        <div style={{ fontSize: "11px", marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>فاتورة:</span>
            <span style={{ fontWeight: 700 }}>#{invoice.invoiceNumber}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>التاريخ:</span>
            <span>{date.toLocaleDateString("ar-EG")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>الوقت:</span>
            <span>{date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {invoice.customerName && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>العميل:</span>
              <span style={{ fontWeight: 700 }}>{invoice.customerName}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: 6 }}>
          <div style={{ display: "flex", fontWeight: 700, fontSize: "11px" }}>
            <span style={{ flex: 2 }}>الصنف</span>
            <span style={{ width: 24, textAlign: "center" }}>كم</span>
            <span style={{ width: 50, textAlign: "left" }}>الإجمالي</span>
          </div>
        </div>

        {invoice.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: "11px" }}>
            <div style={{ fontWeight: 700 }}>{it.productName}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.quantity} × {it.unitPrice.toLocaleString()}</span>
              <span style={{ fontWeight: 700 }}>{it.total.toLocaleString()}</span>
            </div>
            {(it as any).discount > 0 && (
              <div style={{ fontSize: "10px", color: "#666" }}>
                خصم: -{(it as any).discount.toLocaleString()}
              </div>
            )}
          </div>
        ))}

        <div style={{ borderTop: "1px dashed #000", paddingTop: 6, marginTop: 6, fontSize: "11px" }}>
          {(invoice as any).itemsDiscountTotal > 0 && (
            <Row label="خصم الأصناف" value={`-${(invoice as any).itemsDiscountTotal.toLocaleString()}`} />
          )}
          {(invoice as any).invoiceDiscount > 0 && (
            <Row label="خصم الفاتورة" value={`-${(invoice as any).invoiceDiscount.toLocaleString()}`} />
          )}
          <Row label="الإجمالي" value={`${invoice.total.toLocaleString()} ج.م`} bold />
          <Row label="المدفوع" value={`${invoice.paid.toLocaleString()} ج.م`} />
          {invoice.remaining > 0 && (
            <Row label="المتبقي" value={`${invoice.remaining.toLocaleString()} ج.م`} bold />
          )}
        </div>

        <div style={{ textAlign: "center", borderTop: "1px dashed #000", paddingTop: 8, marginTop: 8 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>شكراً لتعاملكم معنا</p>
          <p style={{ margin: "2px 0 0", fontSize: "10px" }}>إدارة: أ/ مينا عيد</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 800 : 400, marginBottom: 2 }}>
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}
