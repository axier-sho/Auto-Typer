/**
 * Auto-Typer - Human-like Typing Simulator
 * Developed by Axier
 * Website: https://axier.dev
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: 'Auto-Typer',
    titleBarStyle: 'default',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Register global shortcut to toggle typing (works from any app)
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-typing');
      // Bring window to front when triggered from another app
      if (!mainWindow.isFocused()) {
        mainWindow.show();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for typing simulation
ipcMain.handle('start-typing', async (event, data) => {
  return { success: true };
});

ipcMain.handle('stop-typing', async () => {
  return { success: true };
});
