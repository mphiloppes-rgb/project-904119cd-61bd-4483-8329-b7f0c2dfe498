import * as XLSX from 'xlsx';
import { getProducts, getCustomers, getInvoices, getExpenses, getReport } from './store';

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportProductsToExcel() {
  const products = getProducts();
  const data = products.map(p => ({
    'الاسم': p.name,
    'الكود': p.code || '-',
    'الماركة': p.brand || '-',
    'الموديل': p.model || '-',
    'سعر الشراء': p.costPrice,
    'سعر البيع': p.sellPrice,
    'الكمية': p.quantity,
    'حد التنبيه': p.lowStockThreshold,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Array(8).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
  downloadWorkbook(wb, 'المنتجات.xlsx');
}

export function exportCustomersToExcel() {
  const customers = getCustomers();
  const data = customers.map(c => ({
    'الاسم': c.name,
    'الهاتف': c.phone || '-',
    'الرصيد': c.balance,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Array(3).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  downloadWorkbook(wb, 'العملاء.xlsx');
}

export function exportInvoicesToExcel() {
  const invoices = getInvoices();
  const data = invoices.map(inv => ({
    'رقم الفاتورة': inv.id,
    'التاريخ': new Date(inv.createdAt).toLocaleDateString('ar-EG'),
    'العميل': inv.customerName || 'بدون عميل',
    'الإجمالي': inv.total,
    'المدفوع': inv.paid,
    'المتبقي': inv.remaining,
    'عدد الأصناف': inv.items.length,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Array(7).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
  downloadWorkbook(wb, 'الفواتير.xlsx');
}

export function exportExpensesToExcel() {
  const expenses = getExpenses();
  const data = expenses.map(e => ({
    'الاسم': e.name,
    'المبلغ': e.amount,
    'النوع': e.type,
    'التاريخ': e.date,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Array(4).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, 'المصاريف');
  downloadWorkbook(wb, 'المصاريف.xlsx');
}

export function exportReportToExcel(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const report = getReport(period);
  const labels: Record<string, string> = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' };
  
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summary = [
    ['تقرير ' + labels[period]],
    [''],
    ['البند', 'القيمة'],
    ['إجمالي المبيعات', report.totalSales],
    ['تكلفة المشتريات', report.totalCost],
    ['إجمالي المصاريف', report.totalExpenses],
    ['صافي الربح', report.netProfit],
    ['عدد الفواتير', report.invoiceCount],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'ملخص');

  // Best selling
  if (report.bestSelling.length > 0) {
    const bestData = report.bestSelling.map((p, i) => ({
      'الترتيب': i + 1,
      'المنتج': p.name,
      'الكمية المباعة': p.qty,
      'الإيراد': p.revenue,
    }));
    const ws2 = XLSX.utils.json_to_sheet(bestData);
    ws2['!cols'] = Array(4).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws2, 'أفضل المنتجات');
  }

  downloadWorkbook(wb, `تقرير_${labels[period]}.xlsx`);
}

export function exportAllDataToExcel() {
  const wb = XLSX.utils.book_new();

  // Products
  const products = getProducts().map(p => ({
    'الاسم': p.name, 'الكود': p.code || '-', 'الماركة': p.brand || '-',
    'سعر الشراء': p.costPrice, 'سعر البيع': p.sellPrice, 'الكمية': p.quantity,
  }));
  const ws1 = XLSX.utils.json_to_sheet(products);
  ws1['!cols'] = Array(6).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws1, 'المنتجات');

  // Customers
  const customers = getCustomers().map(c => ({
    'الاسم': c.name, 'الهاتف': c.phone || '-', 'الرصيد': c.balance,
  }));
  const ws2 = XLSX.utils.json_to_sheet(customers);
  ws2['!cols'] = Array(3).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws2, 'العملاء');

  // Invoices
  const invoices = getInvoices().map(inv => ({
    'التاريخ': new Date(inv.createdAt).toLocaleDateString('ar-EG'),
    'العميل': inv.customerName || '-', 'الإجمالي': inv.total,
    'المدفوع': inv.paid, 'المتبقي': inv.remaining,
  }));
  const ws3 = XLSX.utils.json_to_sheet(invoices);
  ws3['!cols'] = Array(5).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws3, 'الفواتير');

  // Expenses
  const expenses = getExpenses().map(e => ({
    'الاسم': e.name, 'المبلغ': e.amount, 'النوع': e.type, 'التاريخ': e.date,
  }));
  const ws4 = XLSX.utils.json_to_sheet(expenses);
  ws4['!cols'] = Array(4).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws4, 'المصاريف');

  downloadWorkbook(wb, 'بيانات_كاملة.xlsx');
}

// ================= Extra: Monthly profit / Debts / CSV =================
import { getInvoices, getInvoiceOriginalTotal, getInvoiceNetTotal, getInvoiceInitialPaid } from './store';

function monthKey(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthLabel(k: string) { const [y,m]=k.split('-'); return `${m}/${y}`; }

interface MonthRow { month: string; sales: number; cost: number; expenses: number; returns: number; purchases: number; profit: number; invoices: number; }

function buildMonthlyRows(): MonthRow[] {
  const invoices = getInvoices();
  const expenses = getExpenses();
  let purchases: any[] = [];
  try { purchases = JSON.parse(localStorage.getItem('pos_purchase_invoices') || '[]'); } catch {}
  const map: Record<string, MonthRow> = {};
  const ensure = (k: string) => (map[k] ||= { month: k, sales: 0, cost: 0, expenses: 0, returns: 0, purchases: 0, profit: 0, invoices: 0 });
  invoices.forEach(inv => {
    const k = monthKey(inv.createdAt); const row = ensure(k);
    const net = getInvoiceNetTotal(inv as any);
    const cost = (inv.items||[]).reduce((s,it)=>s + (it.quantity - ((inv.returnedItems||[]).filter(r=>r.productId===it.productId).reduce((a,r)=>a+r.quantity,0))) * it.costPrice, 0);
    row.sales += net; row.cost += cost; row.invoices += 1;
    row.returns += (inv.returnedItems||[]).reduce((a,r)=>a+r.total,0);
  });
  expenses.forEach(e => { const k = monthKey(e.date); ensure(k).expenses += e.amount || 0; });
  purchases.forEach((p:any) => { const k = monthKey(p.createdAt); ensure(k).purchases += p.total || 0; });
  Object.values(map).forEach(r => { r.profit = r.sales - r.cost - r.expenses; });
  return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
}

export function exportMonthlyProfitToExcel() {
  const rows = buildMonthlyRows().map(r => ({
    'الشهر': monthLabel(r.month),
    'عدد الفواتير': r.invoices,
    'المبيعات (صافي)': r.sales,
    'تكلفة المبيعات': r.cost,
    'المرتجعات': r.returns,
    'المصاريف': r.expenses,
    'المشتريات': r.purchases,
    'صافي الربح': r.profit,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Array(8).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws, 'صافي الربح الشهري');
  XLSX.writeFile(wb, `صافي_الربح_الشهري.xlsx`);
}

export function exportMonthlyProfitToCSV() {
  const rows = buildMonthlyRows();
  const header = ['الشهر','عدد الفواتير','المبيعات','التكلفة','المرتجعات','المصاريف','المشتريات','صافي الربح'];
  const lines = [header.join(',')];
  rows.forEach(r => lines.push([monthLabel(r.month), r.invoices, r.sales, r.cost, r.returns, r.expenses, r.purchases, r.profit].join(',')));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'صافي_الربح_الشهري.csv'; a.click();
}

export function exportDebtsReportToExcel() {
  const customers = getCustomers();
  const suppliers = (() => { try { return JSON.parse(localStorage.getItem('pos_suppliers') || '[]'); } catch { return []; } })();
  const wb = XLSX.utils.book_new();
  const cust = customers.filter(c => (c.balance||0) !== 0).map(c => ({
    'العميل': c.name, 'الهاتف': c.phone || '-', 'الرصيد (ج.م)': c.balance,
    'الحالة': c.balance > 0 ? 'مدين للمحل' : 'دائن للمحل',
  }));
  const supp = (suppliers as any[]).filter(s => (s.balance||0) !== 0).map(s => ({
    'المورد': s.name, 'الهاتف': s.phone || '-', 'الرصيد (ج.م)': s.balance,
    'الحالة': s.balance > 0 ? 'المحل مدين له' : 'له عندنا',
  }));
  const totalCustDebt = cust.reduce((s, c) => s + Math.max(0, Number(c['الرصيد (ج.م)'])||0), 0);
  const totalSuppDebt = supp.reduce((s, x) => s + Math.max(0, Number(x['الرصيد (ج.م)'])||0), 0);
  const summary = [
    ['ملخص الديون'], [''],
    ['البند', 'القيمة (ج.م)'],
    ['إجمالي ديون العملاء (لصالحنا)', totalCustDebt],
    ['إجمالي ديون الموردين (علينا)', totalSuppDebt],
    ['الصافي', totalCustDebt - totalSuppDebt],
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(summary); ws0['!cols'] = [{ wch: 32 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws0, 'ملخص');
  const ws1 = XLSX.utils.json_to_sheet(cust); ws1['!cols'] = Array(4).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws1, 'ديون العملاء');
  const ws2 = XLSX.utils.json_to_sheet(supp); ws2['!cols'] = Array(4).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws2, 'ديون الموردين');
  XLSX.writeFile(wb, 'تقرير_الديون.xlsx');
}

export function exportDebtsReportToCSV() {
  const customers = getCustomers();
  let suppliers: any[] = []; try { suppliers = JSON.parse(localStorage.getItem('pos_suppliers') || '[]'); } catch {}
  const lines = ['النوع,الاسم,الهاتف,الرصيد,الحالة'];
  customers.filter(c => (c.balance||0) !== 0).forEach(c =>
    lines.push(['عميل', c.name, c.phone||'-', c.balance, c.balance>0?'مدين للمحل':'دائن للمحل'].join(',')));
  suppliers.filter((s:any) => (s.balance||0) !== 0).forEach((s:any) =>
    lines.push(['مورد', s.name, s.phone||'-', s.balance, s.balance>0?'المحل مدين له':'له عندنا'].join(',')));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'تقرير_الديون.csv'; a.click();
}

export function exportReportToCSV(period: 'daily'|'weekly'|'monthly'|'yearly') {
  const r = getReport(period);
  const labels: Record<string,string> = { daily:'يومي', weekly:'أسبوعي', monthly:'شهري', yearly:'سنوي' };
  const lines = [
    'البند,القيمة',
    `إجمالي المبيعات,${r.totalSales}`,
    `تكلفة المبيعات,${r.totalCost}`,
    `المرتجعات,${r.totalReturns}`,
    `المصاريف,${r.totalExpenses}`,
    `المشتريات,${(r as any).totalPurchases||0}`,
    `صافي الربح,${r.netProfit}`,
    `عدد الفواتير,${r.invoiceCount}`,
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `تقرير_${labels[period]}.csv`; a.click();
}
