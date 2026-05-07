// تصدير ملف بيانات للعارض المنفصل (RaeiViewer)
// اسم الملف ثابت ليطابق ما يتوقعه العارض: shop-viewer-data.json
// يدعم: حفظ تلقائي عبر Electron لمسار محدد + سجل الأسعار + آخر سعر مورد
import { getProducts } from "./store";
import { getPriceHistoryForProduct } from "./price-history";
import { getPurchaseInvoices } from "./suppliers";

const VIEWER_PATH_KEY = "pos_viewer_save_path";

export function getViewerSavePath(): string {
  try { return localStorage.getItem(VIEWER_PATH_KEY) || ""; } catch { return ""; }
}
export function setViewerSavePath(p: string) {
  try { localStorage.setItem(VIEWER_PATH_KEY, p); } catch {}
}

/** آخر سعر شراء للمنتج من أي مورد + تاريخه + رقم الفاتورة + اسم المورد */
function getLastPurchaseForProduct(productId: string) {
  const invoices = getPurchaseInvoices()
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  for (const inv of invoices) {
    const it = inv.items.find((x: any) => x.productId === productId);
    if (it) {
      return {
        unitCost: it.unitCost,
        date: inv.createdAt,
        invoiceNumber: inv.invoiceNumber,
        supplierId: (inv as any).supplierId || null,
        supplierName: (inv as any).supplierName || null,
      };
    }
  }
  return null;
}

export function buildViewerPayload() {
  const products = getProducts().map((p) => {
    const last = getLastPurchaseForProduct(p.id);
    const history = getPriceHistoryForProduct(p.id).slice(0, 5).map((h) => ({
      date: h.date,
      oldCost: h.oldCost,
      newCost: h.newCost,
      diff: h.diff,
      percent: h.percent,
      direction: h.direction,
      reason: h.reason,
      userReason: h.userReason,
    }));
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      brand: p.brand,
      model: p.model,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      wholesalePrice: p.wholesalePrice,
      wholesaleMinQty: p.wholesaleMinQty,
      halfWholesalePrice: p.halfWholesalePrice,
      halfWholesaleMinQty: p.halfWholesaleMinQty,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      lastPurchase: last, // { unitCost, date, invoiceNumber, supplierName }
      priceHistory: history, // آخر 5 تغييرات
    };
  });
  return { updatedAt: new Date().toISOString(), version: 2, products };
}

/**
 * يحفظ ملف العارض. لو فيه Electron + مسار محفوظ → بيكتب مباشرة (تحديث فوري للعارض).
 * غير كده → بينزّل الملف عن طريق المتصفح.
 */
export async function exportViewerData(opts?: { silent?: boolean }): Promise<{ ok: boolean; path?: string; method: "electron" | "download" }> {
  const payload = buildViewerPayload();
  const json = JSON.stringify(payload, null, 2);

  // محاولة استخدام Electron IPC
  const w = window as any;
  if (w?.posElectron?.saveViewerData) {
    const savedPath = getViewerSavePath();
    const res = await w.posElectron.saveViewerData(json, savedPath || null);
    if (res?.ok) {
      if (res.path && res.path !== savedPath) setViewerSavePath(res.path);
      return { ok: true, path: res.path, method: "electron" };
    }
  }

  // Fallback: download
  if (opts?.silent) return { ok: false, method: "download" };
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shop-viewer-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { ok: true, method: "download" };
}

/** يفتح حوار اختيار المسار (Electron فقط) ويحفظ المسار */
export async function chooseViewerSavePath(): Promise<string | null> {
  const w = window as any;
  if (!w?.posElectron?.chooseViewerPath) return null;
  const p = await w.posElectron.chooseViewerPath();
  if (p) setViewerSavePath(p);
  return p || null;
}

/** بدء التحديث التلقائي كل X ثانية (افتراضي 5) — للاستخدام داخل البرنامج الأساسي */
let autoTimer: number | null = null;
export function startAutoViewerSync(intervalMs = 5000) {
  stopAutoViewerSync();
  // أول تشغيل فوري
  exportViewerData({ silent: true }).catch(() => {});
  autoTimer = window.setInterval(() => {
    exportViewerData({ silent: true }).catch(() => {});
  }, intervalMs);
}
export function stopAutoViewerSync() {
  if (autoTimer != null) { clearInterval(autoTimer); autoTimer = null; }
}
