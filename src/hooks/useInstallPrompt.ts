import React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_KEY = 'dompetku_install_dismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const isIOSSafari = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);
  return isIOS && isSafari;
};

const isStandalone = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ('standalone' in navigator && (navigator as any).standalone) return true;
  return false;
};

const wasDismissedRecently = () => {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

/**
 * Hook to manage the PWA "Add to Home Screen" install prompt.
 * Supports Chrome/Edge (beforeinstallprompt) and iOS Safari (manual instructions).
 */
export function useInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    if (wasDismissedRecently()) {
      setIsDismissed(true);
    }

    // iOS Safari doesn't fire beforeinstallprompt
    if (isIOSSafari()) {
      setShowIOSGuide(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      setShowIOSGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!installPromptEvent) return false;

    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    }

    return outcome === 'accepted';
  }, [installPromptEvent]);

  const dismissInstall = React.useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  const canInstallNative = !isInstalled && installPromptEvent !== null;
  const canShowIOSGuide = !isInstalled && showIOSGuide && !canInstallNative;

  return {
    canInstall: (canInstallNative || canShowIOSGuide) && !isDismissed,
    canInstallNative,
    canShowIOSGuide,
    isInstalled,
    promptInstall,
    dismissInstall,
  };
}
