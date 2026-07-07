// Smart importer: auto-detects tables & columns from Excel/CSV/MDB (Access) files
// and maps them intelligently to POS entities (products, customers, suppliers,
// invoices, expenses, categories) — supports Arabic + English column names.

import * as XLSX from 'xlsx';
import {
  getProducts, saveProducts, getCustomers, saveCustomers,
  getExpenses, saveExpenses, type Product, type Customer, type Expense,
} from './store';
import { getSuppliers, saveSuppliers, type Supplier } from './suppliers';

export interface ParsedTable {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}
export interface ParsedDb {
  source: string;      // filename
  format: 'xlsx' | 'csv' | 'mdb';
  tables: ParsedTable[];
}

// ---------------- File parsing ----------------

async function parseXlsx(file: File): Promise<ParsedTable[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', codepage: 65001 });
  return wb.SheetNames.map((sn) => {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: true });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { name: sn, columns, rows };
  });
}

async function parseCsv(file: File): Promise<ParsedTable[]> {
  const text = await file.text();
  const wb = XLSX.read(text, { type: 'string' });
  const sn = wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return [{ name: file.name.replace(/\.csv$/i, ''), columns, rows }];
}

async function parseMdb(file: File): Promise<ParsedTable[]> {
  const w = window as any;
  if (w?.posElectron?.readMdb) {
    const buf = await file.arrayBuffer();
    const res = await w.posElectron.readMdb(Array.from(new Uint8Array(buf)));
    if (!res?.ok) throw new Error(res?.error || 'فشل قراءة قاعدة البيانات');
    return res.tables as ParsedTable[];
  }
  try {
    const mod: any = await import('mdb-reader');
    const MDBReader = mod.default || mod;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const g: any = globalThis as any;
    if (!g.Buffer) {
      const bufMod: any = await import('buffer');
      g.Buffer = bufMod.Buffer;
    }
    const reader = new MDBReader(g.Buffer ? g.Buffer.from(bytes) : bytes);
    const names: string[] = reader.getTableNames();
    return names.map((n: string) => {
      const t = reader.getTable(n);
      const cols: string[] = t.getColumnNames();
      const rows: Record<string, any>[] = t.getData();
      return { name: n, columns: cols, rows };
    });
  } catch (e: any) {
    throw new Error(
      'قراءة ملفات Access (.mdb) تحتاج نسخة سطح المكتب. من فضلك افتح الملف في Access وصدّره كـ Excel/CSV.\n' +
      (e?.message || '')
    );
  }
}

export type ProgressFn = (p: { phase: string; percent: number; message?: string }) => void;

export async function parseFile(file: File, onProgress?: ProgressFn): Promise<ParsedDb> {
  const name = file.name.toLowerCase();
  onProgress?.({ phase: 'parse', percent: 5, message: 'جاري فتح الملف...' });
  let tables: ParsedTable[] = [];
  let format: ParsedDb['format'];
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) { format = 'xlsx'; tables = await parseXlsx(file); }
  else if (name.endsWith('.csv')) { format = 'csv'; tables = await parseCsv(file); }
  else if (name.endsWith('.mdb') || name.endsWith('.accdb')) { format = 'mdb'; tables = await parseMdb(file); }
  else throw new Error('صيغة الملف غير مدعومة. المدعوم: .xlsx .xls .csv .mdb .accdb');
  onProgress?.({ phase: 'parse', percent: 40, message: `تم قراءة ${tables.length} جدول` });
  tables = tables.filter(t => t.rows.length > 0 && t.columns.length > 0);
  return { source: file.name, format, tables };
}

// ---------------- Normalization helpers ----------------

// تحويل أرقام عربية → إنجليزية + إزالة رموز عربية للفواصل
function normalizeDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.').replace(/٬/g, ',');
}

