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
let overlayWindow = null;
let latestOverlayState = {
  progress: 0,
  actualWpm: 0,
  elapsedMs: 0,
  estimatedMs: 0,
  isPaused: false,
  isTyping: false,
};
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
  if (!mainWindow || mainWindow.isDestroyed()) return false;
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
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Auto-Typer',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#e2e8f0',
      height: 36,
    },
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
  const registered = globalShortcut.register('CommandOrControl+Alt+\\', () => {
    console.log('[MAIN] Global shortcut triggered'); // #region agent log
    if (mainWindow) {
      mainWindow.webContents.send('toggle-typing');
      console.log('[MAIN] Sent toggle-typing event'); // #region agent log
      // Don't bring window to front - let it type to the focused app
    }
  });
  console.log('[MAIN] Global shortcut registered:', registered); // #region agent log

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

app.on('before-quit', () => {
  destroyOverlay();
});

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.showInactive();
    return overlayWindow;
  }

  overlayWindow = new BrowserWindow({
    width: 340,
    height: 92,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    acceptFirstMouse: true,
    title: 'Auto-Typer Overlay',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.env.NODE_ENV === 'development') {
    overlayWindow.loadURL('http://localhost:5173/#overlay');
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'overlay',
    });
  }

  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.showInactive();
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function destroyOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
}

function pushOverlayState() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  try {
    overlayWindow.webContents.send('overlay-state', latestOverlayState);
  } catch (e) {
    console.error('[MAIN] Failed to push overlay state:', e);
  }
}

ipcMain.handle('overlay-show', () => {
  createOverlayWindow();
  pushOverlayState();
  return { success: true };
});

ipcMain.handle('overlay-hide', () => {
  destroyOverlay();
  return { success: true };
});

ipcMain.handle('overlay-update', (_event, payload) => {
  if (payload && typeof payload === 'object') {
    latestOverlayState = { ...latestOverlayState, ...payload };
  }
  pushOverlayState();
  return { success: true };
});

ipcMain.handle('overlay-ready', () => {
  pushOverlayState();
  return { success: true };
});

function isAsciiKeystrokeSafe(char) {
  if (typeof char !== 'string' || char.length === 0) {
    return false;
  }
  if (char === '\n' || char === '\r' || char === '\t') {
    return true;
  }
  if (char.length !== 1) {
    return false;
  }
  const code = char.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e;
}

// Force all characters outside the ASCII range to \uXXXX escape sequences so
// that the JXA script source we hand to osascript is pure ASCII. This removes
// any dependency on argv / file-encoding matching between Node, execFile and
// osascript — a known source of silent corruption for non-BMP chars.
function escapeNonAscii(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0x7e) {
      out += '\\u' + ('0000' + code.toString(16)).slice(-4);
    } else {
      out += s[i];
    }
  }
  return out;
}

// Non-ASCII characters (Japanese, emoji, full-width punctuation, etc.) can't be
// emitted reliably by AppleScript's keystroke, so each one is flipped to a
// single-char paste event. Per-char (not grouped) keeps the "typing one char at
// a time" rhythm instead of dumping a whole run at once.
function markNonAsciiAsPaste(events) {
  const result = [];
  for (const ev of events) {
    const isType = ev && ev.type === 'type' && typeof ev.char === 'string';
    if (isType && !isAsciiKeystrokeSafe(ev.char)) {
      result.push({
        type: 'paste',
        text: ev.char,
        delayMs: Math.max(0, Number(ev.delayMs) || 0),
      });
    } else {
      result.push(ev);
    }
  }
  return result;
}

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

