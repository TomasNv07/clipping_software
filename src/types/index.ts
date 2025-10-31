// Settings types
export interface Settings {
  resolution: string; // e.g., "1920x1080"
  fps: number; // 30 or 60
  bitrate: number; // 5-50 Mbps
  bufferDuration: number; // 15-120 seconds
  savePath: string; // folder path
  hotkey: string; // e.g., "F3"
}

// Clip types
export interface Clip {
  id: string; // filename
  path: string; // full file path
  filename: string;
  duration: number; // seconds
  createdAt: Date;
  size: number; // bytes
  thumbnail: string; // path to thumbnail image
}

// Recording state types
export interface RecordingState {
  isRecording: boolean;
  bufferTime: number; // seconds recorded in buffer
  isSaving: boolean;
}

// Screen source types
export interface ScreenSource {
  id: string;
  name: string;
}

// Electron IPC API types
export interface ElectronAPI {
  // Screen capture
  getScreenSources: () => Promise<ScreenSource[]>;

  // Recording controls
  startRecording: () => Promise<{ success: boolean; error?: string }>;
  stopRecording: () => Promise<{ success: boolean }>;
  saveClip: () => Promise<{ success: boolean; clipPath?: string; error?: string }>;

  // Settings
  getSettings: () => Promise<Settings>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  selectFolder: () => Promise<string | null>;

  // Clip management
  getClipsList: () => Promise<Clip[]>;
  openClip: (path: string) => Promise<void>;
  openClipFolder: (path: string) => Promise<void>;
  deleteClip: (path: string) => Promise<{ success: boolean }>;

  // Event listeners
  onRecordingStateChange: (callback: (state: RecordingState) => void) => void;
  onClipSaved: (callback: (clip: Clip) => void) => void;
  onNotification: (callback: (notification: { message: string; type: 'success' | 'error' | 'info' }) => void) => void;
}

// Extend Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
