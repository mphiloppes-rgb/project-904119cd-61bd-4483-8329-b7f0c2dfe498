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
  // Prefer Electron IPC (Node has Buffer, full support)
  if (w?.posElectron?.readMdb) {
    const buf = await file.arrayBuffer();
    const res = await w.posElectron.readMdb(Array.from(new Uint8Array(buf)));
    if (!res?.ok) throw new Error(res?.error || 'فشل قراءة قاعدة البيانات');
    return res.tables as ParsedTable[];
  }
  // Browser fallback: try mdb-reader with Uint8Array (may fail without Buffer polyfill)
  try {
    const mod: any = await import('mdb-reader');
    const MDBReader = mod.default || mod;
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Some versions require Buffer. Polyfill minimally.
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

export async function parseFile(file: File): Promise<ParsedDb> {
  const name = file.name.toLowerCase();
  let tables: ParsedTable[] = [];
  let format: ParsedDb['format'];
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) { format = 'xlsx'; tables = await parseXlsx(file); }
  else if (name.endsWith('.csv')) { format = 'csv'; tables = await parseCsv(file); }
  else if (name.endsWith('.mdb') || name.endsWith('.accdb')) { format = 'mdb'; tables = await parseMdb(file); }
  else throw new Error('صيغة الملف غير مدعومة. المدعوم: .xlsx .xls .csv .mdb .accdb');
  // Drop completely empty tables
  tables = tables.filter(t => t.rows.length > 0 && t.columns.length > 0);
  return { source: file.name, format, tables };
}

// ---------------- Detection heuristics ----------------

export type EntityKind = 'products' | 'customers' | 'suppliers' | 'expenses' | 'categories' | 'unknown';

const NORM = (s: string) => String(s || '').trim().toLowerCase().replace(/[\s_\-.]+/g, '');

// keyword banks (Arabic + English)
const KW = {
  productName: ['name','product','productname','item','itemname','desc','description','اسم','اسمالصنف','اسمالمنتج','صنف','منتج','البيان','بيان'],
  code:        ['code','barcode','sku','itemcode','ref','كود','باركود','رقمالصنف','رمز'],
  cost:        ['cost','costprice','buyprice','buy','purchase','سعرالشراء','تكلفة','التكلفة','شراء','سعرالتكلفة'],
  sell:        ['sell','sellprice','price','saleprice','retail','unitprice','سعر','سعرالبيع','بيع','السعر','سعرالقطاعي'],
  wholesale:   ['wholesale','wholesaleprice','سعرالجملة','جملة'],
  qty:         ['qty','quantity','stock','instock','balance','onhand','رصيد','كمية','الكمية','المخزون','المتاح'],
  category:    ['category','cat','group','type','تصنيف','فئة','قسم','مجموعة','نوع'],
  brand:       ['brand','maker','manufacturer','ماركة','الماركة','علامة'],
  model:       ['model','موديل','الموديل'],
  minStock:    ['min','minqty','minimum','reorder','حدأدنى','حدادنى','الحدالادنى'],
  customerName:['customer','client','customername','عميل','العميل','اسمالعميل','زبون'],
  phone:       ['phone','mobile','tel','telephone','هاتف','تليفون','موبايل','جوال','رقم'],
  balance:     ['balance','debt','due','رصيد','دين','مديونية','عليه','متبقي'],
  supplierName:['supplier','vendor','مورد','المورد','اسمالمورد','شركة'],
  expenseName: ['expense','item','desc','description','بيان','مصروف','اسمالمصروف'],
  expenseType: ['type','category','نوع','تصنيف','بند'],
  amount:      ['amount','total','value','مبلغ','قيمة','المبلغ','القيمة'],
  date:        ['date','datetime','التاريخ','تاريخ','يوم'],
  notes:       ['notes','note','remark','ملاحظات','ملاحظة'],
  categoryName:['name','category','categoryname','اسم','التصنيف','الفئة','القسم','المجموعة','النوع'],
};

function matchCol(columns: string[], bank: string[]): string | null {
  const norm = columns.map(c => ({ raw: c, n: NORM(c) }));
  for (const k of bank) {
    const nk = NORM(k);
    // exact
    const ex = norm.find(x => x.n === nk);
    if (ex) return ex.raw;
  }
  for (const k of bank) {
    const nk = NORM(k);
    const p = norm.find(x => x.n.includes(nk) || nk.includes(x.n));
    if (p) return p.raw;
  }
  return null;
}

export interface FieldMap { [pos: string]: string | null }

