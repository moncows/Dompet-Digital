import { TransactionQueueItem } from '../types';
import { STORE_NAMES, requestToPromise, withStore } from './indexedDb';

export function createQueueItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function enqueueTransactionMutation(item: TransactionQueueItem) {
  await withStore(STORE_NAMES.transactionQueue, 'readwrite', async (store) => {
    await requestToPromise(store.put(item));
  });
}

export async function listTransactionMutations() {
  const items = await withStore(STORE_NAMES.transactionQueue, 'readonly', async (store) => {
    return requestToPromise(store.getAll());
  });

  return items.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export async function updateTransactionMutation(item: TransactionQueueItem) {
  await withStore(STORE_NAMES.transactionQueue, 'readwrite', async (store) => {
    await requestToPromise(store.put(item));
  });
}

export async function removeTransactionMutation(id: string) {
  await withStore(STORE_NAMES.transactionQueue, 'readwrite', async (store) => {
    await requestToPromise(store.delete(id));
  });
}

export async function clearTransactionMutations() {
  await withStore(STORE_NAMES.transactionQueue, 'readwrite', async (store) => {
    await requestToPromise(store.clear());
  });
}

export async function getPendingTransactionCount() {
  return withStore(STORE_NAMES.transactionQueue, 'readonly', async (store) => {
    return requestToPromise(store.count());
  });
}
