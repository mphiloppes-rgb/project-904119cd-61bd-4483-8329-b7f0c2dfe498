// حاسبة بنود التقارير: اختر بنود (مخزون/كاش/مديونية) وتجمع/تطرح
// + تقرير مديونية قابل للتجميع لكل عميل.
import { useMemo, useRef, useState } from "react";
import { Calculator, Plus, Minus, Equal, Users, Filter, Download, FileText } from "lucide-react";
import { getCustomers, getInvoices, type Customer } from "@/lib/store";
import { exportElementToPDF } from "@/lib/pdf-export";

export interface ReportLineItem {
  key: string;
  label: string;
  value: number;
  hint?: string;
}

interface Props {
  inventoryAtCost: number;
  inventoryAtSell: number;
  cashOnHand: number;
  customerDebt: number;
  supplierDebt: number;
  netProfit: number;
  totalSales: number;
  totalExpenses: number;
}

type Op = "+" | "-";

export default function ReportCalculator(props: Props) {
  const items: ReportLineItem[] = [
    { key: "inv-cost", label: "قيمة المخزون (تكلفة)", value: props.inventoryAtCost, hint: "أصول" },
    { key: "inv-sell", label: "قيمة المخزون (بيع متوقع)", value: props.inventoryAtSell, hint: "أصول" },
    { key: "cash", label: "كاش في المحل", value: props.cashOnHand, hint: "سيولة" },
    { key: "cust-debt", label: "مديونية ليّا (عند العملاء)", value: props.customerDebt, hint: "هتدخل" },
    { key: "supp-debt", label: "مديونية عليّ (للموردين)", value: props.supplierDebt, hint: "هتطلع" },
    { key: "sales", label: "صافي المبيعات (الفترة)", value: props.totalSales, hint: "إيراد" },
    { key: "expenses", label: "المصاريف (الفترة)", value: props.totalExpenses, hint: "مصروف" },
    { key: "profit", label: "صافي الربح (الفترة)", value: props.netProfit, hint: "أرباح" },
  ];

  const [selected, setSelected] = useState<Record<string, Op>>({
    "inv-cost": "+",
    "cash": "+",
    "cust-debt": "+",
    "supp-debt": "-",
  });

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!next[key]) next[key] = "+";
      else if (next[key] === "+") next[key] = "-";
      else delete next[key];
      return next;
    });
  };

  const total = useMemo(() => {
    return Object.entries(selected).reduce((s, [k, op]) => {
      const item = items.find((i) => i.key === k);
      if (!item) return s;
      return op === "+" ? s + item.value : s - item.value;
    }, 0);
  }, [selected, items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="text-primary" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">حاسبة بنود التقرير</h3>
          <p className="text-xs text-muted-foreground">اضغط على البند لتغييره: + (جمع) ↔ − (طرح) ↔ (إلغاء)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => {
          const op = selected[it.key];
          const active = !!op;
          const positive = op === "+";
          return (
            <button
              key={it.key}
              onClick={() => toggle(it.key)}
              className={`text-right p-3 rounded-2xl border-2 transition-all hover:scale-[1.02] ${
                active
                  ? positive
                    ? "bg-success/10 border-success/40"
                    : "bg-destructive/10 border-destructive/40"
                  : "bg-muted/30 border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-sm truncate">{it.label}</p>
                  {it.hint && <p className="text-[10px] text-muted-foreground">{it.hint}</p>}
                </div>
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-extrabold ${
                    active
                      ? positive
                        ? "bg-success text-success-foreground"
                        : "bg-destructive text-destructive-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {active ? (positive ? <Plus size={14} /> : <Minus size={14} />) : "·"}
                </span>
              </div>
              <p className="text-base font-extrabold">{it.value.toLocaleString()} ج.م</p>
            </button>
          );
        })}
      </div>

      {/* المعادلة */}
      <div className="p-3 rounded-xl bg-muted/40 text-xs sm:text-sm font-bold text-center overflow-x-auto whitespace-nowrap">
        {Object.entries(selected).length === 0 ? (
          <span className="text-muted-foreground">اختر بنود لحساب الناتج</span>
        ) : (
          <>
            {Object.entries(selected).map(([k, op], idx) => {
              const item = items.find((i) => i.key === k);
              if (!item) return null;
              return (
                <span key={k}>
                  {idx > 0 && <span className="mx-2">{op}</span>}
                  {idx === 0 && op === "-" && <span className="mx-1">−</span>}
                  <span>{item.value.toLocaleString()}</span>
                </span>
              );
            })}
            <span className="mx-2">=</span>
            <span className={total >= 0 ? "text-success" : "text-destructive"}>{total.toLocaleString()}</span>
          </>
        )}
      </div>

      {/* الناتج النهائي */}
      <div
        className={`p-5 rounded-2xl border-2 ${
          total >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
        } flex items-center justify-between flex-wrap gap-3`}
      >
        <div className="flex items-center gap-2">
          <Equal className={total >= 0 ? "text-success" : "text-destructive"} size={20} />
          <span className="font-extrabold text-sm">الناتج</span>
        </div>
        <p className={`text-2xl sm:text-3xl font-extrabold ${total >= 0 ? "text-success" : "text-destructive"}`}>
          {total.toLocaleString()} <span className="text-base">ج.م</span>
        </p>
      </div>
    </div>
  );
}

// === تقرير مديونية قابل للتجميع ===
type DebtMode = "all" | "byCustomer" | "single";

export function DebtReport() {
  const reportRef = useRef<HTMLDivElement>(null);
  const customers = useMemo(() => getCustomers(), []);
  const invoices = useMemo(() => getInvoices(), []);
  const [mode, setMode] = useState<DebtMode>("byCustomer");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const debtors = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.remaining <= 0) return false;
      if (!inv.customerId) return false;
      if (mode === "single" && selectedCustomerId && inv.customerId !== selectedCustomerId) return false;
      if (from) {
        const d = new Date(inv.createdAt).getTime();
        if (d < new Date(from).getTime()) return false;
      }
      if (to) {
        const d = new Date(inv.createdAt).getTime();
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        if (d > toEnd.getTime()) return false;
      }
      return true;
    });
  }, [invoices, mode, selectedCustomerId, from, to]);

  const byCustomer = useMemo(() => {
    const map: Record<string, { customer: Customer; total: number; count: number }> = {};
    filteredInvoices.forEach((inv) => {
      const c = customers.find((x) => x.id === inv.customerId);
      if (!c) return;
      if (!map[c.id]) map[c.id] = { customer: c, total: 0, count: 0 };
      map[c.id].total += inv.remaining;
      map[c.id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredInvoices, customers]);

  const grandTotal = byCustomer.reduce((s, x) => s + x.total, 0);

  const exportCSV = () => {
    const rows = mode === "all"
      ? filteredInvoices.map((inv) => [inv.invoiceNumber, inv.customerName || "—", new Date(inv.createdAt).toLocaleString("ar-EG"), inv.total, inv.remaining])
      : byCustomer.map(({ customer, total, count }) => [customer.name, customer.phone || "—", count, total, ""]);
    const headers = mode === "all" ? ["رقم الفاتورة", "العميل", "التاريخ", "الإجمالي", "المتبقي"] : ["العميل", "الهاتف", "عدد الفواتير", "إجمالي المديونية", "ملاحظة"];
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_المديونية_${mode}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    await exportElementToPDF(reportRef.current, `تقرير_المديونية_${new Date().toISOString().split("T")[0]}.pdf`, "تقرير المديونية");
  };

  return (
    <div className="space-y-4" ref={reportRef}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
          <Users className="text-warning" size={22} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg">تقرير المديونية</h3>
          <p className="text-xs text-muted-foreground">جمّع كل البنود أو اعرض كل عميل لوحده</p>
        </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-success/15 text-success text-xs font-extrabold">
            <Download size={14} /> CSV
          </button>
          <button type="button" onClick={exportPDF} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-extrabold">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {(["byCustomer", "single", "all"] as DebtMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === m ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {m === "byCustomer" ? "تجميع لكل عميل" : m === "single" ? "عميل محدد" : "كل الفواتير"}
            </button>
          ))}
        </div>
        {mode === "single" && (
          <select
            className="input-field min-w-[180px]"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            <option value="">اختر عميل</option>
            {debtors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.balance.toLocaleString()} ج.م
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-muted-foreground" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-field text-xs py-2"
            placeholder="من"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-field text-xs py-2"
            placeholder="إلى"
          />
        </div>
      </div>

      {/* الناتج */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-muted-foreground">إجمالي المديونية المطابقة للفلتر</p>
          <p className="text-[11px] text-muted-foreground">
            {byCustomer.length} عميل • {filteredInvoices.length} فاتورة مفتوحة
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold text-warning">
          {grandTotal.toLocaleString()} <span className="text-base">ج.م</span>
        </p>
      </div>

      {/* تجميع لكل عميل */}
      {(mode === "byCustomer" || mode === "single") && (
        <div className="space-y-2">
          {byCustomer.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مديونيات في الفلتر المحدد</p>}
          {byCustomer.map(({ customer, total, count }) => (
            <div key={customer.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold truncate">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {count} فاتورة مفتوحة {customer.phone ? `• ${customer.phone}` : ""}
                </p>
              </div>
              <p className="text-lg font-extrabold text-warning flex-shrink-0">
                {total.toLocaleString()} <span className="text-xs">ج.م</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* كل الفواتير لوحدها */}
      {mode === "all" && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-right p-3 font-extrabold">#</th>
                <th className="text-right p-3 font-extrabold">العميل</th>
                <th className="text-right p-3 font-extrabold">التاريخ</th>
                <th className="text-center p-3 font-extrabold">الإجمالي</th>
                <th className="text-center p-3 font-extrabold">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد فواتير</td>
                </tr>
              )}
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="p-3 font-mono">#{inv.invoiceNumber}</td>
                  <td className="p-3 font-bold">{inv.customerName || "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                  <td className="p-3 text-center">{inv.total.toLocaleString()}</td>
                  <td className="p-3 text-center font-extrabold text-warning">{inv.remaining.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
