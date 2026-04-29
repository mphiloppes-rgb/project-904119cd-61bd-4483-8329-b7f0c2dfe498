import { useState } from "react";
import { X, PackagePlus, Sparkles } from "lucide-react";
import { addProduct, type Product } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
  defaultCost?: number;
  defaultName?: string;
}

export default function QuickAddProduct({ open, onClose, onCreated, defaultCost = 0, defaultName = "" }: Props) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [costPrice, setCostPrice] = useState<number>(defaultCost);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  if (!open) return null;

  const reset = () => {
    setName(""); setCode(""); setCostPrice(0); setSellPrice(0); setQuantity(0); setLowStockThreshold(5);
  };

  const submit = () => {
    if (!name.trim()) {
      toast({ title: "خطأ", description: "اسم المنتج مطلوب", variant: "destructive" });
      return;
    }
    if (sellPrice <= 0) {
      toast({ title: "خطأ", description: "سعر البيع لازم يكون أكبر من صفر", variant: "destructive" });
      return;
    }
    const p = addProduct({
      name: name.trim(),
      code: code.trim() || undefined,
      costPrice: Number(costPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      quantity: Number(quantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
    });
    toast({ title: "تم إضافة المنتج ✅", description: p.name });
    onCreated(p);
    reset();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="glass-modal rounded-3xl p-5 sm:p-7 md:p-8 w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg animate-bounce-in">
              <PackagePlus className="text-primary-foreground" size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl flex items-center gap-2">
                إضافة منتج سريعة <Sparkles size={16} className="text-warning" />
              </h3>
              <p className="text-xs text-muted-foreground">المنتج هيتضاف للمخزون وللفاتورة على طول</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all hover:rotate-90 duration-300">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground mb-1 block">اسم المنتج *</label>
            <input autoFocus className="input-field w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">الكود / الباركود</label>
            <input className="input-field w-full" value={code} onChange={(e) => setCode(e.target.value)} placeholder="اختياري" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">الكمية المبدئية</label>
            <input type="number" min={0} className="input-field w-full" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">سعر الشراء (التكلفة)</label>
            <input type="number" min={0} className="input-field w-full" value={costPrice || ""} onChange={(e) => setCostPrice(Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">سعر البيع *</label>
            <input type="number" min={0} className="input-field w-full" value={sellPrice || ""} onChange={(e) => setSellPrice(Number(e.target.value))} placeholder="0" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground mb-1 block">حد المخزون الأدنى للتنبيه</label>
            <input type="number" min={0} className="input-field w-full" value={lowStockThreshold || ""} onChange={(e) => setLowStockThreshold(Number(e.target.value))} placeholder="5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={submit} className="btn-primary py-3">حفظ وإضافة للفاتورة</button>
          <button onClick={onClose} className="bg-secondary text-secondary-foreground py-3 rounded-xl font-extrabold hover:bg-muted transition-all">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
