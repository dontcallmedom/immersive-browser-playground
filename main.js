const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');

/**
 * Scale factor of the primary display.
 */
let scaleFactor;

/**
 * Handle to the immersive browser window
 */
let browserWindow;

/**
 * Handle to the window that contains the HTML that we want to render in
 * the immersive browser.
 */
let contentWindow;

const createBrowserWindow = () => {
  browserWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden'
  });
  browserWindow.on('closed', _ => {
    contentWindow.destroy();
    contentWindow = null;
    browserWindow = null;
  });
  browserWindow.loadFile('index.html');
};

const createContentWindow = () => {
  contentWindow = new BrowserWindow({
    webPreferences: {
      offscreen: true
    },
    show: false,
    width: 800,
    height: 600
  });

  contentWindow.webContents.on('paint', (event, dirty, image) => {
    let resized = image;
    if (scaleFactor !== 1) {
      // Immersive browser window uses the image as texture. The dimensions of
      // the texture must be the dimensions of the content window (800x600).
      resized = image.resize({
        width: Math.floor(image.getSize().width / scaleFactor),
        height: Math.floor(image.getSize().height / scaleFactor)
      });
    }
    browserWindow.webContents.send('paint', 'content', resized);
  });
  contentWindow.webContents.setFrameRate(10);
  contentWindow.loadFile('content.html');
};

app.whenReady().then(() => {
  // Content window is rendered offscreen, but is still attached to a display.
  // This affects the Dots per Inch (DPI) scale used to render the content.
  // Let's assume that the window is attached to the primary display.
  const primaryDisplay = screen.getPrimaryDisplay();
  scaleFactor = primaryDisplay.scaleFactor;

  createBrowserWindow();
  createContentWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBrowserWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
