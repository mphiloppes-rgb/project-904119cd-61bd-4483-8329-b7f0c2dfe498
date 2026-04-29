// تصدير التقارير لـ PDF (يدعم العربي عبر تحويل العنصر لصورة canvas)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export async function exportElementToPDF(
  element: HTMLElement,
  filename = 'تقرير.pdf',
  title = 'تقرير'
): Promise<void> {
  // اعمل الـ canvas بدقة عالية
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Header
  pdf.setFontSize(14);
  pdf.text(title, pageWidth / 2, 10, { align: 'center' });
  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleString('ar-EG'), pageWidth / 2, 16, { align: 'center' });

  let position = 22;
  let heightLeft = imgHeight;

  // أول صفحة
  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position;

  // صفحات إضافية لو طويل
  while (heightLeft > 0) {
    pdf.addPage();
    position = -(imgHeight - heightLeft) + margin;
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin;
  }

  pdf.save(filename);
}
