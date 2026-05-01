// تبويب يعرض السجل التاريخي لتغير سعر شراء صنف محدد داخل فاتورة الشراء
import { useMemo } from "react";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getPriceHistoryForProduct } from "@/lib/price-history";

interface Props {
  productId: string;
  productName: string;
  currentNewPrice: number; // السعر اللي بيدخله المستخدم في الفاتورة دلوقتي
  storedCostPrice: number; // السعر المخزن حالياً للمنتج
}

export default function InlinePriceHistory({ productId, productName, currentNewPrice, storedCostPrice }: Props) {
  const history = useMemo(() => getPriceHistoryForProduct(productId).slice(0, 8), [productId]);

  const direction =
    currentNewPrice > storedCostPrice ? "up" : currentNewPrice < storedCostPrice ? "down" : "same";
  const percent = storedCostPrice > 0 ? ((currentNewPrice - storedCostPrice) / storedCostPrice) * 100 : 0;

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <History className="text-primary" size={16} />
        <p className="font-extrabold text-xs">سجل أسعار "{productName}"</p>
      </div>

      {/* المقارنة الفورية */}
      <div
        className={`p-2 rounded-lg mb-2 text-xs font-bold flex items-center justify-between ${
          direction === "up"
            ? "bg-destructive/10 text-destructive"
            : direction === "down"
            ? "bg-success/10 text-success"
            : "bg-muted/40 text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-1">
          {direction === "up" ? (
            <TrendingUp size={14} />
          ) : direction === "down" ? (
            <TrendingDown size={14} />
          ) : (
            <Minus size={14} />
          )}
          {direction === "up"
            ? `السعر ارتفع ${percent.toFixed(1)}٪`
            : direction === "down"
            ? `السعر انخفض ${Math.abs(percent).toFixed(1)}٪`
            : "نفس السعر السابق"}
        </span>
        <span>
          {storedCostPrice.toLocaleString()} → {currentNewPrice.toLocaleString()}
        </span>
      </div>

      {/* السجل التاريخي */}
      {history.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-2">مفيش سجل سابق لهذا المنتج</p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/30">
              <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString("ar-EG")}</span>
              <span className="font-bold">
                {h.oldCost.toLocaleString()} → {h.newCost.toLocaleString()}
              </span>
              <span
                className={`font-extrabold ${
                  h.direction === "up" ? "text-destructive" : h.direction === "down" ? "text-success" : "text-muted-foreground"
                }`}
              >
                {h.percent > 0 ? "+" : ""}
                {h.percent.toFixed(0)}٪
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
