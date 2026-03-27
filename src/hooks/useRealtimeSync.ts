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
 * multi-device sync. Firestore SDK handles online/offline automatically.
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
  const hasReceivedSnapshotRef = React.useRef(false);

  // Store callbacks in refs so the onSnapshot listener always calls the latest version
  const handleSnapshotRef = React.useRef(handleSnapshot);
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => { handleSnapshotRef.current = handleSnapshot; }, [handleSnapshot]);
  React.useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Track online/offline status for the badge.
  // Only switch to 'live' if we've already received at least one snapshot.
  React.useEffect(() => {
    if (!isReady) return;

    if (!isOnline) {
      setSyncStatus('offline');
    } else if (hasReceivedSnapshotRef.current) {
      setSyncStatus('live');
    }
    // If online but no snapshot yet, stay 'connecting' — the subscription
    // callback will set 'live' once the first snapshot arrives.
  }, [isOnline, isReady]);

  // Subscribe to real-time Firestore snapshots.
  React.useEffect(() => {
    if (!userId || !isReady || !isFirebaseConfigured()) {
      return;
    }

    hasReceivedSnapshotRef.current = false;
    setSyncStatus(isOnline ? 'connecting' : 'offline');

    const unsubscribe = subscribeToRemoteSnapshot(
      userId,
      (remoteSnapshot) => {
        // Mark as 'live' on ANY callback — even null (empty data).
        // This means Firestore is connected and listening.
        hasReceivedSnapshotRef.current = true;
        setSyncStatus('live');

        if (remoteSnapshot) {
          handleSnapshotRef.current(remoteSnapshot);
        }
      },
      (error) => {
        setSyncStatus('error');
        onErrorRef.current?.(error);
      },
    );

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isReady]);

  return syncStatus;
}
