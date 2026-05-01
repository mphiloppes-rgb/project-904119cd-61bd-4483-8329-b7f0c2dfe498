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
  userId?: string;       // اللي عمل التغيير (لو الـ auth مفعّل)
  userName?: string;     // اسمه
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

  // اقرأ المستخدم الحالى لو فيه
  let userId: string | undefined;
  let userName: string | undefined;
  try {
    const enabled = localStorage.getItem('pos_auth_enabled') === '1';
    if (enabled) {
      const session = JSON.parse(localStorage.getItem('pos_session_user') || 'null');
      if (session?.userId) {
        const users = JSON.parse(localStorage.getItem('pos_users') || '[]');
        const u = users.find((x: any) => x.id === session.userId);
        if (u) { userId = u.id; userName = u.name; }
      }
    }
  } catch {}

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
    userId,
    userName,
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


/** تصدير سجل تغييرات الأسعار كـ CSV (يدعم العربى عبر BOM)
 *  افتراضياً: الأعمدة المطلوبة فقط (المنتج/السبب/المستخدم/الوقت/المصدر/قديم→جديد)
 *  لو detailed=true: كل الأعمدة. */
export function exportPriceHistoryCSV(rows?: PriceChange[], opts?: { detailed?: boolean }) {
  const data = rows || getPriceHistory();
  const detailed = !!opts?.detailed;
  const headers = detailed
    ? ['الوقت', 'المنتج', 'السعر القديم', 'السعر الجديد', 'الفرق', 'النسبة %', 'الاتجاه', 'مصدر التغيير', 'السبب', 'المستخدم']
    : ['المنتج', 'السبب', 'المستخدم', 'الوقت', 'المصدر', 'قديم → جديد'];
  const lines = [headers.join(',')];
  data.forEach(r => {
    const cells = detailed
      ? [
          new Date(r.date).toLocaleString('ar-EG'),
          r.productName,
          r.oldCost,
          r.newCost,
          r.diff.toFixed(2),
          r.percent.toFixed(1),
          r.direction === 'up' ? 'ارتفاع' : r.direction === 'down' ? 'انخفاض' : 'ثابت',
          r.reason,
          r.userReason || '—',
          r.userName || '—',
        ]
      : [
          r.productName,
          r.userReason || r.reason || '—',
          r.userName || '—',
          new Date(r.date).toLocaleString('ar-EG'),
          r.source || r.reason || '—',
          `${r.oldCost.toLocaleString()} → ${r.newCost.toLocaleString()} (${r.direction === 'up' ? '↑' : r.direction === 'down' ? '↓' : '='}${r.percent.toFixed(1)}٪)`,
        ];
    const safeCells = cells.map(v => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(safeCells.join(','));
  });
  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `سجل_الأسعار_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
