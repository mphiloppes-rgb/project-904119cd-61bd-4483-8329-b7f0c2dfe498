import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, X, Check, Package } from "lucide-react";
import { getProducts, addProduct, updateProduct, deleteProduct, type Product } from "@/lib/store";
import { getSuppliers } from "@/lib/suppliers";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";

const emptyForm = {
  name: "", code: "", brand: "", model: "",
  costPrice: 0, sellPrice: 0,
  wholesalePrice: 0, halfWholesalePrice: 0,
  wholesaleMinQty: 0, halfWholesaleMinQty: 0,
  quantity: 0, lowStockThreshold: 5,
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

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s) || p.brand?.toLowerCase().includes(s));
  }, [search, products]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
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
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "خطأ", description: "اسم المنتج مطلوب", variant: "destructive" }); return; }
    const payload = {
      ...form,
      wholesalePrice: form.wholesalePrice || undefined,
      halfWholesalePrice: form.halfWholesalePrice || undefined,
      wholesaleMinQty: form.wholesaleMinQty || undefined,
      halfWholesaleMinQty: form.halfWholesaleMinQty || undefined,
      preferredSupplierId: form.preferredSupplierId || undefined,
    };
    if (editId) { updateProduct(editId, payload); toast({ title: "تم التحديث ✅" }); }
    else { addProduct(payload); toast({ title: "تمت الإضافة ✅" }); }
    refresh(); setShowForm(false);
  };

  const handleDelete = (id: string) => { if (confirm("هل تريد حذف هذا المنتج؟")) { deleteProduct(id); refresh(); toast({ title: "تم الحذف" }); } };
  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in-up p-4">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg">{editId ? "تعديل المنتج" : "إضافة منتج جديد"}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-bold text-muted-foreground">الاسم *</label><input className="input-field w-full mt-1" value={form.name} onChange={(e) => setField("name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-bold text-muted-foreground">الكود / الباركود</label><input className="input-field w-full mt-1" value={form.code} onChange={(e) => setField("code", e.target.value)} /></div>
                <div><label className="text-sm font-bold text-muted-foreground">الماركة</label><input className="input-field w-full mt-1" value={form.brand} onChange={(e) => setField("brand", e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-bold text-muted-foreground">الموديل</label><input className="input-field w-full mt-1" value={form.model} onChange={(e) => setField("model", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-bold text-muted-foreground">سعر الشراء</label><input type="number" className="input-field w-full mt-1" value={form.costPrice || ""} onChange={(e) => setField("costPrice", Number(e.target.value))} /></div>
                <div><label className="text-sm font-bold text-muted-foreground">سعر القطاعي *</label><input type="number" className="input-field w-full mt-1" value={form.sellPrice || ""} onChange={(e) => setField("sellPrice", Number(e.target.value))} /></div>
              </div>

              <div className="bg-accent/30 rounded-xl p-3 space-y-3">
                <p className="text-xs font-extrabold text-muted-foreground">أسعار متعددة (اختياري)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold">سعر نص جملة</label><input type="number" className="input-field w-full mt-1" value={form.halfWholesalePrice || ""} onChange={(e) => setField("halfWholesalePrice", Number(e.target.value))} /></div>
                  <div><label className="text-xs font-bold">يبدأ من كمية</label><input type="number" className="input-field w-full mt-1" value={form.halfWholesaleMinQty || ""} onChange={(e) => setField("halfWholesaleMinQty", Number(e.target.value))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold">سعر الجملة</label><input type="number" className="input-field w-full mt-1" value={form.wholesalePrice || ""} onChange={(e) => setField("wholesalePrice", Number(e.target.value))} /></div>
                  <div><label className="text-xs font-bold">يبدأ من كمية</label><input type="number" className="input-field w-full mt-1" value={form.wholesaleMinQty || ""} onChange={(e) => setField("wholesaleMinQty", Number(e.target.value))} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-bold text-muted-foreground">الكمية</label><input type="number" className="input-field w-full mt-1" value={form.quantity || ""} onChange={(e) => setField("quantity", Number(e.target.value))} /></div>
                <div><label className="text-sm font-bold text-muted-foreground">حد التنبيه</label><input type="number" className="input-field w-full mt-1" value={form.lowStockThreshold || ""} onChange={(e) => setField("lowStockThreshold", Number(e.target.value))} /></div>
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground">المورد المفضل</label>
                <select className="input-field w-full mt-1" value={form.preferredSupplierId} onChange={(e) => setField("preferredSupplierId", e.target.value)}>
                  <option value="">— بدون —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSave} className="w-full mt-4 btn-primary py-3"><Check size={18} /> {editId ? "تحديث" : "إضافة"}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-3 animate-fade-in-up">
        {filtered.map((p) => (
          <div key={p.id} className="stat-card">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-extrabold truncate">{p.name}</p>
                {p.code && <p className="text-xs text-muted-foreground">كود: {p.code}</p>}
                {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-border/50">
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

      <div className="hidden md:block glass-table animate-fade-in-up overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-right p-3 font-extrabold">الاسم</th>
              <th className="text-right p-3 font-extrabold">الكود</th>
              <th className="text-right p-3 font-extrabold">الماركة</th>
              <th className="text-right p-3 font-extrabold">شراء</th>
              <th className="text-right p-3 font-extrabold">قطاعي</th>
              <th className="text-right p-3 font-extrabold">نص جملة</th>
              <th className="text-right p-3 font-extrabold">جملة</th>
              <th className="text-right p-3 font-extrabold">الكمية</th>
              <th className="text-center p-3 font-extrabold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                <td className="p-3 font-bold">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.code || "-"}</td>
                <td className="p-3 text-muted-foreground">{p.brand || "-"}</td>
                <td className="p-3">{p.costPrice.toLocaleString()}</td>
                <td className="p-3 font-extrabold text-primary">{p.sellPrice.toLocaleString()}</td>
                <td className="p-3 text-xs">{p.halfWholesalePrice ? `${p.halfWholesalePrice} (≥${p.halfWholesaleMinQty})` : "-"}</td>
                <td className="p-3 text-xs">{p.wholesalePrice ? `${p.wholesalePrice} (≥${p.wholesaleMinQty})` : "-"}</td>
                <td className={`p-3 font-extrabold ${p.quantity <= p.lowStockThreshold ? "text-destructive" : ""}`}>{p.quantity}</td>
                <td className="p-3 text-center">
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
