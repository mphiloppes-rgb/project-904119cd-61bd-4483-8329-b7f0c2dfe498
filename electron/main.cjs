const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_VIEWER_PATH = path.join(os.homedir(), 'Documents', 'shop-viewer-data.json');
// Default backup folder: D:\PosBackup on Windows, ~/PosBackup elsewhere
const DEFAULT_BACKUP_FOLDER = process.platform === 'win32'
  ? 'D:\\PosBackup'
  : path.join(os.homedir(), 'PosBackup');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'مون تك',
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

// ===== Viewer file IPC =====
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

// ===== Full disk backup IPC =====
function safeFolder(folder) {
  return folder && typeof folder === 'string' && folder.trim() ? folder : DEFAULT_BACKUP_FOLDER;
}

ipcMain.handle('pos:save-full-backup', async (_evt, { json, folder }) => {
  try {
    const dir = safeFolder(folder);
    fs.mkdirSync(dir, { recursive: true });
    // ملف ثابت (آخر نسخة)
    const latest = path.join(dir, 'pos-backup-latest.json');
    fs.writeFileSync(latest, json, 'utf-8');
    // نسخة بالوقت (تدوير: نحتفظ بآخر 60 نسخة فقط)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dated = path.join(dir, `pos-backup-${stamp}.json`);
    fs.writeFileSync(dated, json, 'utf-8');
    try {
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith('pos-backup-') && f.endsWith('.json') && f !== 'pos-backup-latest.json')
        .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      files.slice(60).forEach(x => { try { fs.unlinkSync(path.join(dir, x.f)); } catch {} });
    } catch {}
    return { ok: true, folder: dir, latest, dated };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pos:choose-backup-folder', async () => {
  const res = await dialog.showOpenDialog({
    title: 'اختر مجلد النسخ الاحتياطي (يفضّل قسم D:)',
    defaultPath: DEFAULT_BACKUP_FOLDER,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths?.[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle('pos:get-default-backup-folder', () => DEFAULT_BACKUP_FOLDER);

ipcMain.handle('pos:list-backups', async (_evt, folder) => {
  try {
    const dir = safeFolder(folder);
    if (!fs.existsSync(dir)) return { ok: true, folder: dir, files: [] };
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('pos-backup-') && f.endsWith('.json'))
      .map(f => {
        const st = fs.statSync(path.join(dir, f));
        return { name: f, size: st.size, mtime: st.mtime.toISOString() };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
    return { ok: true, folder: dir, files };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ===== Access .mdb / .accdb reader (smart importer) =====
ipcMain.handle('pos:read-mdb', async (_evt, bytes) => {
  try {
    const MDBReader = require('mdb-reader').default || require('mdb-reader');
    const buf = Buffer.from(bytes);
    const reader = new MDBReader(buf);
    const names = reader.getTableNames();
    const tables = names.map((n) => {
      try {
        const t = reader.getTable(n);
        return {
          name: n,
          columns: t.getColumnNames(),
          rows: t.getData(),
        };
      } catch (e) {
        return { name: n, columns: [], rows: [], error: e.message };
      }
    });
    return { ok: true, tables };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
