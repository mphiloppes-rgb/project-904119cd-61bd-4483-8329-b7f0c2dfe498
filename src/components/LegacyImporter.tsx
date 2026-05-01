// أداة لاستيراد بيانات من نسخة احتياطية قديمة ودمجها مع الموجود (دون مسح).
import { useRef, useState } from "react";
import { Upload, ArrowDown, AlertCircle, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getProducts, saveProducts, getCustomers, saveCustomers, getInvoices, saveInvoices,
  getExpenses, saveExpenses,
} from "@/lib/store";

type Mode = "merge" | "replace";

interface ImportResult {
  products: number; productsSkipped: number;
  customers: number; customersSkipped: number;
  invoices: number; invoicesSkipped: number;
  expenses: number; expensesSkipped: number;
}

export default function LegacyImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("merge");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // تحقق سريع — يدعم backup الجديد + أي backup قديم له نفس الشكل
      if (!data.products && !data.customers && !data.invoices && !data.expenses) {
        toast({ title: "ملف غير صالح", description: "مفيش بيانات يمكن استيرادها", variant: "destructive" });
        return;
      }
      setPreviewData(data);
      setResult(null);
    } catch (err: any) {
      toast({ title: "ملف تالف", description: err?.message || "تعذّر قراءة JSON", variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const apply = () => {
    if (!previewData) return;
    setBusy(true);
    try {
      const r: ImportResult = {
        products: 0, productsSkipped: 0,
        customers: 0, customersSkipped: 0,
        invoices: 0, invoicesSkipped: 0,
        expenses: 0, expensesSkipped: 0,
      };

      if (mode === "replace") {
        if (previewData.products) { saveProducts(previewData.products); r.products = previewData.products.length; }
        if (previewData.customers) { saveCustomers(previewData.customers); r.customers = previewData.customers.length; }
        if (previewData.invoices) { saveInvoices(previewData.invoices); r.invoices = previewData.invoices.length; }
        if (previewData.expenses) { saveExpenses(previewData.expenses); r.expenses = previewData.expenses.length; }
      } else {
        // merge — نتجنب الـ duplicates بالـ id والاسم/الكود
        if (Array.isArray(previewData.products)) {
          const existing = getProducts();
          const idsSet = new Set(existing.map(p => p.id));
          const codeSet = new Set(existing.filter(p => p.code).map(p => p.code!.toLowerCase()));
          const merged = [...existing];
          previewData.products.forEach((p: any) => {
            if (idsSet.has(p.id) || (p.code && codeSet.has(String(p.code).toLowerCase()))) {
              r.productsSkipped++;
            } else {
              merged.push(p); r.products++;
            }
          });
          saveProducts(merged);
        }
        if (Array.isArray(previewData.customers)) {
          const existing = getCustomers();
          const idsSet = new Set(existing.map(c => c.id));
          const phoneSet = new Set(existing.filter(c => c.phone).map(c => c.phone));
          const merged = [...existing];
          previewData.customers.forEach((c: any) => {
            if (idsSet.has(c.id) || (c.phone && phoneSet.has(c.phone))) {
              r.customersSkipped++;
            } else {
              merged.push(c); r.customers++;
            }
          });
          saveCustomers(merged);
        }
        if (Array.isArray(previewData.invoices)) {
          const existing = getInvoices();
          const idsSet = new Set(existing.map(i => i.id));
          const numSet = new Set(existing.map(i => i.invoiceNumber));
          const merged = [...existing];
          previewData.invoices.forEach((inv: any) => {
            if (idsSet.has(inv.id) || numSet.has(inv.invoiceNumber)) {
              r.invoicesSkipped++;
            } else {
              merged.push(inv); r.invoices++;
            }
          });
          saveInvoices(merged);
        }
        if (Array.isArray(previewData.expenses)) {
          const existing = getExpenses();
          const idsSet = new Set(existing.map(e => e.id));
          const merged = [...existing];
          previewData.expenses.forEach((ex: any) => {
            if (idsSet.has(ex.id)) {
              r.expensesSkipped++;
            } else {
              merged.push(ex); r.expenses++;
            }
          });
          saveExpenses(merged);
        }
      }

      setResult(r);
      setPreviewData(null);
      toast({ title: "تم الاستيراد ✅", description: `أُضيف ${r.products + r.customers + r.invoices + r.expenses} عنصر` });
    } catch (err: any) {
      toast({ title: "فشل الاستيراد", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stat-card animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <ArrowDown className="text-purple-500" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">نقل بيانات من إصدار قديم</h3>
          <p className="text-xs text-muted-foreground">ارفع ملف backup من الإصدار القديم وادمجه مع الإدارة الحالية</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setMode("merge")}
          className={`py-2.5 rounded-xl font-bold text-sm ${mode === "merge" ? "bg-primary text-primary-foreground shadow" : "bg-accent"}`}
        >
          🔗 دمج (يحتفظ بالحالي)
        </button>
        <button
          onClick={() => setMode("replace")}
          className={`py-2.5 rounded-xl font-bold text-sm ${mode === "replace" ? "bg-destructive text-destructive-foreground shadow" : "bg-accent"}`}
        >
          ⚠️ استبدال كامل
        </button>
      </div>

      {mode === "replace" && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 mb-3 flex items-start gap-2">
          <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-destructive font-bold">
            تحذير: الاستبدال هيمسح كل البيانات الحالية ويحط بدلها بيانات الملف. متأكد؟
          </p>
        </div>
      )}

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-xl font-extrabold hover:opacity-90"
      >
        <Upload size={18} /> اختر ملف (.json)
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFile} />

      {previewData && (
        <div className="mt-3 p-3 rounded-xl bg-muted/40 space-y-2">
          <p className="text-xs font-extrabold">معاينة الملف:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-card rounded">منتجات: <strong>{previewData.products?.length || 0}</strong></div>
            <div className="p-2 bg-card rounded">عملاء: <strong>{previewData.customers?.length || 0}</strong></div>
            <div className="p-2 bg-card rounded">فواتير: <strong>{previewData.invoices?.length || 0}</strong></div>
            <div className="p-2 bg-card rounded">مصاريف: <strong>{previewData.expenses?.length || 0}</strong></div>
          </div>
          {previewData.exportDate && (
            <p className="text-[11px] text-muted-foreground">
              تاريخ الإصدار: {new Date(previewData.exportDate).toLocaleString("ar-EG")}
            </p>
          )}
          <button onClick={apply} disabled={busy} className="w-full btn-primary py-2.5 text-sm">
            <Check size={16} /> {busy ? "جارٍ..." : `${mode === "merge" ? "دمج البيانات الآن" : "استبدال البيانات الآن"}`}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 rounded-xl bg-success/10 border border-success/30">
          <p className="text-xs font-extrabold text-success mb-2">✅ تم الاستيراد بنجاح:</p>
          <ul className="text-xs space-y-1">
            <li>منتجات: <strong>+{result.products}</strong> {result.productsSkipped > 0 && <span className="text-muted-foreground">({result.productsSkipped} تم تخطيها كمكررة)</span>}</li>
            <li>عملاء: <strong>+{result.customers}</strong> {result.customersSkipped > 0 && <span className="text-muted-foreground">({result.customersSkipped} مكرر)</span>}</li>
            <li>فواتير: <strong>+{result.invoices}</strong> {result.invoicesSkipped > 0 && <span className="text-muted-foreground">({result.invoicesSkipped} مكرر)</span>}</li>
            <li>مصاريف: <strong>+{result.expenses}</strong> {result.expensesSkipped > 0 && <span className="text-muted-foreground">({result.expensesSkipped} مكرر)</span>}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
