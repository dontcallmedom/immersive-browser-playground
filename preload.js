const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  onViewportGeometry: (cb) => ipcRenderer.on('viewportGeometry', cb),
  onPaint: (cb) => ipcRenderer.on('paint', cb),
  onPaint3D: (cb) => ipcRenderer.on('paint3d', cb),
  onReset3D: (cb) => ipcRenderer.on('reset3d', cb),
  scroll: (delta) => ipcRenderer.invoke('scroll', delta),
  setMode: (mode) => ipcRenderer.invoke('setMode', mode),
  sendClick: (x, y) => ipcRenderer.invoke('sendClick', x, y),
  isLoaded: () => ipcRenderer.invoke('browserIsLoaded'),
  toggleFeatureInContent: (name) => ipcRenderer.invoke('toggleFeatureInContent', name),
  toggle3d: _ => ipcRenderer.invoke('toggle3d'),
  toggleIllustrate: _ => ipcRenderer.invoke('toggle-illustrate'),
  toggleNavigate: _ => ipcRenderer.invoke('toggle-navigate')
});

contextBridge.exposeInMainWorld('logger', {
  log: function () { ipcRenderer.invoke("console", ...arguments); console.log(...arguments); },
  error: function () { ipcRenderer.invoke("console", ...arguments); console.error(...arguments); }
});


