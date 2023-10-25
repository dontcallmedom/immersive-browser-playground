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
      ipcRenderer.onPaint(async (_event, target, image) => {
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
