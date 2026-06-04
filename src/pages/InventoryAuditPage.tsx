import { useMemo, useState } from "react";
import { ClipboardCheck, Search, Save, AlertTriangle, Check, RotateCcw, Filter } from "lucide-react";
import { getProducts, updateProduct, effectiveLowStockThreshold, type Product } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";

type FilterMode = "all" | "low" | "out" | "mismatch";

export default function InventoryAuditPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const products = useMemo(() => getProducts(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  // counts: productId -> actual count entered by user
  const [counts, setCounts] = useState<Record<string, number | "">>({});

  const setCount = (id: string, v: string) => {
    setCounts(c => ({ ...c, [id]: v === "" ? "" : Number(v) }));
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (q && !(p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))) return false;
      if (filter === "low") return p.quantity <= effectiveLowStockThreshold(p) && p.quantity > 0;
      if (filter === "out") return p.quantity <= 0;
      if (filter === "mismatch") {
        const c = counts[p.id];
        return typeof c === "number" && c !== p.quantity;
      }
      return true;
    });
  }, [products, search, filter, counts]);

  const lowCount = products.filter(p => p.quantity <= effectiveLowStockThreshold(p) && p.quantity > 0).length;
  const outCount = products.filter(p => p.quantity <= 0).length;

  const saveOne = (p: Product) => {
    const c = counts[p.id];
    if (typeof c !== "number" || isNaN(c) || c < 0) {
      toast({ title: "أدخل العدد الفعلي أولاً", variant: "destructive" });
      return;
    }
    updateProduct(p.id, { quantity: c });
    setCounts(prev => { const cp = { ...prev }; delete cp[p.id]; return cp; });
    refresh();
    toast({ title: "تم تحديث المخزون ✅", description: `${p.name}: ${p.quantity} → ${c}` });
  };

  const saveAll = () => {
    const entries = Object.entries(counts).filter(([, v]) => typeof v === "number");
    if (!entries.length) return toast({ title: "مفيش تعديلات للحفظ" });
    entries.forEach(([id, v]) => updateProduct(id, { quantity: v as number }));
    setCounts({});
    refresh();
    toast({ title: `تم حفظ ${entries.length} تعديل ✅` });
  };

  const fillSystem = () => {
    const next: Record<string, number> = {};
    visible.forEach(p => { next[p.id] = p.quantity; });
    setCounts(next);
  };

  const tabs: { id: FilterMode; label: string; color: string }[] = [
    { id: "all", label: `الكل (${products.length})`, color: "" },
    { id: "low", label: `منخفض (${lowCount})`, color: "text-warning" },
    { id: "out", label: `نافد (${outCount})`, color: "text-destructive" },
    { id: "mismatch", label: `فيه فرق`, color: "text-primary" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ClipboardCheck className="text-primary" size={22} /></div>
        <h1 className="page-header mb-0">جرد المخزون والنواقص</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="stat-card text-center"><p className="text-xs text-muted-foreground">إجمالي الأصناف</p><p className="text-2xl font-extrabold">{products.length}</p></div>
        <div className="stat-card text-center"><p className="text-xs text-muted-foreground">منخفض</p><p className="text-2xl font-extrabold text-warning">{lowCount}</p></div>
        <div className="stat-card text-center"><p className="text-xs text-muted-foreground">نافد</p><p className="text-2xl font-extrabold text-destructive">{outCount}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم/الكود/الماركة..." className="input-field w-full pr-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)} className={`whitespace-nowrap text-xs font-extrabold px-3 py-2 rounded-xl border ${filter === t.id ? "bg-primary text-primary-foreground border-primary" : `bg-accent border-transparent ${t.color}`}`}>
              <Filter size={12} className="inline ml-1" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={saveAll} className="btn-primary text-sm"><Save size={16} /> حفظ كل التعديلات</button>
        <button onClick={fillSystem} className="bg-accent hover:bg-accent/80 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1"><RotateCcw size={14} /> ملء بالعدد الحالي</button>
        <button onClick={() => setCounts({})} className="bg-secondary px-3 py-2 rounded-xl text-sm font-bold">مسح</button>
      </div>

      <div className="glass-table overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-right p-3 font-extrabold">الاسم</th>
              <th className="text-right p-3 font-extrabold">الكود</th>
              <th className="text-center p-3 font-extrabold">بالنظام</th>
              <th className="text-center p-3 font-extrabold">العدد الفعلي</th>
              <th className="text-center p-3 font-extrabold">الفرق</th>
              <th className="text-center p-3 font-extrabold">الحالة</th>
              <th className="text-center p-3 font-extrabold">حفظ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => {
              const c = counts[p.id];
              const numericC = typeof c === "number" ? c : null;
              const diff = numericC == null ? null : numericC - p.quantity;
              const isLow = p.quantity <= effectiveLowStockThreshold(p);
              const isOut = p.quantity <= 0;
              return (
                <tr key={p.id} className="border-b hover:bg-muted/20">
                  <td className="p-3 font-bold">{p.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.code || "—"}</td>
                  <td className="p-3 text-center font-extrabold">{p.quantity}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min={0}
                      className="input-field w-24 text-center"
                      value={c === "" || c == null ? "" : c}
                      onChange={e => setCount(p.id, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                  <td className={`p-3 text-center font-extrabold ${diff == null ? "" : diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff == null ? "—" : (diff > 0 ? `+${diff}` : diff)}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {isOut ? <span className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-extrabold">نافد</span>
                     : isLow ? <span className="px-2 py-1 rounded-lg bg-warning/15 text-warning font-extrabold inline-flex items-center gap-1"><AlertTriangle size={12} /> منخفض</span>
                     : <span className="text-success font-bold">متوفر</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => saveOne(p)} disabled={numericC == null || diff === 0} className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-40">
                      <Check size={12} /> حفظ
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