// تطبيع نص العمود للمطابقة (يشيل الحركات + ال التعريف + الفراغات)
const NORM = (s: string) => normalizeDigits(String(s || ''))
  .trim()
  .toLowerCase()
  .replace(/[\u064B-\u0652\u0670]/g, '')      // حركات
  .replace(/[إأآا]/g, 'ا')
  .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/^ال/, '')
  .replace(/[\s_\-.:،؛/\\()[\]{}]+/g, '');

// keyword banks (Arabic + English) — موسّعة
const KW = {
  productName: ['name','productname','itemname','description','desc','product','item','goods','اسم','اسمالصنف','اسمالمنتج','اسمالبضاعه','صنف','منتج','بضاعه','البيان','بيان','السلعه','سلعه'],
  code:        ['code','barcode','sku','itemcode','productcode','ref','reference','partno','partnumber','كود','باركود','رقمالصنف','رقمالمنتج','رمز','مرجع','بارکد'],
  cost:        ['cost','costprice','buyprice','buy','purchase','purchaseprice','avgcost','سعرالشراء','تكلفه','السعرالتكلفه','شراء','سعرالتكلفه','متوسطالتكلفه','تكلفهالوحده'],
  sell:        ['sell','sellprice','price','saleprice','retail','retailprice','unitprice','listprice','سعر','سعرالبيع','بيع','السعرالقطاعي','سعرالقطاعي','سعرقطاعي','مفرق','سعرمفرد'],
  wholesale:   ['wholesale','wholesaleprice','bulkprice','سعرالجمله','جمله','سعرجمله','بالجمله'],
  halfWholesale:['halfwholesale','sellprice2','price2','نصجمله','سعرنصجمله','سعرنصفجمله','نصفجمله'],
  qty:         ['qty','quantity','stock','instock','balance','onhand','currentstock','رصيد','كميه','الكميهالمتاحه','المخزون','المتاح','رصيدالمخزون'],
  category:    ['category','cat','group','type','kind','class','classification','تصنيف','فئه','قسم','مجموعه','نوع','قسمالصنف','النوع'],
  brand:       ['brand','maker','manufacturer','make','ماركه','الماركه','علامه','ماركة','شركهمصنعه'],
  model:       ['model','modelno','موديل','الموديل','رقمالموديل'],
  minStock:    ['min','minqty','minimum','minstock','reorder','reorderpoint','حدادني','الحدالادني','حدأدنى','مخزونحدادني'],
  customerName:['customer','client','customername','clientname','buyer','عميل','العميل','اسمالعميل','زبون','الزبون','اسمالزبون'],
  phone:       ['phone','mobile','tel','telephone','cell','contact','هاتف','تليفون','موبايل','جوال','رقمالهاتف','رقمالتليفون','رقمالموبايل','رقم'],
  balance:     ['balance','debt','due','openingbalance','currentbalance','رصيد','دين','مديونيه','عليه','متبقي','الرصيد','رصيدسابق','رصيدافتتاحي'],
  supplierName:['supplier','vendor','provider','مورد','المورد','اسمالمورد','شركه','الشركهالمورده'],
  expenseName: ['expense','item','desc','description','memo','بيان','مصروف','اسمالمصروف','البند'],
  expenseType: ['type','category','kind','group','نوع','تصنيف','بند','نوعالمصروف'],
  amount:      ['amount','total','value','sum','price','cost','مبلغ','قيمه','المبلغ','القيمه','الاجمالي','اجمالي'],
  date:        ['date','datetime','entrydate','trxdate','createdat','التاريخ','تاريخ','يوم','تاريخالانشاء','تاريخالحركه'],
  notes:       ['notes','note','remark','remarks','comment','ملاحظات','ملاحظه','تعليق'],
  categoryName:['name','category','categoryname','group','اسم','التصنيف','الفئه','القسم','المجموعه','النوع'],
};

