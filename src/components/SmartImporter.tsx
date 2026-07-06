import { useState } from "react";
import { Upload, FileSearch, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  parseFile, detectAll, runImport, KIND_LABEL,
  type ParsedDb, type DetectedSelection, type EntityKind, type ImportMode,
} from "@/lib/smart-import";

const KIND_OPTS: EntityKind[] = ['products','customers','suppliers','expenses','categories','unknown'];

export default function SmartImporter() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState<ParsedDb | null>(null);
  const [items, setItems] = useState<DetectedSelection[]>([]);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const onFile = async (f: File) => {
    setLoading(true);
    try {
      const parsed = await parseFile(f);
      if (!parsed.tables.length) throw new Error('لم يتم العثور على أي جداول في الملف');
      const detected = detectAll(parsed);
      setDb(parsed);
      setItems(detected.map(d => ({ ...d, include: d.kind !== 'unknown' })));
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message || 'فشل قراءة الملف');
    } finally {
      setLoading(false);
    }
  };

  const doImport = () => {
    try {
      const res = runImport(items, mode);
      toast.success(
        `تم الاستيراد ✓ منتجات: ${res.products} • عملاء: ${res.customers} • موردين: ${res.suppliers} • مصاريف: ${res.expenses} • تصنيفات: ${res.categories}` +
        (res.skipped ? ` (تم تجاهل ${res.skipped} صف)` : '')
      );
      setOpen(false);
      setDb(null); setItems([]);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e?.message || 'فشل الاستيراد');
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-5 w-5 text-primary" />
            استيراد ذكي من برنامج آخر (Access / Excel / CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            يدعم <b>.mdb</b> و <b>.accdb</b> (Microsoft Access) و <b>.xlsx</b> و <b>.csv</b>.
            البرنامج يقرأ الجداول والأعمدة تلقائيًا (عربي/إنجليزي) ويربطها بالمنتجات، العملاء، الموردين،
            المصاريف والتصنيفات — مع معاينة قبل الحفظ.
          </p>
          <div className="flex items-center gap-2">
            <input
              id="smart-imp"
              type="file"
              accept=".xlsx,.xls,.csv,.mdb,.accdb"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }}
            />
            <Button
              onClick={() => document.getElementById('smart-imp')?.click()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
              اختر ملف النسخة الاحتياطية
            </Button>
            <span className="text-xs text-muted-foreground">
              ملفات .mdb تعمل على نسخة سطح المكتب. في المتصفح: صدّر من Access كـ Excel أولاً.
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              معاينة الاستيراد — {db?.source}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm text-muted-foreground">
                تم اكتشاف <b>{db?.tables.length}</b> جدول. راجع التصنيف واختر ما تريد استيراده:
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">وضع الاستيراد:</span>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">دمج (حفظ الحالي)</SelectItem>
                    <SelectItem value="replace">استبدال كامل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === 'replace' && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                تحذير: سيتم <b>حذف كل البيانات الحالية</b> (منتجات، عملاء، موردين، مصاريف، تصنيفات) قبل الاستيراد.
              </div>
            )}

            <div className="border rounded-md divide-y">
              {items.map((it, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={it.include}
                        onCheckedChange={(v) => {
                          const copy = [...items]; copy[i] = { ...copy[i], include: !!v }; setItems(copy);
                        }}
                      />
                      <span className="font-semibold">{it.table.name}</span>
                      <Badge variant="outline">{it.table.rows.length} صف • {it.table.columns.length} عمود</Badge>
                      {it.confidence > 0 && (
                        <Badge variant={it.confidence > 0.5 ? 'default' : 'secondary'}>
                          {it.confidence > 0.5 ? <CheckCircle2 className="h-3 w-3 ml-1" /> : null}
                          ثقة {Math.round(it.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={it.overrideKind || it.kind}
                        onValueChange={(v: any) => {
                          const copy = [...items]; copy[i] = { ...copy[i], overrideKind: v, include: v !== 'unknown' }; setItems(copy);
                        }}
                      >
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KIND_OPTS.map(k => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setPreviewIdx(previewIdx === i ? null : i)}>
                        {previewIdx === i ? 'إخفاء' : 'معاينة'}
                      </Button>
                    </div>
                  </div>

                  {previewIdx === i && (
                    <div className="mt-3 overflow-auto border rounded">
                      <table className="text-xs w-full">
                        <thead className="bg-muted">
                          <tr>{it.table.columns.map(c => <th key={c} className="p-1 text-right border">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {it.table.rows.slice(0, 5).map((r, ri) => (
                            <tr key={ri}>
                              {it.table.columns.map(c => (
                                <td key={c} className="p-1 border align-top">{String(r[c] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-2 text-xs text-muted-foreground">
                        الحقول المُكتشفة:{' '}
                        {Object.entries(it.map).filter(([, v]) => v).map(([k, v]) => `${k}→${v}`).join(' • ') || '—'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={doImport} disabled={!items.some(i => i.include)}>
                استيراد {items.filter(i => i.include).length} جدول
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
