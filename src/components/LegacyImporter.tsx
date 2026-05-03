// أداة لاستيراد بيانات من نسخة احتياطية قديمة مع اختبار، معاينة، وتعيين حقول قبل التنفيذ.
import { useMemo, useRef, useState } from "react";
import {
  Upload,
  ArrowDown,
  AlertCircle,
  Check,
  X,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Wand2,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getProducts, saveProducts, getCustomers, saveCustomers, getInvoices, saveInvoices,
  getExpenses, saveExpenses,
} from "@/lib/store";
import { getSuppliers, saveSuppliers, getPurchaseInvoices, savePurchaseInvoices } from "@/lib/suppliers";

type Mode = "merge" | "replace" | "skip";
type DataKey = "products" | "customers" | "invoices" | "expenses" | "suppliers" | "purchases";
type FieldMappings = Record<DataKey, Record<string, string>>;

interface ImportResult {
  products: number; productsSkipped: number;
  customers: number; customersSkipped: number;
  invoices: number; invoicesSkipped: number;
  expenses: number; expensesSkipped: number;
  suppliers: number; suppliersSkipped: number;
  purchases: number; purchasesSkipped: number;
}

interface DryRunRow {
  incoming: number;
  mapped: number;
  conflicts: number;
  willAdd: number;
  willReplace: number;
  willSkip: number;
  fieldsMapped: number;
  fieldsTotal: number;
  missingRequired: string[];
  conflictSamples: string[];
}

type TableConfig = {
  key: DataKey;
  label: string;
  icon: string;
  fields: string[];
  required: string[];
  aliases: Record<string, string[]>;
  getFn: () => any[];
  saveFn: (arr: any[]) => void;
  dedupe: (item: any, existing: any[]) => boolean;
};

const commonAliases: Record<string, string[]> = {
  id: ["id", "_id", "uuid", "key", "codeId"],
  name: ["name", "title", "productName", "customerName", "supplierName", "اسم", "الاسم", "اسم المنتج", "اسم العميل", "اسم المورد"],
  phone: ["phone", "mobile", "telephone", "tel", "رقم", "رقم الهاتف", "الهاتف", "موبايل"],
  balance: ["balance", "debt", "remaining", "رصيد", "مديونية", "باقي", "المتبقي"],
  createdAt: ["createdAt", "created_at", "date", "created", "time", "التاريخ", "تاريخ"],
};

