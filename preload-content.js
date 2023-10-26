const { ipcRenderer } = require('electron');
ipcRenderer.on("scroll", function (_event, delta) {
  window.scrollBy(0, delta);
});

window.console.log = function () { ipcRenderer.invoke("console", ...arguments)};
window.console.error = function () { ipcRenderer.invoke("console", ...arguments)};
let isLoaded = new Promise(res => window.addEventListener('DOMContentLoaded', res));

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on("click", function (_event, x, y) {
    const target = document.elementFromPoint(x, y);
    if (target) {
      target.dispatchEvent(new PointerEvent("click", {
        bubbles: true,
        clientX: x,
        clientY: y
      }));
    }
  });

  const wikiLinks = [...document.querySelectorAll('#bodyContent a[href^="/wiki/"]')];

  const weightedLinks = wikiLinks.map(a => a.href.split('#')[0]).filter(l => l.match(/\/wiki\/[^:]*$/)).reduce((a, b) => {
    if (!a[b]) {
      a[b] = 0;
    }
    a[b]++;
    return a;
  }, {});
  ipcRenderer.invoke('sortedLinks', weightedLinks);

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

let featuredEnabled = false;
ipcRenderer.on('toggle3d', _ => {
  if (featuredEnabled) {
    for (const el of [...document.querySelectorAll('[data-xr-z]')]) {
      el.style.visibility = 'visible';
    }
  }
  else {
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
  }
  featuredEnabled = !featuredEnabled;
});

ipcRenderer.on('featuresupdated', async _ => {
  for (const el of [...document.querySelectorAll('[data-xr-z]')]) {
    el.style.visibility = 'hidden';
  }
});

ipcRenderer.on('illustrate', async () => {
  console.log("illustrate!");
  await isLoaded;
  console.log("loaded!", window.location.href);
  const illustrations = [...document.querySelectorAll('figure[typeof~="mw:File/Thumb"] img')];
  console.log(illustrations.map(i => i.src));
  createIllustrationObserver(illustrations);
});

