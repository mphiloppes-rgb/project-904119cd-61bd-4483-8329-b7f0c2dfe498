const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('viewer', {
  readData: () => ipcRenderer.invoke('viewer:read-data'),
  getPath: () => ipcRenderer.invoke('viewer:get-path'),
  getDefaultPath: () => ipcRenderer.invoke('viewer:get-default-path'),
  choosePath: () => ipcRenderer.invoke('viewer:choose-path'),
  resetPath: () => ipcRenderer.invoke('viewer:reset-path'),
  onFileChanged: (cb) => ipcRenderer.on('viewer:file-changed', cb),
});
