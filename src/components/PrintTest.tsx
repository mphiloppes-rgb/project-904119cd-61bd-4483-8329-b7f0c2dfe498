import { useState } from "react";
import { Printer, FileText, Receipt as ReceiptIcon } from "lucide-react";
import InvoicePrint from "./InvoicePrint";
import ThermalPrint from "./ThermalPrint";
import type { Invoice } from "@/lib/store";

// نموذج فاتورة تجريبية للاختبار (لا تُحفظ في قاعدة البيانات)
const sampleInvoice: Invoice = {
  id: "TEST-0001",
  invoiceNumber: "TEST-0001",
  customerId: "",
  customerName: "عميل تجريبي",
  items: [
    { productId: "P1", productName: "منتج تجريبي أ", quantity: 2, unitPrice: 150, costPrice: 100, discount: 0, total: 300 },
    { productId: "P2", productName: "منتج تجريبي ب", quantity: 1, unitPrice: 500, costPrice: 350, discount: 50, total: 450 },
    { productId: "P3", productName: "منتج تجريبي ج", quantity: 3, unitPrice: 75, costPrice: 40, discount: 0, total: 225 },
  ] as any,
  total: 975,
  paid: 500,
  remaining: 475,
  createdAt: new Date().toISOString(),
} as any;

export default function PrintTest() {
  const [mode, setMode] = useState<null | "a4" | "thermal">(null);

  const doPrint = (m: "a4" | "thermal") => {
    setMode(m);
    setTimeout(() => {
      window.print();
      setTimeout(() => setMode(null), 400);
    }, 250);
  };

  return (
    <>
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Printer className="text-primary" size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-lg">اختبار الطباعة</h3>
            <p className="text-xs text-muted-foreground">تأكد من مقاس ورقة A4 والطابعة الحرارية قبل الاستخدام</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => doPrint("a4")}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-right"
          >
            <FileText className="text-primary" size={28} />
            <div className="flex-1">
              <div className="font-extrabold">طباعة A4 تجريبية</div>
              <div className="text-xs text-muted-foreground">فاتورة كاملة بألوان الهوية</div>
            </div>
          </button>

          <button
            onClick={() => doPrint("thermal")}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-right"
          >
            <ReceiptIcon className="text-primary" size={28} />
            <div className="flex-1">
              <div className="font-extrabold">طباعة حرارية 80mm</div>
              <div className="text-xs text-muted-foreground">للطابعة الصغيرة (كاشير)</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          نصيحة: في نافذة الطباعة اختر «Save as PDF» للفحص، أو اختر الطابعة الحقيقية للتجربة الفعلية.
        </p>
      </div>

      {mode === "a4" && <InvoicePrint invoice={sampleInvoice} />}
      {mode === "thermal" && <ThermalPrint invoice={sampleInvoice} />}
    </>
  );
}