function matchCol(columns: string[], bank: string[]): string | null {
  const norm = columns.map(c => ({ raw: c, n: NORM(c) }));
  // exact match first
  for (const k of bank) {
    const nk = NORM(k);
    const ex = norm.find(x => x.n === nk);
    if (ex) return ex.raw;
  }
  // prefix
  for (const k of bank) {
    const nk = NORM(k);
    const p = norm.find(x => x.n.startsWith(nk) || nk.startsWith(x.n));
    if (p) return p.raw;
  }
  // contains
  for (const k of bank) {
    const nk = NORM(k);
    if (nk.length < 3) continue;
    const p = norm.find(x => x.n.includes(nk) || nk.includes(x.n));
    if (p) return p.raw;
  }
  return null;
}

// ---------------- Detection ----------------

export type EntityKind = 'products' | 'customers' | 'suppliers' | 'expenses' | 'categories' | 'unknown';

export interface FieldMap { [pos: string]: string | null }

export interface DetectedTable {
  table: ParsedTable;
  kind: EntityKind;
  confidence: number;
  map: FieldMap;
  tableHint?: EntityKind;
}

function nameHint(tname: string): EntityKind | undefined {
  const n = NORM(tname);
  if (/product|item|stock|صنف|منتج|مخزون|اصناف|بضاعه/.test(n)) return 'products';
  if (/customer|client|عميل|زبون|عملاء/.test(n))               return 'customers';
  if (/supplier|vendor|مورد|موردين/.test(n))                    return 'suppliers';
  if (/expense|مصروف|مصاريف/.test(n))                           return 'expenses';
  if (/categor|group|تصنيف|فئه|قسم|اقسام|مجموعه/.test(n))       return 'categories';
  return undefined;
}

