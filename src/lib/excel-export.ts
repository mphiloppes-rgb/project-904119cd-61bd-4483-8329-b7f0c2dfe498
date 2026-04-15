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
