// أداة لاستيراد بيانات من نسخة احتياطية قديمة مع معاينة وتحكم لكل جدول.
import { useRef, useState } from "react";
import { Upload, ArrowDown, AlertCircle, Check, X, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getProducts, saveProducts, getCustomers, saveCustomers, getInvoices, saveInvoices,
  getExpenses, saveExpenses,
} from "@/lib/store";
import { getSuppliers, saveSuppliers, getPurchaseInvoices, savePurchaseInvoices } from "@/lib/suppliers";

type Mode = "merge" | "replace" | "skip";

interface ImportResult {
  products: number; productsSkipped: number;
  customers: number; customersSkipped: number;
  invoices: number; invoicesSkipped: number;
  expenses: number; expensesSkipped: number;
  suppliers: number; suppliersSkipped: number;
  purchases: number; purchasesSkipped: number;
}

type DataKey = "products" | "customers" | "invoices" | "expenses" | "suppliers" | "purchases";
const dataTypes: { key: DataKey; label: string; icon: string }[] = [
  { key: "products", label: "المنتجات", icon: "📦" },
  { key: "customers", label: "العملاء", icon: "👥" },
  { key: "invoices", label: "فواتير البيع", icon: "🧾" },
  { key: "expenses", label: "المصاريف", icon: "💸" },
  { key: "suppliers", label: "الموردين", icon: "🏭" },
  { key: "purchases", label: "فواتير الشراء", icon: "📥" },
];