export interface DetectedTable {
  table: ParsedTable;
  kind: EntityKind;
  confidence: number;      // 0..1
  map: FieldMap;
  // heuristic hint from table name
  tableHint?: EntityKind;
}

function nameHint(tname: string): EntityKind | undefined {
  const n = NORM(tname);
  if (/product|item|stock|صنف|منتج|مخزون|اصناف/.test(n)) return 'products';
  if (/customer|client|عميل|زبون|عملاء/.test(n))       return 'customers';
  if (/supplier|vendor|مورد|موردين/.test(n))          return 'suppliers';
  if (/expense|مصروف|مصاريف/.test(n))                 return 'expenses';
  if (/category|cat|تصنيف|فئة|قسم|اقسام|مجموعة/.test(n)) return 'categories';
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
    // Only count if it's likely people not products
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
  // categories (simple list)
  {
    const m: FieldMap = { name: matchCol(t.columns, KW.categoryName) };
    let s = 0;
    if (m.name) s += 1;
    if (t.columns.length <= 3) s += 0.5;
    candidates.push({ kind: 'categories', score: s, map: m });
  }

  // apply name hint bonus
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

// ---------------- Import execution ----------------

function toNum(v: any): number {
  if (v == null || v === '') return 0;
  const s = String(v).replace(/[,\s]/g, '').replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function toStr(v: any): string { return v == null ? '' : String(v).trim(); }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  products: number;
  customers: number;
  suppliers: number;
  expenses: number;
  categories: number;
  skipped: number;
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
  overrideKind?: EntityKind;   // user may change kind
}

export function runImport(items: DetectedSelection[], mode: ImportMode): ImportResult {
  const res: ImportResult = { products: 0, customers: 0, suppliers: 0, expenses: 0, categories: 0, skipped: 0 };

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

  for (const it of items) {
    if (!it.include) continue;
    const kind = it.overrideKind || it.kind;
    if (kind === 'unknown') { res.skipped += it.table.rows.length; continue; }
    const { map, table } = it;

    for (const r of table.rows) {
      try {
        if (kind === 'products') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; continue; }
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
            quantity: toNum(r[map.quantity || '']),
            lowStockThreshold: toNum(r[map.lowStockThreshold || '']) || 5,
          };
          if (existing) {
            Object.assign(existing, patch);
          } else {
            products.push({ id: newId(), createdAt: new Date().toISOString(), ...patch } as Product);
          }
          res.products++;
        } else if (kind === 'customers') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; continue; }
          const phone = toStr(r[map.phone || '']) || undefined;
          const balance = toNum(r[map.balance || '']);
          const existing = customers.find(c => c.name === name && (c.phone || '') === (phone || ''));
          if (existing) { existing.balance = balance; if (phone) existing.phone = phone; }
          else customers.push({ id: newId(), createdAt: new Date().toISOString(), name, phone, balance });
          res.customers++;
        } else if (kind === 'suppliers') {
          const name = toStr(r[map.name || '']);
          if (!name) { res.skipped++; continue; }
          const phone = toStr(r[map.phone || '']) || undefined;
          const balance = toNum(r[map.balance || '']);
          const notes = toStr(r[map.notes || '']) || undefined;
          const existing = suppliers.find(s => s.name === name);
          if (existing) { existing.balance = balance; if (phone) existing.phone = phone; if (notes) existing.notes = notes; }
          else suppliers.push({ id: newId(), createdAt: new Date().toISOString(), name, phone, balance, notes });
          res.suppliers++;
        } else if (kind === 'expenses') {
          const name = toStr(r[map.name || '']) || 'مصروف';
          const amount = toNum(r[map.amount || '']);
          if (!amount) { res.skipped++; continue; }
          const type = toStr(r[map.type || '']) || 'عام';
          const dateRaw = r[map.date || ''];
          let date: string;
          try { date = new Date(dateRaw).toISOString(); } catch { date = new Date().toISOString(); }
          expenses.push({ id: newId(), createdAt: new Date().toISOString(), name, amount, type, date });
          res.expenses++;
        } else if (kind === 'categories') {
          const name = toStr(r[map.name || '']);
          if (name) addCategory(name);
        }
      } catch {
        res.skipped++;
      }
    }
  }

  saveProducts(products);
  saveCustomers(customers);
  saveSuppliers(suppliers);
  saveExpenses(expenses);
  saveCategories(categories);
  return res;
}

export const KIND_LABEL: Record<EntityKind, string> = {
  products: 'منتجات',
  customers: 'عملاء',
  suppliers: 'موردين',
  expenses: 'مصاريف',
  categories: 'تصنيفات',
  unknown: 'غير معروف',
};
