// طبقة حماية: ترجع منتجات بدون البيانات الحساسة (سعر الشراء/كمية المخزون)
// تستخدمها شاشات الكاشير حتى لو فتح URL مباشرة.
import { getProducts, type Product } from "./store";
import { isCashier } from "./auth";

export type PublicProduct = Omit<Product, "costPrice" | "quantity" | "lowStockThreshold"> & {
  costPrice?: number;       // محذوف للكاشير
  quantity?: number;        // محذوف للكاشير
  lowStockThreshold?: number;
  inStock?: boolean;        // بديل آمن: في مخزون أو لأ
};

/** يرجع المنتجات حسب صلاحية المستخدم — للكاشير: بدون costPrice وبدون quantity */
export function getProductsSafe(): PublicProduct[] {
  const all = getProducts();
  if (!isCashier()) return all as PublicProduct[];
  return all.map((p) => {
    const inStock = p.quantity > 0;
    // نسخة جديدة بدون الحقول الحساسة
    const safe: any = { ...p };
    delete safe.costPrice;
    delete safe.quantity;
    delete safe.lowStockThreshold;
    safe.inStock = inStock;
    return safe as PublicProduct;
  });
}

/** قائمة بصلاحيات الكاشير لعرضها في صفحة المعلومات */
export const CASHIER_PERMISSIONS = {
  allowed: [
    { label: "تسجيل عمليات بيع جديدة", icon: "🛒" },
    { label: "إضافة عميل جديد وتسجيل ديون", icon: "👤" },
    { label: "تحصيل دفعات من العملاء", icon: "💵" },
    { label: "عرض فواتير اليوم اللي عملها", icon: "🧾" },
    { label: "البحث عن منتج بالاسم أو الكود", icon: "🔍" },
    { label: "طباعة الفاتورة الحرارية للعميل", icon: "🖨️" },
  ],
  denied: [
    { label: "رؤية سعر الشراء أو الأرباح", icon: "🚫" },
    { label: "رؤية كميات المخزون التفصيلية", icon: "🚫" },
    { label: "فتح صفحة التقارير أو تصديرها", icon: "🚫" },
    { label: "إضافة/تعديل/حذف منتج", icon: "🚫" },
    { label: "إدارة الموردين أو فواتير الشراء", icon: "🚫" },
    { label: "تسجيل المصاريف", icon: "🚫" },
    { label: "الوصول للإعدادات أو نسخ احتياطية", icon: "🚫" },
    { label: "تعديل أسعار البيع", icon: "🚫" },
    { label: "عمل مرتجع كامل لفاتورة", icon: "🚫" },
  ],
};
