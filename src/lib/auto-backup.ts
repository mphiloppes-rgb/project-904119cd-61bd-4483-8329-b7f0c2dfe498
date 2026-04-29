// نظام لقطات احتياطية تلقائية (Offline) — يحفظ كل عملية في حلقة دوّارة
// آخر 30 لقطة مضغوطة في localStorage. أي تغيير في البيانات يطلق snapshot جديد.

const SNAPSHOTS_KEY = 'pos_auto_snapshots';
const MAX_SNAPSHOTS = 30;
const DATA_KEYS = [
  'pos_products',
  'pos_customers',
  'pos_invoices',
  'pos_expenses',
  'pos_suppliers',
  'pos_purchase_invoices',
  'pos_supplier_payments',
  'pos_customer_payments',
];

export interface Snapshot {
  id: string;
  timestamp: string;
  trigger: string; // "بيع", "إضافة منتج", "حفظ تلقائي" ...
  data: Record<string, string>; // raw localStorage values
  size: number; // bytes
}

function nowId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSnapshots(list: Snapshot[]) {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));
  } catch (e) {
    // Storage full — drop oldest half and retry
    const trimmed = list.slice(-Math.floor(MAX_SNAPSHOTS / 2));
    try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed)); } catch {}
  }
}

function buildDataPayload(): Record<string, string> {
  const data: Record<string, string> = {};
  DATA_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  });
  return data;
}

function dataHash(data: Record<string, string>): string {
  // hash بسيط جداً عشان نعرف هل البيانات اتغيرت
  let h = 0;
  const s = JSON.stringify(data);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

let lastHash = '';

export function takeSnapshot(trigger = 'حفظ تلقائي'): Snapshot | null {
  const data = buildDataPayload();
  const h = dataHash(data);
  if (h === lastHash) return null; // مفيش تغيير
  lastHash = h;

  const size = JSON.stringify(data).length;
  const snap: Snapshot = {
    id: nowId(),
    timestamp: new Date().toISOString(),
    trigger,
    data,
    size,
  };
  const list = readSnapshots();
  list.push(snap);
  while (list.length > MAX_SNAPSHOTS) list.shift();
  writeSnapshots(list);
  return snap;
}

export function getSnapshots(): Snapshot[] {
  return readSnapshots().slice().reverse(); // الأحدث أولاً
}

export function restoreSnapshot(id: string): boolean {
  const list = readSnapshots();
  const snap = list.find((s) => s.id === id);
  if (!snap) return false;

  // قبل الاسترجاع، خد لقطة سلامة من الوضع الحالي
  takeSnapshot('قبل الاسترجاع');

  Object.entries(snap.data).forEach(([k, v]) => {
    try { localStorage.setItem(k, v); } catch {}
  });
  return true;
}

export function deleteSnapshot(id: string): void {
  writeSnapshots(readSnapshots().filter((s) => s.id !== id));
}

export function clearSnapshots(): void {
  writeSnapshots([]);
}

// === مراقبة تلقائية ===
// يبدأ المراقبة: كل X ثانية + عند أي تغيير في DATA_KEYS عبر storage event.
// التكرار يتم تحميله من الإعدادات ويتغير حياً عند التحديث.

const INTERVAL_KEY = 'pos_auto_backup_interval_ms';
const DEFAULT_INTERVAL = 30_000;

export function getAutoBackupInterval(): number {
  try {
    const v = parseInt(localStorage.getItem(INTERVAL_KEY) || '');
    if (!isNaN(v) && v >= 5_000) return v;
  } catch {}
  return DEFAULT_INTERVAL;
}

export function setAutoBackupInterval(ms: number) {
  try { localStorage.setItem(INTERVAL_KEY, String(ms)); } catch {}
  if (started && timer) {
    window.clearInterval(timer);
    timer = window.setInterval(() => takeSnapshot('حفظ تلقائي دوري'), ms);
  }
}

let started = false;
let timer: number | null = null;

export function startAutoBackup(intervalMs?: number) {
  if (started) return;
  started = true;
  const ms = intervalMs ?? getAutoBackupInterval();

  takeSnapshot('بداية الجلسة');
  timer = window.setInterval(() => takeSnapshot('حفظ تلقائي دوري'), ms);

  const origSetItem = localStorage.setItem.bind(localStorage);
  let pending: number | null = null;
  let pendingTrigger = 'تحديث بيانات';
  (localStorage as any).setItem = function (k: string, v: string) {
    origSetItem(k, v);
    if (DATA_KEYS.includes(k)) {
      const labelMap: Record<string, string> = {
        pos_invoices: 'بيع/تعديل فاتورة',
        pos_products: 'تحديث منتجات',
        pos_customers: 'تحديث عملاء',
        pos_expenses: 'تحديث مصاريف',
        pos_suppliers: 'تحديث موردين',
        pos_purchase_invoices: 'فاتورة شراء',
        pos_supplier_payments: 'دفع لمورد',
        pos_customer_payments: 'تحصيل من عميل',
      };
      pendingTrigger = labelMap[k] || pendingTrigger;
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        takeSnapshot(pendingTrigger);
        pending = null;
      }, 800);
    }
  };

  window.addEventListener('beforeunload', () => takeSnapshot('قبل الإغلاق'));
}

export function stopAutoBackup() {
  if (timer) window.clearInterval(timer);
  timer = null;
  started = false;
}

// مقارنة بين لقطة معينة والوضع الحالي
export interface SnapshotDiffRow {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
}

const KEY_LABELS: Record<string, string> = {
  pos_products: 'منتجات',
  pos_customers: 'عملاء',
  pos_invoices: 'فواتير بيع',
  pos_expenses: 'مصاريف',
  pos_suppliers: 'موردين',
  pos_purchase_invoices: 'فواتير شراء',
  pos_supplier_payments: 'مدفوعات للموردين',
  pos_customer_payments: 'مدفوعات من العملاء',
};

export function diffSnapshotWithCurrent(snapshotId: string): SnapshotDiffRow[] | null {
  const list = readSnapshots();
  const snap = list.find(s => s.id === snapshotId);
  if (!snap) return null;
  const current = buildDataPayload();
  const rows: SnapshotDiffRow[] = [];
  DATA_KEYS.forEach(k => {
    let beforeCount = 0;
    let afterCount = 0;
    try { beforeCount = JSON.parse(current[k] || '[]').length || 0; } catch {}
    try { afterCount = JSON.parse(snap.data[k] || '[]').length || 0; } catch {}
    rows.push({
      key: k,
      label: KEY_LABELS[k] || k,
      before: beforeCount,
      after: afterCount,
      delta: afterCount - beforeCount,
    });
  });
  return rows;
}