const tableConfigs: TableConfig[] = [
  {
    key: "products",
    label: "المنتجات",
    icon: "📦",
    fields: ["id", "name", "code", "brand", "model", "costPrice", "sellPrice", "wholesalePrice", "halfWholesalePrice", "wholesaleMinQty", "halfWholesaleMinQty", "quantity", "lowStockThreshold", "preferredSupplierId", "createdAt"],
    required: ["name"],
    aliases: {
      ...commonAliases,
      code: ["code", "barcode", "sku", "كود", "باركود"],
      brand: ["brand", "make", "ماركة", "الماركة"],
      model: ["model", "موديل", "الموديل"],
      costPrice: ["costPrice", "cost", "purchasePrice", "buyPrice", "unitCost", "سعر الشراء", "تكلفة"],
      sellPrice: ["sellPrice", "salePrice", "price", "retailPrice", "سعر البيع", "السعر"],
      wholesalePrice: ["wholesalePrice", "جملة", "سعر الجملة"],
      halfWholesalePrice: ["halfWholesalePrice", "نص جملة", "سعر نص الجملة"],
      wholesaleMinQty: ["wholesaleMinQty", "حد الجملة"],
      halfWholesaleMinQty: ["halfWholesaleMinQty", "حد نص الجملة"],
      quantity: ["quantity", "qty", "stock", "count", "الكمية", "المخزون"],
      lowStockThreshold: ["lowStockThreshold", "minQty", "alertQty", "حد التنبيه"],
      preferredSupplierId: ["preferredSupplierId", "supplierId", "المورد"],
    },
    getFn: getProducts,
    saveFn: saveProducts as any,
    dedupe: (p, ex) => ex.some(e => e.id === p.id || (p.code && String(e.code || "").toLowerCase() === String(p.code).toLowerCase())),
  },
  {
    key: "customers",
    label: "العملاء",
    icon: "👥",
    fields: ["id", "name", "phone", "balance", "createdAt"],
    required: ["name"],
    aliases: commonAliases,
    getFn: getCustomers,
    saveFn: saveCustomers as any,
    dedupe: (c, ex) => ex.some(e => e.id === c.id || (c.phone && e.phone === c.phone)),
  },
  {
    key: "invoices",
    label: "فواتير البيع",
    icon: "🧾",
    fields: ["id", "invoiceNumber", "items", "subtotal", "invoiceDiscount", "total", "paid", "remaining", "customerId", "customerName", "status", "createdAt"],
    required: ["invoiceNumber"],
    aliases: {
      ...commonAliases,
      invoiceNumber: ["invoiceNumber", "number", "no", "serial", "رقم الفاتورة"],
      items: ["items", "lines", "products", "الأصناف", "المنتجات"],
      subtotal: ["subtotal", "subTotal", "قبل الخصم"],
      invoiceDiscount: ["invoiceDiscount", "discount", "خصم"],
      total: ["total", "amount", "grandTotal", "الإجمالي", "اجمالي"],
      paid: ["paid", "paidAmount", "المدفوع"],
      remaining: ["remaining", "rest", "باقي", "المتبقي"],
      customerId: ["customerId", "clientId", "كود العميل"],
      customerName: ["customerName", "clientName", "اسم العميل"],
      status: ["status", "الحالة"],
    },
    getFn: getInvoices,
    saveFn: saveInvoices as any,
    dedupe: (i, ex) => ex.some(e => e.id === i.id || e.invoiceNumber === i.invoiceNumber),
  },
  {
    key: "expenses",
    label: "المصاريف",
    icon: "💸",
    fields: ["id", "name", "amount", "type", "date", "createdAt"],
    required: ["name", "amount"],
    aliases: {
      ...commonAliases,
      amount: ["amount", "value", "cost", "المبلغ", "القيمة"],
      type: ["type", "category", "نوع", "تصنيف"],
      date: ["date", "expenseDate", "التاريخ"],
    },
    getFn: getExpenses,
    saveFn: saveExpenses as any,
    dedupe: (x, ex) => ex.some(e => e.id === x.id),
  },
  {
    key: "suppliers",
    label: "الموردين",
    icon: "🏭",
    fields: ["id", "name", "phone", "notes", "balance", "createdAt"],
    required: ["name"],
    aliases: { ...commonAliases, notes: ["notes", "note", "ملاحظات"] },
    getFn: getSuppliers,
    saveFn: saveSuppliers as any,
    dedupe: (s, ex) => ex.some(e => e.id === s.id || (s.phone && e.phone === s.phone)),
  },
  {
    key: "purchases",
    label: "فواتير الشراء",
    icon: "📥",
    fields: ["id", "invoiceNumber", "supplierId", "supplierName", "items", "total", "paid", "remaining", "notes", "createdAt"],
    required: ["invoiceNumber"],
    aliases: {
      ...commonAliases,
      invoiceNumber: ["invoiceNumber", "number", "no", "serial", "رقم الفاتورة"],
      supplierId: ["supplierId", "vendorId", "كود المورد"],
      supplierName: ["supplierName", "vendorName", "اسم المورد"],
      items: ["items", "lines", "products", "الأصناف", "المنتجات"],
      total: ["total", "amount", "grandTotal", "الإجمالي"],
      paid: ["paid", "paidAmount", "المدفوع"],
      remaining: ["remaining", "rest", "باقي", "المتبقي"],
      notes: ["notes", "note", "ملاحظات"],
    },
    getFn: getPurchaseInvoices,
    saveFn: savePurchaseInvoices as any,
    dedupe: (i, ex) => ex.some(e => e.id === i.id || e.invoiceNumber === i.invoiceNumber),
  },
];

const dataTypes = tableConfigs.map(({ key, label, icon }) => ({ key, label, icon }));
const pageSize = 10;

function normalizeKey(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/[\s_\-\u0640]/g, "");
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function getRows(data: any, key: DataKey): any[] {
  const source = key === "purchases" ? (data?.purchases || data?.purchaseInvoices) : data?.[key];
  return Array.isArray(source) ? source : [];
}

function getSourceFields(rows: any[]): string[] {
  const fields = new Set<string>();
  rows.slice(0, 100).forEach(row => {
    if (row && typeof row === "object") Object.keys(row).forEach(k => fields.add(k));
  });
  return Array.from(fields);
}

function guessMapping(config: TableConfig, sourceFields: string[]): Record<string, string> {
  const normalizedSource = sourceFields.map(field => ({ field, normalized: normalizeKey(field) }));
  return config.fields.reduce<Record<string, string>>((acc, target) => {
    const aliases = [target, ...(config.aliases[target] || [])].map(normalizeKey);
    const exact = normalizedSource.find(src => aliases.includes(src.normalized));
    const partial = normalizedSource.find(src => aliases.some(alias => src.normalized.includes(alias) || alias.includes(src.normalized)));
    acc[target] = exact?.field || partial?.field || "";
    return acc;
  }, {});
}

