// تصدير ملف بيانات للعارض المنفصل (RaeiViewer)
// اسم الملف ثابت ليطابق ما يتوقعه العارض في ~/Documents
import { getProducts } from "./store";

export function exportViewerData() {
  const products = getProducts().map(p => ({
    id: p.id, name: p.name, code: p.code, brand: p.brand, model: p.model,
    sellPrice: p.sellPrice,
    wholesalePrice: p.wholesalePrice, wholesaleMinQty: p.wholesaleMinQty,
    halfWholesalePrice: p.halfWholesalePrice, halfWholesaleMinQty: p.halfWholesaleMinQty,
    quantity: p.quantity, lowStockThreshold: p.lowStockThreshold,
  }));
  const payload = { updatedAt: new Date().toISOString(), products };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shop-viewer-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
