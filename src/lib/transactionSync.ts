import { TransactionQueueItem } from '../types';
import {
  listTransactionMutations,
  removeTransactionMutation,
  updateTransactionMutation,
} from './offlineQueue';
import { isFirebaseConfigured } from './firebase';
import { upsertTransactionDocument } from './firestoreStore';

async function sendTransactionMutation(item: TransactionQueueItem) {
  if (!isFirebaseConfigured()) {
    throw new Error('Sinkronisasi cloud belum aktif.');
  }

  await upsertTransactionDocument(item.userId, item.transaction);
}

export async function flushPendingTransactionMutations(options?: {
  userId: string;
  onSuccess?: (item: TransactionQueueItem) => void;
  onFailure?: (item: TransactionQueueItem, errorMessage: string) => void;
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      syncedCount: 0,
      failedCount: 0,
      skipped: true,
      reason: 'offline',
    };
  }

  if (!options?.userId) {
    return {
      syncedCount: 0,
      failedCount: 0,
      skipped: true,
      reason: 'unauthenticated',
    };
  }

  const items = await listTransactionMutations(options.userId);
  if (items.length === 0) {
    return {
      syncedCount: 0,
      failedCount: 0,
      skipped: false,
      reason: 'empty',
    };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      await sendTransactionMutation(item);
      await removeTransactionMutation(item.id);
      syncedCount += 1;
      options?.onSuccess?.(item);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      failedCount += 1;

      await updateTransactionMutation({
        ...item,
        retryCount: item.retryCount + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: errorMessage,
      });

      options?.onFailure?.(item, errorMessage);

      if (errorMessage.includes('Sinkronisasi cloud belum aktif.')) {
        break;
      }

      if (error instanceof TypeError || errorMessage.includes('Failed to fetch')) {
        break;
      }
    }
  }

  return {
    syncedCount,
    failedCount,
    skipped: false,
    reason: failedCount > 0 ? 'partial' : 'success',
  };
}
