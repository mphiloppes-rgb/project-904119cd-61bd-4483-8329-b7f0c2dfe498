import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, Database, AlertTriangle, Settings } from "lucide-react";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { exportAllDataToExcel, exportProductsToExcel, exportCustomersToExcel, exportInvoicesToExcel, exportExpensesToExcel } from "@/lib/excel-export";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const counts = await restoreBackup(file);
      toast({ title: "تم استعادة البيانات بنجاح ✅", description: `${counts.products} منتج، ${counts.customers} عميل، ${counts.invoices} فاتورة، ${counts.expenses} مصروف` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setRestoring(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const excelExports = [
    { label: "المنتجات", action: exportProductsToExcel },
    { label: "العملاء", action: exportCustomersToExcel },
    { label: "الفواتير", action: exportInvoicesToExcel },
    { label: "المصاريف", action: exportExpensesToExcel },
    { label: "جميع البيانات", action: exportAllDataToExcel },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Settings className="text-primary" size={22} /></div>
        <h1 className="page-header mb-0">الإعدادات</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="text-primary" size={22} /></div>
            <h3 className="font-extrabold text-lg">النسخ الاحتياطي</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">احفظ نسخة من جميع بياناتك أو استعد بيانات سابقة</p>
          <div className="space-y-3">
            <button onClick={downloadBackup} className="w-full btn-primary py-3"><Download size={18} /> تحميل نسخة احتياطية</button>
            <button onClick={() => fileRef.current?.click()} disabled={restoring} className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-xl font-extrabold hover:opacity-90 transition-all duration-200">
              <Upload size={18} /> {restoring ? "جاري الاستعادة..." : "استعادة نسخة احتياطية"}
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </div>
          <div className="mt-4 p-3 bg-warning/10 rounded-xl flex items-start gap-2">
            <AlertTriangle className="text-warning shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-muted-foreground font-bold">استعادة النسخة الاحتياطية ستحل محل جميع البيانات الحالية</p>
          </div>
        </div>

        <div className="stat-card animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><FileSpreadsheet className="text-success" size={22} /></div>
            <h3 className="font-extrabold text-lg">تصدير إلى Excel</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">صدّر بياناتك إلى ملف Excel لعرضها أو طباعتها</p>
          <div className="space-y-2">
            {excelExports.map((item) => (
              <button key={item.label} onClick={item.action} className="w-full flex items-center justify-between p-3 bg-accent/50 rounded-xl hover:bg-accent transition-all duration-200 font-bold text-sm">
                <span>{item.label}</span>
                <Download size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
