import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, X, Check, Package, Lock } from "lucide-react";
import { getProducts, addProduct, updateProduct, deleteProduct, effectiveLowStockThreshold, type Product } from "@/lib/store";
import { getSuppliers } from "@/lib/suppliers";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import { canViewCostPrice, isCashier } from "@/lib/auth";

const emptyForm = {
  name: "", code: "", brand: "", model: "",
  costPrice: 0, sellPrice: 0,
  wholesalePrice: 0, halfWholesalePrice: 0,
  wholesaleMinQty: 0, halfWholesaleMinQty: 0,
  quantity: 0, lowStockThreshold: 1,
  preferredSupplierId: "",
};

export default function ProductsPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const products = useMemo(() => getProducts(), [refreshKey]);
  const suppliers = useMemo(() => getSuppliers(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [originalCost, setOriginalCost] = useState<number>(0); // عشان نقارن
  const [costReason, setCostReason] = useState<string>("");
  const showCost = canViewCostPrice();
  const cashierMode = isCashier();

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s) || p.brand?.toLowerCase().includes(s));
  }, [search, products]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setOriginalCost(0); setCostReason(""); setShowForm(true); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, code: p.code || "", brand: p.brand || "", model: p.model || "",
      costPrice: p.costPrice, sellPrice: p.sellPrice,
      wholesalePrice: p.wholesalePrice || 0,
      halfWholesalePrice: p.halfWholesalePrice || 0,
      wholesaleMinQty: p.wholesaleMinQty || 0,
      halfWholesaleMinQty: p.halfWholesaleMinQty || 0,
      quantity: p.quantity, lowStockThreshold: p.lowStockThreshold,
      preferredSupplierId: p.preferredSupplierId || "",
    });
    setEditId(p.id);
    setOriginalCost(p.costPrice);
    setCostReason("");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "خطأ", description: "اسم المنتج مطلوب", variant: "destructive" }); return; }
    const costChanged = editId && Number(form.costPrice) !== originalCost;
    if (costChanged && !costReason.trim()) {
      toast({ title: "اكتب سبب تغيير سعر الشراء", description: "مطلوب تكتب سبب علشان يتسجل في السجل", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      wholesalePrice: form.wholesalePrice || undefined,
      halfWholesalePrice: form.halfWholesalePrice || undefined,
      wholesaleMinQty: form.wholesaleMinQty || undefined,
      halfWholesaleMinQty: form.halfWholesaleMinQty || undefined,
      preferredSupplierId: form.preferredSupplierId || undefined,
    };
    if (editId) { updateProduct(editId, payload, { reason: costReason.trim() || undefined }); toast({ title: "تم التحديث ✅" }); }
    else { addProduct(payload); toast({ title: "تمت الإضافة ✅" }); }
    refresh(); setShowForm(false);
  };

  const handleDelete = (id: string) => { if (confirm("هل تريد حذف هذا المنتج؟")) { deleteProduct(id); refresh(); toast({ title: "تم الحذف" }); } };
  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  if (cashierMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock size={56} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-extrabold mb-2">مفيش صلاحية</h2>
        <p className="text-sm text-muted-foreground">صفحة المنتجات للمدير فقط</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="text-primary" size={22} /></div>
          <h1 className="page-header mb-0">المنتجات ({products.length})</h1>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={18} /> إضافة منتج</button>
      </div>

      <div className="relative mb-4 animate-fade-in-up">
        <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
        <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-full pr-10" />
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-border/50">
                <h3 className="font-extrabold text-xl sm:text-2xl">{editId ? "✏️ تعديل المنتج" : "➕ إضافة منتج جديد"}</h3>
                <button onClick={() => setShowForm(false)} className="p-2.5 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all hover:rotate-90 duration-300"><X size={22} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">الاسم *</label><input className="input-field w-full" value={form.name} onChange={(e) => setField("name", e.target.value)} autoFocus /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">الكود / الباركود</label><input className="input-field w-full" value={form.code} onChange={(e) => setField("code", e.target.value)} /></div>
                  <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">الماركة</label><input className="input-field w-full" value={form.brand} onChange={(e) => setField("brand", e.target.value)} /></div>
                </div>
                <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">الموديل</label><input className="input-field w-full" value={form.model} onChange={(e) => setField("model", e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1.5 block">سعر الشراء</label>
                    <input type="number" className="input-field w-full" value={form.costPrice || ""} onChange={(e) => setField("costPrice", Number(e.target.value))} />
                  </div>
                  <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">سعر القطاعي *</label><input type="number" className="input-field w-full" value={form.sellPrice || ""} onChange={(e) => setField("sellPrice", Number(e.target.value))} /></div>
                </div>

                {editId && Number(form.costPrice) !== originalCost && originalCost > 0 && (
                  <div className={`rounded-2xl p-4 border-2 ${Number(form.costPrice) > originalCost ? 'bg-destructive/10 border-destructive/30' : 'bg-success/10 border-success/30'} animate-fade-in-up`}>
                    <p className={`font-extrabold text-sm mb-2 ${Number(form.costPrice) > originalCost ? 'text-destructive' : 'text-success'}`}>
                      {Number(form.costPrice) > originalCost ? '⚠️ السعر ارتفع' : '✅ السعر انخفض'} من {originalCost.toLocaleString()} إلى {Number(form.costPrice).toLocaleString()} ج.م
                      {' '}({((Number(form.costPrice) - originalCost) / originalCost * 100).toFixed(1)}٪)
                    </p>
                    <label className="text-xs font-bold text-foreground mb-1 block">السبب (مطلوب) *</label>
                    <input
                      className="input-field w-full"
                      placeholder="مثلاً: زيادة من المورد / عرض خصم / تصحيح خطأ"
                      value={costReason}
                      onChange={(e) => setCostReason(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">السبب هيتسجل في سجل تغييرات الأسعار.</p>
                  </div>
                )}

                <div className="bg-accent/40 rounded-2xl p-4 space-y-3 border border-accent">
                  <p className="text-sm font-extrabold text-accent-foreground">💰 أسعار متعددة (اختياري)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold mb-1 block">سعر نص جملة</label><input type="number" className="input-field w-full" value={form.halfWholesalePrice || ""} onChange={(e) => setField("halfWholesalePrice", Number(e.target.value))} /></div>
                    <div><label className="text-xs font-bold mb-1 block">يبدأ من كمية</label><input type="number" className="input-field w-full" value={form.halfWholesaleMinQty || ""} onChange={(e) => setField("halfWholesaleMinQty", Number(e.target.value))} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold mb-1 block">سعر الجملة</label><input type="number" className="input-field w-full" value={form.wholesalePrice || ""} onChange={(e) => setField("wholesalePrice", Number(e.target.value))} /></div>
                    <div><label className="text-xs font-bold mb-1 block">يبدأ من كمية</label><input type="number" className="input-field w-full" value={form.wholesaleMinQty || ""} onChange={(e) => setField("wholesaleMinQty", Number(e.target.value))} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">الكمية</label><input type="number" className="input-field w-full" value={form.quantity || ""} onChange={(e) => setField("quantity", Number(e.target.value))} /></div>
                  <div><label className="text-sm font-bold text-muted-foreground mb-1.5 block">حد التنبيه</label><input type="number" className="input-field w-full" value={form.lowStockThreshold || ""} onChange={(e) => setField("lowStockThreshold", Number(e.target.value))} /></div>
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-1.5 block">المورد المفضل</label>
                  <select className="input-field w-full" value={form.preferredSupplierId} onChange={(e) => setField("preferredSupplierId", e.target.value)}>
                    <option value="">— بدون —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-border/50">
                <button onClick={handleSave} className="btn-primary py-3.5 text-base"><Check size={20} /> {editId ? "تحديث" : "إضافة"}</button>
                <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground py-3.5 rounded-xl font-extrabold hover:bg-muted transition-all text-base">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile + Tablet: cards (more readable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3 animate-fade-in-up">
        {filtered.map((p) => (
          <div key={p.id} className="stat-card flex flex-col h-full">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-extrabold truncate">{p.name}</p>
                {p.code && <p className="text-xs text-muted-foreground truncate">كود: {p.code}</p>}
                {p.brand && <p className="text-xs text-muted-foreground truncate">{p.brand}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-auto pt-3 border-t border-border/50">
              <div><p className="text-xs text-muted-foreground">شراء</p><p className="font-extrabold text-sm">{p.costPrice.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">بيع</p><p className="font-extrabold text-sm text-primary">{p.sellPrice.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">المخزون</p><p className={`font-extrabold text-sm ${p.quantity <= p.lowStockThreshold ? "text-destructive" : ""}`}>{p.quantity}</p></div>
            </div>
            {(p.wholesalePrice || p.halfWholesalePrice) && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {p.halfWholesalePrice ? `نص: ${p.halfWholesalePrice} (≥${p.halfWholesaleMinQty})` : ''}
                {p.halfWholesalePrice && p.wholesalePrice ? ' • ' : ''}
                {p.wholesalePrice ? `جملة: ${p.wholesalePrice} (≥${p.wholesaleMinQty})` : ''}
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا توجد منتجات</p>}
      </div>

      <div className="hidden lg:block glass-table animate-fade-in-up overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-right p-3 font-extrabold whitespace-nowrap">الاسم</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">الكود</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">الماركة</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">شراء</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">قطاعي</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">نص جملة</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">جملة</th>
              <th className="text-right p-3 font-extrabold whitespace-nowrap">الكمية</th>
              <th className="text-center p-3 font-extrabold whitespace-nowrap">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                <td className="p-3 font-bold whitespace-nowrap">{p.name}</td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">{p.code || "-"}</td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">{p.brand || "-"}</td>
                <td className="p-3 whitespace-nowrap">{p.costPrice.toLocaleString()}</td>
                <td className="p-3 font-extrabold text-primary whitespace-nowrap">{p.sellPrice.toLocaleString()}</td>
                <td className="p-3 text-xs whitespace-nowrap">{p.halfWholesalePrice ? `${p.halfWholesalePrice} (≥${p.halfWholesaleMinQty})` : "-"}</td>
                <td className="p-3 text-xs whitespace-nowrap">{p.wholesalePrice ? `${p.wholesalePrice} (≥${p.wholesaleMinQty})` : "-"}</td>
                <td className={`p-3 font-extrabold whitespace-nowrap ${p.quantity <= p.lowStockThreshold ? "text-destructive" : ""}`}>{p.quantity}</td>
                <td className="p-3 text-center whitespace-nowrap">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-xl hover:bg-muted transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
