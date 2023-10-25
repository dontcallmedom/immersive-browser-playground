(function (AFRAME) {
  const imageCache = {};

  AFRAME.registerComponent('cursor-listener', {
    init: function () {
      this.el.addEventListener('click', function (evt) {
	console.log('I was clicked at: ', evt.detail.intersection.point);
      });
    }
  });


  // The a-frame component refreshes an image used as texture
  // whenever a new one is received from the main thread.
  AFRAME.registerComponent('paint-image', {
    schema: {
      id: { type: 'string', default: 'content' }
    },

    init: function () {
      this.textureLoader = new THREE.TextureLoader();
      this.pending = false;

      window.document.getElementById("mode").addEventListener("change", e => {
	ipcRenderer.setMode(e.target.value);
      });

      window.addEventListener("mousewheel", event => {
	ipcRenderer.scroll(event.deltaY);
      });

      ipcRenderer.onPaint(async (_event, target, image) => {
        if (target !== this.data.id || this.pending) {
          // Paint message is for someone else
          // or we're already busy re-drawing the texture
          return;
        }
	if (typeof image === "string") {
	  if (!imageCache[image]) {
	    const src = image;
	    const img = new Image();
	    const isLoaded = new Promise(res => img.addEventListener("load", res));
	    img.src = src;
	    await isLoaded;
	    const cv = document.createElement("canvas");
	    cv.width = 800;
	    cv.height = 600;
	    const ctx = cv.getContext("2d");
	    const aspectRatio = img.width / img.height;
	    const width = Math.min(800, 600*aspectRatio);
	    const height = Math.min(600, 800/aspectRatio);
	    ctx.drawImage(img, 0, 0, width, height);
	    imageCache[image] = cv;
	  }
	  image = imageCache[image];
	}
        this.pending = new Promise(resolve => {
          this.textureLoader.load(
            image.toDataURL(),
            texture => {
              this.el.getObject3D('mesh').material.map = texture;
              this.el.getObject3D('mesh').material.map.needsUpdate = true;
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
})(AFRAME);
