// عارض الأسعار والمخزون فقط — Electron App
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// مسار ملف البيانات المشترك (نفس المسار اللي البرنامج الأساسي بيكتب فيه)
const SHARED_FILE = path.join(os.homedir(), 'Documents', 'shop-viewer-data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    title: 'عارض المخزون والأسعار — الراعي للعدد والآلات',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('viewer:read-data', async () => {
  try {
    if (!fs.existsSync(SHARED_FILE)) {
      return { ok: false, message: `لم يتم العثور على ملف البيانات في:\n${SHARED_FILE}\n\nمن البرنامج الأساسي: الإعدادات → "مزامنة العارض" لإنشاء/تحديث الملف.`, products: [] };
    }
    const raw = fs.readFileSync(SHARED_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return { ok: true, products: data.products || [], updatedAt: data.updatedAt || null, file: SHARED_FILE };
  } catch (e) {
    return { ok: false, message: 'خطأ في قراءة الملف: ' + e.message, products: [] };
  }
});

ipcMain.handle('viewer:get-path', () => SHARED_FILE);

app.whenReady().then(() => {
  createWindow();
  // مراقبة الملف للتحديث التلقائي
  try {
    fs.watchFile(SHARED_FILE, { interval: 2000 }, () => {
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('viewer:file-changed'));
    });
  } catch {}
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
