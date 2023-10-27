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

  let rawLinks = [...document.querySelectorAll('#bodyContent a[href^="/wiki/"]')]
    .map(a => a.href.split('#')[0])
    .filter(l => l.match(/\/wiki\/[^:]*$/));
  if (rawLinks.length === 0) {
    rawLinks = [...document.querySelectorAll('a[href]')];
  }

  const weightedLinks = rawLinks.reduce((a, b) => {
    if (!a[b]) {
      a[b] = 0;
    }
    a[b]++;
    return a;
  }, {});

  ipcRenderer.invoke('sortedLinks', weightedLinks);
});

window.addEventListener('beforeunload', () => {
  ipcRenderer.invoke('beforeunload');
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

function get3DEffect(el) {
  const translateZ = el.getAttribute('data-xr-z');
  if (el.hasAttribute('data-xr-z')) {
    if (!el.getAttribute('data-xr-z')) {
      return 0;
    }
    else if (el.getAttribute('data-xr-z') === 'background') {
      return -100;
    }
    else {
      return Math.max(-100, Math.min(100, parseFloat(el.getAttribute('data-xr-z'))));
    }
  }
  if (el.nodeName === 'H1') {
    return 100;
  }
  if (el.nodeName === 'H2') {
    return 40;
  }
  if (el.nodeName === 'IMG') {
    return 20;
  }
  return 0;
}

let featuresIn3dEnabled = false;
let featureByName = {};
ipcRenderer.on('toggle3d', _ => {
  if (featuresIn3dEnabled) {
    featuresIn3dEnabled = false;
    return;
  }

  featuresIn3dEnabled = true;
  let features = [];
  featureByName = {};
  if (document.querySelector('[data-xr-z]')) {
    // Page is immersive 3D aware, let's apply the 3D effects it wants.
    features = [...document.querySelectorAll('[data-xr-z]')]
      .filter(el => !!el.getAttribute('data-xr-z'))
      .map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const feature = {
          name: 'feature-' + idx + '-' + el.nodeName,
          translateZ: get3DEffect(el),
          rect: {
            x: Math.floor(rect.x),
            y: Math.floor(rect.y),
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height)
          },
          el
        };
        if (el.getAttribute('src')) {
          feature.src = el.getAttribute('src');
        }
        return feature;
      });
  }
  else {
    // Page is not 3D aware, let's apply default 3D effects
    features = [...document.querySelectorAll('h1,h2,img')]
      .map((el, idx) => {
        const rect = el.getBoundingClientRect();
        return {
          name: 'feature-' + idx + '-' + el.nodeName,
          translateZ: get3DEffect(el),
          rect: {
            x: Math.floor(rect.x),
            y: Math.floor(rect.y),
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height)
          },
          el
        };
      });
  }

  // Only consider features that are visible in the absence of scrolling
  // TODO: Support scrolling!
  features = features
    .filter(feature => Math.round(feature.translateZ) !== 0)
    .filter(feature =>
        (feature.rect.x + feature.rect.width <= window.innerWidth) &&
        (feature.rect.y + feature.rect.height <= window.innerHeight));

  for (const feature of features) {
    feature.center = {
      x: feature.rect.x + feature.rect.width / 2,
      y: feature.rect.y + feature.rect.height / 2,
    };
    featureByName[feature.name] = feature.el;
    delete feature.el;
  }
  ipcRenderer.invoke('features', features);
});

ipcRenderer.on('toggleFeatureInContent', (_event, name) => {
  const el = featureByName[name];
  if (el) {
    el.style.visibility = (el.style.visibility === 'hidden') ? 'visible' : 'hidden';
  }
});

ipcRenderer.on('illustrate', async () => {
  await isLoaded;
  let illustrations = [...document.querySelectorAll('figure[typeof~="mw:File/Thumb"] img')];
  if (illustrations.length === 0) {
    illustrations = [...document.querySelectorAll('img')];
  }
  console.log(illustrations.map(i => i.src));
  createIllustrationObserver(illustrations);
});

ipcRenderer.on('addUrl', async (_event, url, label) => {
  await isLoaded;
  const li = document.createElement('li');
  li.innerHTML = `<a href="${url}">${label}</a>`;
  document.querySelector('[data-urls]').appendChild(li);
  document.querySelector('[data-nocustom').style.display = 'none';
});