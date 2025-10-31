interface SidebarProps {
  currentView: 'clips' | 'settings';
  onViewChange: (view: 'clips' | 'settings') => void;
}

function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <div className="w-16 bg-sidebar-bg border-r border-border flex flex-col items-center py-4">
      {/* Clips button */}
      <button
        onClick={() => onViewChange('clips')}
        className={`
          w-full h-16 flex items-center justify-center relative
          transition-colors duration-200
          ${currentView === 'clips' ? 'text-white' : 'text-text-secondary hover:text-white'}
        `}
        title="Clips"
      >
        {/* Active indicator */}
        {currentView === 'clips' && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        )}

        {/* Icon - Moments/Clips */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      </button>

      {/* Settings button */}
      <button
        onClick={() => onViewChange('settings')}
        className={`
          w-full h-16 flex items-center justify-center relative
          transition-colors duration-200 mt-2
          ${currentView === 'settings' ? 'text-white' : 'text-text-secondary hover:text-white'}
        `}
        title="Settings"
      >
        {/* Active indicator */}
        {currentView === 'settings' && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        )}

        {/* Icon - Settings/Gear */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m0-18a11 11 0 1 1 0 22 11 11 0 0 1 0-22z" />
          <path d="M19.07 4.93l-4.24 4.24m0 5.66l4.24 4.24M4.93 4.93l4.24 4.24m5.66 0l4.24-4.24" />
        </svg>
      </button>
    </div>
  );
}

export default Sidebar;
