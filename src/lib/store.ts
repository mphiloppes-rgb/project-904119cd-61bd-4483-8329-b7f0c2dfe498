// Local storage based data store

export interface Product {
  id: string;
  name: string;
  code?: string; // باركود / كود
  brand?: string;
  model?: string;
  costPrice: number;
  sellPrice: number; // سعر القطاعي (default)
  wholesalePrice?: number; // سعر الجملة
  halfWholesalePrice?: number; // سعر نص جملة
  wholesaleMinQty?: number; // الكمية اللي تفعّل سعر الجملة
  halfWholesaleMinQty?: number; // الكمية اللي تفعّل نص جملة
  quantity: number;
  lowStockThreshold: number;
  preferredSupplierId?: string;
  createdAt: string;
}

// يرجع السعر المناسب حسب الكمية
export function getTierPrice(p: Product, qty: number): number {
  if (p.wholesalePrice && p.wholesaleMinQty && qty >= p.wholesaleMinQty) return p.wholesalePrice;
  if (p.halfWholesalePrice && p.halfWholesaleMinQty && qty >= p.halfWholesaleMinQty) return p.halfWholesalePrice;
  return p.sellPrice;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  balance: number; // positive = they owe us, negative = we owe them
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
  discount?: number; // خصم مبلغ على هذا الصنف
  discountType?: 'amount' | 'percent';
  discountValue?: number; // القيمة قبل التحويل (لو نسبة)
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal?: number; // الإجمالي قبل خصم الفاتورة
  invoiceDiscount?: number; // مبلغ خصم على الفاتورة كاملة
  invoiceDiscountType?: 'amount' | 'percent';
  invoiceDiscountValue?: number;
  itemsDiscountTotal?: number; // مجموع خصومات الأصناف
  total: number;
  paid: number;
  remaining: number;
  customerId?: string;
  customerName?: string;
  status?: 'saved' | 'completed'; // saved = محفوظة بدون طباعة، completed = مكتملة
  isReturned?: boolean;
  returnedItems?: ReturnedItem[];
  createdAt: string;
}

