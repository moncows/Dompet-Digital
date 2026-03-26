import { Category, Transaction, Wallet } from '../types';
import { STORE_NAMES, requestToPromise, withStore } from './indexedDb';

const LEGACY_STORAGE_KEYS = {
  wallets: 'dompetku_wallets',
  categories: 'dompetku_categories',
  transactions: 'dompetku_transactions',
} as const;

type SnapshotKey = keyof typeof LEGACY_STORAGE_KEYS;

type SnapshotRecord<T> = {
  key: string;
  value: T;
  updatedAt: string;
};

export type AppSnapshot = {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
};

function readLegacyLocalValue<T>(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function createScopedSnapshotKey(userId: string, key: SnapshotKey) {
  return `${userId}:${key}`;
}

async function getSnapshotRecord<T>(userId: string, key: SnapshotKey) {
  return withStore<SnapshotRecord<T> | undefined>(STORE_NAMES.appSnapshot, 'readonly', async (store) => {
    const record = await requestToPromise(store.get(createScopedSnapshotKey(userId, key)));
    return record as SnapshotRecord<T> | undefined;
  });
}

export function clearLegacyAppSnapshot() {
  Object.values(LEGACY_STORAGE_KEYS).forEach((storageKey) => {
    window.localStorage.removeItem(storageKey);
  });
}

function getLegacyAppSnapshot(defaults: AppSnapshot) {
  const wallets = readLegacyLocalValue<Wallet[]>(LEGACY_STORAGE_KEYS.wallets);
  const categories = readLegacyLocalValue<Category[]>(LEGACY_STORAGE_KEYS.categories);
  const transactions = readLegacyLocalValue<Transaction[]>(LEGACY_STORAGE_KEYS.transactions);

  if (!wallets && !categories && !transactions) {
    return null;
  }

  return {
    wallets: wallets ?? defaults.wallets,
    categories: categories ?? defaults.categories,
    transactions: transactions ?? defaults.transactions,
  };
}

export async function loadAppSnapshot(userId: string, defaults: AppSnapshot) {
  const [walletsRecord, categoriesRecord, transactionsRecord] = await Promise.all([
    getSnapshotRecord<Wallet[]>(userId, 'wallets'),
    getSnapshotRecord<Category[]>(userId, 'categories'),
    getSnapshotRecord<Transaction[]>(userId, 'transactions'),
  ]);

  if (walletsRecord || categoriesRecord || transactionsRecord) {
    clearLegacyAppSnapshot();
    return {
      wallets: walletsRecord?.value ?? defaults.wallets,
      categories: categoriesRecord?.value ?? defaults.categories,
      transactions: transactionsRecord?.value ?? defaults.transactions,
    };
  }

  const legacySnapshot = getLegacyAppSnapshot(defaults);
  if (legacySnapshot) {
    await saveAppSnapshot(userId, legacySnapshot);
    clearLegacyAppSnapshot();
    return legacySnapshot;
  }

  await saveAppSnapshot(userId, defaults);
  return defaults;
}

export async function saveAppSnapshot(userId: string, snapshot: AppSnapshot) {
  const updatedAt = new Date().toISOString();

  await withStore(STORE_NAMES.appSnapshot, 'readwrite', async (store) => {
    await requestToPromise(store.put({
      key: createScopedSnapshotKey(userId, 'wallets'),
      value: snapshot.wallets,
      updatedAt,
    }));
    await requestToPromise(store.put({
      key: createScopedSnapshotKey(userId, 'categories'),
      value: snapshot.categories,
      updatedAt,
    }));
    await requestToPromise(store.put({
      key: createScopedSnapshotKey(userId, 'transactions'),
      value: snapshot.transactions,
      updatedAt,
    }));
  });
}

export async function clearAppSnapshot(userId: string) {
  await withStore(STORE_NAMES.appSnapshot, 'readwrite', async (store) => {
    await Promise.all([
      requestToPromise(store.delete(createScopedSnapshotKey(userId, 'wallets'))),
      requestToPromise(store.delete(createScopedSnapshotKey(userId, 'categories'))),
      requestToPromise(store.delete(createScopedSnapshotKey(userId, 'transactions'))),
    ]);
  });

  clearLegacyAppSnapshot();
}
