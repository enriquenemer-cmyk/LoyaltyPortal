const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
});