export interface ReturnedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  returnedAt: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: string;
  date: string;
  createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateInvoiceNumber(): string {
  const invoices = getItem<Invoice[]>('pos_invoices', []);
  const lastNum = invoices.reduce((max, inv) => {
    const n = parseInt(inv.invoiceNumber || '0');
    return n > max ? n : max;
  }, 0);
  return String(lastNum + 1).padStart(6, '0');
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

// Products
export function getProducts(): Product[] {
  return getItem<Product[]>('pos_products', []);
}
export function saveProducts(products: Product[]) {
  setItem('pos_products', products);
}
export function addProduct(p: Omit<Product, 'id' | 'createdAt'>): Product {
  const products = getProducts();
  const product: Product = { ...p, id: generateId(), createdAt: new Date().toISOString() };
  products.push(product);
  saveProducts(products);
  return product;
}
export function updateProduct(id: string, updates: Partial<Product>) {
  const products = getProducts().map(p => p.id === id ? { ...p, ...updates } : p);
  saveProducts(products);
}
export function deleteProduct(id: string) {
  saveProducts(getProducts().filter(p => p.id !== id));
}
export function getLowStockProducts(): Product[] {
  return getProducts().filter(p => p.quantity <= p.lowStockThreshold);
}

// Customers
export function getCustomers(): Customer[] {
  return getItem<Customer[]>('pos_customers', []);
}
export function saveCustomers(customers: Customer[]) {
  setItem('pos_customers', customers);
}
export function addCustomer(c: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const customers = getCustomers();
  const customer: Customer = { ...c, id: generateId(), createdAt: new Date().toISOString() };
  customers.push(customer);
  saveCustomers(customers);
  return customer;
}
export function updateCustomer(id: string, updates: Partial<Customer>) {
  const customers = getCustomers().map(c => c.id === id ? { ...c, ...updates } : c);
  saveCustomers(customers);
}
export function deleteCustomer(id: string) {
  saveCustomers(getCustomers().filter(c => c.id !== id));
}
export function getCustomersWithDebt(): Customer[] {
  return getCustomers().filter(c => c.balance > 0);
}

// Invoices
export function getInvoices(): Invoice[] {
  return getItem<Invoice[]>('pos_invoices', []);
}
export function saveInvoices(invoices: Invoice[]) {
  setItem('pos_invoices', invoices);
}
export function addInvoice(inv: Omit<Invoice, 'id' | 'createdAt' | 'invoiceNumber'>): Invoice {
  const invoices = getInvoices();
  const invoice: Invoice = { ...inv, id: generateId(), invoiceNumber: generateInvoiceNumber(), createdAt: new Date().toISOString() };
  invoices.push(invoice);
  saveInvoices(invoices);

  // Update product quantities
  const products = getProducts();
  inv.items.forEach(item => {
    const idx = products.findIndex(p => p.id === item.productId);
    if (idx !== -1) {
      products[idx].quantity = Math.max(0, products[idx].quantity - item.quantity);
    }
  });
  saveProducts(products);

  // Update customer balance if applicable
  if (inv.customerId && inv.remaining > 0) {
    const customers = getCustomers();
    const cidx = customers.findIndex(c => c.id === inv.customerId);
    if (cidx !== -1) {
      customers[cidx].balance += inv.remaining;
      saveCustomers(customers);
    }
  }

  return invoice;
}

export function assignInvoiceToCustomer(invoiceId: string, customerId: string): void {
  const invoices = getInvoices();
  const customers = getCustomers();
  const idx = invoices.findIndex(i => i.id === invoiceId);
  const customer = customers.find(c => c.id === customerId);
  if (idx === -1 || !customer) return;
  
  invoices[idx].customerId = customerId;
  invoices[idx].customerName = customer.name;
  
  // If there's remaining balance, add to customer
  if (invoices[idx].remaining > 0) {
    const cidx = customers.findIndex(c => c.id === customerId);
    if (cidx !== -1) {
      customers[cidx].balance += invoices[idx].remaining;
      saveCustomers(customers);
    }
  }
  saveInvoices(invoices);
}

export function returnInvoiceFull(invoiceId: string): boolean {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === invoiceId);
  if (idx === -1 || invoices[idx].isReturned) return false;
  
  const inv = invoices[idx];
  inv.isReturned = true;
  inv.returnedItems = inv.items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    returnedAt: new Date().toISOString(),
  }));
  
  // Return stock
  const products = getProducts();
  inv.items.forEach(item => {
    const pidx = products.findIndex(p => p.id === item.productId);
    if (pidx !== -1) products[pidx].quantity += item.quantity;
  });
  saveProducts(products);
  
  // Adjust customer balance
  if (inv.customerId && inv.remaining > 0) {
    const customers = getCustomers();
    const cidx = customers.findIndex(c => c.id === inv.customerId);
    if (cidx !== -1) {
      customers[cidx].balance = Math.max(0, customers[cidx].balance - inv.remaining);
      saveCustomers(customers);
    }
  }
  
  saveInvoices(invoices);
  return true;
}

export function returnInvoiceItem(invoiceId: string, productId: string, returnQty: number): boolean {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === invoiceId);
  if (idx === -1) return false;
  
  const inv = invoices[idx];
  const itemIdx = inv.items.findIndex(it => it.productId === productId);
  if (itemIdx === -1) return false;
  
  const item = inv.items[itemIdx];
  const alreadyReturned = (inv.returnedItems || []).filter(r => r.productId === productId).reduce((s, r) => s + r.quantity, 0);
  if (returnQty > item.quantity - alreadyReturned) return false;
  
  if (!inv.returnedItems) inv.returnedItems = [];
  inv.returnedItems.push({
    productId: item.productId,
    productName: item.productName,
    quantity: returnQty,
    unitPrice: item.unitPrice,
    total: returnQty * item.unitPrice,
    returnedAt: new Date().toISOString(),
  });
  
  // Update invoice totals
  const totalReturned = inv.returnedItems.reduce((s, r) => s + r.total, 0);
  inv.total = inv.items.reduce((s, it) => s + it.total, 0) - totalReturned;
  inv.remaining = Math.max(0, inv.total - inv.paid);
  
  // Check if all items fully returned
  const allReturned = inv.items.every(it => {
    const retQty = inv.returnedItems!.filter(r => r.productId === it.productId).reduce((s, r) => s + r.quantity, 0);
    return retQty >= it.quantity;
  });
  if (allReturned) inv.isReturned = true;
  
  // Return stock
  const products = getProducts();
  const pidx = products.findIndex(p => p.id === productId);
  if (pidx !== -1) products[pidx].quantity += returnQty;
  saveProducts(products);
  
  saveInvoices(invoices);
  return true;
}

