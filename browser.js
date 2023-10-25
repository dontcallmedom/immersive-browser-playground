window.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById("f");
  const plane = document.getElementById("screen");
  let counter = 0;
  ipcRenderer.onPaint((_event, image) => {
    img.src = image.toDataURL();
    if (document.getElementById("screen").getObject3D) {
      document.getElementById("screen").getObject3D("mesh").material.map.needsUpdate = true;
    }
  });
});