export default function LegacyImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState<DataKey | null>(null);
  // كل جدول له mode منفصل: merge | replace | skip
  const [perTypeMode, setPerTypeMode] = useState<Record<DataKey, Mode>>({
    products: "merge", customers: "merge", invoices: "merge",
    expenses: "merge", suppliers: "merge", purchases: "merge",
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.products && !data.customers && !data.invoices && !data.expenses && !data.suppliers && !data.purchaseInvoices && !data.purchases) {
        toast({ title: "ملف غير صالح", description: "مفيش بيانات يمكن استيرادها", variant: "destructive" });
        return;
      }
      if (data.purchaseInvoices && !data.purchases) data.purchases = data.purchaseInvoices;
      setPreviewData(data);
      setResult(null);
      // أي جدول فاضي اعتبره skip تلقائيًا
      const next: Record<DataKey, Mode> = { ...perTypeMode };
      dataTypes.forEach(t => { if (!data[t.key]?.length) next[t.key] = "skip"; });
      setPerTypeMode(next);
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
        suppliers: 0, suppliersSkipped: 0,
        purchases: 0, purchasesSkipped: 0,
      };

      const handleArray = <T extends { id?: string }>(
        key: DataKey,
        getFn: () => T[],
        saveFn: (arr: T[]) => void,
        dedupe: (item: any, existing: T[]) => boolean,
        countKey: keyof ImportResult,
        skipKey: keyof ImportResult
      ) => {
        const mode = perTypeMode[key];
        if (mode === "skip") return;
        const incoming = previewData[key];
        if (!Array.isArray(incoming)) return;
        if (mode === "replace") {
          saveFn(incoming);
          (r as any)[countKey] = incoming.length;
          return;
        }
        // merge
        const existing = getFn();
        const merged = [...existing];
        incoming.forEach((item: any) => {
          if (dedupe(item, existing)) (r as any)[skipKey]++;
          else { merged.push(item); (r as any)[countKey]++; }
        });
        saveFn(merged);
      };

      handleArray("products", getProducts, saveProducts,
        (p, ex) => ex.some(e => e.id === p.id || (p.code && (e as any).code?.toLowerCase() === String(p.code).toLowerCase())),
        "products", "productsSkipped");
      handleArray("customers", getCustomers, saveCustomers,
        (c, ex) => ex.some(e => e.id === c.id || (c.phone && (e as any).phone === c.phone)),
        "customers", "customersSkipped");
      handleArray("invoices", getInvoices, saveInvoices,
        (i, ex) => ex.some(e => e.id === i.id || (e as any).invoiceNumber === i.invoiceNumber),
        "invoices", "invoicesSkipped");
      handleArray("expenses", getExpenses, saveExpenses,
        (x, ex) => ex.some(e => e.id === x.id),
        "expenses", "expensesSkipped");
      handleArray("suppliers", getSuppliers, saveSuppliers,
        (s, ex) => ex.some(e => e.id === s.id || (s.phone && (e as any).phone === s.phone)),
        "suppliers", "suppliersSkipped");
      handleArray("purchases", getPurchaseInvoices, savePurchaseInvoices,
        (i, ex) => ex.some(e => e.id === i.id || (e as any).invoiceNumber === i.invoiceNumber),
        "purchases", "purchasesSkipped");

      setResult(r);
      setPreviewData(null);
      toast({ title: "تم الاستيراد ✅", description: `أُضيف ${r.products + r.customers + r.invoices + r.expenses + r.suppliers + r.purchases} عنصر` });
    } catch (err: any) {
      toast({ title: "فشل الاستيراد", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const setMode = (key: DataKey, mode: Mode) => setPerTypeMode(prev => ({ ...prev, [key]: mode }));
  const hasReplace = dataTypes.some(t => perTypeMode[t.key] === "replace" && (previewData?.[t.key]?.length || 0) > 0);
  const hasAny = dataTypes.some(t => perTypeMode[t.key] !== "skip" && (previewData?.[t.key]?.length || 0) > 0);

  const previewSample = previewType && previewData?.[previewType] ? (previewData[previewType] as any[]).slice(0, 20) : [];

  return (
    <div className="stat-card animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <ArrowDown className="text-purple-500" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">نقل بيانات من إصدار قديم</h3>
          <p className="text-xs text-muted-foreground">معاينة كل جدول لوحده واختيار: دمج / استبدال / تخطي</p>
        </div>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-xl font-extrabold hover:opacity-90"
      >
        <Upload size={18} /> اختر ملف (.json)
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFile} />

      {previewData && (
        <div className="mt-3 p-3 rounded-xl bg-muted/40 space-y-3">
          <p className="text-xs font-extrabold">معاينة + اختيار الإجراء لكل جدول:</p>

          <div className="space-y-2">
            {dataTypes.map((t) => {
              const count = previewData[t.key]?.length || 0;
              const mode = perTypeMode[t.key];
              return (
                <div key={t.key} className={`rounded-xl border p-3 ${count ? 'bg-card border-border' : 'bg-muted/30 border-muted opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-extrabold text-sm truncate">{t.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent">{count}</span>
                    </div>
                    {count > 0 && (
                      <button
                        onClick={() => { setPreviewType(t.key); setShowPreviewModal(true); }}
                        className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                      >
                        <Eye size={14} /> معاينة
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["merge", "replace", "skip"] as Mode[]).map(m => (
                      <button
                        key={m}
                        disabled={!count}
                        onClick={() => setMode(t.key, m)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition ${
                          mode === m
                            ? m === "replace" ? "bg-destructive text-destructive-foreground" : m === "skip" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                            : "bg-accent/40 text-foreground hover:bg-accent"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {m === "merge" ? "🔗 دمج" : m === "replace" ? "⚠️ استبدال" : "⊘ تخطي"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {hasReplace && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-destructive font-bold">
                تنبيه: جداول الاستبدال هتمسح البيانات الحالية فيها وتحط بدلها بيانات الملف.
              </p>
            </div>
          )}

          {previewData.exportDate && (
            <p className="text-[11px] text-muted-foreground">
              تاريخ الإصدار: {new Date(previewData.exportDate).toLocaleString("ar-EG")}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => setPreviewData(null)} className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-bold">
              إلغاء
            </button>
            <button onClick={apply} disabled={busy || !hasAny} className="flex-[2] btn-primary py-2.5 text-sm disabled:opacity-50">
              <Check size={16} /> {busy ? "جارٍ..." : "تنفيذ الاستيراد المحدد"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 rounded-xl bg-success/10 border border-success/30">
          <p className="text-xs font-extrabold text-success mb-2">✅ تم الاستيراد بنجاح:</p>
          <ul className="text-xs space-y-1">
            <li>منتجات: <strong>+{result.products}</strong> {result.productsSkipped > 0 && <span className="text-muted-foreground">({result.productsSkipped} مكرر)</span>}</li>
            <li>عملاء: <strong>+{result.customers}</strong> {result.customersSkipped > 0 && <span className="text-muted-foreground">({result.customersSkipped} مكرر)</span>}</li>
            <li>فواتير بيع: <strong>+{result.invoices}</strong> {result.invoicesSkipped > 0 && <span className="text-muted-foreground">({result.invoicesSkipped} مكرر)</span>}</li>
            <li>مصاريف: <strong>+{result.expenses}</strong> {result.expensesSkipped > 0 && <span className="text-muted-foreground">({result.expensesSkipped} مكرر)</span>}</li>
            <li>موردين: <strong>+{result.suppliers}</strong> {result.suppliersSkipped > 0 && <span className="text-muted-foreground">({result.suppliersSkipped} مكرر)</span>}</li>
            <li>فواتير شراء: <strong>+{result.purchases}</strong> {result.purchasesSkipped > 0 && <span className="text-muted-foreground">({result.purchasesSkipped} مكرر)</span>}</li>
          </ul>
        </div>
      )}

      {/* مودال المعاينة التفصيلية */}
      {showPreviewModal && previewType && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-3xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-lg">
                  معاينة: {dataTypes.find(t => t.key === previewType)?.label}
                  <span className="text-xs font-normal text-muted-foreground mr-2">
                    (أول {previewSample.length} من {previewData[previewType]?.length || 0})
                  </span>
                </h3>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 rounded-lg hover:bg-accent">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-auto max-h-[60vh] rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-accent/50 sticky top-0">
                    <tr>
                      {previewSample[0] && Object.keys(previewSample[0]).slice(0, 6).map(k => (
                        <th key={k} className="p-2 text-right font-extrabold">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewSample.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.keys(previewSample[0]).slice(0, 6).map(k => (
                          <td key={k} className="p-2 truncate max-w-[180px]">
                            {typeof row[k] === "object" ? JSON.stringify(row[k]).slice(0, 40) : String(row[k] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
