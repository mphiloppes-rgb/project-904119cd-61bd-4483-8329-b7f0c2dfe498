import { useState, useMemo } from "react";
import { PackagePlus, Plus, Trash2, Search, Eye, Banknote, X, Sparkles } from "lucide-react";
import {
  getPurchaseInvoices,
  addPurchaseInvoice,
  paySupplierForInvoice,
  deletePurchaseInvoice,
  getSuppliers,
  type PurchaseInvoiceItem,
  type PurchaseInvoice,
} from "@/lib/suppliers";
import { getProducts, type Product } from "@/lib/store";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import QuickAddProduct from "@/components/QuickAddProduct";

export default function PurchasesPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const invoices = useMemo(
    () => getPurchaseInvoices().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [refreshKey]
  );
  const suppliers = useMemo(() => getSuppliers(), [refreshKey]);
  const products = useMemo(() => getProducts(), [refreshKey]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([]);
  const [paid, setPaid] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [priceReason, setPriceReason] = useState("");

  const [viewing, setViewing] = useState<PurchaseInvoice | null>(null);
  const [payOpen, setPayOpen] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // مقارنة بين سعر الفاتورة الجديد وسعر الشراء الحالي للمنتج
  const priceDiffs = useMemo(() => {
    return items.map((it) => {
      const current = products.find((p) => p.id === it.productId);
      const oldCost = current?.costPrice ?? 0;
      const changed = oldCost > 0 && oldCost !== it.unitCost;
      const direction: 'up' | 'down' | 'same' = it.unitCost > oldCost ? 'up' : it.unitCost < oldCost ? 'down' : 'same';
      const percent = oldCost > 0 ? ((it.unitCost - oldCost) / oldCost) * 100 : 0;
      return { productId: it.productId, productName: it.productName, oldCost, newCost: it.unitCost, changed, direction, percent };
    });
  }, [items, products]);

  const hasPriceChanges = priceDiffs.some((d) => d.changed);

  const handleQuickAddCreated = (p: Product) => {
    refresh();
    // add to invoice immediately
    setItems((prev) => {
      if (prev.find((i) => i.productId === p.id)) return prev;
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitCost: p.costPrice, total: p.costPrice }];
    });
    setProductSearch("");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const s = search.toLowerCase();
    return invoices.filter(
      (i) => i.invoiceNumber.toLowerCase().includes(s) || i.supplierName.toLowerCase().includes(s)
    );
  }, [invoices, search]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const s = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s));
  }, [products, productSearch]);

  const total = items.reduce((s, i) => s + i.total, 0);
  const remaining = Math.max(0, total - paid);

  const addItem = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      setItems(items.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitCost } : i));
    } else {
      setItems([...items, { productId: p.id, productName: p.name, quantity: 1, unitCost: p.costPrice, total: p.costPrice }]);
    }
    setProductSearch("");
  };

  const updateItem = (productId: string, field: "quantity" | "unitCost", value: number) => {
    setItems(items.map((i) => {
      if (i.productId !== productId) return i;
      const next = { ...i, [field]: value };
      next.total = next.quantity * next.unitCost;
      return next;
    }));
  };

  const removeItem = (productId: string) => setItems(items.filter((i) => i.productId !== productId));

  const submit = () => {
    if (!supplierId) {
      toast({ title: "خطأ", description: "اختر المورد", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "خطأ", description: "أضف منتجات للفاتورة", variant: "destructive" });
      return;
    }
    if (hasPriceChanges && !priceReason.trim()) {
      toast({
        title: "اكتب سبب تغيير الأسعار",
        description: "في أصناف اتغير سعرها — لازم تكتب السبب علشان يتسجل في السجل",
        variant: "destructive",
      });
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const inv = addPurchaseInvoice({
      supplierId,
      supplierName: supplier.name,
      items,
      total,
      paid,
      remaining,
      notes,
    }, { priceChangeReason: priceReason.trim() || undefined });

    toast({ title: "تم ✅", description: `تم تسجيل فاتورة شراء #${inv.invoiceNumber}` });
    setShowForm(false);
    setSupplierId("");
    setNotes("");
    setItems([]);
    setPaid(0);
    setPriceReason("");
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل تريد حذف هذه الفاتورة؟ سيتم خصم الكميات من المخزون")) return;
    deletePurchaseInvoice(id);
    toast({ title: "تم الحذف" });
    refresh();
  };

  const handlePay = () => {
    if (!payOpen || payAmount <= 0) return;
    paySupplierForInvoice(payOpen.id, payAmount);
    toast({ title: "تم الدفع ✅" });
    setPayOpen(null);
    setPayAmount(0);
    refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <PackagePlus className="text-primary" size={22} />
        </div>
        <h1 className="page-header mb-0">فواتير الشراء ({invoices.length})</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو المورد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pr-10"
          />
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-5 py-2.5 whitespace-nowrap">
          <Plus size={18} /> فاتورة شراء جديدة
        </button>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
        {filtered.map((inv) => (
          <div key={inv.id} className="stat-card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-extrabold">#{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <p className="font-extrabold text-primary">{inv.total.toLocaleString()} ج.م</p>
            </div>
            <p className="text-sm font-bold mb-1">المورد: {inv.supplierName}</p>
            <p className="text-xs text-muted-foreground mb-3">
              مدفوع: {inv.paid.toLocaleString()} • باقي: <span className="text-destructive font-bold">{inv.remaining.toLocaleString()}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setViewing(inv)} className="flex-1 text-xs py-2 rounded-lg bg-accent font-bold flex items-center justify-center gap-1">
                <Eye size={14} /> عرض
              </button>
              {inv.remaining > 0 && (
                <button onClick={() => { setPayOpen(inv); setPayAmount(inv.remaining); }} className="flex-1 text-xs py-2 rounded-lg bg-success/20 text-success font-bold flex items-center justify-center gap-1">
                  <Banknote size={14} /> دفع
                </button>
              )}
              <button onClick={() => handleDelete(inv.id)} className="text-xs py-2 px-3 rounded-lg bg-destructive/15 text-destructive font-bold">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block glass-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-right p-4 font-extrabold">رقم الفاتورة</th>
              <th className="text-right p-4 font-extrabold">المورد</th>
              <th className="text-right p-4 font-extrabold">التاريخ</th>
              <th className="text-center p-4 font-extrabold">الإجمالي</th>
              <th className="text-center p-4 font-extrabold">المدفوع</th>
              <th className="text-center p-4 font-extrabold">المتبقي</th>
              <th className="text-center p-4 font-extrabold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-border/30 hover:bg-accent/30">
                <td className="p-4 font-mono font-bold text-primary">#{inv.invoiceNumber}</td>
                <td className="p-4 font-bold">{inv.supplierName}</td>
                <td className="p-4 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                <td className="p-4 text-center font-extrabold">{inv.total.toLocaleString()}</td>
                <td className="p-4 text-center text-success font-bold">{inv.paid.toLocaleString()}</td>
                <td className="p-4 text-center font-extrabold text-destructive">{inv.remaining.toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setViewing(inv)} className="p-2 rounded-lg bg-accent" title="عرض"><Eye size={16} /></button>
                    {inv.remaining > 0 && (
                      <button onClick={() => { setPayOpen(inv); setPayAmount(inv.remaining); }} className="p-2 rounded-lg bg-success/20 text-success" title="دفع"><Banknote size={16} /></button>
                    )}
                    <button onClick={() => handleDelete(inv.id)} className="p-2 rounded-lg bg-destructive/15 text-destructive" title="حذف"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">لا توجد فواتير شراء</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg">فاتورة شراء جديدة</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">اختر المورد *</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="input-field" placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-bold">إضافة منتج</label>
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-lg bg-gradient-to-r from-success to-success/70 text-success-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Sparkles size={14} /> منتج جديد
                </button>
              </div>
              <input
                className="input-field w-full"
                placeholder="ابحث عن منتج بالاسم أو الكود..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-card border border-border rounded-xl">
                  {filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => addItem(p.id)} className="w-full text-right p-3 hover:bg-accent border-b last:border-0 flex justify-between items-center">
                      <span className="font-bold text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">المخزون: {p.quantity}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="p-3 text-center">
                      <p className="text-muted-foreground text-sm mb-2">لا توجد نتائج</p>
                      <button
                        onClick={() => setQuickAddOpen(true)}
                        className="text-xs font-extrabold text-primary hover:underline"
                      >
                        + إضافة "{productSearch}" كمنتج جديد
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {items.map((it) => (
                <div key={it.productId} className="bg-accent/40 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-sm">{it.productName}</p>
                    <button onClick={() => removeItem(it.productId)} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">الكمية</label>
                      <input type="number" min={1} className="input-field w-full text-sm py-1.5" value={it.quantity} onChange={(e) => updateItem(it.productId, "quantity", Math.max(1, Number(e.target.value)))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">سعر الوحدة</label>
                      <input type="number" min={0} className="input-field w-full text-sm py-1.5" value={it.unitCost} onChange={(e) => updateItem(it.productId, "unitCost", Math.max(0, Number(e.target.value)))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">الإجمالي</label>
                      <p className="font-extrabold mt-1.5">{it.total.toLocaleString()} ج.م</p>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">أضف منتجات للفاتورة</p>}
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-lg font-extrabold">
                <span>الإجمالي</span>
                <span>{total.toLocaleString()} ج.م</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold min-w-[80px]">المدفوع</label>
                <input type="number" className="input-field flex-1" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} placeholder="0" />
              </div>
              <div className="flex justify-between font-extrabold text-destructive">
                <span>المتبقي (مديونية على المحل)</span>
                <span>{remaining.toLocaleString()} ج.م</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={submit} className="btn-primary py-3">حفظ الفاتورة</button>
              <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice */}
      {viewing && (
        <div className="modal-overlay">
          <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-lg">فاتورة شراء #{viewing.invoiceNumber}</h3>
              <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-xl">✕</button>
            </div>
            <p className="text-sm mb-1">المورد: <strong>{viewing.supplierName}</strong></p>
            <p className="text-sm text-muted-foreground mb-3">{new Date(viewing.createdAt).toLocaleString("ar-EG")}</p>
            {viewing.notes && <p className="text-sm bg-accent/50 p-2 rounded-lg mb-3">{viewing.notes}</p>}
            <table className="w-full text-sm mb-3">
              <thead><tr className="border-b"><th className="text-right py-2">المنتج</th><th className="text-center py-2">الكمية</th><th className="text-center py-2">السعر</th><th className="text-left py-2">الإجمالي</th></tr></thead>
              <tbody>
                {viewing.items.map((it, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 font-bold">{it.productName}</td>
                    <td className="text-center">{it.quantity}</td>
                    <td className="text-center">{it.unitCost.toLocaleString()}</td>
                    <td className="text-left font-bold">{it.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-extrabold"><span>الإجمالي</span><span>{viewing.total.toLocaleString()} ج.م</span></div>
              <div className="flex justify-between"><span>المدفوع</span><span className="text-success font-bold">{viewing.paid.toLocaleString()}</span></div>
              <div className="flex justify-between font-extrabold text-destructive"><span>المتبقي</span><span>{viewing.remaining.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Pay invoice */}
      {payOpen && (
        <div className="modal-overlay">
          <div className="glass-modal rounded-3xl p-5 sm:p-7 w-full max-w-[95vw] sm:max-w-md">
            <h3 className="font-extrabold text-lg mb-3">دفع لفاتورة #{payOpen.invoiceNumber}</h3>
            <div className="bg-accent/50 rounded-xl p-3 mb-3 flex justify-between text-sm">
              <span>المتبقي</span>
              <span className="font-extrabold text-destructive">{payOpen.remaining.toLocaleString()} ج.م</span>
            </div>
            <input type="number" className="input-field w-full mb-3" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} placeholder="المبلغ" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePay} className="btn-primary py-3">دفع</button>
              <button onClick={() => setPayOpen(null)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <QuickAddProduct
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={handleQuickAddCreated}
        defaultName={productSearch}
      />
    </div>
  );
}
