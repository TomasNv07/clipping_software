import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Screen capture
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // Audio devices
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),

  // Recording controls
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  saveClip: (videoData?: ArrayBuffer) => ipcRenderer.invoke('save-clip', videoData),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Clip management
  getClipsList: () => ipcRenderer.invoke('get-clips-list'),
  openClip: (path: string) => ipcRenderer.invoke('open-clip', path),
  openClipFolder: (path: string) => ipcRenderer.invoke('open-clip-folder', path),
  deleteClip: (path: string) => ipcRenderer.invoke('delete-clip', path),

  // Event listeners
  onRecordingStateChange: (callback: (state: any) => void) => {
    ipcRenderer.on('recording-state-change', (_event, state) => callback(state));
  },
  onClipSaved: (callback: (clip: any) => void) => {
    ipcRenderer.on('clip-saved', (_event, clip) => callback(clip));
  },
  onNotification: (callback: (notification: any) => void) => {
    ipcRenderer.on('notification', (_event, notification) => callback(notification));
  },
  onHotkeyPressed: (callback: () => void) => {
    ipcRenderer.on('hotkey-pressed', () => callback());
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});
