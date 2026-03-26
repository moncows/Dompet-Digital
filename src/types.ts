export type Wallet = {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
};

export type TransactionType = 'income' | 'expense' | 'transfer';

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
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
};
