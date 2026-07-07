import { useEffect, useState } from "react";
import { Upload, FileSearch, Loader2, CheckCircle2, AlertCircle, History, RotateCcw, Save, Trash2, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  parseFile, detectAll, runImport, KIND_LABEL,
  getImportHistory, rollbackImport, deleteHistoryEntry,
  getMappingTemplates, saveMappingTemplate, deleteMappingTemplate, applyMappingTemplate,
  type ParsedDb, type DetectedSelection, type EntityKind, type ImportMode,
  type ImportHistoryEntry, type MappingTemplate,
} from "@/lib/smart-import";

const KIND_OPTS: EntityKind[] = ['products','customers','suppliers','expenses','categories','unknown'];

export default function SmartImporter() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState<ParsedDb | null>(null);
  const [items, setItems] = useState<DetectedSelection[]>([]);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ pct: number; msg: string } | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const refreshHistory = () => { setHistory(getImportHistory()); setTemplates(getMappingTemplates()); };
  useEffect(() => { refreshHistory(); }, []);

  const onFile = async (f: File) => {
    setLoading(true);
    setProgress({ pct: 5, msg: 'جاري قراءة الملف...' });
    try {
      const parsed = await parseFile(f, (p) => setProgress({ pct: p.percent, msg: p.message || '' }));
      if (!parsed.tables.length) throw new Error('لم يتم العثور على أي جداول في الملف');
      const detected = detectAll(parsed);
      setDb(parsed);
      setItems(detected.map(d => ({ ...d, include: d.kind !== 'unknown' })));
      setProgress(null);
      setOpen(true);
    } catch (e: any) {
      toast({ title: e?.message || 'فشل قراءة الملف', variant: "destructive" });
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    try {
      setProgress({ pct: 5, msg: 'بداية الاستيراد...' });
      // yield so UI paints
      await new Promise(r => setTimeout(r, 30));
      const { result } = runImport(items, mode, {
        source: db?.source,
        onProgress: (p) => setProgress({ pct: p.percent, msg: p.message || '' }),
      });
      toast({
        title: `تم الاستيراد ✓`,
        description: `منتجات: ${result.products} • عملاء: ${result.customers} • موردين: ${result.suppliers} • مصاريف: ${result.expenses} • تصنيفات: ${result.categories}${result.skipped ? ` (تجاهل ${result.skipped})` : ''}`,
      });
      setOpen(false);
      setDb(null); setItems([]); setProgress(null);
      refreshHistory();
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast({ title: e?.message || 'فشل الاستيراد', variant: "destructive" });
      setProgress(null);
    }
  };

  const doRollback = (id: string) => {
    if (!confirm('هل أنت متأكد من التراجع عن هذه العملية؟ سيتم استرجاع البيانات كما كانت قبل الاستيراد.')) return;
    const ok = rollbackImport(id);
    if (ok) {
      toast({ title: 'تم التراجع بنجاح ✓' });
      refreshHistory();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast({ title: 'تعذّر التراجع (نسخة الاسترجاع غير متوفرة)', variant: 'destructive' });
    }
  };

  const doSaveTemplate = () => {
    const name = prompt('اسم قالب المطابقة (مثلاً: نسخة Access الشهرية)');
    if (!name?.trim()) return;
    saveMappingTemplate(name.trim(), items);
    refreshHistory();
    toast({ title: 'تم حفظ القالب ✓' });
  };

  const doApplyTemplate = (tpl: MappingTemplate) => {
    setItems(applyMappingTemplate(items, tpl));
    toast({ title: `تم تطبيق قالب "${tpl.name}"` });
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
            البرنامج يقرأ الأعمدة تلقائيًا (عربي/إنجليزي)، يوحّد الأرقام العربية، يقرأ التواريخ بأشكال مختلفة،
            ويربطها بالمنتجات، العملاء، الموردين، المصاريف والتصنيفات — مع معاينة قبل الحفظ.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="outline" onClick={() => { refreshHistory(); setShowHistory(true); }}>
              <History className="h-4 w-4 ml-2" /> سجل الاستيراد ({history.length})
            </Button>
            <span className="text-xs text-muted-foreground">
              ملفات .mdb تعمل على نسخة سطح المكتب. في المتصفح: صدّر من Access كـ Excel أولاً.
            </span>
          </div>

          {progress && !open && (
            <div className="space-y-1">
              <Progress value={progress.pct} />
              <p className="text-xs text-muted-foreground">{progress.msg} ({progress.pct}%)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import wizard */}
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
              <div className="flex items-center gap-2 flex-wrap">
                {templates.length > 0 && (
                  <Select onValueChange={(id) => { const t = templates.find(x => x.id === id); if (t) doApplyTemplate(t); }}>
                    <SelectTrigger className="w-56 h-9"><SelectValue placeholder="تطبيق قالب مطابقة..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" variant="outline" onClick={doSaveTemplate}>
                  <BookmarkPlus className="h-4 w-4 ml-1" /> حفظ كقالب
                </Button>
                <span className="text-sm">وضع:</span>
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
                تحذير: سيتم <b>حذف كل البيانات الحالية</b>. سيتم إنشاء نسخة تراجع تلقائية.
              </div>
            )}

            {progress && (
              <div className="space-y-1">
                <Progress value={progress.pct} />
                <p className="text-xs text-muted-foreground">{progress.msg} ({progress.pct}%)</p>
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
              <Button variant="outline" onClick={() => setOpen(false)} disabled={!!progress}>إلغاء</Button>
              <Button onClick={doImport} disabled={!items.some(i => i.include) || !!progress}>
                {progress ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                استيراد {items.filter(i => i.include).length} جدول
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> سجل عمليات الاستيراد
            </DialogTitle>
          </DialogHeader>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا يوجد سجل استيراد بعد.</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold">{h.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString('ar-EG')} • وضع: {h.mode === 'replace' ? 'استبدال' : 'دمج'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {h.canRollback && (
                        <Button size="sm" variant="destructive" onClick={() => doRollback(h.id)}>
                          <RotateCcw className="h-3 w-3 ml-1" /> تراجع
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('حذف هذه العملية من السجل؟')) { deleteHistoryEntry(h.id); refreshHistory(); } }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">منتجات: {h.result.products}</Badge>
                    <Badge variant="outline">عملاء: {h.result.customers}</Badge>
                    <Badge variant="outline">موردين: {h.result.suppliers}</Badge>
                    <Badge variant="outline">مصاريف: {h.result.expenses}</Badge>
                    <Badge variant="outline">تصنيفات: {h.result.categories}</Badge>
                    {h.result.skipped > 0 && <Badge variant="secondary">تم تجاهل: {h.result.skipped}</Badge>}
                  </div>
                  {h.result.perTable?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">تفاصيل لكل جدول ({h.result.perTable.length})</summary>
                      <table className="w-full text-xs mt-2 border">
                        <thead className="bg-muted">
                          <tr><th className="p-1 border">الجدول</th><th className="p-1 border">النوع</th><th className="p-1 border">أُدرج</th><th className="p-1 border">تجاهل</th></tr>
                        </thead>
                        <tbody>
                          {h.result.perTable.map((t, i) => (
                            <tr key={i}>
                              <td className="p-1 border">{t.table}</td>
                              <td className="p-1 border">{KIND_LABEL[t.kind]}</td>
                              <td className="p-1 border">{t.affected}</td>
                              <td className="p-1 border">{t.skipped}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {templates.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-bold mb-2 flex items-center gap-2"><Save className="h-4 w-4" /> قوالب المطابقة المحفوظة</h4>
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm">
                      <p className="font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.entries.length} جدول • {new Date(t.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { deleteMappingTemplate(t.id); refreshHistory(); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
