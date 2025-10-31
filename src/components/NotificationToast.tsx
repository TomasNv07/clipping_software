import { useEffect, useState } from 'react';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

function NotificationToast({ message, type, duration = 3000, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-primary',
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
  }[type];

  return (
    <div
      className={`
        fixed bottom-5 right-5 z-50
        ${bgColor} text-white
        px-4 py-3 rounded-lg shadow-lg
        flex items-center gap-3
        transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <span className="text-lg font-bold">{icon}</span>
      <span>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 hover:opacity-80 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

export default NotificationToast;
