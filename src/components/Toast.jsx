import { useState, useEffect } from 'preact/hooks';

const toastQueue = [];
let listeners = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toastQueue]));
}

export function showToast(message, type = 'info', duration = 3000) {
  const toast = {
    id: Date.now(),
    message,
    type,
  };
  
  toastQueue.push(toast);
  notifyListeners();
  
  setTimeout(() => {
    const index = toastQueue.findIndex(t => t.id === toast.id);
    if (index > -1) {
      toastQueue.splice(index, 1);
      notifyListeners();
    }
  }, duration);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);
  
  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'var(--color-green)',
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: 'var(--color-red)',
          icon: '✕',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-brown)',
          icon: '⚠',
        };
      default:
        return {
          backgroundColor: 'var(--color-gray-800)',
          icon: 'ℹ',
        };
    }
  };
  
  return (
    <div style="position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: var(--space-sm); pointer-events: none;">
      {toasts.map(toast => {
        const styles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            class="toast"
            style={{
              backgroundColor: styles.backgroundColor,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ fontSize: '1.2em' }}>{styles.icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
