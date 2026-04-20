import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, AlertTriangle, Save, Percent, Tag, X, Eye, EyeOff, Receipt, Scan } from "lucide-react";
import { getProducts, getCustomers, addInvoice, getTierPrice, findProductByCode, type InvoiceItem } from "@/lib/store";
import { logAction, canViewCostPrice } from "@/lib/auth";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { toast } from "@/hooks/use-toast";
import InvoicePrint from "@/components/InvoicePrint";
import ThermalPrint from "@/components/ThermalPrint";

type DiscountType = 'amount' | 'percent';
type PrintMode = 'a4' | 'thermal';

interface CartItem extends InvoiceItem {
  discountType?: DiscountType;
  discountValue?: number;
}

export default function POSPage() {
  const { refreshKey, refresh } = useStoreRefresh();
  const products = useMemo(() => getProducts(), [refreshKey]);
  const customers = useMemo(() => getCustomers(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paid, setPaid] = useState<number>(0);
  const [showPrint, setShowPrint] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showNoCustomerDialog, setShowNoCustomerDialog] = useState(false);
  const [showConfirmSale, setShowConfirmSale] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'print'>('print');
  const [showProfit, setShowProfit] = useState(false);
  const allowProfit = canViewCostPrice();
  const [printMode, setPrintMode] = useState<PrintMode>(() => (localStorage.getItem('pos_print_mode') as PrintMode) || 'a4');
  const searchRef = useRef<HTMLInputElement>(null);
  const paidRef = useRef<HTMLInputElement>(null);

  // Invoice-level discount
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>('amount');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<number>(0);

  // Item discount dialog
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [tempDiscountType, setTempDiscountType] = useState<DiscountType>('amount');
  const [tempDiscountValue, setTempDiscountValue] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('pos_print_mode', printMode);
  }, [printMode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20);
    const s = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.code && p.code.toLowerCase().includes(s))
    );
  }, [search, products]);

  const calcItemDiscountAmount = (item: CartItem) => {
    if (!item.discountValue) return 0;
    const gross = item.quantity * item.unitPrice;
    if (item.discountType === 'percent') return Math.min(gross, (gross * item.discountValue) / 100);
    return Math.min(gross, item.discountValue);
  };

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const itemsDiscountTotal = cart.reduce((s, i) => s + calcItemDiscountAmount(i), 0);
  const afterItemsDiscount = subtotal - itemsDiscountTotal;
  const invoiceDiscountAmount = invoiceDiscountType === 'percent'
    ? Math.min(afterItemsDiscount, (afterItemsDiscount * (invoiceDiscountValue || 0)) / 100)
    : Math.min(afterItemsDiscount, invoiceDiscountValue || 0);
  const total = Math.max(0, afterItemsDiscount - invoiceDiscountAmount);
  const remaining = Math.max(0, total - paid);

  // ربح لحظي = الإجمالي بعد الخصم - تكلفة الأصناف
  const totalCost = cart.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const liveProfit = total - totalCost;

  const getAvailableStock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const inCart = cart.find(i => i.productId === productId);
    return product.quantity - (inCart ? inCart.quantity : 0);
  };

  const addToCart = (product: typeof products[0]) => {
    if (product.quantity <= 0) {
      toast({ title: "⚠️ نفد المخزون", description: `${product.name} غير متاح حالياً`, variant: "destructive" });
      return;
    }
    const existing = cart.find((i) => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= product.quantity) {
      toast({ title: "⚠️ لا يمكن", description: `الكمية المتاحة في المخزون: ${product.quantity}`, variant: "destructive" });
      return;
    }
    if (existing) {
      const newQty = existing.quantity + 1;
      const newPrice = getTierPrice(product, newQty);
      setCart(cart.map((i) => i.productId === product.id ? { ...i, quantity: newQty, unitPrice: newPrice, total: newQty * newPrice } : i));
    } else {
      const price = getTierPrice(product, 1);
      setCart([...cart, { productId: product.id, productName: product.name, quantity: 1, unitPrice: price, costPrice: product.costPrice, total: price }]);
    }
  };

  // Barcode handler: لو الـ search match exact code -> add مباشر
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      const product = findProductByCode(search.trim());
      if (product) {
        addToCart(product);
        setSearch("");
      } else if (filtered.length === 1) {
        addToCart(filtered[0]);
        setSearch("");
      } else {
        toast({ title: "غير موجود", description: "لم يتم العثور على منتج بهذا الكود", variant: "destructive" });
      }
    }
  };

  const updateQty = (productId: string, delta: number) => {
    if (delta > 0) {
      const available = getAvailableStock(productId);
      if (available <= 0) {
        const product = products.find(p => p.id === productId);
        toast({ title: "⚠️ لا يمكن", description: `الكمية المتاحة في المخزون: ${product?.quantity || 0}`, variant: "destructive" });
        return;
      }
    }
    setCart(cart.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      const product = products.find(p => p.id === productId);
      const newPrice = product ? getTierPrice(product, newQty) : i.unitPrice;
      return { ...i, quantity: newQty, unitPrice: newPrice, total: newQty * newPrice };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string) => setCart(cart.filter((i) => i.productId !== productId));

  const openItemDiscount = (item: CartItem) => {
    setDiscountItemId(item.productId);
    setTempDiscountType(item.discountType || 'amount');
    setTempDiscountValue(item.discountValue || 0);
  };

  const applyItemDiscount = () => {
    if (!discountItemId) return;
    setCart(cart.map(i => i.productId === discountItemId
      ? { ...i, discountType: tempDiscountType, discountValue: Math.max(0, tempDiscountValue || 0) }
      : i
    ));
    setDiscountItemId(null);
    setTempDiscountValue(0);
  };

  const clearItemDiscount = () => {
    if (!discountItemId) return;
    setCart(cart.map(i => i.productId === discountItemId
      ? { ...i, discountType: undefined, discountValue: undefined }
      : i
    ));
    setDiscountItemId(null);
    setTempDiscountValue(0);
  };

  const attemptAction = (action: 'save' | 'print') => {
    if (cart.length === 0) { toast({ title: "خطأ", description: "الفاتورة فارغة", variant: "destructive" }); return; }
    setPendingAction(action);
    if (!customerId) {
      setShowNoCustomerDialog(true);
      return;
    }
    setShowConfirmSale(true);
  };

  const confirmAndSell = () => {
    setShowConfirmSale(false);
    setShowNoCustomerDialog(false);
    const customer = customers.find((c) => c.id === customerId);

    const finalItems: InvoiceItem[] = cart.map(i => {
      const gross = i.quantity * i.unitPrice;
      const disc = calcItemDiscountAmount(i);
      return {
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
        total: gross - disc,
        discount: disc > 0 ? disc : undefined,
        discountType: i.discountType,
        discountValue: i.discountValue,
      };
    });

    const invoice = addInvoice({
      items: finalItems,
      subtotal,
      itemsDiscountTotal: itemsDiscountTotal > 0 ? itemsDiscountTotal : undefined,
      invoiceDiscount: invoiceDiscountAmount > 0 ? invoiceDiscountAmount : undefined,
      invoiceDiscountType: invoiceDiscountValue > 0 ? invoiceDiscountType : undefined,
      invoiceDiscountValue: invoiceDiscountValue > 0 ? invoiceDiscountValue : undefined,
      total,
      paid,
      remaining,
      customerId: customerId || undefined,
      customerName: customer?.name,
      status: pendingAction === 'print' ? 'completed' : 'saved',
    });
    setLastInvoice(invoice);
    logAction(pendingAction === 'print' ? 'sell_print' : 'save_invoice', `فاتورة #${invoice.invoiceNumber} - ${total.toLocaleString()} ج.م`);
    toast({
      title: pendingAction === 'print' ? "تم البيع ✅" : "تم الحفظ 💾",
      description: `فاتورة رقم ${invoice.invoiceNumber}`,
    });

    if (pendingAction === 'print') {
      setShowPrint(true);
      setTimeout(() => { window.print(); setShowPrint(false); }, 300);
    }

    setCart([]); setPaid(0); setCustomerId(""); setInvoiceDiscountValue(0);
    refresh();
  };

  const proceedWithoutCustomer = () => {
    setShowNoCustomerDialog(false);
    setShowConfirmSale(true);
  };

  const invoiceForPrint = lastInvoice || {
    items: cart.map(i => ({ ...i, total: i.quantity * i.unitPrice - calcItemDiscountAmount(i) })),
    total, paid, remaining,
    customerName: customers.find((c) => c.id === customerId)?.name,
    createdAt: new Date().toISOString(),
    id: "draft",
    invoiceNumber: "------"
  };

  const editingItem = cart.find(i => i.productId === discountItemId);

  // Keyboard shortcuts: F2=clear/new, F3=focus search, F4=focus paid, Esc=close dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in input (except F-keys)
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (discountItemId) { setDiscountItemId(null); e.preventDefault(); return; }
        if (showNoCustomerDialog) { setShowNoCustomerDialog(false); e.preventDefault(); return; }
        if (showConfirmSale) { setShowConfirmSale(false); e.preventDefault(); return; }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]); setPaid(0); setCustomerId(""); setInvoiceDiscountValue(0);
        toast({ title: "تم تفريغ الفاتورة" });
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        paidRef.current?.focus();
        paidRef.current?.select();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) attemptAction('print');
        return;
      }
      if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) attemptAction('save');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, discountItemId, showNoCustomerDialog, showConfirmSale]);

  return (
    <>
      {showPrint && (printMode === 'thermal' ? <ThermalPrint invoice={invoiceForPrint} /> : <InvoicePrint invoice={invoiceForPrint} />)}

      {/* Item Discount Dialog */}
      {discountItemId && editingItem && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-sm animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg flex items-center gap-2"><Tag size={20} className="text-primary" /> خصم على المنتج</h3>
                <button onClick={() => setDiscountItemId(null)} className="p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4 truncate">{editingItem.productName}</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setTempDiscountType('amount')} className={`py-2 rounded-xl font-bold text-sm transition-all ${tempDiscountType === 'amount' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>مبلغ (ج.م)</button>
                <button onClick={() => setTempDiscountType('percent')} className={`py-2 rounded-xl font-bold text-sm transition-all ${tempDiscountType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>نسبة (%)</button>
              </div>
              <input
                type="number"
                value={tempDiscountValue || ''}
                onChange={(e) => setTempDiscountValue(Number(e.target.value))}
                placeholder={tempDiscountType === 'percent' ? 'مثال: 10' : 'مثال: 50'}
                className="input-field w-full mb-4"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={applyItemDiscount} className="btn-primary py-3 text-sm">تطبيق</button>
                <button onClick={clearItemDiscount} className="bg-destructive/10 text-destructive py-3 rounded-xl font-extrabold text-sm hover:bg-destructive/20 transition-all">حذف الخصم</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNoCustomerDialog && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-sm animate-scale-in text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-amber-500" size={28} />
              </div>
              <h3 className="font-extrabold text-lg mb-2">لم يتم اختيار عميل</h3>
              <p className="text-muted-foreground text-sm mb-6">هل تريد المتابعة بدون تحديد عميل؟</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={proceedWithoutCustomer} className="btn-primary py-3 text-sm">بدون عميل</button>
                <button onClick={() => setShowNoCustomerDialog(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">اختيار عميل</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmSale && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="glass-modal rounded-2xl p-6 w-full max-w-sm animate-scale-in text-center">
              <h3 className="font-extrabold text-lg mb-2">{pendingAction === 'print' ? 'تأكيد البيع والطباعة' : 'تأكيد حفظ الفاتورة'}</h3>
              <div className="bg-accent/50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>عدد الأصناف</span><span className="font-extrabold">{cart.length}</span></div>
                <div className="flex justify-between"><span>الإجمالي قبل الخصم</span><span className="font-extrabold">{subtotal.toLocaleString()} ج.م</span></div>
                {itemsDiscountTotal > 0 && <div className="flex justify-between text-amber-500"><span>خصم الأصناف</span><span className="font-extrabold">- {itemsDiscountTotal.toLocaleString()} ج.م</span></div>}
                {invoiceDiscountAmount > 0 && <div className="flex justify-between text-amber-500"><span>خصم الفاتورة</span><span className="font-extrabold">- {invoiceDiscountAmount.toLocaleString()} ج.م</span></div>}
                <div className="flex justify-between border-t border-border/50 pt-2"><span>الإجمالي النهائي</span><span className="font-extrabold text-primary">{total.toLocaleString()} ج.م</span></div>
                <div className="flex justify-between"><span>المدفوع</span><span className="font-extrabold text-success">{paid.toLocaleString()} ج.م</span></div>
                {remaining > 0 && <div className="flex justify-between"><span>المتبقي</span><span className="font-extrabold text-destructive">{remaining.toLocaleString()} ج.م</span></div>}
                {customerId && <div className="flex justify-between"><span>العميل</span><span className="font-extrabold">{customers.find(c => c.id === customerId)?.name}</span></div>}
                {!customerId && <div className="flex justify-between"><span>العميل</span><span className="text-muted-foreground">بدون عميل</span></div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={confirmAndSell} className="btn-primary py-3 text-sm">
                  {pendingAction === 'print' ? <><Printer size={16} /> طباعة</> : <><Save size={16} /> حفظ</>}
                </button>
                <button onClick={() => setShowConfirmSale(false)} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold text-sm hover:opacity-90 transition-all">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="page-header mb-0">نقطة البيع</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 text-xs">
              <button onClick={() => setPrintMode('a4')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${printMode === 'a4' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Receipt size={12} className="inline ml-1" /> A4
              </button>
              <button onClick={() => setPrintMode('thermal')} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${printMode === 'thermal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Receipt size={12} className="inline ml-1" /> 80mm
              </button>
            </div>
            {allowProfit && (
              <button onClick={() => setShowProfit(s => !s)} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showProfit ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                {showProfit ? <Eye size={14} /> : <EyeOff size={14} />}
                {showProfit ? 'إخفاء الربح' : 'عرض الربح'}
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts hint */}
        <div className="hidden lg:flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">F2</kbd> فاتورة جديدة</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">F3</kbd> بحث</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">F4</kbd> المدفوع</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">F9</kbd> طباعة</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">F10</kbd> حفظ</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> إلغاء</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-4 animate-fade-in-up order-2 lg:order-1">
            <div className="relative">
              <Scan className="absolute right-3 top-3 text-primary" size={18} />
              <input
                ref={searchRef}
                type="text"
                placeholder="ابحث بالاسم أو امسح الباركود ثم Enter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                className="input-field w-full pr-10"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
              {filtered.map((p, idx) => (
                <button key={p.id} onClick={() => addToCart(p)} disabled={p.quantity <= 0} className={`stat-card text-right cursor-pointer animate-fade-in-up ${p.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`} style={{ animationDelay: `${idx * 0.03}s` }}>
                  <p className="font-extrabold text-sm truncate">{p.name}</p>
                  {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  <p className="text-primary font-extrabold mt-2">{p.sellPrice.toLocaleString()} ج.م</p>
                  {(p.wholesalePrice || p.halfWholesalePrice) && (
                    <p className="text-[10px] text-muted-foreground">
                      {p.halfWholesalePrice && p.halfWholesaleMinQty ? `نص: ${p.halfWholesalePrice}@${p.halfWholesaleMinQty}` : ''}
                      {p.halfWholesalePrice && p.wholesalePrice ? ' · ' : ''}
                      {p.wholesalePrice && p.wholesaleMinQty ? `جملة: ${p.wholesalePrice}@${p.wholesaleMinQty}` : ''}
                    </p>
                  )}
                  <p className={`text-xs ${p.quantity <= 0 ? 'text-destructive font-extrabold' : 'text-muted-foreground'}`}>
                    المخزون: {p.quantity} {p.quantity <= 0 && '(نفد)'}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">لا توجد منتجات</p>}
            </div>
          </div>

          <div className="lg:col-span-2 animate-slide-in order-1 lg:order-2">
            <div className="stat-card sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="text-primary" size={22} />
                <h3 className="font-extrabold text-lg">الفاتورة</h3>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input-field w-full mb-4">
                <option value="">بدون عميل</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {cart.map((item) => {
                  const itemDisc = calcItemDiscountAmount(item);
                  const itemFinal = item.quantity * item.unitPrice - itemDisc;
                  return (
                    <div key={item.productId} className="p-3 bg-accent/50 rounded-xl transition-all duration-200 hover:bg-accent">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.unitPrice.toLocaleString()} ج.م</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.productId, -1)} className="p-1.5 rounded-lg bg-muted hover:bg-border transition-colors"><Minus size={14} /></button>
                          <span className="w-7 text-center font-extrabold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, 1)} className="p-1.5 rounded-lg bg-muted hover:bg-border transition-colors"><Plus size={14} /></button>
                          <button onClick={() => openItemDiscount(item)} className={`p-1.5 rounded-lg transition-colors ${itemDisc > 0 ? 'bg-amber-500/20 text-amber-600' : 'text-muted-foreground hover:bg-muted'}`} title="خصم على المنتج"><Tag size={14} /></button>
                          <button onClick={() => removeFromCart(item.productId)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
                        {itemDisc > 0 ? (
                          <span className="text-xs text-amber-600 font-bold">خصم: {itemDisc.toLocaleString()} ج.م</span>
                        ) : <span />}
                        <span className="font-extrabold text-sm">{itemFinal.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  );
                })}
                {cart.length === 0 && <p className="text-center text-muted-foreground py-6">اضف منتجات للفاتورة</p>}
              </div>

              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">الإجمالي قبل الخصم</span><span className="font-bold">{subtotal.toLocaleString()} ج.م</span></div>
                {itemsDiscountTotal > 0 && <div className="flex justify-between text-sm text-amber-600"><span>خصم الأصناف</span><span className="font-bold">- {itemsDiscountTotal.toLocaleString()} ج.م</span></div>}

                <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2">
                  <Percent size={16} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground min-w-[55px]">خصم الفاتورة</span>
                  <input
                    type="number"
                    value={invoiceDiscountValue || ''}
                    onChange={(e) => setInvoiceDiscountValue(Number(e.target.value))}
                    placeholder="0"
                    className="input-field flex-1 py-1.5 text-sm"
                  />
                  <select
                    value={invoiceDiscountType}
                    onChange={(e) => setInvoiceDiscountType(e.target.value as DiscountType)}
                    className="input-field py-1.5 text-xs w-20"
                  >
                    <option value="amount">ج.م</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                {invoiceDiscountAmount > 0 && <div className="flex justify-between text-xs text-amber-600"><span>قيمة خصم الفاتورة</span><span className="font-bold">- {invoiceDiscountAmount.toLocaleString()} ج.م</span></div>}

                <div className="flex justify-between text-lg font-extrabold border-t border-border/50 pt-2"><span>الإجمالي</span><span className="text-primary">{total.toLocaleString()} ج.م</span></div>
                {allowProfit && showProfit && cart.length > 0 && (
                  <div className="flex justify-between text-sm bg-success/10 -mx-2 px-3 py-2 rounded-lg">
                    <span className="text-success font-bold">صافي الربح اللحظي</span>
                    <span className={`font-extrabold ${liveProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{liveProfit.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex items-center gap-3"><label className="text-sm text-muted-foreground min-w-[60px] font-bold">المدفوع</label><input ref={paidRef} type="number" value={paid || ""} onChange={(e) => setPaid(Number(e.target.value))} className="input-field flex-1" placeholder="0" /></div>
                <div className="flex justify-between font-extrabold text-destructive"><span>المتبقي</span><span>{remaining.toLocaleString()} ج.م</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => attemptAction('print')} className="btn-primary py-3"><Printer size={18} /> بيع وطباعة</button>
                <button onClick={() => attemptAction('save')} className="flex items-center justify-center gap-2 bg-emerald-500/90 text-white py-3 rounded-xl font-extrabold hover:bg-emerald-500 transition-all duration-200"><Save size={18} /> حفظ فقط</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