async function pasteText(text) {
  if (process.platform !== 'darwin' || typeof text !== 'string' || text.length === 0) {
    return;
  }

  const script = `
ObjC.import('Foundation');
ObjC.import('AppKit');
const sys = Application('System Events');
const pasteboard = $.NSPasteboard.generalPasteboard;

function readClipboard() {
  const value = pasteboard.stringForType($.NSPasteboardTypeString);
  return value ? ObjC.unwrap(value) : "";
}

function writeClipboard(value) {
  pasteboard.clearContents;
  pasteboard.setStringForType($(value), $.NSPasteboardTypeString);
}

const text = ${JSON.stringify(text)};
const previous = readClipboard();
try {
  writeClipboard(text);
  sys.keystroke('v', { using: 'command down' });
  // Give the target app time to actually read the pasteboard before we
  // restore it; otherwise the paste lands on stale clipboard content.
  $.NSThread.sleepForTimeInterval(0.04);
} finally {
  writeClipboard(previous);
}
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
    } else if (char === ' ' && isAsciiKeystrokeSafe(char)) {
      await sendNativeInput({ keyCode: KEYCODES.SPACE });
    } else if (!isAsciiKeystrokeSafe(char)) {
      await pasteText(char);
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
  pauseRequested = true;
  // Kill the current typing process if it exists
  if (currentTypingProcess) {
    try {
      currentTypingProcess.kill('SIGKILL');
      currentTypingProcess = null;
    } catch (e) {
      console.error('Error killing typing process:', e);
    }
  }
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
  // Guard against the race where the renderer queued this batch just before
  // Tab was pressed. Without this check main would spawn a fresh osascript
  // that runs ~10 more keystrokes after the user asked to pause.
  if (pauseRequested) {
    return { success: false, paused: true };
  }
  await typeBatch(events);
  // Batch may have been killed mid-flight by a Tab press. Don't let the
  // renderer advance its committed index — signal paused so it rolls back
  // the preview to match reality.
  if (pauseRequested) {
    return { success: false, paused: true };
  }
  return { success: true };
});

// Handler to type backspace (non-blocking)
ipcMain.handle('type-backspace', async () => {
  // Execute backspace without blocking other IPC calls
  await typeBackspace();
  return { success: true };
});

let currentTypingProcess = null;
let pauseRequested = false;

// Dynamic shortcut management for Tab key (Pause only)
ipcMain.handle('register-pause-shortcut', () => {
  try {
    // A fresh start/resume clears any stale pause flag from the previous run.
    pauseRequested = false;
    // Only register if not already registered
    if (!globalShortcut.isRegistered('Tab')) {
      const registered = globalShortcut.register('Tab', () => {
        console.log('[MAIN] Tab key pressed for pause'); // #region agent log
        // Set main-side pause flag synchronously so any in-flight or
        // about-to-arrive type-batch IPC short-circuits instead of spawning
        // another osascript run.
        pauseRequested = true;
        if (mainWindow) {
          mainWindow.webContents.send('force-pause');
          console.log('[MAIN] Sent force-pause event'); // #region agent log
        }
        // Kill the current typing process if it exists
        if (currentTypingProcess) {
          try {
            console.log('[MAIN] Killing typing process'); // #region agent log
            // SIGKILL forces immediate termination; SIGTERM let osascript
            // finish its current keystroke + sleep before exiting.
            currentTypingProcess.kill('SIGKILL');
            currentTypingProcess = null;
          } catch (e) {
            console.error('Error killing typing process:', e);
          }
        }
      });
      console.log('[MAIN] Tab shortcut registered:', registered); // #region agent log
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

  const processedEvents = markNonAsciiAsPaste(events);
  
  // #region agent log
  console.log('[MAIN] typeBatch called with', events.length, 'events');
  // #endregion
  
  // Debug: log first few events to see structure
  if (events.length > 0) {
    console.log('First event:', JSON.stringify(events[0]));
    if (events.length > 1) {
      console.log('Second event:', JSON.stringify(events[1]));
    }
  }

  const script = `
ObjC.import('Foundation');
ObjC.import('AppKit');
const sys = Application('System Events');
const pasteboard = $.NSPasteboard.generalPasteboard;

function sleep(ms) {
  $.NSThread.sleepForTimeInterval(ms / 1000);
}

function readClipboard() {
  const value = pasteboard.stringForType($.NSPasteboardTypeString);
  return value ? ObjC.unwrap(value) : "";
}

function writeClipboard(value) {
  pasteboard.clearContents;
  pasteboard.setStringForType($(value), $.NSPasteboardTypeString);
}

function pasteText(text) {
  console.log('[JXA] pasteText start, length=' + text.length + ' cp0=' + (text.length ? text.charCodeAt(0).toString(16) : 'n/a'));
  const previous = readClipboard();
  try {
    writeClipboard(text);
    const written = readClipboard();
    console.log('[JXA] clipboard after write, length=' + written.length + ' matches=' + (written === text));
    sys.keystroke('v', { using: 'command down' });
    sleep(40);
  } finally {
    writeClipboard(previous);
  }
  console.log('[JXA] pasteText end');
}

const events = ${escapeNonAscii(JSON.stringify(processedEvents))};

events.forEach(function(e) {
  if (e.type === 'paste') {
    pasteText(e.text || '');
  } else if (e.type === 'type') {
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
    // #region agent log
    console.log('[MAIN] Starting osascript process');
    // #endregion
    currentTypingProcess = execFile('osascript', ['-l', 'JavaScript', '-e', script], (error, stdout, stderr) => {
      // #region agent log
      console.log('[MAIN] osascript completed/terminated, killed:', error?.killed);
      // #endregion
      currentTypingProcess = null;
      if (error && error.killed) {
        // Process was killed intentionally
        resolve();
      } else if (error) {
        console.error('[MAIN] osascript error:', error.message);
        if (stderr) console.error('[MAIN] osascript stderr:', stderr);
        resolve(); // Resolve anyway to avoid crashing app
      } else {
        if (stderr) console.error('[MAIN] osascript stderr (no error):', stderr);
        resolve();
      }
    });
  });
}
