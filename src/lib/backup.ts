import { getProducts, getCustomers, getInvoices, getExpenses, saveProducts, saveCustomers, saveInvoices, saveExpenses } from './store';

const EXTRA_KEYS = [
  'pos_suppliers',
  'pos_purchase_invoices',
  'pos_supplier_payments',
  'pos_customer_payments',
  'pos_price_changes',
  'pos_users',
  'pos_auth_enabled',
  'pos_viewer_save_path',
  'pos_auto_backup_interval_ms',
];

export function exportBackup(): string {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    products: getProducts(),
    customers: getCustomers(),
    invoices: getInvoices(),
    expenses: getExpenses(),
    extra: EXTRA_KEYS.reduce<Record<string, string>>((acc, key) => {
      const value = localStorage.getItem(key);
      if (value != null) acc[key] = value;
      return acc;
    }, {}),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadBackup() {
  const json = exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(file: File): Promise<{ products: number; customers: number; invoices: number; expenses: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.products || !data.customers || !data.invoices || !data.expenses) {
          throw new Error('ملف غير صالح');
        }
        saveProducts(data.products);
        saveCustomers(data.customers);
        saveInvoices(data.invoices);
        saveExpenses(data.expenses);
        if (data.extra && typeof data.extra === 'object') {
          Object.entries(data.extra).forEach(([key, value]) => {
            if (EXTRA_KEYS.includes(key) && typeof value === 'string') localStorage.setItem(key, value);
          });
        }
        resolve({
          products: data.products.length,
          customers: data.customers.length,
          invoices: data.invoices.length,
          expenses: data.expenses.length,
        });
      } catch {
        reject(new Error('ملف النسخة الاحتياطية غير صالح'));
      }
    };
    reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
    reader.readAsText(file);
  });
}
