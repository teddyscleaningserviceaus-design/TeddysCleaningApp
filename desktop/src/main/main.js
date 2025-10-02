const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');

let mainWindow;
let backendServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

function startBackendServer() {
  const backendApp = express();
  backendApp.use(cors());
  backendApp.use(express.json());

  // Load modular backend services
  require('../backend/modules/employee-management')(backendApp);
  require('../backend/modules/inventory-management')(backendApp);
  require('../backend/modules/site-management')(backendApp);
  require('../backend/modules/robotics-integration')(backendApp);
  require('../backend/modules/space-venture')(backendApp);

  const port = 3001;
  backendServer = backendApp.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendServer) {
    backendServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});