const { app, BrowserWindow, ipcMain } = require('electron');
// inclusion du chemin du module Node.js au tout début de votre fichier
const path = require('node:path');

let browserWindow; 

const createBrowserWindow = () => {
  browserWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  browserWindow.loadFile('index.html');
};

const createContentWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      offscreen: true
    },
    show: false,
    width: 800,
    height: 600,
  });

  win.webContents.on('paint', (event, dirty, image) => {
    browserWindow.webContents.send('paint', image);
  });
  win.webContents.setFrameRate(10);
  win.loadFile('content.html');
};


app.whenReady().then(() => {
  createBrowserWindow();
  createContentWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createBrowserWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
