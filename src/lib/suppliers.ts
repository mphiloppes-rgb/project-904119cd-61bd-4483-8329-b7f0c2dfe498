// Suppliers + Purchase invoices store

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  balance: number; // positive = we owe supplier (shop debt), negative = supplier owes us
  createdAt: string;
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseInvoiceItem[];
  total: number;
  paid: number;
  remaining: number;
  notes?: string;
  createdAt: string;
}

import { getProducts, saveProducts } from './store';
import { logPriceChange } from './price-history';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}
function setItem<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Suppliers
export function getSuppliers(): Supplier[] {
  return getItem<Supplier[]>('pos_suppliers', []);
}
export function saveSuppliers(s: Supplier[]) {
  setItem('pos_suppliers', s);
}
export function addSupplier(s: Omit<Supplier, 'id' | 'createdAt' | 'balance'> & { balance?: number }): Supplier {
  const list = getSuppliers();
  const supplier: Supplier = {
    ...s,
    balance: s.balance || 0,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  list.push(supplier);
  saveSuppliers(list);
  return supplier;
}
export function updateSupplier(id: string, updates: Partial<Supplier>) {
  saveSuppliers(getSuppliers().map(s => s.id === id ? { ...s, ...updates } : s));
}
export function deleteSupplier(id: string) {
  saveSuppliers(getSuppliers().filter(s => s.id !== id));
}
export function getSuppliersWithDebt(): Supplier[] {
  return getSuppliers().filter(s => s.balance > 0);
}

// Purchase Invoices
export function getPurchaseInvoices(): PurchaseInvoice[] {
  return getItem<PurchaseInvoice[]>('pos_purchase_invoices', []);
}
export function savePurchaseInvoices(list: PurchaseInvoice[]) {
  setItem('pos_purchase_invoices', list);
}

function generatePurchaseInvoiceNumber(): string {
  const list = getPurchaseInvoices();
  const lastNum = list.reduce((max, inv) => {
    const n = parseInt(inv.invoiceNumber || '0');
    return n > max ? n : max;
  }, 0);
  return 'P-' + String(lastNum + 1).padStart(6, '0');
}

export function addPurchaseInvoice(inv: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'invoiceNumber'>): PurchaseInvoice {
  const list = getPurchaseInvoices();
  const invoice: PurchaseInvoice = {
    ...inv,
    id: generateId(),
    invoiceNumber: generatePurchaseInvoiceNumber(),
    createdAt: new Date().toISOString(),
  };
  list.push(invoice);
  savePurchaseInvoices(list);

  // Add stock to products + log price changes
  const products = getProducts();
  inv.items.forEach(item => {
    const idx = products.findIndex(p => p.id === item.productId);
    if (idx !== -1) {
      const oldCost = products[idx].costPrice;
      products[idx].quantity += item.quantity;
      products[idx].costPrice = item.unitCost;
      if (oldCost !== item.unitCost) {
        logPriceChange({
          productId: products[idx].id,
          productName: products[idx].name,
          oldCost,
          newCost: item.unitCost,
          reason: `فاتورة شراء #${invoice.invoiceNumber} — ${invoice.supplierName}`,
          source: invoice.id,
        });
      }
    }
  });
  saveProducts(products);

  // Add remaining to supplier balance (shop owes supplier)
  if (inv.remaining > 0) {
    const suppliers = getSuppliers();
    const sidx = suppliers.findIndex(s => s.id === inv.supplierId);
    if (sidx !== -1) {
      suppliers[sidx].balance += inv.remaining;
      saveSuppliers(suppliers);
    }
  }

  return invoice;
}

export function paySupplierForInvoice(purchaseId: string, amount: number): boolean {
  if (amount <= 0) return false;
  const list = getPurchaseInvoices();
  const idx = list.findIndex(i => i.id === purchaseId);
  if (idx === -1) return false;

  const inv = list[idx];
  const actual = Math.min(amount, inv.remaining);
  if (actual <= 0) return false;

  inv.paid += actual;
  inv.remaining = Math.max(0, inv.total - inv.paid);
  savePurchaseInvoices(list);

  const suppliers = getSuppliers();
  const sidx = suppliers.findIndex(s => s.id === inv.supplierId);
  if (sidx !== -1) {
    suppliers[sidx].balance = Math.max(0, suppliers[sidx].balance - actual);
    saveSuppliers(suppliers);
  }
  return true;
}

export function paySupplierDebt(supplierId: string, amount: number, note?: string): boolean {
  if (amount <= 0) return false;
  const suppliers = getSuppliers();
  const sidx = suppliers.findIndex(s => s.id === supplierId);
  if (sidx === -1) return false;

  let remaining = amount;
  const list = getPurchaseInvoices();
  const supplierInvoices = list
    .filter(i => i.supplierId === supplierId && i.remaining > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  supplierInvoices.forEach(inv => {
    if (remaining <= 0) return;
    const idx = list.findIndex(i => i.id === inv.id);
    const pay = Math.min(remaining, inv.remaining);
    list[idx].paid += pay;
    list[idx].remaining = Math.max(0, list[idx].total - list[idx].paid);
    remaining -= pay;
  });

  savePurchaseInvoices(list);
  suppliers[sidx].balance = Math.max(0, suppliers[sidx].balance - amount);
  saveSuppliers(suppliers);

  // Log payment
  const payments = getItem<any[]>('pos_supplier_payments', []);
  payments.push({ id: generateId(), supplierId, amount, date: new Date().toISOString(), note });
  setItem('pos_supplier_payments', payments);
  return true;
}

export function deletePurchaseInvoice(id: string): boolean {
  const list = getPurchaseInvoices();
  const idx = list.findIndex(i => i.id === id);
  if (idx === -1) return false;
  const inv = list[idx];

  // Remove stock back
  const products = getProducts();
  inv.items.forEach(item => {
    const pidx = products.findIndex(p => p.id === item.productId);
    if (pidx !== -1) {
      products[pidx].quantity = Math.max(0, products[pidx].quantity - item.quantity);
    }
  });
  saveProducts(products);

  // Refund supplier balance
  if (inv.remaining > 0) {
    const suppliers = getSuppliers();
    const sidx = suppliers.findIndex(s => s.id === inv.supplierId);
    if (sidx !== -1) {
      suppliers[sidx].balance = Math.max(0, suppliers[sidx].balance - inv.remaining);
      saveSuppliers(suppliers);
    }
  }

  list.splice(idx, 1);
  savePurchaseInvoices(list);
  return true;
}

export function getPurchaseInvoicesBySupplier(supplierId: string): PurchaseInvoice[] {
  return getPurchaseInvoices()
    .filter(i => i.supplierId === supplierId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
