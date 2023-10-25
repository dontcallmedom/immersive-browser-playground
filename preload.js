const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("ipcRenderer", {
  onPaint: (cb) => ipcRenderer.on("paint", cb)
});