function buildAutoMappings(data: any): FieldMappings {
  return tableConfigs.reduce((acc, config) => {
    acc[config.key] = guessMapping(config, getSourceFields(getRows(data, config.key)));
    return acc;
  }, {} as FieldMappings);
}

function toNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRow(key: DataKey, row: any): any {
  const now = new Date().toISOString();
  const out = { ...row };
  out.id = out.id || makeId();
  out.createdAt = out.createdAt || out.date || now;

  if (key === "products") {
    out.name = String(out.name || "منتج بدون اسم");
    out.costPrice = toNumber(out.costPrice);
    out.sellPrice = toNumber(out.sellPrice || out.price || out.costPrice);
    out.quantity = toNumber(out.quantity);
    out.lowStockThreshold = toNumber(out.lowStockThreshold, 5);
  }
  if (key === "customers" || key === "suppliers") {
    out.name = String(out.name || "بدون اسم");
    out.balance = toNumber(out.balance);
  }
  if (key === "invoices" || key === "purchases") {
    out.invoiceNumber = String(out.invoiceNumber || out.number || makeId());
    out.items = Array.isArray(out.items) ? out.items : [];
    out.total = toNumber(out.total);
    out.paid = toNumber(out.paid);
    out.remaining = toNumber(out.remaining, Math.max(0, out.total - out.paid));
  }
  if (key === "expenses") {
    out.name = String(out.name || out.type || "مصروف");
    out.amount = toNumber(out.amount);
    out.type = out.type || "عام";
    out.date = out.date || out.createdAt || now;
  }
  return out;
}

function mapRow(key: DataKey, sourceRow: any, mapping: Record<string, string>): any {
  const mapped: any = {};
  Object.entries(mapping).forEach(([target, source]) => {
    if (source && Object.prototype.hasOwnProperty.call(sourceRow, source)) mapped[target] = sourceRow[source];
  });
  return normalizeRow(key, { ...sourceRow, ...mapped });
}

function mappedRows(data: any, key: DataKey, mapping: Record<string, string>): any[] {
  return getRows(data, key).map(row => mapRow(key, row, mapping));
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 90);
  return String(value);
}

function conflictLabel(row: any): string {
  return row.name || row.invoiceNumber || row.phone || row.code || row.id || "سجل بدون عنوان";
}

