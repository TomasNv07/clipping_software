import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ClipGallery from './components/ClipGallery';
import SettingsPanel from './components/SettingsPanel';
import NotificationToast from './components/NotificationToast';

type View = 'clips' | 'settings';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [currentView, setCurrentView] = useState<View>('clips');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for notifications from main process
    window.electron.onNotification((notification) => {
      const newNotification: Notification = {
        id: Date.now(),
        message: notification.message,
        type: notification.type,
      };
      setNotifications((prev) => [...prev, newNotification]);
    });
  }, []);

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex h-screen w-screen bg-app-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <TopBar />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {currentView === 'clips' ? <ClipGallery /> : <SettingsPanel />}
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-0 right-0 p-4 flex flex-col gap-2 pointer-events-none">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              message={notification.message}
              type={notification.type}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
