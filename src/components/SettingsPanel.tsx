import { useSettings } from '../hooks/useSettings';
import { useState, useEffect } from 'react';
import { AudioDevice } from '../types';

function SettingsPanel() {
  const {
    settings,
    updateResolution,
    updateFPS,
    updateBitrate,
    updateBufferDuration,
    updateSavePath,
    updateHotkey,
    updateMicrophoneId,
    updateSpeakerId,
    selectFolder,
  } = useSettings();

  const [isListeningForHotkey, setIsListeningForHotkey] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);

  const handleSelectFolder = async () => {
    const folderPath = await selectFolder();
    if (folderPath) {
      updateSavePath(folderPath);
    }
  };

  // Listen for hotkey press when in listening mode
  useEffect(() => {
    if (!isListeningForHotkey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();

      // Get the key name
      let keyName = event.key;

      // Convert to proper format
      if (keyName.length === 1) {
        // Single character keys (letters, numbers, etc.)
        keyName = keyName.toUpperCase();
      }

      // Ignore modifier keys alone
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(keyName)) {
        return;
      }

      // Update the hotkey
      updateHotkey(keyName);
      setIsListeningForHotkey(false);
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListeningForHotkey, updateHotkey]);

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Section 1: Video Quality */}
      <div className="bg-card-bg border border-border rounded p-5 mb-5">
        <h2 className="text-base font-bold text-white mb-5">Video Quality</h2>

        {/* Resolution */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">Resolution</label>
          <select
            value={settings.resolution}
            onChange={(e) => updateResolution(e.target.value)}
            className="w-full bg-app-bg border border-border text-white px-3 py-2 rounded focus:outline-none focus:border-primary"
          >
            <option value="1280x720">720p (1280x720)</option>
            <option value="1920x1080">1080p (1920x1080)</option>
            <option value="2560x1440">1440p (2560x1440)</option>
            <option value="3840x2160">4K (3840x2160)</option>
          </select>
        </div>

        {/* Frame Rate */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-2">Frame Rate</label>
          <select
            value={settings.fps}
            onChange={(e) => updateFPS(Number(e.target.value))}
            className="w-full bg-app-bg border border-border text-white px-3 py-2 rounded focus:outline-none focus:border-primary"
          >
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>

        {/* Bitrate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm text-gray-400">Bitrate</label>
            <span className="text-primary font-bold">{settings.bitrate} Mbps</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={settings.bitrate}
            onChange={(e) => updateBitrate(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>5 Mbps</span>
            <span>50 Mbps</span>
          </div>
        </div>
      </div>

      {/* Section 2: Recording Settings */}
      <div className="bg-card-bg border border-border rounded p-5 mb-5">
        <h2 className="text-base font-bold text-white mb-5">Recording Settings</h2>

        {/* Buffer Duration */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm text-gray-400">
              Buffer Duration (Clip Length)
            </label>
            <span className="text-primary font-bold">
              {settings.bufferDuration} seconds
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={120}
            step={5}
            value={settings.bufferDuration}
            onChange={(e) => updateBufferDuration(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>15s</span>
            <span>120s</span>
          </div>
        </div>
      </div>

      {/* Section 3: File Settings */}
      <div className="bg-card-bg border border-border rounded p-5 mb-5">
        <h2 className="text-base font-bold text-white mb-5">File Settings</h2>

        {/* Save Location */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Save Location</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.savePath}
              readOnly
              className="flex-1 bg-app-bg border border-border text-white px-3 py-2 rounded focus:outline-none"
            />
            <button
              onClick={handleSelectFolder}
              className="bg-primary text-white px-4 py-2 rounded font-medium hover:bg-opacity-90 transition-colors"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Hotkeys */}
      <div className="bg-card-bg border border-border rounded p-5">
        <h2 className="text-base font-bold text-white mb-5">Hotkeys</h2>

        {/* Save Replay */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Save Replay</label>
          <div className="flex items-center gap-4">
            <div className="bg-app-bg border-2 border-primary px-5 py-2 rounded text-white font-bold text-center min-w-[100px]">
              {settings.hotkey}
            </div>
            <button
              onClick={() => setIsListeningForHotkey(!isListeningForHotkey)}
              className="bg-border text-white px-4 py-2 rounded font-medium hover:bg-opacity-80 transition-colors"
            >
              {isListeningForHotkey ? 'Press a key...' : 'Change'}
            </button>
          </div>
          {isListeningForHotkey && (
            <div className="text-xs text-text-secondary mt-2">
              Press any key to set as your save hotkey
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
