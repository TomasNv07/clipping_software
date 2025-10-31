"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Screen capture
    getScreenSources: () => electron_1.ipcRenderer.invoke('get-screen-sources'),
    // Recording controls
    startRecording: () => electron_1.ipcRenderer.invoke('start-recording'),
    stopRecording: () => electron_1.ipcRenderer.invoke('stop-recording'),
    saveClip: () => electron_1.ipcRenderer.invoke('save-clip'),
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => electron_1.ipcRenderer.invoke('update-settings', settings),
    selectFolder: () => electron_1.ipcRenderer.invoke('select-folder'),
    // Clip management
    getClipsList: () => electron_1.ipcRenderer.invoke('get-clips-list'),
    openClip: (path) => electron_1.ipcRenderer.invoke('open-clip', path),
    openClipFolder: (path) => electron_1.ipcRenderer.invoke('open-clip-folder', path),
    deleteClip: (path) => electron_1.ipcRenderer.invoke('delete-clip', path),
    // Event listeners
    onRecordingStateChange: (callback) => {
        electron_1.ipcRenderer.on('recording-state-change', (_event, state) => callback(state));
    },
    onClipSaved: (callback) => {
        electron_1.ipcRenderer.on('clip-saved', (_event, clip) => callback(clip));
    },
    onNotification: (callback) => {
        electron_1.ipcRenderer.on('notification', (_event, notification) => callback(notification));
    },
    // Window controls
    windowMinimize: () => electron_1.ipcRenderer.send('window-minimize'),
    windowMaximize: () => electron_1.ipcRenderer.send('window-maximize'),
    windowClose: () => electron_1.ipcRenderer.send('window-close'),
});
