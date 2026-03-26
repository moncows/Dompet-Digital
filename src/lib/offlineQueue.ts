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

export async function listTransactionMutations(userId: string) {
  const items = await withStore(STORE_NAMES.transactionQueue, 'readonly', async (store) => {
    return requestToPromise(store.getAll());
  });

  return items
    .filter((item) => item.userId === userId)
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
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

export async function clearTransactionMutations(userId: string) {
  await withStore(STORE_NAMES.transactionQueue, 'readwrite', async (store) => {
    const items = await requestToPromise(store.getAll());

    await Promise.all(
      items
        .filter((item) => item.userId === userId)
        .map((item) => requestToPromise(store.delete(item.id))),
    );
  });
}

export async function getPendingTransactionCount(userId: string) {
  return withStore(STORE_NAMES.transactionQueue, 'readonly', async (store) => {
    const items = await requestToPromise(store.getAll());
    return items.filter((item) => item.userId === userId).length;
  });
}
