export const DB_NAME = 'dompetku-offline-db';
export const DB_VERSION = 3;

export const STORE_NAMES = {
  appSnapshot: 'app_snapshot',
  transactionQueue: 'transaction_queue',
} as const;

type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

export function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAMES.appSnapshot)) {
        const store = database.createObjectStore(STORE_NAMES.appSnapshot, { keyPath: 'key' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORE_NAMES.transactionQueue)) {
        const store = database.createObjectStore(STORE_NAMES.transactionQueue, { keyPath: 'id' });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
        store.createIndex('transactionId', 'transactionId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      } else {
        const store = request.transaction?.objectStore(STORE_NAMES.transactionQueue);
        if (store && !store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);

  try {
    const result = await action(store);
    await transactionDone(transaction);
    return result;
  } finally {
    database.close();
  }
}
