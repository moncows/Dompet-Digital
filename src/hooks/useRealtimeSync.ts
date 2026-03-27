import React from 'react';
import { AppSnapshot } from '../lib/appStorage';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  subscribeToRemoteSnapshot,
} from '../lib/firestoreStore';

export type SyncStatus = 'connecting' | 'live' | 'offline' | 'error';

type UseRealtimeSyncOptions = {
  userId: string;
  isOnline: boolean;
  isReady: boolean;
  onSnapshot: (snapshot: AppSnapshot) => void;
  onError?: (error: Error) => void;
};

/**
 * Manages a single Firestore onSnapshot listener that provides real-time
 * multi-device sync. Firestore SDK handles online/offline automatically
 * — no need for manual enableNetwork/disableNetwork calls.
 *
 * Uses refs to avoid stale closures in the snapshot callback.
 */
export function useRealtimeSync({
  userId,
  isOnline,
  isReady,
  onSnapshot: handleSnapshot,
  onError,
}: UseRealtimeSyncOptions): SyncStatus {
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('connecting');

  // Store callbacks in refs so the onSnapshot listener always calls the latest version
  const handleSnapshotRef = React.useRef(handleSnapshot);
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => { handleSnapshotRef.current = handleSnapshot; }, [handleSnapshot]);
  React.useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Track online/offline status for the badge — Firestore handles reconnect internally.
  React.useEffect(() => {
    if (!isReady) return;
    setSyncStatus(isOnline ? 'live' : 'offline');
  }, [isOnline, isReady]);

  // Subscribe to real-time Firestore snapshots.
  React.useEffect(() => {
    if (!userId || !isReady || !isFirebaseConfigured()) {
      return;
    }

    setSyncStatus('connecting');

    const unsubscribe = subscribeToRemoteSnapshot(
      userId,
      (remoteSnapshot) => {
        if (!remoteSnapshot) return;
        setSyncStatus('live');
        handleSnapshotRef.current(remoteSnapshot);
      },
      (error) => {
        setSyncStatus('error');
        onErrorRef.current?.(error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userId, isReady]);

  return syncStatus;
}
