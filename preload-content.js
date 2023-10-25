const { ipcRenderer } = require('electron');

ipcRenderer.on("scroll", function (_event, delta) {
  window.scrollBy(0, delta);
});

window.console.log = function () { ipcRenderer.invoke("console", ...arguments)};
window.console.error = function () { ipcRenderer.invoke("console", ...arguments)};


window.addEventListener('DOMContentLoaded', () => {

  const wikiLinks = [...document.querySelectorAll('#bodyContent a[href^="/wiki/"]')];

  const weightedLinks = wikiLinks.map(a => a.href.split('#')[0]).filter(l => l.match(/\/wiki\/[^:]*$/)).reduce((a, b) => {
    if (!a[b]) {
      a[b] = 0;
    }
    a[b]++;
    return a;
  }, {});
  ipcRenderer.invoke('open', weightedLinks);

});
