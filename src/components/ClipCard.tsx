import { Clip } from '../types';

interface ClipCardProps {
  clip: Clip;
  onDelete: (clipPath: string) => void;
}

function ClipCard({ clip, onDelete }: ClipCardProps) {
  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp as relative time
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'A FEW SECONDS AGO';
    } else if (diffMins < 60) {
      return `${diffMins} MINUTE${diffMins > 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
      return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`;
    } else {
      return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
    }
  };

  // Format date as "Month Day, Year"
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleClick = () => {
    window.electron.openClip(clip.path);
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electron.openClipFolder(clip.path);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this clip?')) {
      onDelete(clip.path);
    }
  };

  return (
    <div
      className="bg-card-bg border border-border rounded hover:border-primary transition-colors cursor-pointer group"
      onClick={handleClick}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-border overflow-hidden">
        {clip.thumbnail ? (
          <img
            src={`file://${clip.thumbnail}`}
            alt={clip.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            No thumbnail
          </div>
        )}

        {/* Duration overlay */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-80 px-2 py-1 rounded text-xs text-white">
          {formatDuration(clip.duration)}
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button
            onClick={handleOpenFolder}
            className="bg-black bg-opacity-80 hover:bg-opacity-100 p-2 rounded transition-colors"
            title="Open folder"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="bg-black bg-opacity-80 hover:bg-red-600 hover:bg-opacity-100 p-2 rounded transition-colors"
            title="Delete clip"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="p-3">
        <div className="text-white text-sm font-medium mb-1">
          Desktop Clip {formatDate(clip.createdAt)}
        </div>
        <div className="text-text-secondary text-xs uppercase">
          {formatTimestamp(clip.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default ClipCard;
