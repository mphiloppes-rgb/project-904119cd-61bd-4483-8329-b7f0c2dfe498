// تلميح بآخر سعر اشترى بيه المورد المختار المنتج ده + وقت/تاريخ آخر تحديث
import { useMemo } from "react";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getLastSupplierPriceForProduct } from "@/lib/suppliers";

export default function SupplierLastPriceHint({
  supplierId,
  productId,
  currentUnitCost,
}: {
  supplierId: string;
  productId: string;
  currentUnitCost: number;
}) {
  const last = useMemo(
    () => (supplierId && productId ? getLastSupplierPriceForProduct(supplierId, productId) : null),
    [supplierId, productId]
  );
  if (!supplierId) {
    return (
      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
        اختار المورد علشان يظهر آخر سعر اشترى بيه المنتج ده
      </p>
    );
  }
  if (!last) {
    return (
      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
        المورد ده لسه ما اشترى المنتج ده قبل كده
      </p>
    );
  }
  const dir = currentUnitCost > last.unitCost ? "up" : currentUnitCost < last.unitCost ? "down" : "same";
  const pct = last.unitCost > 0 ? ((currentUnitCost - last.unitCost) / last.unitCost) * 100 : 0;
  const dt = new Date(last.date);
  return (
    <div
      className={`mt-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold flex items-center justify-between gap-2 border ${
        dir === "up"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : dir === "down"
          ? "bg-success/10 text-success border-success/20"
          : "bg-muted/40 text-muted-foreground border-border"
      }`}
    >
      <span className="flex items-center gap-1 min-w-0">
        <History size={11} className="flex-shrink-0" />
        <span className="truncate">
          آخر سعر للمورد: <strong>{last.unitCost.toLocaleString()}</strong> ج.م ({dt.toLocaleDateString("ar-EG")} • {dt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}) — #{last.invoiceNumber}
        </span>
      </span>
      <span className="flex items-center gap-0.5 flex-shrink-0">
        {dir === "up" ? <TrendingUp size={11} /> : dir === "down" ? <TrendingDown size={11} /> : <Minus size={11} />}
        {dir !== "same" && <span>{Math.abs(pct).toFixed(0)}٪</span>}
      </span>
    </div>
  );
}
