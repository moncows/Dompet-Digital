import React from 'react';
import { AppSnapshot } from '../lib/appStorage';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  enableFirestoreNetwork,
  disableFirestoreNetwork,
  subscribeToRemoteSnapshot,
} from '../lib/firestoreStore';

export type SyncStatus = 'connecting' | 'live' | 'offline' | 'error';

type UseRealtimeSyncOptions = {
  userId: string;
  isOnline: boolean;
  isReady: boolean; // true after bootstrap is done
  onSnapshot: (snapshot: AppSnapshot) => void;
  onError?: (error: Error) => void;
};

/**
 * Manages a single Firestore onSnapshot listener that provides real-time
 * multi-device sync. Handles online/offline transitions by explicitly
 * enabling/disabling the Firestore network connection.
 */
export function useRealtimeSync({
  userId,
  isOnline,
  isReady,
  onSnapshot: handleSnapshot,
  onError,
}: UseRealtimeSyncOptions): SyncStatus {
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('connecting');

  // Re-enable/disable Firestore SDK network layer when connectivity changes.
  React.useEffect(() => {
    if (!isFirebaseConfigured()) return;

    if (isOnline) {
      void enableFirestoreNetwork().then(() => {
        setSyncStatus((prev) => (prev === 'offline' ? 'connecting' : prev));
      });
    } else {
      void disableFirestoreNetwork().then(() => {
        setSyncStatus('offline');
      });
    }
  }, [isOnline]);

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
        handleSnapshot(remoteSnapshot);
      },
      (error) => {
        setSyncStatus('error');
        onError?.(error);
      },
    );

    // Mark as live immediately (Firestore will call the callback from cache first)
    setSyncStatus(isOnline ? 'live' : 'offline');

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isReady]);

  return syncStatus;
}
