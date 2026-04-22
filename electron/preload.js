/**
 * Auto-Typer preload — exposes a narrow IPC surface to the renderer so that
 * contextIsolation can stay enabled and nodeIntegration stays disabled.
 */

const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = new Set([
  'start-typing',
  'stop-typing',
  'type-batch',
  'type-character',
  'type-backspace',
  'overlay-show',
  'overlay-hide',
  'overlay-update',
  'overlay-ready',
  'register-pause-shortcut',
  'unregister-pause-shortcut',
  'check-permissions',
  'request-permissions',
  'minimize-window',
]);

const LISTEN_CHANNELS = new Set([
  'toggle-typing',
  'force-pause',
  'overlay-state',
  'stop-typing',
]);

const wrapperByListener = new WeakMap();

contextBridge.exposeInMainWorld('autoTyperIPC', {
  invoke: (channel, ...args) => {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`IPC invoke not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, listener) => {
    if (!LISTEN_CHANNELS.has(channel) || typeof listener !== 'function') return;
    const wrapped = (_event, ...args) => listener(...args);
    wrapperByListener.set(listener, wrapped);
    ipcRenderer.on(channel, wrapped);
  },
  removeListener: (channel, listener) => {
    if (!LISTEN_CHANNELS.has(channel) || typeof listener !== 'function') return;
    const wrapped = wrapperByListener.get(listener);
    if (wrapped) {
      ipcRenderer.removeListener(channel, wrapped);
      wrapperByListener.delete(listener);
    }
  },
});