export default function LegacyImporter() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [dryRun, setDryRun] = useState<Record<DataKey, DryRunRow> | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState<DataKey | null>(null);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>(() => buildAutoMappings({}));
  const [perTypeMode, setPerTypeMode] = useState<Record<DataKey, Mode>>({
    products: "merge", customers: "merge", invoices: "merge",
    expenses: "merge", suppliers: "merge", purchases: "merge",
  });

  const activeConfig = previewType ? tableConfigs.find(t => t.key === previewType) : null;
  const activeRows = useMemo(() => {
    if (!previewData || !previewType) return [];
    return mappedRows(previewData, previewType, fieldMappings[previewType] || {});
  }, [previewData, previewType, fieldMappings]);
  const activeSourceFields = useMemo(() => {
    if (!previewData || !previewType) return [];
    return getSourceFields(getRows(previewData, previewType));
  }, [previewData, previewType]);
  const filteredPreviewRows = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter(row => JSON.stringify(row).toLowerCase().includes(q));
  }, [activeRows, previewSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredPreviewRows.length / pageSize));
  const safePreviewPage = Math.min(previewPage, pageCount);
  const pagedRows = filteredPreviewRows.slice((safePreviewPage - 1) * pageSize, safePreviewPage * pageSize);
  const previewColumns = activeConfig?.fields.filter(field => activeRows.some(row => row[field] !== undefined && row[field] !== "")) || [];

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.purchaseInvoices && !data.purchases) data.purchases = data.purchaseInvoices;
      if (!dataTypes.some(t => getRows(data, t.key).length > 0)) {
        toast({ title: "ملف غير صالح", description: "مفيش بيانات يمكن استيرادها", variant: "destructive" });
        return;
      }
      setPreviewData(data);
      setFieldMappings(buildAutoMappings(data));
      setDryRun(null);
      setResult(null);
      setPreviewSearch("");
      setPreviewPage(1);
      const next: Record<DataKey, Mode> = { ...perTypeMode };
      dataTypes.forEach(t => { next[t.key] = getRows(data, t.key).length ? (next[t.key] === "skip" ? "merge" : next[t.key]) : "skip"; });
      setPerTypeMode(next);
      toast({ title: "تمت قراءة الملف ✅", description: "راجع الاختبار وتعيين الحقول قبل التنفيذ" });
    } catch (err: any) {
      toast({ title: "ملف تالف", description: err?.message || "تعذّر قراءة JSON", variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runDryRun = () => {
    if (!previewData) return;
    const summary = tableConfigs.reduce((acc, config) => {
      const incoming = getRows(previewData, config.key);
      const rows = mappedRows(previewData, config.key, fieldMappings[config.key] || {});
      const existing = config.getFn();
      const conflictsList = rows.filter(row => config.dedupe(row, existing));
      const mode = perTypeMode[config.key];
      const missingRequired = config.required.filter(field => !(fieldMappings[config.key] || {})[field]);
      const fieldsMapped = Object.values(fieldMappings[config.key] || {}).filter(Boolean).length;
      acc[config.key] = {
        incoming: incoming.length,
        mapped: rows.length,
        conflicts: conflictsList.length,
        willAdd: mode === "merge" ? Math.max(0, rows.length - conflictsList.length) : 0,
        willReplace: mode === "replace" ? rows.length : 0,
        willSkip: mode === "skip" ? rows.length : conflictsList.length,
        fieldsMapped,
        fieldsTotal: config.fields.length,
        missingRequired,
        conflictSamples: conflictsList.slice(0, 4).map(conflictLabel),
      };
      return acc;
    }, {} as Record<DataKey, DryRunRow>);
    setDryRun(summary);
    toast({ title: "تم اختبار الاستيراد ✅", description: "اتراجع عدد السجلات والتعارضات لكل جدول بدون حفظ أي بيانات" });
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

      const resultKeys: Record<DataKey, [keyof ImportResult, keyof ImportResult]> = {
        products: ["products", "productsSkipped"],
        customers: ["customers", "customersSkipped"],
        invoices: ["invoices", "invoicesSkipped"],
        expenses: ["expenses", "expensesSkipped"],
        suppliers: ["suppliers", "suppliersSkipped"],
        purchases: ["purchases", "purchasesSkipped"],
      };

      tableConfigs.forEach(config => {
        const mode = perTypeMode[config.key];
        if (mode === "skip") return;
        const incoming = mappedRows(previewData, config.key, fieldMappings[config.key] || {});
        if (!incoming.length) return;
        const [countKey, skipKey] = resultKeys[config.key];
        if (mode === "replace") {
          config.saveFn(incoming);
          (r as any)[countKey] = incoming.length;
          return;
        }
        const existing = config.getFn();
        const merged = [...existing];
        incoming.forEach(item => {
          if (config.dedupe(item, existing)) (r as any)[skipKey]++;
          else { merged.push(item); (r as any)[countKey]++; }
        });
        config.saveFn(merged);
      });

      setResult(r);
      setPreviewData(null);
      setDryRun(null);
      toast({ title: "تم الاستيراد ✅", description: `أُضيف ${r.products + r.customers + r.invoices + r.expenses + r.suppliers + r.purchases} عنصر` });
    } catch (err: any) {
      toast({ title: "فشل الاستيراد", description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const setMode = (key: DataKey, mode: Mode) => {
    setPerTypeMode(prev => ({ ...prev, [key]: mode }));
    setDryRun(null);
  };
  const updateMapping = (key: DataKey, target: string, source: string) => {
    setFieldMappings(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [target]: source } }));
    setDryRun(null);
  };
  const resetAutoMapping = (key: DataKey) => {
    if (!previewData) return;
    const config = tableConfigs.find(t => t.key === key);
    if (!config) return;
    setFieldMappings(prev => ({ ...prev, [key]: guessMapping(config, getSourceFields(getRows(previewData, key))) }));
    setDryRun(null);
  };
  const openPreview = (key: DataKey) => {
    setPreviewType(key);
    setPreviewSearch("");
    setPreviewPage(1);
    setShowPreviewModal(true);
  };

  const hasReplace = dataTypes.some(t => perTypeMode[t.key] === "replace" && getRows(previewData, t.key).length > 0);
  const hasAny = dataTypes.some(t => perTypeMode[t.key] !== "skip" && getRows(previewData, t.key).length > 0);

  return (
    <div className="stat-card animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ArrowDown className="text-primary" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">نقل بيانات من إصدار قديم</h3>
          <p className="text-xs text-muted-foreground">اختبار قبل التنفيذ + معاينة ببحث وصفحات + تعيين حقول تلقائي قابل للتعديل</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs font-extrabold">راجع كل جدول قبل التنفيذ:</p>
            <button onClick={runDryRun} className="btn-secondary py-2 text-xs">
              <ClipboardCheck size={15} /> وضع اختبار بدون حفظ
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dataTypes.map((t) => {
              const count = getRows(previewData, t.key).length;
              const mode = perTypeMode[t.key];
              const test = dryRun?.[t.key];
              return (
                <div key={t.key} className={`rounded-xl border p-3 ${count ? "bg-card border-border" : "bg-muted/30 border-muted opacity-60"}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-extrabold text-sm truncate">{t.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent">{count}</span>
                    </div>
                    {count > 0 && (
                      <button onClick={() => openPreview(t.key)} className="flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                        <Eye size={14} /> معاينة/حقول
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
                  {test && (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      <span>مطابق: <strong className="text-foreground">{test.mapped}/{test.incoming}</strong></span>
                      <span>تعارضات: <strong className="text-foreground">{test.conflicts}</strong></span>
                      <span>سيضاف: <strong className="text-foreground">{test.willAdd}</strong></span>
                      <span>سيُستبدل: <strong className="text-foreground">{test.willReplace}</strong></span>
                      <span className="col-span-2">الحقول: <strong className="text-foreground">{test.fieldsMapped}/{test.fieldsTotal}</strong></span>
                      {test.conflictSamples.length > 0 && (
                        <span className="col-span-2 truncate">أمثلة تعارض: {test.conflictSamples.join("، ")}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasReplace && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-destructive font-bold">تنبيه: جداول الاستبدال هتمسح البيانات الحالية فيها وتحط بدلها بيانات الملف.</p>
            </div>
          )}

          {previewData.exportDate && (
            <p className="text-[11px] text-muted-foreground">تاريخ الإصدار: {new Date(previewData.exportDate).toLocaleString("ar-EG")}</p>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setPreviewData(null); setDryRun(null); }} className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-bold">
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

      {showPreviewModal && previewType && activeConfig && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card modal-xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-lg">معاينة وتعيين حقول: {activeConfig.label}</h3>
                  <p className="text-xs text-muted-foreground">{filteredPreviewRows.length} سجل مطابق للبحث من أصل {activeRows.length}</p>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 rounded-lg hover:bg-accent">
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-3 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-extrabold flex items-center gap-2"><Wand2 size={16} className="text-primary" /> تعيين الحقول</p>
                  <button onClick={() => resetAutoMapping(previewType)} className="text-xs font-bold text-primary hover:underline">إعادة تعيين تلقائي</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {activeConfig.fields.map(field => (
                    <label key={field} className="text-xs font-bold space-y-1">
                      <span>{field}{activeConfig.required.includes(field) ? " *" : ""}</span>
                      <select
                        value={(fieldMappings[previewType] || {})[field] || ""}
                        onChange={(e) => updateMapping(previewType, field, e.target.value)}
                        className="input-field w-full py-2 text-xs"
                      >
                        <option value="">لا يستورد</option>
                        {activeSourceFields.map(source => <option key={source} value={source}>{source}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    value={previewSearch}
                    onChange={(e) => { setPreviewSearch(e.target.value); setPreviewPage(1); }}
                    placeholder="بحث داخل السجلات..."
                    className="input-field w-full pr-9 py-2"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={safePreviewPage <= 1} className="p-2 rounded-lg bg-accent disabled:opacity-40"><ChevronRight size={16} /></button>
                  <span>صفحة {safePreviewPage} / {pageCount}</span>
                  <button onClick={() => setPreviewPage(p => Math.min(pageCount, p + 1))} disabled={safePreviewPage >= pageCount} className="p-2 rounded-lg bg-accent disabled:opacity-40"><ChevronLeft size={16} /></button>
                </div>
              </div>

              <div className="overflow-auto max-h-[42vh] rounded-xl border border-border">
                <table className="w-full text-xs min-w-[760px]">
                  <thead className="bg-accent/70 sticky top-0 z-10">
                    <tr>
                      {(previewColumns.length ? previewColumns : activeConfig.fields.slice(0, 6)).map(k => (
                        <th key={k} className="p-2 text-right font-extrabold whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, i) => (
                      <tr key={`${safePreviewPage}-${i}`} className="border-t border-border hover:bg-muted/30">
                        {(previewColumns.length ? previewColumns : activeConfig.fields.slice(0, 6)).map(k => (
                          <td key={k} className="p-2 max-w-[180px] truncate">{displayValue(row[k])}</td>
                        ))}
                      </tr>
                    ))}
                    {pagedRows.length === 0 && (
                      <tr><td colSpan={Math.max(1, previewColumns.length)} className="p-6 text-center text-muted-foreground">لا توجد سجلات مطابقة</td></tr>
                    )}
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
