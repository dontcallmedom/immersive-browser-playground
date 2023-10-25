(function (AFRAME) {
  function renderHtmlToCanvas(xhtml, canvas, featured) {
    return new Promise(resolve => {
      const ctx = canvas.getContext('2d');
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
            width="${canvas.width}" height="${canvas.height}">
          <foreignObject width="100%" height="100%">${xhtml}</foreignObject>
        </svg>`;
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      //const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

      const tempImg = new Image();
      tempImg.addEventListener('load', function () {
        console.log('drawn');
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);
        if (featured.title) {
          const rect = featured.title.rect;
          featured.title.data = ctx.getImageData(rect.x, rect.y, rect.x+rect.width, rect.y+rect.height);
          ctx.fillStyle = '#F8F8F8';
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        if (featured.image) {
          const rect = featured.image.rect;
          featured.image.data = ctx.getImageData(rect.x, rect.y, rect.x+rect.width, rect.y+rect.height);
          ctx.fillStyle = '#F8F8F8';
          ctx.fillRect(rect.x, rect.y, rect.width + 2, rect.height + 2);
        }
        resolve();
      });
      tempImg.src = svgUrl;
    });
  }

  function renderFeaturedPlane(name, feature) {
    const canvas = document.querySelector(`#canvas-${name}`);
    canvas.width = feature.rect.width;
    canvas.height = feature.rect.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(feature.data, 0, 0);
    const el = document.querySelector(`#plane-${name}`);
    el.object3D.position.x = feature.position.x;
    el.object3D.position.y = feature.position.y;
    el.object3D.position.z = feature.position.z + 0.001;
    el.setAttribute('width', feature.geometry.width);
    el.setAttribute('height', feature.geometry.height);
    el.setAttribute('visible', true);
    el.getObject3D('mesh').material.map.needsUpdate = true;

    if (name === 'title') {
      el.setAttribute('animation', {
        property: 'position',
        to: { x: feature.position.x - 0.01, y: feature.position.y, z: feature.position.z + 0.05 },
        easing: 'easeInOutSine',
        dur: 2000,
        startEvents: 'features'
      });
    }
    else if (name === 'image') {
      el.setAttribute('animation', {
        property: 'position',
        to: { x: feature.position.x + 0.02, y: feature.position.y, z: feature.position.z + 0.05 },
        easing: 'easeInOutSine',
        dur: 2000,
        startEvents: 'features'
      });
    }

    setTimeout(function() {
      el.emit('features');
    }, 2000);
  }

  AFRAME.registerComponent('draw-html-canvas', {
    schema: {
      src: { type: 'string', default: '' }
    },

    init: function () {
      this.xmlSerializer = new XMLSerializer();
      this.canvas = document.querySelector(this.data.src);
      this.pending = null;
      this.idoc = document.querySelector('iframe').contentDocument;
      inlineresources.loadAndInlineImages(this.idoc);
      this.previousXhtml = null;
    },
    
    tick: async function (t) {
      if (this.pending) return;
      const xhtml = this.xmlSerializer.serializeToString(this.idoc.documentElement);
      if (xhtml === this.previousXhtml) return;
      this.previousXhtml = xhtml;

      const featured = {
        title: {
          el: this.idoc.documentElement.querySelector('h1')
        },
        image: {
          el: this.idoc.documentElement.querySelector('img')
        }
      };
      for (const [name, feature] of Object.entries(featured)) {
        if (feature.el) {
          const rect = feature.el.getBoundingClientRect();
          feature.backgroundColor = getComputedStyle(feature.el).backgroundColor;
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
          const fromPageCenter = {
            dx: feature.center.x - this.canvas.width / 2,
            dy: this.canvas.height / 2 - feature.center.y
          }
          console.log('fromPageCenter', fromPageCenter.dx, fromPageCenter.dy);
          feature.position = {
            x: this.el.object3D.position.x + fromPageCenter.dx / this.canvas.width * this.el.getAttribute('geometry').width,
            y: this.el.object3D.position.y + fromPageCenter.dy / this.canvas.height * this.el.getAttribute('geometry').height,
            z: this.el.object3D.position.z
          };
          console.log('position', feature.position.x, feature.position.y);
          feature.geometry = {
            width: this.el.getAttribute('geometry').width * feature.rect.width / this.canvas.width,
            height: this.el.getAttribute('geometry').height * feature.rect.height / this.canvas.height
          };
          console.log('geometry', feature.geometry.width, feature.geometry.height);
        }
      }

      this.pending = renderHtmlToCanvas(xhtml, this.canvas, featured);
      await this.pending;
      this.pending = null;

      const material = this.el.getObject3D('mesh').material;
      if (!material.map) {
        return;
      }
      material.map.needsUpdate = true;

      if (featured.title.el) {
        renderFeaturedPlane('title', featured.title);
      }
      if (featured.image) {
        renderFeaturedPlane('image', featured.image);
      }
    }
  });
})(AFRAME);