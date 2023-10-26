let viewport;
document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.isLoaded();
});

ipcRenderer.onViewportGeometry(function (_event, width, height) {
  viewport = {
    width,
    height
    };
});


(function (AFRAME) {
  const imageCache = {};

  AFRAME.registerComponent('cursor-listener', {
    init: function () {
      this.el.addEventListener('click', function (evt) {
	const screen = evt.target.object3D;

	// Y axis is oriented in opposed directions in 3D and in viewport
	const clickVector = evt.target.object3D.worldToLocal(new THREE.Vector3(evt.detail.intersection.point.x, evt.detail.intersection.point.y, evt.detail.intersection.point.z));
	const offsetX = (clickVector.x + 1/2)*viewport.width;
	const offsetY = -(clickVector.y - 1/2)*viewport.height;
	ipcRenderer.sendClick(offsetX, offsetY);
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
	    cv.width = viewport.width;
	    cv.height = viewport.height;
	    const ctx = cv.getContext("2d");
	    const aspectRatio = img.width / img.height;
	    const width = Math.min(cv.width, cv.height*aspectRatio);
	    const height = Math.min(cv.height, cv.width/aspectRatio);
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
