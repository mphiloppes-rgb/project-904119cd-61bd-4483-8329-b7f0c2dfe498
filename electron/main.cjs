const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_VIEWER_PATH = path.join(os.homedir(), 'Documents', 'shop-viewer-data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'الراعي للعدد والآلات',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// IPC: حفظ ملف العارض (مسار مختار من المستخدم)
ipcMain.handle('pos:save-viewer-data', async (_evt, { json, savedPath }) => {
  try {
    const target = savedPath && typeof savedPath === 'string' && savedPath.trim()
      ? savedPath
      : DEFAULT_VIEWER_PATH;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json, 'utf-8');
    return { ok: true, path: target };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: اختيار مسار حفظ ملف shop-viewer-data.json يدويًا
ipcMain.handle('pos:choose-viewer-path', async () => {
  const res = await dialog.showSaveDialog({
    title: 'اختر مكان حفظ ملف بيانات العارض',
    defaultPath: DEFAULT_VIEWER_PATH,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle('pos:get-default-viewer-path', () => DEFAULT_VIEWER_PATH);

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
