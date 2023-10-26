const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  onPaint: cb => ipcRenderer.on('paint', cb),
  toggle3d: _ => ipcRenderer.invoke('toggle3d')
});


