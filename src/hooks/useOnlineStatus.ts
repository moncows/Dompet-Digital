import React from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  });

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
