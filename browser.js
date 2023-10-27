let viewport;

document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.isLoaded();
});

ipcRenderer.onViewportGeometry(function (_event, geometry) {
  viewport = geometry;
});


(function (AFRAME) {
  // Maximum displacement on the z-axis (in meters)
  const ZMAX = 0.05;

  const imageCache = {};

  // The a-frame component refreshes an image used as texture
  // whenever a new one is received from the main thread.
  AFRAME.registerComponent('paint-image', {
    schema: {
      id: { type: 'string', default: 'content' }
    },

    init: function () {
      this.textureLoader = new THREE.TextureLoader();
      this.pending = false;

      window.addEventListener("mousewheel", event => {
        ipcRenderer.scroll(event.deltaY);
      });

      ipcRenderer.onReset3D(async _event => {
        for (const featurePlane of Object.values(featured)) {
          featurePlane.remove();
        }
        featured = {};
      });

      ipcRenderer.onPaint(async (_event, target, image) => {
        if (target !== this.data.id || this.pending) {
          // Paint message is for someone else
          // or we're already busy re-drawing the texture
          return;
        }
        if (typeof image === "string") {
          if (image.startsWith("https://")) {
            if (!imageCache[image]) {
              const src = image;
              const img = new Image();
              const isLoaded = new Promise(res => img.addEventListener("load", res));
              img.src = src;
              await isLoaded;
              const cv = document.createElement("canvas");
              cv.width = viewport.width;
              cv.height = viewport.height;
              const ctx = cv.getContext("2d");
              const aspectRatio = img.width / img.height;
              const width = Math.min(cv.width, cv.height*aspectRatio);
              const height = Math.min(cv.height, cv.width/aspectRatio);
              ctx.drawImage(img, 0, 0, width, height);
              imageCache[image] = cv;
            }
            image = imageCache[image].toDataURL();
          }
        } else {
          image = image.toDataURL();
        }
        this.pending = new Promise(resolve => {
          this.textureLoader.load(
            image,
            texture => {
              const material = this.el.getObject3D('mesh').material;
              material.map = texture;
              material.map.needsUpdate = true;
              resolve();
            },
            null,
            err => {
              logger.error(err);
              resolve();
            }
          );
        });
        await this.pending;
        this.pending = null;
      });
    }
  });

  let featured = {};

  ipcRenderer.onPaint3D(async (_event, feature, image) => {
    const contentPlane = document.querySelector('#content');
    const fromPageCenter = {
      dx: feature.center.x - (viewport.width / viewport.scaleFactor) / 2,
      dy: (viewport.height / viewport.scaleFactor) / 2 - feature.center.y
    }
    logger.log(feature.name, 'fromPageCenter', fromPageCenter.dx, fromPageCenter.dy);
    feature.position = {
      x: contentPlane.object3D.position.x + fromPageCenter.dx / (viewport.width / viewport.scaleFactor) * contentPlane.getAttribute('geometry').width,
      y: contentPlane.object3D.position.y + fromPageCenter.dy / (viewport.height / viewport.scaleFactor) * contentPlane.getAttribute('geometry').height,
      z: contentPlane.object3D.position.z
    };
    logger.log(feature.name, 'position', feature.position.x, feature.position.y);
    feature.geometry = {
      width: contentPlane.getAttribute('geometry').width * feature.rect.width / (viewport.width / viewport.scaleFactor),
      height: contentPlane.getAttribute('geometry').height * feature.rect.height / (viewport.height / viewport.scaleFactor)
    };
    logger.log(feature.name, 'geometry', feature.geometry.width, feature.geometry.height);

    const textureLoader = new THREE.TextureLoader();
    let featurePlane = featured[feature.name];
    if (!featurePlane) {
      featurePlane = document.createElement('a-plane');
      document.querySelector('#content-container').appendChild(featurePlane);
      featured[feature.name] = featurePlane;
    }

    featurePlane.setAttribute('id', feature.name);
    featurePlane.setAttribute('position', `${feature.position.x} ${feature.position.y} ${feature.position.z + 0.0001}`);
    featurePlane.setAttribute('width', feature.geometry.width);
    featurePlane.setAttribute('height', feature.geometry.height);
    featurePlane.setAttribute('material', 'side:double; metalness:0; transparent: true; opacity: 0.9;');
    featurePlane.setAttribute('shadow', 'cast: true; receive: false');
    featurePlane.setAttribute('visible', 'false');
    featurePlane.setAttribute('animation__show', {
      property: 'position',
      to: { z: feature.position.z + feature.translateZ / 100 * ZMAX },
      easing: 'easeInOutSine',
      dur: 2000,
      startEvents: 'show3d'
    });
    featurePlane.setAttribute('animation__hide', {
      property: 'position',
      to: { z: feature.position.z + 0.0001 },
      easing: 'easeInOutSine',
      dur: 1000,
      startEvents: 'hide3d'
    });
    featurePlane.addEventListener('animationcomplete', (evt) => {
      if (evt.detail.name === 'animation__hide') {
        ipcRenderer.toggleFeatureInContent(feature.name);

        // Give some time to content window to toggle visibility before we
        // drop the 3D plane to avoid flickering.
        // (TODO: would better be done with another back and forth message)
        setTimeout(() => { featurePlane.remove(); }, 200);
      }
    });
    textureLoader.load(
      image,
      texture => {
        featurePlane.getObject3D('mesh').material.map = texture;
        featurePlane.getObject3D('mesh').material.needsUpdate = true;
        ipcRenderer.toggleFeatureInContent(feature.name);
        featurePlane.object3D.visible = true;
        featurePlane.emit('show3d');
      },
      null,
      err => {
        logger.error(err);
      }
    );
  });

  AFRAME.registerComponent('cursor-listener', {
    schema: {
      action: { type: 'string', default: 'content-click' }
    },

    init: function () {
      this.el.addEventListener('animationcomplete', evt => {
        if (evt.detail.name === 'animation__click_push') {
          this.el.emit('click-pop');
        }
      });
      this.el.addEventListener('click', evt => {
        switch (this.data.action) {
        case 'content-click':
          const screen = evt.target.object3D;
          // Y axis is oriented in opposed directions in 3D and in viewport
          const clickVector = evt.target.object3D.worldToLocal(new THREE.Vector3(evt.detail.intersection.point.x, evt.detail.intersection.point.y, evt.detail.intersection.point.z));
          const { width, height} = evt.target.getAttribute("geometry");
          const { x: scaleX, y: scaleY} = evt.target.object3D.scale;
          const offsetX = viewport.width* (clickVector.x + scaleX*width/2) / (scaleX*width);
          const offsetY = -viewport.height*(clickVector.y - scaleY*height/2) / (scaleY*height);
          ipcRenderer.sendClick(offsetX, offsetY);
          break;

        case 'toggle-wireframe':
          const isVisible = document.querySelector('#wireframe').object3D.visible;
          document.querySelector('#wireframe').object3D.visible = !isVisible;
          break;

        case 'toggle-3d':
          for (const featurePlane of Object.values(featured)) {
            featurePlane.emit('hide3d');
          }
          featured = {};
          ipcRenderer.toggle3d();
          break;

        case 'toggle-illustrate':
          ipcRenderer.toggleIllustrate();
          break;

        case 'toggle-navigate':
          ipcRenderer.toggleNavigate();
          break;
        }

        this.el.emit('click-push');
      });
    }
  });
})(AFRAME);
