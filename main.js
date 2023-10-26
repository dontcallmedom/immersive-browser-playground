const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('node:path');

/**
 * Scale factor of the primary display.
 */
let scaleFactor;

/**
 * Handle to the immersive browser window
 */
let browserWindow;

let windows = [];

let illustrationSrc;

let url;

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
    windows.forEach(win => {
      win.destroy();
    });
    windows = null;
    browserWindow = null;
  });
  browserWindow.loadFile("index.html");
};

const createContentWindow = (position = 0) => {
  const options = {
    webPreferences: {
      offscreen: true
    },
    show: false,
    width: 800,
    height: 600
  };

  if (position === 0) {
    options.webPreferences.preload = path.join(__dirname, 'preload-content.js');
  }
  const win = new BrowserWindow(options);
  win.webContents.on('paint', (event, dirty, image) => {
    let resized = image;
    if (scaleFactor !== 1) {
      // Immersive browser window uses the image as texture. The dimensions of
      // the texture must be the dimensions of the content window (800x600).
      resized = image.resize({
        width: Math.floor(image.getSize().width / scaleFactor),
        height: Math.floor(image.getSize().height / scaleFactor)
      });
    }
    browserWindow.webContents.send('paint', "content" + position, resized);
  });
  win.webContents.setFrameRate(10);
  windows[position] = win;
};

let sortedLinks;

const showMode = mode => {
  switch(mode) {
  case "classic":
    for (let i = 0 ; i < 4; i++) {
      windows[i+1].loadURL("about:blank");
    }
    break;
  case "page":
    for (let i = 1 ; i < 4; i++) {
      windows[i+1].loadURL("about:blank");
    }
    //windows[1].loadURL(url);
    windows[0].webContents.send('illustrate');
    break;
  case "navigation":
    for (let i = 0 ; i < Math.min(sortedLinks.length, 4); i++) {
      windows[i+1].loadURL(sortedLinks[i]);
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

  createBrowserWindow();
  for (let i = 0  ; i < 5 ; i++) {
    createContentWindow(i);
  }
  url = process.argv[2] ?? 'https://fr.wikipedia.org/wiki/Route_de_la_soie';
  windows[0].loadURL(url);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBrowserWindow();
    }
  });

  ipcMain.handle('console', function(e, ...args) {
    console.log(...args);
  });

  ipcMain.handle('sendClick', function(e, x, y) {
    windows[0].webContents.send('click', x, y);
  });

  ipcMain.handle('scroll', (event, delta) => {
    windows[0].webContents.send('scroll', delta);
  });
  ipcMain.handle('loadImage', (event, src) => {
    browserWindow.webContents.send('paint', "content1", src);
  });


  ipcMain.handle('setMode', (event, mode) => {
    showMode(mode);
  });


  ipcMain.handle('open', (event, links) => {
    sortedLinks = Object.keys(links).sort((l1, l2) => links[l1] - links[l2]);
  });
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
