import { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, desktopCapturer } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { Recorder } from './recorder';

interface Settings {
  resolution: string;
  fps: number;
  bitrate: number;
  bufferDuration: number;
  savePath: string;
  hotkey: string;
}

const store = new Store<{ settings: Settings }>();
let mainWindow: BrowserWindow | null = null;
let recorder: Recorder | null = null;

// Default settings
const defaultSettings: Settings = {
  resolution: '1920x1080',
  fps: 60,
  bitrate: 20,
  bufferDuration: 30,
  savePath: path.join(app.getPath('videos'), 'Clips'),
  hotkey: 'F3',
};

function getSettings(): Settings {
  return store.get('settings', defaultSettings);
}

function updateSettings(newSettings: Partial<Settings>): void {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  store.set('settings', updatedSettings);

  // Re-register hotkey if changed
  if (newSettings.hotkey && newSettings.hotkey !== currentSettings.hotkey) {
    registerGlobalHotkey(updatedSettings.hotkey);
  }
}

function registerGlobalHotkey(hotkey: string): void {
  // Unregister all existing hotkeys
  globalShortcut.unregisterAll();

  // Register new hotkey
  try {
    const success = globalShortcut.register(hotkey, async () => {
      if (recorder && mainWindow) {
        const result = await recorder.saveClip();
        if (result.success && result.clipPath) {
          mainWindow.webContents.send('clip-saved', result.clip);
          mainWindow.webContents.send('notification', {
            message: 'Clip saved!',
            type: 'success',
          });
        } else {
          mainWindow.webContents.send('notification', {
            message: result.error || 'Failed to save clip',
            type: 'error',
          });
        }
      } else {
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
  } catch (error) {
    console.error('Error registering hotkey:', error);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

// IPC Handlers
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
    }));
  } catch (error: any) {
    console.error('Error getting screen sources:', error);
    return [];
  }
});

ipcMain.handle('start-recording', async () => {
  try {
    const settings = getSettings();

    // Ensure save path exists
    if (!fs.existsSync(settings.savePath)) {
      fs.mkdirSync(settings.savePath, { recursive: true });
    }

    if (!recorder) {
      recorder = new Recorder(settings, mainWindow!);
    }

    const result = await recorder.startRecording();
    return result;
  } catch (error: any) {
    console.error('Error starting recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  try {
    if (recorder) {
      await recorder.stopRecording();
      recorder = null;
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error stopping recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-clip', async (event, videoData?: ArrayBuffer) => {
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
  } catch (error: any) {
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

ipcMain.handle('get-settings', async () => {
  return getSettings();
});

ipcMain.handle('update-settings', async (event, settings: Partial<Settings>) => {
  updateSettings(settings);
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Save Location',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('get-clips-list', async () => {
  try {
    const settings = getSettings();
    const savePath = settings.savePath;

    if (!fs.existsSync(savePath)) {
      return [];
    }

    const files = fs.readdirSync(savePath);
    const clipFiles = files.filter(f => f.endsWith('.mp4') && f.startsWith('Clip_'));

    const clips = clipFiles.map(filename => {
      const filePath = path.join(savePath, filename);
      const stats = fs.statSync(filePath);
      const thumbnailPath = path.join(savePath, filename.replace('.mp4', '_thumb.jpg'));

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
  } catch (error: any) {
    console.error('Error getting clips list:', error);
    return [];
  }
});

ipcMain.handle('open-clip', async (event, clipPath: string) => {
  try {
    await shell.openPath(clipPath);
  } catch (error) {
    console.error('Error opening clip:', error);
  }
});

ipcMain.handle('open-clip-folder', async (event, clipPath: string) => {
  try {
    shell.showItemInFolder(clipPath);
  } catch (error) {
    console.error('Error opening clip folder:', error);
  }
});

ipcMain.handle('delete-clip', async (event, clipPath: string) => {
  try {
    // Delete video file
    if (fs.existsSync(clipPath)) {
      fs.unlinkSync(clipPath);
    }

    // Delete thumbnail
    const thumbnailPath = clipPath.replace('.mp4', '_thumb.jpg');
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting clip:', error);
    return { success: false, error: error.message };
  }
});

// Window controls for frameless window
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Register global hotkey
  const settings = getSettings();
  registerGlobalHotkey(settings.hotkey);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Stop recording if active
  if (recorder) {
    recorder.stopRecording();
  }
});
