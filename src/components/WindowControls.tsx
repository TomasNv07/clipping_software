/**
 * Window Controls Component
 * Provides minimize, maximize, and close buttons for frameless window
 */

function WindowControls() {
  const handleMinimize = () => {
    window.electron.windowMinimize();
  };

  const handleMaximize = () => {
    window.electron.windowMaximize();
  };

  const handleClose = () => {
    window.electron.windowClose();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Minimize */}
      <button
        onClick={handleMinimize}
        className="w-12 h-8 flex items-center justify-center hover:bg-gray-700 transition-colors"
        title="Minimize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="0" y="5" width="12" height="2" fill="currentColor" />
        </svg>
      </button>

      {/* Maximize/Restore */}
      <button
        onClick={handleMaximize}
        className="w-12 h-8 flex items-center justify-center hover:bg-gray-700 transition-colors"
        title="Maximize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect
            x="1"
            y="1"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {/* Close */}
      <button
        onClick={handleClose}
        className="w-12 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
        title="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M 1,1 L 11,11 M 11,1 L 1,11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
