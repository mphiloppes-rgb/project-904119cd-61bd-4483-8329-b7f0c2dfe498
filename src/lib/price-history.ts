// سجل تغييرات أسعار الشراء — بيتسجل عند كل فاتورة شراء أو تعديل يدوي
// يخزن: المنتج، السعر القديم، الجديد، الفرق، النسبة، السبب، التاريخ.

const KEY = 'pos_price_history';
const MAX_ENTRIES = 500;

export interface PriceChange {
  id: string;
  productId: string;
  productName: string;
  oldCost: number;
  newCost: number;
  diff: number;          // newCost - oldCost
  percent: number;       // ((newCost - oldCost) / oldCost) * 100
  direction: 'up' | 'down' | 'same';
  reason: string;        // "فاتورة شراء P-000001" / "تعديل يدوي"
  userReason?: string;   // السبب اللي المستخدم كتبه
  source?: string;       // invoice id
  date: string;
}

function read(): PriceChange[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list: PriceChange[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function logPriceChange(args: {
  productId: string;
  productName: string;
  oldCost: number;
  newCost: number;
  reason: string;
  source?: string;
  userReason?: string;
}): PriceChange | null {
  const { oldCost, newCost } = args;
  if (oldCost === newCost) return null;
  const diff = newCost - oldCost;
  const percent = oldCost > 0 ? (diff / oldCost) * 100 : 100;
  const entry: PriceChange = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    productId: args.productId,
    productName: args.productName,
    oldCost,
    newCost,
    diff,
    percent,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    reason: args.reason,
    userReason: args.userReason,
    source: args.source,
    date: new Date().toISOString(),
  };
  const list = read();
  list.push(entry);
  while (list.length > MAX_ENTRIES) list.shift();
  write(list);
  return entry;
}

export function getPriceHistory(): PriceChange[] {
  return read().slice().reverse(); // الأحدث أولاً
}

export function getPriceHistoryForProduct(productId: string): PriceChange[] {
  return getPriceHistory().filter(p => p.productId === productId);
}

export function clearPriceHistory() { write([]); }

/**
 * إرجاع سعر منتج لقيمة سابقة من سجل التغييرات.
 * بيرجع للـ oldCost اللي في الإدخال ده، وبيسجل تغيير جديد بسبب "إرجاع يدوي".
 */
export async function revertToOldCost(changeId: string): Promise<{ ok: boolean; message: string }> {
  const list = read();
  const change = list.find(c => c.id === changeId);
  if (!change) return { ok: false, message: 'الإدخال مش موجود' };

  const { getProducts, saveProducts } = await import('./store');
  const products = getProducts();
  const idx = products.findIndex(p => p.id === change.productId);
  if (idx === -1) return { ok: false, message: 'المنتج اتمسح' };

  const currentCost = products[idx].costPrice;
  if (currentCost === change.oldCost) return { ok: false, message: 'السعر الحالي زي اللي بترجعله بالظبط' };

  products[idx].costPrice = change.oldCost;
  saveProducts(products);

  // سجل العملية
  logPriceChange({
    productId: change.productId,
    productName: change.productName,
    oldCost: currentCost,
    newCost: change.oldCost,
    reason: `إرجاع يدوي لسعر قديم`,
    userReason: `رجعت من ${currentCost.toLocaleString()} إلى ${change.oldCost.toLocaleString()} (سجل ${new Date(change.date).toLocaleDateString('ar-EG')})`,
  });

  return { ok: true, message: `تم إرجاع السعر إلى ${change.oldCost.toLocaleString()} ج.م` };
}

