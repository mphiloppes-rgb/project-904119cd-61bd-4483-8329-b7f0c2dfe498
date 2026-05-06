const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('viewer', {
  readData: () => ipcRenderer.invoke('viewer:read-data'),
  getPath: () => ipcRenderer.invoke('viewer:get-path'),
  onFileChanged: (cb) => ipcRenderer.on('viewer:file-changed', cb),
});