export function detectTable(t: ParsedTable): DetectedTable {
  const hint = nameHint(t.name);
  const candidates: { kind: EntityKind; score: number; map: FieldMap }[] = [];

  // products
  {
    const m: FieldMap = {
      name: matchCol(t.columns, KW.productName),
      code: matchCol(t.columns, KW.code),
      costPrice: matchCol(t.columns, KW.cost),
      sellPrice: matchCol(t.columns, KW.sell),
      wholesalePrice: matchCol(t.columns, KW.wholesale),
      halfWholesalePrice: matchCol(t.columns, KW.halfWholesale),
      quantity: matchCol(t.columns, KW.qty),
      brand: matchCol(t.columns, KW.brand),
      model: matchCol(t.columns, KW.model),
      lowStockThreshold: matchCol(t.columns, KW.minStock),
      category: matchCol(t.columns, KW.category),
    };
    let s = 0;
    if (m.name) s += 2;
    if (m.sellPrice) s += 2;
    if (m.costPrice) s += 1.5;
    if (m.quantity) s += 1.5;
    if (m.code) s += 1;
    if (m.wholesalePrice) s += 0.5;
    candidates.push({ kind: 'products', score: s, map: m });
  }
  // customers
  {
    const m: FieldMap = {
      name: matchCol(t.columns, KW.customerName) || matchCol(t.columns, KW.productName),
      phone: matchCol(t.columns, KW.phone),
      balance: matchCol(t.columns, KW.balance),
      notes: matchCol(t.columns, KW.notes),
    };
    let s = 0;
    if (m.name) s += 1.5;
    if (m.phone) s += 2;
    if (m.balance) s += 1.5;
    candidates.push({ kind: 'customers', score: s, map: m });
  }
  // suppliers
  {
    const m: FieldMap = {
      name: matchCol(t.columns, KW.supplierName) || matchCol(t.columns, KW.customerName),
      phone: matchCol(t.columns, KW.phone),
      balance: matchCol(t.columns, KW.balance),
      notes: matchCol(t.columns, KW.notes),
    };
    let s = 0;
    if (m.name) s += 1.2;
    if (m.phone) s += 1.5;
    if (m.balance) s += 1;
    candidates.push({ kind: 'suppliers', score: s, map: m });
  }
  // expenses
  {
    const m: FieldMap = {
      name: matchCol(t.columns, KW.expenseName),
      amount: matchCol(t.columns, KW.amount),
      type: matchCol(t.columns, KW.expenseType),
      date: matchCol(t.columns, KW.date),
    };
    let s = 0;
    if (m.name) s += 1;
    if (m.amount) s += 2;
    if (m.date) s += 1;
    candidates.push({ kind: 'expenses', score: s, map: m });
  }
  // categories
  {
    const m: FieldMap = { name: matchCol(t.columns, KW.categoryName) };
    let s = 0;
    if (m.name) s += 1;
    if (t.columns.length <= 3) s += 0.5;
    candidates.push({ kind: 'categories', score: s, map: m });
  }

  if (hint) {
    const c = candidates.find(x => x.kind === hint);
    if (c) c.score += 2;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const kind: EntityKind = best.score >= 2 ? best.kind : 'unknown';
  const confidence = Math.min(1, best.score / 6);
  return { table: t, kind, confidence, map: best.map, tableHint: hint };
}

export function detectAll(db: ParsedDb): DetectedTable[] {
  return db.tables.map(detectTable);
}

// ---------------- Value coercion ----------------

function toNum(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = normalizeDigits(String(v)).replace(/\s/g, '');
  // إزالة كل ما ليس رقم/فاصله/ناقص
  s = s.replace(/[^\d.,\-]/g, '');
  // لو فيه فاصلتين (comma + dot): افترض أن ال , فواصل آلاف
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  // لو فيه , فقط اعتبرها فاصلة عشرية
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function toStr(v: any): string { return v == null ? '' : String(v).trim(); }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

// parse dates in many formats: Excel serial, ISO, dd/mm/yyyy, dd-mm-yyyy, arabic digits
function toDate(v: any): string {
  if (v == null || v === '') return new Date().toISOString();
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === 'number' && isFinite(v)) {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  let s = normalizeDigits(String(v)).trim();
  if (!s) return new Date().toISOString();
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    let [, dd, mm, yy, hh = '0', mi = '0', ss = '0'] = m;
    let year = parseInt(yy, 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const d = new Date(year, parseInt(mm,10)-1, parseInt(dd,10), +hh, +mi, +ss);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  products: number;
  customers: number;
  suppliers: number;
  expenses: number;
  categories: number;
  skipped: number;
  perTable: { table: string; kind: EntityKind; affected: number; skipped: number }[];
}

const CATEGORIES_KEY = 'pos_categories';
export function getCategories(): { id: string; name: string }[] {
  try { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]'); } catch { return []; }
}
export function saveCategories(list: { id: string; name: string }[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
}

export interface DetectedSelection extends DetectedTable {
  include: boolean;
  overrideKind?: EntityKind;
}

// ---------------- History + Rollback ----------------

const HISTORY_KEY = 'pos_import_history';
const SNAPSHOT_KEY_PREFIX = 'pos_import_snapshot_';
const MAX_HISTORY = 20;

export interface ImportHistoryEntry {
  id: string;
  timestamp: string;
  source: string;
  mode: ImportMode;
  result: ImportResult;
  canRollback: boolean;
}

export function getImportHistory(): ImportHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveImportHistory(list: ImportHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

function snapshotBefore(id: string) {
  const snap = {
    products: getProducts(),
    customers: getCustomers(),
    suppliers: getSuppliers(),
    expenses: getExpenses(),
    categories: getCategories(),
  };
  try { localStorage.setItem(SNAPSHOT_KEY_PREFIX + id, JSON.stringify(snap)); }
  catch (e) { console.warn('snapshot too large, rollback disabled', e); return false; }
  return true;
}

export function rollbackImport(id: string): boolean {
  const raw = localStorage.getItem(SNAPSHOT_KEY_PREFIX + id);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    saveProducts(s.products || []);
    saveCustomers(s.customers || []);
    saveSuppliers(s.suppliers || []);
    saveExpenses(s.expenses || []);
    saveCategories(s.categories || []);
    localStorage.removeItem(SNAPSHOT_KEY_PREFIX + id);
    // update history
    const h = getImportHistory().map(e => e.id === id ? { ...e, canRollback: false } : e);
    saveImportHistory(h);
    return true;
  } catch { return false; }
}

export function deleteHistoryEntry(id: string) {
  localStorage.removeItem(SNAPSHOT_KEY_PREFIX + id);
  saveImportHistory(getImportHistory().filter(e => e.id !== id));
}

// ---------------- Mapping templates ----------------

const TEMPLATES_KEY = 'pos_import_templates';
export interface MappingTemplate {
  id: string;
  name: string;
  createdAt: string;
  entries: { tableName: string; kind: EntityKind; map: FieldMap }[];
}

export function getMappingTemplates(): MappingTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
export function saveMappingTemplate(name: string, items: DetectedSelection[]): MappingTemplate {
  const list = getMappingTemplates();
  const tpl: MappingTemplate = {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    entries: items.filter(i => i.include).map(i => ({
      tableName: i.table.name,
      kind: (i.overrideKind || i.kind),
      map: i.map,
    })),
  };
  list.unshift(tpl);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list.slice(0, 30)));
  return tpl;
}
export function deleteMappingTemplate(id: string) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(getMappingTemplates().filter(t => t.id !== id)));
}
export function applyMappingTemplate(items: DetectedSelection[], tpl: MappingTemplate): DetectedSelection[] {
  return items.map(it => {
    // match by table name (case-insensitive)
    const found = tpl.entries.find(e => NORM(e.tableName) === NORM(it.table.name));
    if (!found) return it;
    // only keep mapped columns that exist in current table
    const map: FieldMap = {};
    for (const [k, v] of Object.entries(found.map)) {
      if (v && it.table.columns.includes(v)) map[k] = v;
      else map[k] = null;
    }
    return { ...it, overrideKind: found.kind, map, include: true };
  });
}

