"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_store_1 = __importDefault(require("electron-store"));
const recorder_1 = require("./recorder");
const store = new electron_store_1.default();
let mainWindow = null;
let recorder = null;
// Default settings
const defaultSettings = {
    resolution: '1920x1080',
    fps: 60,
    bitrate: 20,
    bufferDuration: 30,
    savePath: path.join(electron_1.app.getPath('videos'), 'Clips'),
    hotkey: 'F3',
};
function getSettings() {
    return store.get('settings', defaultSettings);
}
function updateSettings(newSettings) {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    store.set('settings', updatedSettings);
    // Re-register hotkey if changed
    if (newSettings.hotkey && newSettings.hotkey !== currentSettings.hotkey) {
        registerGlobalHotkey(updatedSettings.hotkey);
    }
}
function registerGlobalHotkey(hotkey) {
    // Unregister all existing hotkeys
    electron_1.globalShortcut.unregisterAll();
    // Register new hotkey
    try {
        const success = electron_1.globalShortcut.register(hotkey, async () => {
            if (recorder && mainWindow) {
                const result = await recorder.saveClip();
                if (result.success && result.clipPath) {
                    mainWindow.webContents.send('clip-saved', result.clip);
                    mainWindow.webContents.send('notification', {
                        message: 'Clip saved!',
                        type: 'success',
                    });
                }
                else {
                    mainWindow.webContents.send('notification', {
                        message: result.error || 'Failed to save clip',
                        type: 'error',
                    });
                }
            }
            else {
                if (mainWindow) {
                    mainWindow.webContents.send('notification', {
                        message: 'Recording not active. Start recording first.',
                        type: 'info',
                    });
                }
            }
        });
        if (!success) {
            console.error('Failed to register hotkey:', hotkey);
        }
    }
    catch (error) {
        console.error('Error registering hotkey:', error);
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        frame: false,
        backgroundColor: '#1a1a1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    // In development, load from Vite dev server
    // In production, load from built files
    // Use app.isPackaged to determine if running in development or production
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC Handlers
electron_1.ipcMain.handle('get-screen-sources', async () => {
    try {
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 },
        });
        return sources.map(source => ({
            id: source.id,
            name: source.name,
        }));
    }
    catch (error) {
        console.error('Error getting screen sources:', error);
        return [];
    }
});
electron_1.ipcMain.handle('start-recording', async () => {
    try {
        const settings = getSettings();
        // Ensure save path exists
        if (!fs.existsSync(settings.savePath)) {
            fs.mkdirSync(settings.savePath, { recursive: true });
        }
        if (!recorder) {
            recorder = new recorder_1.Recorder(settings, mainWindow);
        }
        const result = await recorder.startRecording();
        return result;
    }
    catch (error) {
        console.error('Error starting recording:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('stop-recording', async () => {
    try {
        if (recorder) {
            await recorder.stopRecording();
            recorder = null;
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error stopping recording:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('save-clip', async (event, videoData) => {
    try {
        const settings = getSettings();
        // If videoData is provided, save it directly (from renderer's MediaRecorder)
        if (videoData) {
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now
                .toISOString()
                .replace(/T/, '_')
                .replace(/\..+/, '')
                .replace(/:/g, '-');
            const filename = `Clip_${timestamp}.webm`;
            const clipPath = path.join(settings.savePath, filename);
            // Ensure save directory exists
            if (!fs.existsSync(settings.savePath)) {
                fs.mkdirSync(settings.savePath, { recursive: true });
            }
            // Write video data to file
            fs.writeFileSync(clipPath, Buffer.from(videoData));
            // Create clip metadata
            const stats = fs.statSync(clipPath);
            const clip = {
                id: filename,
                path: clipPath,
                filename,
                duration: settings.bufferDuration,
                createdAt: now,
                size: stats.size,
                thumbnail: '', // No thumbnail for now
            };
            // Emit clip-saved event
            if (mainWindow) {
                mainWindow.webContents.send('clip-saved', clip);
                mainWindow.webContents.send('notification', {
                    message: 'Clip saved!',
                    type: 'success',
                });
            }
            return { success: true, clipPath, clip };
        }
        // Fallback to old method if no video data
        if (!recorder) {
            return { success: false, error: 'Recording not active' };
        }
        const result = await recorder.saveClip();
        return result;
    }
    catch (error) {
        console.error('Error saving clip:', error);
        if (mainWindow) {
            mainWindow.webContents.send('notification', {
                message: `Failed to save clip: ${error.message}`,
                type: 'error',
            });
        }
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-settings', async () => {
    return getSettings();
});
electron_1.ipcMain.handle('update-settings', async (event, settings) => {
    updateSettings(settings);
});
electron_1.ipcMain.handle('select-folder', async () => {
    if (!mainWindow)
        return null;
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Save Location',
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});
electron_1.ipcMain.handle('get-clips-list', async () => {
    try {
        const settings = getSettings();
        const savePath = settings.savePath;
        if (!fs.existsSync(savePath)) {
            return [];
        }
        const files = fs.readdirSync(savePath);
        const clipFiles = files.filter(f => (f.endsWith('.mp4') || f.endsWith('.webm')) && f.startsWith('Clip_'));
        const clips = clipFiles.map(filename => {
            const filePath = path.join(savePath, filename);
            const stats = fs.statSync(filePath);
            const ext = path.extname(filename);
            const thumbnailPath = path.join(savePath, filename.replace(ext, '_thumb.jpg'));
            return {
                id: filename,
                path: filePath,
                filename,
                duration: 0, // Will be extracted from video metadata later
                createdAt: stats.birthtime,
                size: stats.size,
                thumbnail: fs.existsSync(thumbnailPath) ? thumbnailPath : '',
            };
        });
        // Sort by creation date (newest first)
        clips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return clips;
    }
    catch (error) {
        console.error('Error getting clips list:', error);
        return [];
    }
});
electron_1.ipcMain.handle('open-clip', async (event, clipPath) => {
    try {
        await electron_1.shell.openPath(clipPath);
    }
    catch (error) {
        console.error('Error opening clip:', error);
    }
});
electron_1.ipcMain.handle('open-clip-folder', async (event, clipPath) => {
    try {
        electron_1.shell.showItemInFolder(clipPath);
    }
    catch (error) {
        console.error('Error opening clip folder:', error);
    }
});
electron_1.ipcMain.handle('delete-clip', async (event, clipPath) => {
    try {
        // Delete video file
        if (fs.existsSync(clipPath)) {
            fs.unlinkSync(clipPath);
        }
        // Delete thumbnail
        const ext = path.extname(clipPath);
        const thumbnailPath = clipPath.replace(ext, '_thumb.jpg');
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting clip:', error);
        return { success: false, error: error.message };
    }
});
// Window controls for frameless window
electron_1.ipcMain.on('window-minimize', () => {
    if (mainWindow)
        mainWindow.minimize();
});
electron_1.ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
    }
});
electron_1.ipcMain.on('window-close', () => {
    if (mainWindow)
        mainWindow.close();
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    createWindow();
    // Register global hotkey
    const settings = getSettings();
    registerGlobalHotkey(settings.hotkey);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    // Unregister all shortcuts
    electron_1.globalShortcut.unregisterAll();
    // Stop recording if active
    if (recorder) {
        recorder.stopRecording();
    }
});
