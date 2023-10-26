(function (AFRAME) {
  // Maximum displacement on the z-axis (in meters)
  const ZMAX = 0.05;

  // The a-frame component refreshes an image used as texture
  // whenever a new one is received from the main thread.
  AFRAME.registerComponent('paint-image', {
    schema: {
      id: { type: 'string', default: 'content' }
    },

    init: function () {
      this.textureLoader = new THREE.TextureLoader();
      this.pending = false;
      ipcRenderer.onPaint(async (_event, target, image) => {
        if (target !== this.data.id || this.pending) {
          // Paint message is for someone else
          // or we're already busy re-drawing the texture
          return;
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
              console.error(err);
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
  ipcRenderer.onPaint(async (_event, name, image, feature) => {
    // Ignore paint events that are not for features
    if (!name || !name.startsWith('feature-')) {
      return;
    }

    const contentPlane = document.querySelector('#content');
    const material = contentPlane.getObject3D('mesh').material;
    const fromPageCenter = {
      dx: feature.center.x - feature.contentSize.width / 2,
      dy: feature.contentSize.height / 2 - feature.center.y
    }
    console.log('fromPageCenter', fromPageCenter.dx, fromPageCenter.dy);
    feature.position = {
      x: contentPlane.object3D.position.x + fromPageCenter.dx / feature.contentSize.width * contentPlane.getAttribute('geometry').width,
      y: contentPlane.object3D.position.y + fromPageCenter.dy / feature.contentSize.height * contentPlane.getAttribute('geometry').height,
      z: contentPlane.object3D.position.z
    };
    console.log('position', feature.position.x, feature.position.y);
    feature.geometry = {
      width: contentPlane.getAttribute('geometry').width * feature.rect.width / feature.contentSize.width,
      height: contentPlane.getAttribute('geometry').height * feature.rect.height / feature.contentSize.height
    };
    console.log('geometry', feature.geometry.width, feature.geometry.height);

    const textureLoader = new THREE.TextureLoader();
    let featurePlane = featured[name];
    if (!featurePlane) {
      featurePlane = document.createElement('a-plane');
      document.querySelector('#content-container').appendChild(featurePlane);
      featured[name] = featurePlane;
    }

    featurePlane.setAttribute('id', feature.name);
    featurePlane.setAttribute('position', `${feature.position.x} ${feature.position.y} ${feature.position.z + 0.001}`);
    featurePlane.setAttribute('width', feature.geometry.width);
    featurePlane.setAttribute('height', feature.geometry.height);
    featurePlane.setAttribute('material', 'side:double; metalness:0');
    featurePlane.setAttribute('shadow', 'cast: true; receive: false');
    textureLoader.load(
      image,
      texture => {
        featurePlane.getObject3D('mesh').material.map = texture;
        featurePlane.getObject3D('mesh').material.needsUpdate = true;
        featurePlane.setAttribute('animation', {
          property: 'position',
          to: { z: feature.position.z + feature.translateZ / 100 * ZMAX },
          easing: 'easeInOutSine',
          dur: 2000
        });
      },
      null,
      err => {
        console.error(err);
      }
    );
  });
})(AFRAME);