export function getInvoiceByNumber(invoiceNumber: string): Invoice | undefined {
  return getInvoices().find(i => i.invoiceNumber === invoiceNumber);
}

export function getInvoicesByCustomer(customerId: string): Invoice[] {
  return getInvoices().filter(i => i.customerId === customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Pay additional amount on an invoice
export function payInvoice(invoiceId: string, amount: number): boolean {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === invoiceId);
  if (idx === -1 || amount <= 0) return false;
  
  const inv = invoices[idx];
  const actualPayment = Math.min(amount, inv.remaining);
  if (actualPayment <= 0) return false;
  
  inv.paid += actualPayment;
  inv.remaining = Math.max(0, inv.total - inv.paid);
  saveInvoices(invoices);
  
  // Update customer balance
  if (inv.customerId) {
    const customers = getCustomers();
    const cidx = customers.findIndex(c => c.id === inv.customerId);
    if (cidx !== -1) {
      customers[cidx].balance = Math.max(0, customers[cidx].balance - actualPayment);
      saveCustomers(customers);
    }
  }
  
  return true;
}

// Pay customer debt directly (distributes across oldest invoices first)
export function payCustomerDebt(customerId: string, amount: number, note?: string): boolean {
  if (amount <= 0) return false;
  const customers = getCustomers();
  const cidx = customers.findIndex(c => c.id === customerId);
  if (cidx === -1) return false;
  
  let remaining = amount;
  const invoices = getInvoices();
  const customerInvoices = invoices
    .filter(i => i.customerId === customerId && i.remaining > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  customerInvoices.forEach(inv => {
    if (remaining <= 0) return;
    const idx = invoices.findIndex(i => i.id === inv.id);
    const pay = Math.min(remaining, inv.remaining);
    invoices[idx].paid += pay;
    invoices[idx].remaining = Math.max(0, invoices[idx].total - invoices[idx].paid);
    remaining -= pay;
  });
  
  saveInvoices(invoices);
  customers[cidx].balance = Math.max(0, customers[cidx].balance - amount);
  saveCustomers(customers);

  // Log payment
  const allPayments = getItem<CustomerPayment[]>('pos_customer_payments', []);
  allPayments.push({ id: generateId(), customerId, amount, date: new Date().toISOString(), note });
  setItem('pos_customer_payments', allPayments);
  return true;
}
export function getTodayInvoices(): Invoice[] {
  const today = new Date().toISOString().split('T')[0];
  return getInvoices().filter(i => i.createdAt.startsWith(today));
}

// Find product by barcode/code (exact match)
export function findProductByCode(code: string): Product | undefined {
  const c = code.trim().toLowerCase();
  if (!c) return undefined;
  return getProducts().find(p => p.code?.toLowerCase() === c);
}

// Customer payments log (for unified statement view)
export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
}
export function getCustomerPayments(customerId?: string): CustomerPayment[] {
  const all = getItem<CustomerPayment[]>('pos_customer_payments', []);
  return customerId ? all.filter(p => p.customerId === customerId) : all;
}
export function addCustomerPayment(p: Omit<CustomerPayment, 'id' | 'date'>): CustomerPayment {
  const all = getItem<CustomerPayment[]>('pos_customer_payments', []);
  const payment: CustomerPayment = { ...p, id: generateId(), date: new Date().toISOString() };
  all.push(payment);
  setItem('pos_customer_payments', all);
  return payment;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  date: string;
  note?: string;
}
export function getSupplierPayments(supplierId?: string): SupplierPayment[] {
  const all = getItem<SupplierPayment[]>('pos_supplier_payments', []);
  return supplierId ? all.filter(p => p.supplierId === supplierId) : all;
}
export function addSupplierPayment(p: Omit<SupplierPayment, 'id' | 'date'>): SupplierPayment {
  const all = getItem<SupplierPayment[]>('pos_supplier_payments', []);
  const payment: SupplierPayment = { ...p, id: generateId(), date: new Date().toISOString() };
  all.push(payment);
  setItem('pos_supplier_payments', all);
  return payment;
}

// Expenses
export function getExpenses(): Expense[] {
  return getItem<Expense[]>('pos_expenses', []);
}
export function saveExpenses(expenses: Expense[]) {
  setItem('pos_expenses', expenses);
}
export function addExpense(e: Omit<Expense, 'id' | 'createdAt'>): Expense {
  const expenses = getExpenses();
  const expense: Expense = { ...e, id: generateId(), createdAt: new Date().toISOString() };
  expenses.push(expense);
  saveExpenses(expenses);
  return expense;
}
export function deleteExpense(id: string) {
  saveExpenses(getExpenses().filter(e => e.id !== id));
}
export function getTodayExpenses(): Expense[] {
  const today = new Date().toISOString().split('T')[0];
  return getExpenses().filter(e => e.date.startsWith(today));
}

// Reports
export function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'daily': break;
    case 'weekly': start.setDate(start.getDate() - 7); break;
    case 'monthly': start.setMonth(start.getMonth() - 1); break;
    case 'yearly': start.setFullYear(start.getFullYear() - 1); break;
  }
  return { start, end };
}

