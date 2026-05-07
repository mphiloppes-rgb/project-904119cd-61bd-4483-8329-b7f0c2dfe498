// عارض الأسعار والمخزون فقط — Electron App
const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// مسار افتراضي ومسار قابل للتعديل عبر ملف إعدادات (config.json داخل userData)
const DEFAULT_FILE = path.join(os.homedir(), 'Documents', 'shop-viewer-data.json');
let CONFIG_PATH = '';
function getConfigPath() {
  if (!CONFIG_PATH) CONFIG_PATH = path.join(app.getPath('userData'), 'viewer-config.json');
  return CONFIG_PATH;
}
function readConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch { return {}; }
}
function writeConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
    return true;
  } catch { return false; }
}
function getDataFile() {
  const cfg = readConfig();
  return (cfg && cfg.dataPath && typeof cfg.dataPath === 'string') ? cfg.dataPath : DEFAULT_FILE;
}

let watcher = null;
function rewatch() {
  try { if (watcher && watcher.close) watcher.close(); } catch {}
  watcher = null;
  const file = getDataFile();
  try {
    fs.watchFile(file, { interval: 2000 }, () => {
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('viewer:file-changed'));
    });
    watcher = { close: () => fs.unwatchFile(file) };
  } catch {}
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 550,
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
  const file = getDataFile();
  try {
    if (!fs.existsSync(file)) {
      return { ok: false, message: `لم يتم العثور على ملف البيانات في:\n${file}\n\nمن إعدادات العارض اختر مسار الملف الصحيح، أو شغّل المزامنة من البرنامج الأساسي.`, products: [] };
    }
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw);
    return { ok: true, products: data.products || [], updatedAt: data.updatedAt || null, file };
  } catch (e) {
    return { ok: false, message: 'خطأ في قراءة الملف: ' + e.message, products: [] };
  }
});

ipcMain.handle('viewer:get-path', () => getDataFile());
ipcMain.handle('viewer:get-default-path', () => DEFAULT_FILE);

ipcMain.handle('viewer:choose-path', async () => {
  const res = await dialog.showOpenDialog({
    title: 'اختر ملف shop-viewer-data.json',
    defaultPath: getDataFile(),
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePaths || !res.filePaths[0]) return null;
  const cfg = readConfig();
  cfg.dataPath = res.filePaths[0];
  writeConfig(cfg);
  rewatch();
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('viewer:file-changed'));
  return res.filePaths[0];
});

ipcMain.handle('viewer:reset-path', () => {
  const cfg = readConfig();
  delete cfg.dataPath;
  writeConfig(cfg);
  rewatch();
  return getDataFile();
});

app.whenReady().then(() => {
  createWindow();
  rewatch();
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
