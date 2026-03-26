import { Category, Transaction, Wallet } from '../types';
import { STORE_NAMES, requestToPromise, withStore } from './indexedDb';

const LEGACY_STORAGE_KEYS = {
  wallets: 'dompetku_wallets',
  categories: 'dompetku_categories',
  transactions: 'dompetku_transactions',
} as const;

type SnapshotKey = keyof typeof LEGACY_STORAGE_KEYS;

type SnapshotRecord<T> = {
  key: SnapshotKey;
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

async function getSnapshotRecord<T>(key: SnapshotKey) {
  return withStore<SnapshotRecord<T> | undefined>(STORE_NAMES.appSnapshot, 'readonly', async (store) => {
    const record = await requestToPromise(store.get(key));
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

export async function loadAppSnapshot(defaults: AppSnapshot) {
  const [walletsRecord, categoriesRecord, transactionsRecord] = await Promise.all([
    getSnapshotRecord<Wallet[]>('wallets'),
    getSnapshotRecord<Category[]>('categories'),
    getSnapshotRecord<Transaction[]>('transactions'),
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
    await saveAppSnapshot(legacySnapshot);
    clearLegacyAppSnapshot();
    return legacySnapshot;
  }

  await saveAppSnapshot(defaults);
  return defaults;
}

export async function saveAppSnapshot(snapshot: AppSnapshot) {
  const updatedAt = new Date().toISOString();

  await withStore(STORE_NAMES.appSnapshot, 'readwrite', async (store) => {
    await requestToPromise(store.put({
      key: 'wallets',
      value: snapshot.wallets,
      updatedAt,
    }));
    await requestToPromise(store.put({
      key: 'categories',
      value: snapshot.categories,
      updatedAt,
    }));
    await requestToPromise(store.put({
      key: 'transactions',
      value: snapshot.transactions,
      updatedAt,
    }));
  });
}

export async function clearAppSnapshot() {
  await withStore(STORE_NAMES.appSnapshot, 'readwrite', async (store) => {
    await requestToPromise(store.clear());
  });

  clearLegacyAppSnapshot();
}
