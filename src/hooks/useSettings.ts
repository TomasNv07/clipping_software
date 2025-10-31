import { useState, useEffect } from 'react';
import { Settings } from '../types';

const defaultSettings: Settings = {
  resolution: '1920x1080',
  fps: 60,
  bitrate: 20,
  bufferDuration: 30,
  savePath: '',
  hotkey: 'F3',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electron.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Persist to electron-store
    await window.electron.updateSettings({ [key]: value });
  };

  const updateResolution = (value: string) => {
    updateSetting('resolution', value);
  };

  const updateFPS = (value: number) => {
    updateSetting('fps', value);
  };

  const updateBitrate = (value: number) => {
    updateSetting('bitrate', value);
  };

  const updateBufferDuration = (value: number) => {
    updateSetting('bufferDuration', value);
  };

  const updateSavePath = (value: string) => {
    updateSetting('savePath', value);
  };

  const updateHotkey = (value: string) => {
    updateSetting('hotkey', value);
  };

  const selectFolder = async (): Promise<string | null> => {
    const folderPath = await window.electron.selectFolder();
    return folderPath;
  };

  return {
    settings,
    updateResolution,
    updateFPS,
    updateBitrate,
    updateBufferDuration,
    updateSavePath,
    updateHotkey,
    selectFolder,
  };
}
