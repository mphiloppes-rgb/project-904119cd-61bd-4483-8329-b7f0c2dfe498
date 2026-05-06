# عارض المخزون والأسعار (Viewer)

تطبيق Electron مستقل يعرض المنتجات والأسعار والمخزون فقط (للقراءة)، يتحدث تلقائياً من البرنامج الأساسي.

## آلية المزامنة

البرنامج الأساسي يكتب ملف JSON في:
```
~/Documents/shop-viewer-data.json   (Linux/Mac)
%USERPROFILE%\Documents\shop-viewer-data.json   (Windows)
```

العارض يقرأ نفس الملف ويراقبه، فيتحدث تلقائياً عند أي تغيير.

## للتشغيل في وضع التطوير
```bash
cd viewer
npm install
npm start
```

## بناء ملف .exe لويندوز
```bash
cd viewer
npm install
npm run package:win
```
الناتج في `viewer/dist/RaeiViewer-win32-x64/RaeiViewer.exe`

## في البرنامج الأساسي
من **الإعدادات → "مزامنة العارض"** يحفظ ملف JSON في المسار أعلاه.
