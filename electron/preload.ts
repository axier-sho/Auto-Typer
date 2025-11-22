// Preload script (optional for future enhancements)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startTyping: (data: any) => ipcRenderer.invoke('start-typing', data),
  stopTyping: () => ipcRenderer.invoke('stop-typing'),
  onStopTyping: (callback: () => void) => ipcRenderer.on('stop-typing', callback),
});
