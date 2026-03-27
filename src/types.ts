export type Wallet = {
  id: string;
  name: string;
  balance: number;
  balanceMode?: 'base';
  color: string;
  icon: string;
};

export type TransactionType = 'income' | 'expense' | 'transfer';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  walletId: string;
  toWalletId?: string; // Only for transfer
  date: string;
  note: string;
  status?: 'completed' | 'canceled';
  clientId?: string;
  syncStatus?: SyncStatus;
  syncError?: string;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
};

export type TransactionMutationType = 'create' | 'update' | 'cancel';

export type TransactionQueueItem = {
  id: string;
  userId: string;
  transactionId: string;
  operation: TransactionMutationType;
  transaction: Transaction;
  queuedAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
};
