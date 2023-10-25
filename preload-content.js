const { ipcRenderer } = require('electron');

ipcRenderer.on("scroll", function (_event, delta) {
  window.scrollBy(0, delta);
});

window.console.log = function () { ipcRenderer.invoke("console", ...arguments)};
window.console.error = function () { ipcRenderer.invoke("console", ...arguments)};

let isLoaded = new Promise(res => window.addEventListener('DOMContentLoaded', res));

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


function createIllustrationObserver(illustrations) {
  let observer;

  let options = {
    root: null,
    rootMargin: "0px",
    threshold: [0, 0.5, 1]
  };

  observer = new IntersectionObserver(handleIntersect, options);
  illustrations.forEach(el =>
    observer.observe(el)
  );

  const visibleImages = {};

  function handleIntersect(entries, observer) {
    for (let entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio === 1) {
	if (!visibleImages[entry.target.src]) {
	  visibleImages[entry.target.src] = entry;
	}
      } else if (visibleImages[entry.target.src]) {
	delete visibleImages[entry.target.src];
      }
    }
    let minTop = Infinity;
    let minSrc;
    for (let entry of Object.values(visibleImages)) {
      if (entry.boundingClientRect.top < minTop) {
	minSrc= entry.target.src;
	minTop = entry.boundingClientRect.top;
      }
    }
    const thumbSrc = minSrc;
    const fullSrc = thumbSrc.replace(/thumb\//, '').replace(/\.(jpg|png|svg)\/.*/, '.$1');
    ipcRenderer.invoke('loadImage', fullSrc);
  }

}


ipcRenderer.on('illustrate', async () => {
  await isLoaded;
  const illustrations = [...document.querySelectorAll('figure[typeof~="mw:File/Thumb"] img')];
  createIllustrationObserver(illustrations);
});
