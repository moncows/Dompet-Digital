import { Transaction, TransactionMutationType, TransactionQueueItem } from '../types';
import {
  listTransactionMutations,
  removeTransactionMutation,
  updateTransactionMutation,
} from './offlineQueue';

export const ACCESS_TOKEN_STORAGE_KEY = 'dompetku_access_token';

const REQUEST_TIMEOUT_MS = 10_000;

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/$/, '');
}

function createAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => window.clearTimeout(timeoutId),
  };
}

function buildHeaders(token?: string) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

function createPayload(transaction: Transaction) {
  return {
    client_id: transaction.clientId ?? transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    category_id: transaction.categoryId || null,
    wallet_id: transaction.walletId,
    to_wallet_id: transaction.toWalletId ?? null,
    date: transaction.date,
    note: transaction.note,
    status: transaction.status ?? 'completed',
  };
}

async function sendTransactionMutation(item: TransactionQueueItem, token?: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL belum diatur.');
  }

  const transactionId = encodeURIComponent(item.transactionId);
  const syncPrefix = import.meta.env.VITE_API_SYNC_PREFIX?.trim() || '/transactions';
  const resourceBase = `${apiBaseUrl}${syncPrefix.startsWith('/') ? syncPrefix : `/${syncPrefix}`}`;

  const endpointByOperation: Record<TransactionMutationType, string> = {
    create: resourceBase,
    update: `${resourceBase}/${transactionId}`,
    cancel: `${resourceBase}/${transactionId}/cancel`,
  };

  const methodByOperation: Record<TransactionMutationType, string> = {
    create: 'POST',
    update: 'PUT',
    cancel: 'PATCH',
  };

  const { signal, cleanup } = createAbortSignal(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpointByOperation[item.operation], {
      method: methodByOperation[item.operation],
      headers: buildHeaders(token),
      body: JSON.stringify(createPayload(item.transaction)),
      signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json().catch(() => null);
  } finally {
    cleanup();
  }
}

export async function flushPendingTransactionMutations(options?: {
  token?: string;
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

  const items = await listTransactionMutations();
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
      await sendTransactionMutation(item, options?.token);
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

      if (errorMessage.includes('VITE_API_BASE_URL') || errorMessage.includes('HTTP 401')) {
        break;
      }

      if (error instanceof TypeError || errorMessage.includes('Failed to fetch') || errorMessage.includes('abort')) {
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
