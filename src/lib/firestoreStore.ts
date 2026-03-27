import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { Category, Transaction, Wallet } from '../types';
import { AppSnapshot } from './appStorage';
import { getFirestoreInstance } from './firebase';

type WalletDocument = Wallet & {
  updatedAt?: Timestamp;
};

type CategoryDocument = Category & {
  updatedAt?: Timestamp;
};

type TransactionDocument = Transaction & {
  updatedAt?: Timestamp;
};

const USER_COLLECTION = 'users';

function getUserDocumentRef(userId: string) {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Layanan data belum siap digunakan.');
  }

  return doc(firestore, USER_COLLECTION, userId);
}

function getWalletsCollection(userId: string) {
  return collection(getUserDocumentRef(userId), 'wallets');
}

function getCategoriesCollection(userId: string) {
  return collection(getUserDocumentRef(userId), 'categories');
}

function getTransactionsCollection(userId: string) {
  return collection(getUserDocumentRef(userId), 'transactions');
}

function mapWalletsSnapshot(walletsSnapshot: Awaited<ReturnType<typeof getDocs>>) {
  return walletsSnapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data() as WalletDocument;
    return {
      id: documentSnapshot.id,
      name: data.name,
      balance: data.balance,
      balanceMode: data.balanceMode,
      color: data.color,
      icon: data.icon,
    };
  });
}

function mapCategoriesSnapshot(categoriesSnapshot: Awaited<ReturnType<typeof getDocs>>) {
  return categoriesSnapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data() as CategoryDocument;
    return {
      id: documentSnapshot.id,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
    };
  });
}

function mapTransactionsSnapshot(transactionsSnapshot: Awaited<ReturnType<typeof getDocs>>) {
  return transactionsSnapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data() as TransactionDocument;
    return {
      ...data,
      id: documentSnapshot.id,
    };
  });
}

async function replaceCollection<T extends { id: string }>(
  userId: string,
  collectionName: 'wallets' | 'categories' | 'transactions',
  items: T[],
  serializeItem?: (item: T) => Record<string, unknown>,
) {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Layanan data belum siap digunakan.');
  }

  const collectionRef = collection(getUserDocumentRef(userId), collectionName);
  const snapshot = await getDocs(collectionRef);
  const nextIds = new Set(items.map((item) => item.id));
  const batch = writeBatch(firestore);

  items.forEach((item) => {
    batch.set(doc(collectionRef, item.id), {
      ...(serializeItem ? serializeItem(item) : item),
      updatedAt: serverTimestamp(),
    });
  });

  snapshot.docs.forEach((documentSnapshot) => {
    if (!nextIds.has(documentSnapshot.id)) {
      batch.delete(documentSnapshot.ref);
    }
  });

  await batch.commit();
}

function serializeTransaction(transaction: Transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    walletId: transaction.walletId,
    toWalletId: transaction.toWalletId ?? null,
    date: transaction.date,
    note: transaction.note,
    status: transaction.status ?? 'completed',
    clientId: transaction.clientId ?? transaction.id,
  };
}

export async function ensureUserProfileDocument(user: User) {
  await setDoc(
    getUserDocumentRef(user.uid),
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadRemoteSnapshot(userId: string): Promise<AppSnapshot | null> {
  const [walletsSnapshot, categoriesSnapshot, transactionsSnapshot] = await Promise.all([
    getDocs(query(getWalletsCollection(userId), orderBy('name'))),
    getDocs(query(getCategoriesCollection(userId), orderBy('name'))),
    getDocs(query(getTransactionsCollection(userId), orderBy('date', 'desc'))),
  ]);

  if (
    walletsSnapshot.empty &&
    categoriesSnapshot.empty &&
    transactionsSnapshot.empty
  ) {
    return null;
  }

  return {
    wallets: mapWalletsSnapshot(walletsSnapshot),
    categories: mapCategoriesSnapshot(categoriesSnapshot),
    transactions: mapTransactionsSnapshot(transactionsSnapshot),
  };
}

export function subscribeToRemoteSnapshot(
  userId: string,
  onData: (snapshot: AppSnapshot | null) => void,
  onError?: (error: Error) => void,
) {
  let wallets: Wallet[] | null = null;
  let categories: Category[] | null = null;
  let transactions: Transaction[] | null = null;

  const emitSnapshot = () => {
    if (!wallets || !categories || !transactions) {
      return;
    }

    if (wallets.length === 0 && categories.length === 0 && transactions.length === 0) {
      onData(null);
      return;
    }

    onData({
      wallets,
      categories,
      transactions,
    });
  };

  const unsubscribes = [
    onSnapshot(
      query(getWalletsCollection(userId), orderBy('name')),
      (snapshot) => {
        wallets = mapWalletsSnapshot(snapshot);
        emitSnapshot();
      },
      (error) => onError?.(error),
    ),
    onSnapshot(
      query(getCategoriesCollection(userId), orderBy('name')),
      (snapshot) => {
        categories = mapCategoriesSnapshot(snapshot);
        emitSnapshot();
      },
      (error) => onError?.(error),
    ),
    onSnapshot(
      query(getTransactionsCollection(userId), orderBy('date', 'desc')),
      (snapshot) => {
        transactions = mapTransactionsSnapshot(snapshot);
        emitSnapshot();
      },
      (error) => onError?.(error),
    ),
  ];

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export async function seedRemoteSnapshot(userId: string, snapshot: AppSnapshot) {
  await Promise.all([
    replaceCollection(userId, 'wallets', snapshot.wallets),
    replaceCollection(userId, 'categories', snapshot.categories),
    replaceCollection(userId, 'transactions', snapshot.transactions, serializeTransaction),
  ]);
}

export async function syncReferenceData(userId: string, data: Pick<AppSnapshot, 'wallets' | 'categories'>) {
  await Promise.all([
    replaceCollection(userId, 'wallets', data.wallets),
    replaceCollection(userId, 'categories', data.categories),
  ]);
}

export async function upsertTransactionDocument(userId: string, transaction: Transaction) {
  await setDoc(doc(getTransactionsCollection(userId), transaction.clientId ?? transaction.id), {
    ...serializeTransaction(transaction),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransactionDocument(userId: string, transactionId: string) {
  await deleteDoc(doc(getTransactionsCollection(userId), transactionId));
}
