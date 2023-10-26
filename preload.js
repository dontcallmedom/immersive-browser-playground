const { contextBridge, ipcRenderer } = require('electron');

window.console.log = function () { ipcRenderer.invoke("console", ...arguments); console.log(...arguments);};
window.console.error = function () { ipcRenderer.invoke("console", ...arguments); console.error(...arguments);};


contextBridge.exposeInMainWorld("ipcRenderer", {
  onViewportGeometry: (cb) => ipcRenderer.on("viewportGeometry", cb),
  onPaint: (cb) => ipcRenderer.on("paint", cb),
  scroll: (delta) => ipcRenderer.invoke("scroll", delta),
  setMode: (mode) => ipcRenderer.invoke("setMode", mode),
  sendClick: (x, y) => ipcRenderer.invoke("sendClick", x, y),
  isLoaded: () => ipcRenderer.invoke("browserIsLoaded"),
  toggle3d: _ => ipcRenderer.invoke('toggle3d'),
  toggleIllustrate: _ => ipcRenderer.invoke('toggle-illustrate'),
  toggleNavigate: _ => ipcRenderer.invoke('toggle-navigate')
});


