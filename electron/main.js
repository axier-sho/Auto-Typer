/**
 * Auto-Typer - Human-like Typing Simulator
 * Developed by Axier
 * Website: https://axier.dev
 */

const { app, BrowserWindow, ipcMain, globalShortcut, systemPreferences, dialog, shell } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

let mainWindow = null;
const KEYCODES = {
  RETURN: 0x24,
  TAB: 0x30,
  SPACE: 0x31,
  DELETE: 0x33,
};

const KEY_CODE_MAP = {
  'a': 0, 'b': 11, 'c': 8, 'd': 2, 'e': 14, 'f': 3, 'g': 5, 'h': 4, 'i': 34, 'j': 38,
  'k': 40, 'l': 37, 'm': 46, 'n': 45, 'o': 31, 'p': 35, 'q': 12, 'r': 15, 's': 1, 't': 17,
  'u': 32, 'v': 9, 'w': 13, 'x': 7, 'y': 16, 'z': 6,
  '0': 29, '1': 18, '2': 19, '3': 20, '4': 21, '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
  '-': 27, '=': 24, '[': 33, ']': 30, '\\': 42, ';': 41, "'": 39, ',': 43, '.': 47, '/': 44,
  ' ': 49, '`': 50, '\t': 48, '\n': 36, '\r': 36
};

const SHIFT_MAP = {
  '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/'
};

function getCharInfo(char) {
  if (!char) return { keyCode: 0, shift: false };
  
  // Handle shifted symbols
  if (SHIFT_MAP[char]) {
    const baseChar = SHIFT_MAP[char];
    if (KEY_CODE_MAP[baseChar] !== undefined) {
      return { keyCode: KEY_CODE_MAP[baseChar], shift: true };
    }
  }
  
  const lower = char.toLowerCase();
  // Handle letters and numbers
  if (KEY_CODE_MAP[lower] !== undefined) {
    const isUpper = char !== lower && lower >= 'a' && lower <= 'z';
    return { keyCode: KEY_CODE_MAP[lower], shift: isUpper };
  }
  
  return { keyCode: 0, shift: false };
}

/**
 * Check if app has accessibility permissions (macOS only)
 */
function checkAccessibilityPermissions() {
  if (process.platform !== 'darwin') {
    return true; // Only needed on macOS
  }
  
  return systemPreferences.isTrustedAccessibilityClient(false);
}

/**
 * Show permission request dialog
 */
async function showPermissionDialog() {
  const response = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Accessibility Permission Required',
    message: 'Auto-Typer needs Accessibility permission to simulate typing',
    detail: 'This app requires Accessibility permissions to:\n\n' +
            '• Type text in other applications\n' +
            '• Use the global hotkey (Cmd+Shift+Y)\n' +
            '• Simulate realistic keyboard input\n\n' +
            'Click "Open System Settings" to grant permission, then restart the app.',
    buttons: ['Open System Settings', 'Remind Me Later', 'Learn More'],
    defaultId: 0,
    cancelId: 1
  });

  if (response.response === 0) {
    // Open System Settings to Privacy & Security > Accessibility
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  } else if (response.response === 2) {
    // Learn More - open help page
    shell.openExternal('https://support.apple.com/guide/mac-help/allow-accessibility-apps-to-access-your-mac-mh43185/mac');
  }

  return response.response !== 1; // Return true if not "Remind Me Later"
}

/**
 * Request accessibility permissions with prompt
 */
async function requestAccessibilityPermissions() {
  if (process.platform !== 'darwin') {
    return true;
  }

  // Try to prompt for permissions (this will show macOS system dialog)
  const hasPermission = systemPreferences.isTrustedAccessibilityClient(true);
  
  if (!hasPermission) {
    // Show our custom dialog explaining why we need permissions
    await showPermissionDialog();
    return false;
  }
  
  return true;
}

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

