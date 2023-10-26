const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

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

/**
 * Featured in content displayed
 */
let featured;
let featuredNeedsUpdate = false;

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
      offscreen: true,
      preload: path.join(__dirname, 'preload-content.js')
    },
    show: false,
    width: 800,
    height: 600
  });

  contentWindow.webContents.on('paint', (event, dirty, image) => {
    if (!browserWindow) {
      return;
    }
    let resized = image;
    if (scaleFactor !== 1) {
      // Immersive browser window uses the image as texture. The dimensions of
      // the texture must be the dimensions of the content window (800x600).
      resized = image.resize({
        width: Math.floor(image.getSize().width / scaleFactor),
        height: Math.floor(image.getSize().height / scaleFactor)
      });
    }
    browserWindow.webContents.send('paint', 'content', resized.toDataURL());

    if (featuredNeedsUpdate) {
      contentWindow.webContents.send('featuresupdated');
      featuredNeedsUpdate = false;
      for (const feature of featured) {
        feature.contentSize = {
          width: resized.getSize().width,
          height: resized.getSize().height
        };
        const crop = resized.crop(feature.rect);
        browserWindow.webContents.send('paint', feature.name, crop.toDataURL(), feature);
      }
    }
  });
  contentWindow.webContents.setFrameRate(10);
  contentWindow.loadFile('content.html');
  //contentWindow.loadURL('https://www.w3.org/');
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

  ipcMain.handle('featured', async (event, list) => {
    featured = list;
    featuredNeedsUpdate = true;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
