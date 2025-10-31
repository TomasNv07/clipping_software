import { useRecorder } from '../hooks/useRecorder';
import { useSettings } from '../hooks/useSettings';
import WindowControls from './WindowControls';

function TopBar() {
  const { isRecording, bufferTime, isSaving, toggleRecording, saveClip } = useRecorder();
  const { settings } = useSettings();

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract resolution display (e.g., "1920x1080" -> "1080p")
  const getResolutionDisplay = (resolution: string): string => {
    const height = resolution.split('x')[1];
    return `${height}p`;
  };

  return (
    <div className="bg-card-bg border-b border-border flex items-center">
      {/* Draggable title bar region */}
      <div className="flex-1 flex items-center justify-between px-5 py-4" style={{ WebkitAppRegion: 'drag' } as any}>
        {/* Left section - Controls */}
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Toggle switch */}
        <button
          onClick={toggleRecording}
          className={`
            relative w-10 h-5 rounded-full transition-colors duration-200
            ${isRecording ? 'bg-primary' : 'bg-border'}
          `}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {/* Switch knob */}
          <div
            className={`
              absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200
              ${isRecording ? 'translate-x-5' : 'translate-x-0.5'}
            `}
          />
        </button>

        {/* Save Clip Button */}
        <button
          onClick={saveClip}
          disabled={!isRecording || isSaving}
          className={`
            px-4 py-2 rounded font-medium transition-all duration-200
            ${isRecording && !isSaving
              ? 'bg-primary hover:bg-opacity-90 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
          `}
          title={isRecording ? 'Save last clip' : 'Start recording first'}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              💾 Save Clip
            </span>
          )}
        </button>
      </div>

        {/* Right section - Quality Info */}
        <div className="flex items-center gap-4 text-sm text-gray-400" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Timer */}
          <span className="font-mono">{formatTime(bufferTime)}</span>

          {/* Resolution */}
          <span>{getResolutionDisplay(settings.resolution)}</span>

          {/* FPS */}
          <span>{settings.fps}fps</span>

          {/* Hotkey */}
          <span className="px-2 py-0.5 bg-sidebar-bg border border-border rounded text-xs">
            {settings.hotkey}
          </span>
        </div>
      </div>

      {/* Window Controls */}
      <WindowControls />
    </div>
  );
}

export default TopBar;
