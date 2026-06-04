const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posElectron', {
  // Viewer file
  saveViewerData: (json, savedPath) => ipcRenderer.invoke('pos:save-viewer-data', { json, savedPath }),
  chooseViewerPath: () => ipcRenderer.invoke('pos:choose-viewer-path'),
  getDefaultViewerPath: () => ipcRenderer.invoke('pos:get-default-viewer-path'),

  // Full disk backup (e.g. D:\PosBackup)
  saveFullBackup: (json, folder) => ipcRenderer.invoke('pos:save-full-backup', { json, folder }),
  chooseBackupFolder: () => ipcRenderer.invoke('pos:choose-backup-folder'),
  getDefaultBackupFolder: () => ipcRenderer.invoke('pos:get-default-backup-folder'),
  listBackups: (folder) => ipcRenderer.invoke('pos:list-backups', folder),
});
