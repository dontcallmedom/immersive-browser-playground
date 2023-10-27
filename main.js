const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Default content browsing window dimensions
 */
const defaultViewportWidth = 800;
const defaultViewportHeight = 600;

/**
 * Scale factor of the primary display.
 */
let scaleFactor;

/**
 * Handle to the immersive browser window
 */
let immersiveWindow;

/**
 * Handles to the offscreen content windows.
 *
 * First content window in the list contains the main content being rendered.
 * Further content windows contain side content (images or companion page).
 */
let contentWindows = [];

/**
 * Number of companion windows (on top of the main one)
 */
const companionContentWindowsNumber = 4;

/**
 * Handle to the last painted image in the main offscreen content window.
 *
 * This last painted image is used to extract rectangles aimed at 3D effects.
 */
let lastPaintedImage;


/**
 * Requested URL
 */
let url = 'https://fr.wikipedia.org/wiki/Route_de_la_soie';

/**
 * Sorted list of links to use to fill side content planes.
 * The list is sent by the main content window when the page is done loading.
 * It is only useful in "navigation" mode
 */
let sortedLinks;


/**
 * Create the immersive browser window
 *
 * The window renders the a-frame 3D scene that represents the immersive
 * experience. The scene typically contains planes used to render web
 * content (actually rendered from offscreen content windows).
 */
const createImmersiveWindow = () => {
  immersiveWindow = new BrowserWindow({
    width: 1024,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden'
  });
  immersiveWindow.on('closed', _ => {
    contentWindows.forEach(win => {
      win.destroy();
    });
    contentWindows = null;
    immersiveWindow = null;
  });
  immersiveWindow.loadFile('index.html');
};

/**
 * Create offscreen content window at the given position in the list
 *
 * The content window is used to render an actual web page in 2D in the
 * background. Whenever the content is painted, a copy of the rendered
 * content is sent to the immersive browser window, so that the corresponding
 * content plane in the a-frame scene can be updated.
 *
 * The main content window (position 0) can also apply a 3D effect to a set of
 * features (identified through `data-xr-z` attributes in the HTML, and
 * effectively identified as rectangles in the painted image. When needed, the
 * function sends these rectangles to the immersive browser window so that it
 * may convert them to planes in the 3D scene.
 */
const createContentWindow = (position = 0) => {
  const options = {
    webPreferences: {
      offscreen: true
    },
    show: false,
    width: defaultViewportWidth,
    height: defaultViewportHeight
  };
  if (position === 0) {
    options.webPreferences.preload = path.join(__dirname, 'preload-content.js')
  }

  const contentWindow = new BrowserWindow(options);
  contentWindow.webContents.on('paint', (event, dirty, image) => {
    if (!immersiveWindow) {
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
    immersiveWindow.webContents.send('paint', "content" + position, resized);
    lastPaintedImage = resized;
  });
  contentWindow.webContents.setFrameRate(10);
  contentWindows[position] = contentWindow;
};

const showMode = mode => {
  switch (mode) {
  case "classic":
    for (let i = 0 ; i < companionContentWindowsNumber; i++) {
      contentWindows[i+1].loadURL('about:blank');
    }
    break;
  case "3d":
    contentWindows[0].webContents.send('toggle3d');
    break;
  case "page":
    for (let i = 1 ; i < companionContentWindowsNumber; i++) {
      contentWindows[i+1].loadURL("about:blank");
    }
    contentWindows[0].webContents.send('illustrate');
    break;
  case "navigation":
    for (let i = 0 ; i < Math.min(sortedLinks.length, companionContentWindowsNumber); i++) {
      contentWindows[i+1].loadURL(sortedLinks[i]);
    }
    break;
  }
};

app.whenReady().then(() => {
  // Content window is rendered offscreen, but is still attached to a display.
  // This affects the Dots per Inch (DPI) scale used to render the content.
  // Let's assume that the window is attached to the primary display.
  const primaryDisplay = screen.getPrimaryDisplay();
  scaleFactor = primaryDisplay.scaleFactor;

  let mode = "classic";

  createImmersiveWindow();
  for (let i = 0  ; i < 5 ; i++) {
    createContentWindow(i);
  }
  if (process.argv[2]) {
    url = process.argv[2];
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createImmersiveWindow();
    }
  });
  showMode(mode);

  // Proxy console messages sent by browser windows
  ipcMain.handle('console', function(e, ...args) {
    console.log(...args);
  });

  // Send viewport geometry of main content plane to immersive browser
  // once it's ready to process the message, and load default page.
  ipcMain.handle('browserIsLoaded', function(e) {
    immersiveWindow.webContents.send('viewportGeometry', {
      width: defaultViewportWidth*scaleFactor,
      height: defaultViewportHeight*scaleFactor,
      scaleFactor
    });
    contentWindows[0].loadFile("content.html");
  });

  // Proxy click and scroll events between the main content plane in the
  // immersive browser window and the related offscreen content window.
  ipcMain.handle('sendClick', function(e, x, y) {
    contentWindows[0].webContents.send('click', x, y);
  });
  ipcMain.handle('scroll', (event, delta) => {
    contentWindows[0].webContents.send('scroll', delta);
  });

  // An image needs to be loaded on the side of the main content plane
  ipcMain.handle('loadImage', (event, src) => {
    immersiveWindow.webContents.send('paint', "content1", src);
  });

  // Switch to another browsing mode
  ipcMain.handle('setMode', (event, mode) => {
    console.log('setMode', mode);
    showMode(mode);
  });

  // Received a list of links from the main content window
  ipcMain.handle('sortedLinks', (event, links) => {
    sortedLinks = Object.keys(links).sort((l1, l2) => links[l1] - links[l2]);
  });

  // Received a list of features that should be highlighed from the main
  // offscreen content window
  ipcMain.handle('features', (event, features) => {
    for (const feature of features) {
      const crop = lastPaintedImage.crop(feature.rect);
      immersiveWindow.webContents.send('paint3d', feature, crop.toDataURL());
    }
  });

  // Relay the instruction from immersive window to toggle feature's visibility
  // in content window.
  ipcMain.handle('toggleFeatureInContent', (event, name) => {
    contentWindows[0].webContents.send('toggleFeatureInContent', name);
  });

  // Reset 3D effects whenever the loaded content changes.
  ipcMain.handle('beforeunload', _ => {
    immersiveWindow.webContents.send('reset3d');
  });

  // Proxy user actions on buttons between immersive browser window
  // and the main offscreen content window
  ipcMain.handle('toggle3d', async () => {
    showMode("3d");
  });
  ipcMain.handle('toggle-illustrate', async () => {
    await contentWindows[0].loadURL(url);
    showMode("page");
  });
  ipcMain.handle('toggle-navigate', async () => {
    await contentWindows[0].loadURL(url);
    showMode("navigation");
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