// ---------------- Import execution ----------------

export function runImport(
  items: DetectedSelection[],
  mode: ImportMode,
  opts: { source?: string; onProgress?: ProgressFn } = {}
): { history: ImportHistoryEntry; result: ImportResult } {
  const res: ImportResult = {
    products: 0, customers: 0, suppliers: 0, expenses: 0, categories: 0, skipped: 0, perTable: [],
  };
  const id = newId();
  opts.onProgress?.({ phase: 'snapshot', percent: 5, message: 'حفظ نسخة استرجاع...' });
  const canRb = snapshotBefore(id);

  if (mode === 'replace') {
    saveProducts([]); saveCustomers([]); saveSuppliers([]); saveExpenses([]); saveCategories([]);
  }

  const products: Product[] = getProducts();
  const customers: Customer[] = getCustomers();
  const suppliers: Supplier[] = getSuppliers();
  const expenses: Expense[] = getExpenses();
  const categories = getCategories();

  const catNames = new Set(categories.map(c => c.name.toLowerCase()));
  const addCategory = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (catNames.has(n.toLowerCase())) return;
    categories.push({ id: newId(), name: n });
    catNames.add(n.toLowerCase());
    res.categories++;
  };

  const activeItems = items.filter(i => i.include);
  const totalRows = activeItems.reduce((s, it) => s + it.table.rows.length, 0) || 1;
  let processed = 0;

  for (const it of activeItems) {
    const kind = it.overrideKind || it.kind;
    const perT = { table: it.table.name, kind, affected: 0, skipped: 0 };
    if (kind === 'unknown') {
      perT.skipped = it.table.rows.length;
      res.skipped += it.table.rows.length;
      res.perTable.push(perT);
      processed += it.table.rows.length;
      continue;
    }
    opts.onProgress?.({
      phase: 'import',
      percent: 10 + Math.round((processed / totalRows) * 85),
      message: `استيراد ${it.table.name}...`,
    });
    const { map, table } = it;

    for (const r of table.rows) {
      try {
        if (kind === 'products') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; perT.skipped++; continue; }
          const code = toStr(r[map.code || '']);
          const catName = toStr(r[map.category || '']);
          if (catName) addCategory(catName);
          const existing = products.find(p => (code && p.code && p.code === code) || p.name === name);
          const patch: Partial<Product> = {
            name,
            code: code || undefined,
            brand: toStr(r[map.brand || '']) || undefined,
            model: toStr(r[map.model || '']) || undefined,
            costPrice: toNum(r[map.costPrice || '']),
            sellPrice: toNum(r[map.sellPrice || '']),
            wholesalePrice: map.wholesalePrice ? toNum(r[map.wholesalePrice]) || undefined : undefined,
            halfWholesalePrice: map.halfWholesalePrice ? toNum(r[map.halfWholesalePrice]) || undefined : undefined,
            quantity: toNum(r[map.quantity || '']),
            lowStockThreshold: toNum(r[map.lowStockThreshold || '']) || 5,
          };
          if (existing) Object.assign(existing, patch);
          else products.push({ id: newId(), createdAt: new Date().toISOString(), ...patch } as Product);
          res.products++; perT.affected++;
        } else if (kind === 'customers') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; perT.skipped++; continue; }
          const phone = toStr(r[map.phone || '']) || undefined;
          const balance = toNum(r[map.balance || '']);
          const existing = customers.find(c => c.name === name && (c.phone || '') === (phone || ''));
          if (existing) { existing.balance = balance; if (phone) existing.phone = phone; }
          else customers.push({ id: newId(), createdAt: new Date().toISOString(), name, phone, balance });
          res.customers++; perT.affected++;
        } else if (kind === 'suppliers') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; perT.skipped++; continue; }
          const phone = toStr(r[map.phone || '']) || undefined;
          const balance = toNum(r[map.balance || '']);
          const notes = toStr(r[map.notes || '']) || undefined;
          const existing = suppliers.find(s => s.name === name);
          if (existing) { existing.balance = balance; if (phone) existing.phone = phone; if (notes) existing.notes = notes; }
          else suppliers.push({ id: newId(), createdAt: new Date().toISOString(), name, phone, balance, notes });
          res.suppliers++; perT.affected++;
        } else if (kind === 'expenses') {
          const name = toStr(r[map.name || '']) || 'مصروف';
          const amount = toNum(r[map.amount || '']);
          if (!amount) { res.skipped++; perT.skipped++; continue; }
          const type = toStr(r[map.type || '']) || 'عام';
          const date = toDate(r[map.date || '']);
          expenses.push({ id: newId(), createdAt: new Date().toISOString(), name, amount, type, date });
          res.expenses++; perT.affected++;
        } else if (kind === 'categories') {
          const name = toStr(r[map.name || '']);
          if (name) { addCategory(name); perT.affected++; }
        }
      } catch {
        res.skipped++; perT.skipped++;
      }
      processed++;
    }
    res.perTable.push(perT);
  }

  opts.onProgress?.({ phase: 'save', percent: 95, message: 'حفظ البيانات...' });
  saveProducts(products);
  saveCustomers(customers);
  saveSuppliers(suppliers);
  saveExpenses(expenses);
  saveCategories(categories);

  const entry: ImportHistoryEntry = {
    id,
    timestamp: new Date().toISOString(),
    source: opts.source || 'ملف مستورد',
    mode,
    result: res,
    canRollback: canRb,
  };
  const hist = getImportHistory();
  hist.unshift(entry);
  saveImportHistory(hist);

  opts.onProgress?.({ phase: 'done', percent: 100, message: 'تم ✓' });
  return { history: entry, result: res };
}

export const KIND_LABEL: Record<EntityKind, string> = {
  products: 'منتجات',
  customers: 'عملاء',
  suppliers: 'موردين',
  expenses: 'مصاريف',
  categories: 'تصنيفات',
  unknown: 'غير معروف',
};