export function getReport(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const { start, end } = getDateRange(period);
  const allInvoices = getInvoices().filter(i => {
    const d = new Date(i.createdAt);
    return d >= start && d <= end;
  });
  const expenses = getExpenses().filter(e => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  // Purchase invoices in range
  let purchaseInvoices: any[] = [];
  try {
    const purchases = JSON.parse(localStorage.getItem('pos_purchase_invoices') || '[]');
    purchaseInvoices = purchases.filter((p: any) => {
      const d = new Date(p.createdAt);
      return d >= start && d <= end;
    });
  } catch {}

  // Compute net qty per item per invoice (after returns)
  const invoiceNetItems = allInvoices.map(inv => {
    const returnedMap: Record<string, number> = {};
    (inv.returnedItems || []).forEach(r => {
      returnedMap[r.productId] = (returnedMap[r.productId] || 0) + r.quantity;
    });
    const items = inv.items.map(it => {
      const retQty = returnedMap[it.productId] || 0;
      const netQty = it.quantity - retQty;
      return {
        ...it,
        netQty,
        netRevenue: netQty * it.unitPrice,
        netCost: netQty * it.costPrice,
        profit: netQty * (it.unitPrice - it.costPrice),
      };
    });
    const netTotal = items.reduce((s, it) => s + it.netRevenue, 0);
    const netCost = items.reduce((s, it) => s + it.netCost, 0);
    return { invoice: inv, items, netTotal, netCost };
  });

  const totalSales = invoiceNetItems.reduce((s, x) => s + x.netTotal, 0);
  const totalCost = invoiceNetItems.reduce((s, x) => s + x.netCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalReturns = allInvoices.reduce((s, inv) => {
    return s + (inv.returnedItems || []).reduce((a, r) => a + r.total, 0);
  }, 0);
  const netProfit = totalSales - totalCost - totalExpenses;

  // Best selling products (by net qty)
  const productSales: Record<string, { name: string; qty: number; revenue: number; cost: number; profit: number }> = {};
  invoiceNetItems.forEach(({ items }) => {
    items.forEach(item => {
      if (item.netQty <= 0) return;
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0, cost: 0, profit: 0 };
      }
      productSales[item.productId].qty += item.netQty;
      productSales[item.productId].revenue += item.netRevenue;
      productSales[item.productId].cost += item.netCost;
      productSales[item.productId].profit += item.profit;
    });
  });
  const bestSelling = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const productProfits = Object.values(productSales).sort((a, b) => b.profit - a.profit);

  // Returns details
  const returnsDetails: Array<{ invoiceNumber: string; productName: string; quantity: number; total: number; returnedAt: string }> = [];
  allInvoices.forEach(inv => {
    (inv.returnedItems || []).forEach(r => {
      returnsDetails.push({
        invoiceNumber: inv.invoiceNumber,
        productName: r.productName,
        quantity: r.quantity,
        total: r.total,
        returnedAt: r.returnedAt,
      });
    });
  });

  // Sales invoices details
  const salesDetails = invoiceNetItems.map(({ invoice, netTotal }) => ({
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    customerName: invoice.customerName || 'بدون عميل',
    total: netTotal,
    paid: invoice.paid,
    remaining: invoice.remaining,
    isReturned: !!invoice.isReturned,
  }));

  return {
    totalSales,
    totalCost,
    totalExpenses,
    totalReturns,
    netProfit,
    invoiceCount: allInvoices.length,
    bestSelling,
    productProfits,
    returnsDetails,
    salesDetails,
    expensesDetails: expenses,
    purchaseDetails: purchaseInvoices,
    totalPurchases: purchaseInvoices.reduce((s, p) => s + (p.total || 0), 0),
  };
}