app.whenReady().then(async () => {
  createWindow();

  // Check for accessibility permissions on startup
  setTimeout(async () => {
    const hasPermissions = checkAccessibilityPermissions();
    if (!hasPermissions) {
      await requestAccessibilityPermissions();
    }
  }, 1000); // Small delay to let window load

  // Register global shortcut to toggle typing (works from any app)
  globalShortcut.register('CommandOrControl+Alt+\\', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-typing');
      // Don't bring window to front - let it type to the focused app
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

async function sendNativeInput(payload) {
  if (process.platform !== 'darwin') {
    return;
  }

  const script = `
const sys = Application('System Events');

function postKeystroke(payload) {
  const keyCode = (payload.keyCode === undefined || payload.keyCode === null) ? 0 : payload.keyCode;
  const hasText = typeof payload.text === "string" && payload.text.length > 0;

  if (hasText) {
    sys.keystroke(payload.text);
  } else if (keyCode > 0) {
    sys.keyCode(keyCode);
  }
}

postKeystroke(${JSON.stringify(payload)});
`;

  await execFilePromise('osascript', ['-l', 'JavaScript', '-e', script]);
}

/**
 * Type a single character using low-level events to avoid mouse interference
 */
async function typeCharacter(char) {
  try {
    if (char === '\n' || char === '\r') {
      await sendNativeInput({ keyCode: KEYCODES.RETURN });
    } else if (char === '\t') {
      await sendNativeInput({ keyCode: KEYCODES.TAB });
    } else if (char === ' ') {
      await sendNativeInput({ keyCode: KEYCODES.SPACE });
    } else {
      // const charInfo = getCharInfo(char);
      // await sendNativeInput({ text: char, keyCode: charInfo.keyCode, shift: charInfo.shift });
      await sendNativeInput({ text: char });
    }
  } catch (error) {
    console.error('Error typing character:', error);
  }
}

/**
 * Simulate backspace key using low-level events
 */
async function typeBackspace() {
  try {
    await sendNativeInput({ keyCode: KEYCODES.DELETE });
  } catch (error) {
    console.error('Error typing backspace:', error);
  }
}

// IPC handlers for window management
ipcMain.handle('minimize-window', async () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
  return { success: true };
});

// IPC handlers for permissions
ipcMain.handle('check-permissions', async () => {
  return checkAccessibilityPermissions();
});

ipcMain.handle('request-permissions', async () => {
  return await requestAccessibilityPermissions();
});

// IPC handlers for typing simulation
ipcMain.handle('start-typing', async (event, data) => {
  // Check permissions before starting typing
  const hasPermissions = checkAccessibilityPermissions();
  
  if (!hasPermissions) {
    await requestAccessibilityPermissions();
    return { 
      success: false, 
      error: 'Accessibility permissions required',
      needsPermission: true 
    };
  }
  
  return { success: true };
});

ipcMain.handle('stop-typing', async () => {
  return { success: true };
});

// Handler to type a single character (non-blocking)
ipcMain.handle('type-character', async (event, char) => {
  // Execute typing without blocking other IPC calls
  await typeCharacter(char);
  return { success: true };
});

// Handler to type a batch of characters (performance optimized)
ipcMain.handle('type-batch', async (event, events) => {
  await typeBatch(events);
  return { success: true };
});

// Handler to type backspace (non-blocking)
ipcMain.handle('type-backspace', async () => {
  // Execute backspace without blocking other IPC calls
  await typeBackspace();
  return { success: true };
});

let currentTypingProcess = null;

// Dynamic shortcut management for Tab key (Pause only)
ipcMain.handle('register-pause-shortcut', () => {
  try {
    // Only register if not already registered
    if (!globalShortcut.isRegistered('Tab')) {
      globalShortcut.register('Tab', () => {
        if (mainWindow) {
          mainWindow.webContents.send('force-pause');
        }
        // Kill the current typing process if it exists
        if (currentTypingProcess) {
          try {
            currentTypingProcess.kill();
            currentTypingProcess = null;
          } catch (e) {
            console.error('Error killing typing process:', e);
          }
        }
      });
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to register pause shortcut:', error);
  }
  return { success: false };
});

ipcMain.handle('unregister-pause-shortcut', () => {
  try {
    if (globalShortcut.isRegistered('Tab')) {
      globalShortcut.unregister('Tab');
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to unregister pause shortcut:', error);
  }
  return { success: false };
});

async function typeBatch(events) {
  if (process.platform !== 'darwin') {
    return;
  }

  // Preprocess events (no need for keyCodes with System Events)
  const processedEvents = events;
  
  // Debug: log first few events to see structure
  if (events.length > 0) {
    console.log('First event:', JSON.stringify(events[0]));
    if (events.length > 1) {
      console.log('Second event:', JSON.stringify(events[1]));
    }
  }

  const script = `
ObjC.import('Foundation');
const sys = Application('System Events');

function sleep(ms) {
  $.NSThread.sleepForTimeInterval(ms / 1000);
}

const events = ${JSON.stringify(processedEvents)};

events.forEach(function(e) {
  if (e.type === 'type') {
    var char = e.char;
    if (char === '\\n' || char === '\\r') {
      sys.keyCode(${KEYCODES.RETURN});
    } else if (char === '\\t') {
      sys.keyCode(${KEYCODES.TAB});
    } else if (char === ' ') {
      sys.keyCode(${KEYCODES.SPACE});
    } else if (/^[A-Z]$/.test(char)) {
      sys.keystroke(char.toLowerCase(), { using: "shift down" });
    } else {
      sys.keystroke(char);
    }
  } else if (e.type === 'delete') {
    sys.keyCode(${KEYCODES.DELETE});
  }
  
  if (e.delayMs > 0) {
    sleep(e.delayMs);
  }
});
`;

  // Execute with execFile but keep reference to child process
  return new Promise((resolve, reject) => {
    currentTypingProcess = execFile('osascript', ['-l', 'JavaScript', '-e', script], (error, stdout, stderr) => {
      currentTypingProcess = null;
      if (error && error.killed) {
        // Process was killed intentionally
        resolve();
      } else if (error) {
        // console.error('Typing error:', stderr);
        resolve(); // Resolve anyway to avoid crashing app
      } else {
        resolve();
      }
    });
  });
}

