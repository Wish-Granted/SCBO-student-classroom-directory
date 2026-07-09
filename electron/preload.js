const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notifySessionExpired: () => ipcRenderer.send('eminerva-session-expired'),
});