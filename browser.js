(function (AFRAME) {
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
	console.log(this.data.id, target);
        if (target !== this.data.id || this.pending) {
          // Paint message is for someone else
          // or we're already busy re-drawing the texture
          return;
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
