import { useRecorder } from '../hooks/useRecorder';
import { useSettings } from '../hooks/useSettings';
import WindowControls from './WindowControls';

function TopBar() {
  const { isRecording, bufferTime, toggleRecording } = useRecorder();
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
    <div className="bg-card-bg border-b border-border px-5 py-4 flex items-center justify-between">
      {/* Left section - Capture Status */}
      <div className="flex items-center gap-4">
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="text-primary text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <span className="animate-pulse">●</span>
              CAPTURING DESKTOP
            </span>
          </div>
        )}

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

        {/* Auto-clipping status */}
        {isRecording && (
          <span className="text-text-secondary text-xs">
            Auto-clipping: Enabled
          </span>
        )}
      </div>

      {/* Right section - Quality Info */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
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
  );
}

export default TopBar;
