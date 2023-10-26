const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("ipcRenderer", {
  onViewportGeometry: (cb) => ipcRenderer.on("viewportGeometry", cb),
  onPaint: (cb) => ipcRenderer.on("paint", cb),
  scroll: (delta) => ipcRenderer.invoke("scroll", delta),
  setMode: (mode) => ipcRenderer.invoke("setMode", mode),
  sendClick: (x, y) => ipcRenderer.invoke("sendClick", x, y),
  isLoaded: () => ipcRenderer.invoke("browserIsLoaded")
});


