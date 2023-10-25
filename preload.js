const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("ipcRenderer", {
  onPaint: (cb) => ipcRenderer.on("paint", cb),
  scroll: (delta) => ipcRenderer.invoke("scroll", delta),
  setMode: (mode) => ipcRenderer.invoke("setMode", mode),
  loadImage: (cb) => ipcRenderer.on("loadImage", cb)
});


