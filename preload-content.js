const { ipcRenderer } = require('electron');

window.addEventListener('load', _ => {
  const featured = [...document.querySelectorAll('[data-xr-z]')]
    .map((el, idx) => {
      const feature = {};
      const rect = el.getBoundingClientRect();
      feature.name = 'feature-' + idx + '-' + el.nodeName;
      feature.translateZ = Math.max(-100, Math.min(100, parseFloat(el.getAttribute('data-xr-z'))));
      feature.rect = {
        x: Math.floor(rect.x),
        y: Math.floor(rect.y),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };
      feature.center = {
        x: feature.rect.x + feature.rect.width / 2,
        y: feature.rect.y + feature.rect.height / 2,
      };
      return feature;
    });
  ipcRenderer.invoke('featured', featured);
});

ipcRenderer.on('featuresupdated', async _ => {
  for (const el of [...document.querySelectorAll('[data-xr-z]')]) {
    el.style.visibility = 'hidden';
  }
});
