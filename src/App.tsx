import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Wallet as WalletIcon,
  CreditCard,
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Home,
  PieChart,
  Settings,
  Menu,
  X,
  Coffee,
  ShoppingCart,
  Car,
  Briefcase,
  Gift,
  MoreVertical,
  Filter,
  Calendar,
  Pencil,
  Tag,
  ChevronRight,
  ArrowLeft,
  Utensils,
  Zap,
  Heart,
  Book,
  Music,
  Film,
  Camera,
  Phone,
  Laptop,
  Smartphone,
  Plane,
  Dumbbell,
  GraduationCap,
  Stethoscope,
  Pill,
  Shield,
  Lock,
  Search,
  Users,
  Mail,
  MessageSquare,
  Send,
  Cloud,
  Sun,
  Moon,
  Star,
  Activity,
  Target,
  Flag,
  Award,
  Trophy,
  Medal,
  Map,
  Navigation,
  Compass,
  Anchor,
  Bike,
  Truck,
  Bus,
  Train,
  Ship,
  Umbrella,
  Wind,
  Droplets,
  Thermometer,
  Sunrise,
  Sunset,
  Pizza,
  Sandwich,
  IceCream,
  Beer,
  Wine,
  Apple,
  Banana,
  Cherry,
  Grape,
  Carrot,
  Egg,
  Cake,
  Cookie,
  Candy,
  Popcorn,
  AlertCircle
} from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from './context/AuthContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AppSnapshot, clearAppSnapshot, loadAppSnapshot, saveAppSnapshot } from './lib/appStorage';
import { isFirebaseConfigured } from './lib/firebase';
import { ensureUserProfileDocument, loadRemoteSnapshot, seedRemoteSnapshot, syncReferenceData } from './lib/firestoreStore';
import {
  clearTransactionMutations,
  createQueueItemId,
  enqueueTransactionMutation,
  getPendingTransactionCount,
} from './lib/offlineQueue';
import { flushPendingTransactionMutations } from './lib/transactionSync';
import { cn } from './lib/utils';
import { ThemeMode, THEME_STORAGE_KEY, applyTheme, getInitialTheme } from './lib/theme';
import { Wallet, Transaction, Category, TransactionType, TransactionMutationType } from './types';

const createClientId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeTransactions = (items: Transaction[]) => {
  return items.map((transaction) => ({
    ...transaction,
    clientId: transaction.clientId ?? transaction.id,
    syncStatus: transaction.syncStatus ?? 'synced',
  }));
};

// --- MOCK DATA ---
const DEMO_WALLETS: Wallet[] = [
  { id: 'w1', name: 'Dompet Tunai', balance: 1500000, color: 'bg-emerald-500', icon: 'WalletIcon' },
  { id: 'w2', name: 'Rekening BCA', balance: 12500000, color: 'bg-blue-600', icon: 'Landmark' },
  { id: 'w3', name: 'GoPay', balance: 350000, color: 'bg-sky-500', icon: 'CreditCard' },
];

const DEMO_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Gaji', type: 'income', icon: 'Briefcase', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'c2', name: 'Bonus', type: 'income', icon: 'Gift', color: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30' },
  { id: 'c3', name: 'Makanan', type: 'expense', icon: 'Coffee', color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' },
  { id: 'c4', name: 'Belanja', type: 'expense', icon: 'ShoppingCart', color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30' },
  { id: 'c5', name: 'Transportasi', type: 'expense', icon: 'Car', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'income', amount: 10000000, categoryId: 'c1', walletId: 'w2', date: '2026-03-25T08:00:00Z', note: 'Gaji Bulan Maret' },
  { id: 't2', type: 'expense', amount: 50000, categoryId: 'c3', walletId: 'w3', date: '2026-03-24T12:30:00Z', note: 'Makan Siang Nasi Padang' },
  { id: 't3', type: 'expense', amount: 150000, categoryId: 'c4', walletId: 'w2', date: '2026-03-23T15:00:00Z', note: 'Belanja Bulanan Mini' },
  { id: 't4', type: 'transfer', amount: 500000, categoryId: '', walletId: 'w2', toWalletId: 'w3', date: '2026-03-22T09:00:00Z', note: 'Topup GoPay' },
];

const LEGACY_DEMO_APP_SNAPSHOT: AppSnapshot = {
  wallets: DEMO_WALLETS,
  categories: DEMO_CATEGORIES,
  transactions: normalizeTransactions(DEMO_TRANSACTIONS),
};

const STARTER_WALLETS: Wallet[] = [
  { id: 'wallet-bank-abc', name: 'Bank ABC', balance: 0, color: 'bg-blue-600', icon: 'Landmark' },
  { id: 'wallet-cash', name: 'Uang Tunai', balance: 0, color: 'bg-emerald-500', icon: 'WalletIcon' },
];

const STARTER_CATEGORIES: Category[] = [
  { id: 'cat-income-gaji', name: 'Gaji', type: 'income', icon: 'Briefcase', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'cat-income-bonus', name: 'Bonus', type: 'income', icon: 'Gift', color: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30' },
  { id: 'cat-expense-makanan', name: 'Makanan', type: 'expense', icon: 'Coffee', color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' },
  { id: 'cat-expense-transport', name: 'Transportasi', type: 'expense', icon: 'Car', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
];

const STARTER_APP_SNAPSHOT: AppSnapshot = {
  wallets: STARTER_WALLETS,
  categories: STARTER_CATEGORIES,
  transactions: [],
};

const EMPTY_APP_SNAPSHOT: AppSnapshot = {
  wallets: [],
  categories: [],
  transactions: [],
};

const DEFAULT_APP_SNAPSHOT: AppSnapshot = {
  wallets: STARTER_APP_SNAPSHOT.wallets,
  categories: STARTER_APP_SNAPSHOT.categories,
  transactions: STARTER_APP_SNAPSHOT.transactions,
};

const serializeSnapshot = (snapshot: AppSnapshot) => JSON.stringify({
  wallets: snapshot.wallets,
  categories: snapshot.categories,
  transactions: normalizeTransactions(snapshot.transactions),
});

const isDefaultSnapshot = (snapshot: AppSnapshot) => {
  return serializeSnapshot(snapshot) === serializeSnapshot(DEFAULT_APP_SNAPSHOT);
};

const isEmptySnapshot = (snapshot: AppSnapshot) => {
  return serializeSnapshot(snapshot) === serializeSnapshot(EMPTY_APP_SNAPSHOT);
};

const isLegacyDemoSnapshot = (snapshot: AppSnapshot) => {
  return serializeSnapshot(snapshot) === serializeSnapshot(LEGACY_DEMO_APP_SNAPSHOT);
};

// --- HELPER FUNCTIONS ---
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    WalletIcon, CreditCard, Landmark, Coffee, ShoppingCart, Car, Briefcase, Gift,
    Home, Utensils, Zap, Heart, Book, Music, Film, Camera, Phone, Laptop,
    Smartphone, Plane, Dumbbell, GraduationCap, Stethoscope, Pill, Shield,
    Lock, Search, Users, Mail, MessageSquare, Send, Cloud, Sun, Moon, Star,
    Activity, Target, Flag, Award, Trophy, Medal, Map, Navigation,
    Compass, Anchor, Bike, Truck, Bus, Train, Ship, Umbrella,
    Wind, Droplets, Thermometer, Sunrise, Sunset, Pizza, Sandwich,
    IceCream, Beer, Wine, Apple, Banana, Cherry, Grape,
    Carrot, Egg, Cake, Cookie, Candy, Popcorn
  };
  const Icon = icons[iconName] || WalletIcon;
  return <Icon className="w-5 h-5" />;
};

function ThemeToggleButton({
  theme,
  onToggle,
  className,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  className: string;
}) {
  const isDarkTheme = theme === 'dark';
  const label = isDarkTheme ? 'Aktifkan mode terang' : 'Aktifkan mode gelap';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={className}
    >
      {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export default function App() {
  const { user, signOutUser } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isOnline = useOnlineStatus();
  const syncInFlightRef = React.useRef(false);
  const storageSaveQueueRef = React.useRef(Promise.resolve());
  const referenceSyncQueueRef = React.useRef(Promise.resolve());
  const hasBootstrappedRemoteRef = React.useRef(false);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [isRemoteReady, setIsRemoteReady] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [dismissedSyncBannerKey, setDismissedSyncBannerKey] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>(DEFAULT_APP_SNAPSHOT.wallets);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_APP_SNAPSHOT.categories);
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_APP_SNAPSHOT.transactions);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isAddWalletModalOpen, setAddWalletModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isDesktopSettingsMenuOpen, setIsDesktopSettingsMenuOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmationValue, setResetConfirmationValue] = useState('');
  const [isResettingData, setIsResettingData] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'transactions' | 'categories' | 'wallets'>('dashboard');
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string | null>(null);
  const userId = user?.uid ?? '';
  const userLabel = user?.displayName?.trim() || user?.email?.split('@')[0] || 'User';
  const userInitial = userLabel.charAt(0).toUpperCase();

  // --- PERSISTENCE ---
  React.useEffect(() => {
    if (!userId) {
      return;
    }

    let isCancelled = false;
    hasBootstrappedRemoteRef.current = false;
    setIsStorageHydrated(false);
    setIsRemoteReady(false);

    const bootstrapLocalState = async () => {
      try {
        const [snapshot, queuedMutationsCount] = await Promise.all([
          loadAppSnapshot(userId, DEFAULT_APP_SNAPSHOT),
          getPendingTransactionCount(userId),
        ]);

        const shouldUpgradeToStarterSeed = queuedMutationsCount === 0 && (isLegacyDemoSnapshot(snapshot) || isEmptySnapshot(snapshot));
        const resolvedSnapshot = shouldUpgradeToStarterSeed
          ? DEFAULT_APP_SNAPSHOT
          : snapshot;

        if (shouldUpgradeToStarterSeed) {
          await saveAppSnapshot(userId, DEFAULT_APP_SNAPSHOT);
        }

        if (isCancelled) {
          return;
        }

        setWallets(resolvedSnapshot.wallets);
        setCategories(resolvedSnapshot.categories);
        setTransactions(normalizeTransactions(resolvedSnapshot.transactions));
        setPendingSyncCount(queuedMutationsCount);
      } catch {
        if (!isCancelled) {
          setSyncNotice('Gagal memuat IndexedDB. Data default dipakai sementara.');
          setWallets(DEFAULT_APP_SNAPSHOT.wallets);
          setCategories(DEFAULT_APP_SNAPSHOT.categories);
          setTransactions(DEFAULT_APP_SNAPSHOT.transactions);
          setPendingSyncCount(0);
        }
      } finally {
        if (!isCancelled) {
          setIsStorageHydrated(true);
        }
      }
    };

    void bootstrapLocalState();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (!user || !userId || !isStorageHydrated || !isOnline || !isFirebaseConfigured() || hasBootstrappedRemoteRef.current) {
      return;
    }

    let isCancelled = false;
    hasBootstrappedRemoteRef.current = true;

    const bootstrapRemoteState = async () => {
      try {
        await ensureUserProfileDocument(user);

        const remoteSnapshot = await loadRemoteSnapshot(userId);
        if (isCancelled) {
          return;
        }

        const localSnapshot: AppSnapshot = { wallets, categories, transactions };
        const pendingCount = await getPendingTransactionCount(userId);
        const normalizedRemoteSnapshot = remoteSnapshot
          ? {
            wallets: remoteSnapshot.wallets,
            categories: remoteSnapshot.categories,
            transactions: normalizeTransactions(remoteSnapshot.transactions),
          }
          : null;

        if (!remoteSnapshot) {
          await seedRemoteSnapshot(userId, localSnapshot);
          if (!isCancelled) {
            setSyncNotice('Data awal berhasil disiapkan.');
          }
          return;
        }

        if (pendingCount === 0 && normalizedRemoteSnapshot && (isLegacyDemoSnapshot(normalizedRemoteSnapshot) || isEmptySnapshot(normalizedRemoteSnapshot))) {
          setWallets(DEFAULT_APP_SNAPSHOT.wallets);
          setCategories(DEFAULT_APP_SNAPSHOT.categories);
          setTransactions(DEFAULT_APP_SNAPSHOT.transactions);
          await saveAppSnapshot(userId, DEFAULT_APP_SNAPSHOT);
          await seedRemoteSnapshot(userId, DEFAULT_APP_SNAPSHOT);

          if (!isCancelled) {
            setSyncNotice('Data awal otomatis berhasil disiapkan untuk akun ini.');
          }
          return;
        }

        if (pendingCount === 0 && normalizedRemoteSnapshot && isDefaultSnapshot(localSnapshot)) {
          setWallets(normalizedRemoteSnapshot.wallets);
          setCategories(normalizedRemoteSnapshot.categories);
          setTransactions(normalizedRemoteSnapshot.transactions);
          await saveAppSnapshot(userId, normalizedRemoteSnapshot);

          if (!isCancelled) {
            setSyncNotice('Data akun berhasil dimuat ke perangkat ini.');
          }
          return;
        }

        if (pendingCount === 0) {
          await seedRemoteSnapshot(userId, localSnapshot);
          if (!isCancelled) {
            setSyncNotice('Perubahan lokal berhasil diperbarui.');
          }
          return;
        }

        await syncReferenceData(userId, {
          wallets: localSnapshot.wallets,
          categories: localSnapshot.categories,
        });
      } catch {
        if (!isCancelled) {
          setSyncNotice('Koneksi layanan data sedang bermasalah. Data lokal tetap tersedia.');
        }
      } finally {
        if (!isCancelled) {
          setIsRemoteReady(true);
        }
      }
    };

    void bootstrapRemoteState();

    return () => {
      isCancelled = true;
    };
  }, [user, userId, isStorageHydrated, isOnline, wallets, categories, transactions]);

  React.useEffect(() => {
    if (!isStorageHydrated || !userId) {
      return;
    }

    const snapshotToPersist: AppSnapshot = {
      wallets,
      categories,
      transactions,
    };

    storageSaveQueueRef.current = storageSaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveAppSnapshot(userId, snapshotToPersist))
      .catch(() => {
        setSyncNotice('Gagal menyimpan perubahan ke IndexedDB.');
      });
  }, [wallets, categories, transactions, isStorageHydrated, userId]);

  React.useEffect(() => {
    if (!userId || !isStorageHydrated || !isOnline || !isFirebaseConfigured() || !isRemoteReady) {
      return;
    }

    referenceSyncQueueRef.current = referenceSyncQueueRef.current
      .catch(() => undefined)
      .then(() => syncReferenceData(userId, { wallets, categories }))
      .catch(() => {
        setSyncNotice('Perubahan dompet atau kategori belum dapat disimpan saat ini.');
      });
  }, [wallets, categories, userId, isStorageHydrated, isOnline, isRemoteReady]);

  React.useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    if (!syncNotice) {
      return;
    }

    const isPersistentNotice =
      syncNotice.startsWith('Gagal') ||
      syncNotice.startsWith('Mode offline aktif') ||
      syncNotice.includes('belum bisa');

    if (isPersistentNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncNotice((currentNotice) => (currentNotice === syncNotice ? null : currentNotice));
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [syncNotice]);

  const refreshPendingSyncCount = async () => {
    if (!userId) {
      setPendingSyncCount(0);
      return;
    }

    setPendingSyncCount(await getPendingTransactionCount(userId));
  };

  const updateTransactionSyncState = (transactionId: string, syncStatus: Transaction['syncStatus'], syncError?: string) => {
    setTransactions((prev) => prev.map((transaction) => {
      if (transaction.id !== transactionId && transaction.clientId !== transactionId) {
        return transaction;
      }

      return {
        ...transaction,
        syncStatus,
        syncError,
      };
    }));
  };

  const syncPendingTransactions = async () => {
    if (!userId || !isOnline || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    setSyncNotice('Menyinkronkan perubahan lokal...');

    try {
      const result = await flushPendingTransactionMutations({
        userId,
        onSuccess: (item) => {
          updateTransactionSyncState(item.transactionId, 'synced');
        },
        onFailure: (item, errorMessage) => {
          updateTransactionSyncState(item.transactionId, navigator.onLine ? 'failed' : 'pending', errorMessage);
        },
      });

      await refreshPendingSyncCount();

      if (result.syncedCount > 0) {
        setSyncNotice(`${result.syncedCount} perubahan berhasil disinkronkan.`);
      } else if (result.reason === 'offline') {
        setSyncNotice('Mode offline aktif. Perubahan tetap disimpan di perangkat.');
      } else if (result.reason === 'empty') {
        setSyncNotice(null);
      } else if (result.failedCount > 0) {
        setSyncNotice('Sebagian perubahan belum dapat disinkronkan.');
      } else {
        setSyncNotice(null);
      }
    } finally {
      syncInFlightRef.current = false;
    }
  };

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    if (!isOnline) {
      setSyncNotice('Mode offline aktif. Perubahan baru akan masuk antrean sinkronisasi.');
      return;
    }

    if (pendingSyncCount > 0) {
      void syncPendingTransactions();
      return;
    }

    if (syncNotice?.startsWith('Mode offline aktif')) {
      setSyncNotice(null);
    }
  }, [isOnline, pendingSyncCount, userId]);

  const queueTransactionChange = async (operation: TransactionMutationType, transaction: Transaction) => {
    if (!userId) {
      return;
    }

    await enqueueTransactionMutation({
      id: createQueueItemId(),
      userId,
      transactionId: transaction.clientId ?? transaction.id,
      operation,
      transaction,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    });

    await refreshPendingSyncCount();

    if (isOnline) {
      void syncPendingTransactions();
    }
  };

  // --- CALCULATIONS ---
  const totalBalance = useMemo(() => wallets.reduce((acc, w) => acc + w.balance, 0), [wallets]);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => t.status !== 'canceled');
  }, [transactions]);

  const totalIncome = useMemo(() =>
    currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
    , [currentMonthTransactions]);

  const totalExpense = useMemo(() =>
    currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    , [currentMonthTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedWalletFilter) {
      filtered = filtered.filter(t => t.walletId === selectedWalletFilter || t.toWalletId === selectedWalletFilter);
    }
    return filtered;
  }, [transactions, selectedWalletFilter]);

  const isResetConfirmationValid = resetConfirmationValue.trim().toLowerCase() === 'hapus';

  // --- HANDLERS ---
  const handleResetData = async () => {
    if (!userId) {
      return;
    }

    await storageSaveQueueRef.current.catch(() => undefined);
    await clearAppSnapshot(userId);
    await clearTransactionMutations(userId);
    await saveAppSnapshot(userId, DEFAULT_APP_SNAPSHOT);

    if (isOnline && isFirebaseConfigured()) {
      await seedRemoteSnapshot(userId, DEFAULT_APP_SNAPSHOT);
    }

    setWallets(DEFAULT_APP_SNAPSHOT.wallets);
    setTransactions(DEFAULT_APP_SNAPSHOT.transactions);
    setCategories(DEFAULT_APP_SNAPSHOT.categories);
    setPendingSyncCount(0);
    setSyncNotice(null);
    setCurrentView('dashboard');
    setIsMobileSettingsOpen(false);
    setIsDesktopSettingsMenuOpen(false);
  };

  const openResetDataDialog = () => {
    setResetConfirmationValue('');
    setIsResetDialogOpen(true);
  };

  const confirmResetData = async () => {
    if (!isResetConfirmationValid || isResettingData) {
      return;
    }

    setIsResettingData(true);

    try {
      await handleResetData();
      setIsResetDialogOpen(false);
      setResetConfirmationValue('');
    } finally {
      setIsResettingData(false);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDestructive = true, confirmText?: string) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      isDestructive,
      confirmText
    });
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const clientId = createClientId();
    const transaction: Transaction = {
      ...newTx,
      id: clientId,
      clientId,
      syncStatus: 'pending'
    };

    setWallets(prev => prev.map(w => {
      if (transaction.type === 'income' && w.id === transaction.walletId) {
        return { ...w, balance: w.balance + transaction.amount };
      }
      if (transaction.type === 'expense' && w.id === transaction.walletId) {
        return { ...w, balance: w.balance - transaction.amount };
      }
      if (transaction.type === 'transfer') {
        if (w.id === transaction.walletId) return { ...w, balance: w.balance - transaction.amount };
        if (w.id === transaction.toWalletId) return { ...w, balance: w.balance + transaction.amount };
      }
      return w;
    }));

    setTransactions(prev => [transaction, ...prev]);
    void queueTransactionChange('create', transaction);
    setAddModalOpen(false);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    const nextTransaction: Transaction = {
      ...updatedTx,
      clientId: updatedTx.clientId ?? updatedTx.id,
      syncStatus: 'pending',
      syncError: undefined,
    };

    setWallets(prev => {
      let nextWallets = [...prev];

      // 1. Reverse old transaction
      nextWallets = nextWallets.map(w => {
        if (oldTx.type === 'income' && w.id === oldTx.walletId) return { ...w, balance: w.balance - oldTx.amount };
        if (oldTx.type === 'expense' && w.id === oldTx.walletId) return { ...w, balance: w.balance + oldTx.amount };
        if (oldTx.type === 'transfer') {
          if (w.id === oldTx.walletId) return { ...w, balance: w.balance + oldTx.amount };
          if (w.id === oldTx.toWalletId) return { ...w, balance: w.balance - oldTx.amount };
        }
        return w;
      });

      // 2. Apply new transaction
      nextWallets = nextWallets.map(w => {
        if (nextTransaction.type === 'income' && w.id === nextTransaction.walletId) return { ...w, balance: w.balance + nextTransaction.amount };
        if (nextTransaction.type === 'expense' && w.id === nextTransaction.walletId) return { ...w, balance: w.balance - nextTransaction.amount };
        if (nextTransaction.type === 'transfer') {
          if (w.id === nextTransaction.walletId) return { ...w, balance: w.balance - nextTransaction.amount };
          if (w.id === nextTransaction.toWalletId) return { ...w, balance: w.balance + nextTransaction.amount };
        }
        return w;
      });

      return nextWallets;
    });

    setTransactions(prev => prev.map(t => t.id === nextTransaction.id ? nextTransaction : t));
    void queueTransactionChange('update', nextTransaction);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.status === 'canceled') return;

    setWallets(prev => prev.map(w => {
      if (tx.type === 'income' && w.id === tx.walletId) {
        return { ...w, balance: w.balance - tx.amount };
      }
      if (tx.type === 'expense' && w.id === tx.walletId) {
        return { ...w, balance: w.balance + tx.amount };
      }
      if (tx.type === 'transfer') {
        if (w.id === tx.walletId) return { ...w, balance: w.balance + tx.amount };
        if (w.id === tx.toWalletId) return { ...w, balance: w.balance - tx.amount };
      }
      return w;
    }));

    const canceledTransaction: Transaction = {
      ...tx,
      status: 'canceled',
      clientId: tx.clientId ?? tx.id,
      syncStatus: 'pending',
      syncError: undefined,
    };

    setTransactions(prev => prev.map(t => t.id === id ? canceledTransaction : t));
    void queueTransactionChange('cancel', canceledTransaction);
  };

  const handleAddWallet = (newWallet: Omit<Wallet, 'id'>) => {
    const wallet: Wallet = {
      ...newWallet,
      id: `w${Date.now()}`
    };
    setWallets(prev => [...prev, wallet]);
    setAddWalletModalOpen(false);
  };

  const handleUpdateWallet = (updatedWallet: Wallet) => {
    setWallets(prev => prev.map(w => w.id === updatedWallet.id ? updatedWallet : w));
    setEditingWallet(null);
  };

  const handleDeleteWallet = (id: string) => {
    // Check if wallet has transactions
    const hasTransactions = transactions.some(t => t.walletId === id || t.toWalletId === id);
    if (hasTransactions) {
      setConfirmDialog({
        isOpen: true,
        title: 'Tidak Dapat Menghapus',
        message: 'Dompet ini memiliki transaksi. Hapus semua transaksi terkait terlebih dahulu.',
        onConfirm: () => { },
        isDestructive: false,
        confirmText: 'Ok'
      });
      return;
    }
    setWallets(prev => prev.filter(w => w.id !== id));
    if (selectedWalletFilter === id) setSelectedWalletFilter(null);
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const category: Category = {
      ...newCat,
      id: `c${Date.now()}`
    };
    setCategories(prev => [...prev, category]);
    setAddCategoryModalOpen(false);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    const hasTransactions = transactions.some(t => t.categoryId === id);
    if (hasTransactions) {
      setConfirmDialog({
        isOpen: true,
        title: 'Tidak Dapat Menghapus',
        message: 'Kategori ini sedang digunakan dalam transaksi. Ubah kategori transaksi tersebut terlebih dahulu.',
        onConfirm: () => { },
        isDestructive: false,
        confirmText: 'Ok'
      });
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const isDarkTheme = theme === 'dark';
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };
  const hasCloudSyncConfigured = isFirebaseConfigured();
  const syncBanner = !isOnline
    ? {
      key: 'offline',
      text: 'Mode offline aktif. Transaksi baru disimpan lokal dan akan dikirim saat koneksi kembali.',
      className: 'bg-amber-500 text-white',
    }
    : pendingSyncCount > 0
      ? {
        key: hasCloudSyncConfigured
          ? `pending:${pendingSyncCount}:${syncInFlightRef.current ? 'syncing' : 'queued'}`
          : `pending-local:${pendingSyncCount}`,
        text: hasCloudSyncConfigured
          ? syncInFlightRef.current
            ? `Menyinkronkan ${pendingSyncCount} perubahan...`
            : `${pendingSyncCount} perubahan menunggu sinkronisasi.`
          : `${pendingSyncCount} perubahan aman di perangkat, namun sinkronisasi cloud belum aktif.`,
        className: hasCloudSyncConfigured ? 'bg-slate-900 text-white' : 'bg-sky-600 text-white',
      }
      : syncNotice
        ? {
          key: `notice:${syncNotice}`,
          text: syncNotice,
          className: syncNotice.includes('berhasil') ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white',
        }
        : null;
  const visibleSyncBanner = syncBanner && dismissedSyncBannerKey !== syncBanner.key ? syncBanner : null;

  React.useEffect(() => {
    setDismissedSyncBannerKey(null);
  }, [isOnline, pendingSyncCount, syncNotice]);

  if (!isStorageHydrated) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans flex items-center justify-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Memuat Penyimpanan Lokal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            DompetKu sedang membaca data dari IndexedDB agar transaksi offline tetap aman.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans text-gray-900 dark:text-slate-100">
      {visibleSyncBanner && (
        <div className="fixed left-1/2 top-4 z-[80] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 px-4">
          <div className={cn('rounded-2xl px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm flex items-start gap-3', visibleSyncBanner.className)}>
            <div className="flex-1 pr-1">
              {visibleSyncBanner.text}
            </div>
            <button
              type="button"
              onClick={() => setDismissedSyncBannerKey(visibleSyncBanner.key)}
              aria-label="Tutup notifikasi sinkronisasi"
              className="shrink-0 rounded-lg p-1 text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MOBILE VIEW (Native App Style)
          ========================================== */}
      <div className="flex flex-col h-full lg:hidden relative">
        {/* Header (Curved) */}
        <div className="bg-blue-600 pt-12 pb-16 px-6 rounded-b-[2.5rem] shrink-0 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-900/20 flex items-center justify-center text-white font-bold border border-white/30 backdrop-blur-sm">
              {userInitial}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('wallets')}
                className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-900/20 flex items-center justify-center text-white border border-white/30 backdrop-blur-sm"
              >
                <WalletIcon className="w-5 h-5" />
              </button>
              <ThemeToggleButton
                theme={theme}
                onToggle={toggleTheme}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 backdrop-blur-sm transition-colors"
              />
              <div className="relative">
                <button
                  onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
                  className="w-10 h-10 rounded-full bg-white/20 dark:bg-gray-900/20 flex items-center justify-center text-white border border-white/30 backdrop-blur-sm"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {isMobileSettingsOpen && (
                  <div className="absolute top-12 right-0 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileSettingsOpen(false);
                        openResetDataDialog();
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Reset Database
                    </button>
                    <button
                      onClick={async (event) => {
                        event.stopPropagation();
                        setIsMobileSettingsOpen(false);
                        await signOutUser();
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-blue-100 text-sm font-medium">Total Saldo</div>
          <div className="text-white text-3xl font-bold mt-1">{formatRupiah(totalBalance)}</div>
        </div>

        {/* Wallets Horizontal Scroll */}
        <div className="-mt-10 shrink-0 z-10 w-full">
          <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x hide-scrollbar">
            {wallets.map(wallet => (
              <div
                key={wallet.id}
                onClick={() => setSelectedWalletFilter(wallet.id === selectedWalletFilter ? null : wallet.id)}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm min-w-[150px] snap-center shrink-0 border-2 transition-colors cursor-pointer",
                  selectedWalletFilter === wallet.id ? "border-blue-500" : "border-transparent"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white mb-3", wallet.color)}>
                  {getIconComponent(wallet.icon)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{wallet.name}</div>
                <div className="font-bold text-gray-900 dark:text-white mt-0.5">{formatRupiah(wallet.balance)}</div>
              </div>
            ))}
            <div
              onClick={() => setAddWalletModalOpen(true)}
              className="bg-blue-50/50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-2xl p-4 min-w-[120px] snap-center shrink-0 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Tambah</span>
            </div>
          </div>
        </div>

        {/* Transactions List / Reports View */}
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-2">
          {currentView === 'dashboard' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Transaksi Terakhir</h3>
                <button
                  onClick={() => setCurrentView('transactions')}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="space-y-4">
                {filteredTransactions.slice(0, 10).length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">Belum ada transaksi.</div>
                ) : (
                  filteredTransactions.slice(0, 10).map(tx => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const category = categories.find(c => c.id === tx.categoryId);
                    const wallet = wallets.find(w => w.id === tx.walletId);

                    return (
                      <div key={tx.id} className={cn("bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3", tx.status === 'canceled' && "opacity-60")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isTransfer ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" : category?.color || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
                          {isTransfer ? <ArrowRightLeft className="w-5 h-5" /> : getIconComponent(category?.icon || 'WalletIcon')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-bold text-gray-900 dark:text-white truncate text-sm flex items-center gap-2", tx.status === 'canceled' && "line-through text-gray-500 dark:text-gray-400")}>
                            {tx.note || (isTransfer ? 'Transfer' : category?.name)}
                            {tx.status === 'canceled' && <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium no-underline">Dibatalkan</span>}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{wallet?.name} • {format(parseISO(tx.date), 'dd MMM', { locale: id })}</div>
                        </div>
                        <div className={cn("font-bold whitespace-nowrap text-right text-sm", tx.status === 'canceled' ? "text-gray-400 dark:text-gray-500 line-through" : isIncome ? "text-emerald-600 dark:text-emerald-400" : isTransfer ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400")}>
                          {isIncome ? '+' : isTransfer ? '' : '-'}{formatRupiah(tx.amount)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : currentView === 'reports' ? (
            <div className="space-y-6">
              <ReportsView transactions={transactions} categories={categories} isDarkTheme={isDarkTheme} />
            </div>
          ) : currentView === 'transactions' ? (
            <div className="pb-20">
              <TransactionsView
                transactions={filteredTransactions}
                categories={categories}
                wallets={wallets}
                onDelete={handleDeleteTransaction}
                onEdit={(tx) => setEditingTransaction(tx)}
                onShowConfirm={confirmAction}
              />
            </div>
          ) : currentView === 'wallets' ? (
            <WalletsManageView
              wallets={wallets}
              onEdit={(w) => setEditingWallet(w)}
              onDelete={handleDeleteWallet}
              onAdd={() => setAddWalletModalOpen(true)}
              onShowConfirm={confirmAction}
            />
          ) : (
            <CategoriesManageView
              categories={categories}
              onEdit={(c) => setEditingCategory(c)}
              onDelete={handleDeleteCategory}
              onAdd={() => setAddCategoryModalOpen(true)}
              onShowConfirm={confirmAction}
            />
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-2 flex justify-between items-center pb-safe z-20">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={cn("flex flex-col items-center p-2", currentView === 'dashboard' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
          >
            <Home className="w-6 h-6" />
            <span className={cn("text-[10px] mt-1", currentView === 'dashboard' ? "font-bold" : "font-medium")}>Home</span>
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            className={cn("flex flex-col items-center p-2", currentView === 'transactions' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
          >
            <ArrowRightLeft className="w-6 h-6" />
            <span className={cn("text-[10px] mt-1", currentView === 'transactions' ? "font-bold" : "font-medium")}>Transaksi</span>
          </button>

          <div className="w-16"></div> {/* Spacer for FAB */}

          <button
            onClick={() => setCurrentView('reports')}
            className={cn("flex flex-col items-center p-2", currentView === 'reports' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
          >
            <PieChart className="w-6 h-6" />
            <span className={cn("text-[10px] mt-1", currentView === 'reports' ? "font-bold" : "font-medium")}>Laporan</span>
          </button>
          <button
            onClick={() => setCurrentView('categories')}
            className={cn("flex flex-col items-center p-2", currentView === 'categories' ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
          >
            <Tag className="w-6 h-6" />
            <span className={cn("text-[10px] mt-1", currentView === 'categories' ? "font-bold" : "font-medium")}>Kategori</span>
          </button>

          {/* FAB */}
          <button
            onClick={() => setAddModalOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/40 border-4 border-gray-50 dark:border-gray-800 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* ==========================================
          DESKTOP VIEW (Dashboard Style)
          ========================================== */}
      <div className="hidden lg:flex h-full w-full">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <WalletIcon className="w-6 h-6" />
              <span className="text-xl font-bold tracking-tight">DompetKu</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors", currentView === 'dashboard' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <Home className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors", currentView === 'transactions' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <ArrowRightLeft className="w-5 h-5" /> Transaksi
            </button>
            <button
              onClick={() => setCurrentView('wallets')}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors", currentView === 'wallets' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <WalletIcon className="w-5 h-5" /> Dompet
            </button>
            <button
              onClick={() => setCurrentView('categories')}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors", currentView === 'categories' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <Tag className="w-5 h-5" /> Kategori
            </button>
            <button
              onClick={() => setCurrentView('reports')}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors", currentView === 'reports' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <PieChart className="w-5 h-5" /> Laporan
            </button>
          </nav>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 relative">
            {isDesktopSettingsMenuOpen && (
              <div className="absolute bottom-[4.5rem] left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => {
                    setIsDesktopSettingsMenuOpen(false);
                    openResetDataDialog();
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset Database
                </button>
                <button
                  onClick={async () => {
                    setIsDesktopSettingsMenuOpen(false);
                    await signOutUser();
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsDesktopSettingsMenuOpen(!isDesktopSettingsMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
              <Settings className="w-5 h-5" /> Pengaturan
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8 shrink-0">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {currentView === 'dashboard' ? 'Dashboard Keuangan' : currentView === 'reports' ? 'Laporan Keuangan' : 'Riwayat Transaksi'}
            </h1>
            <div className="flex items-center gap-3">
              <ThemeToggleButton
                theme={theme}
                onToggle={toggleTheme}
                className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
              />
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Transaksi</span>
              </button>
              <div className="flex items-center gap-3 pl-1">
                <div className="text-right hidden xl:block">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{userLabel}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Akun aktif</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800">
                  {userInitial}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            {currentView === 'dashboard' ? (
              <div className="max-w-7xl mx-auto space-y-6">
                {/* STATS GRID */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Saldo</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatRupiah(totalBalance)}</div>
                    <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span>Dari {wallets.length} dompet aktif</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pemasukan (Bulan Ini)</div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatRupiah(totalIncome)}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pengeluaran (Bulan Ini)</div>
                      <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatRupiah(totalExpense)}</div>
                  </div>
                </div>

                {/* TWO COLUMN LAYOUT */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaksi Terakhir</h2>
                      <button
                        onClick={() => setCurrentView('transactions')}
                        className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:text-blue-400"
                      >
                        Lihat Semua
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
                      {filteredTransactions.slice(0, 10).length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Belum ada transaksi.</div>
                      ) : (
                        filteredTransactions.slice(0, 10).map(tx => {
                          const isIncome = tx.type === 'income';
                          const isTransfer = tx.type === 'transfer';
                          const category = categories.find(c => c.id === tx.categoryId);
                          const wallet = wallets.find(w => w.id === tx.walletId);
                          const toWallet = wallets.find(w => w.id === tx.toWalletId);

                          return (
                            <div key={tx.id} className={cn("p-5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", tx.status === 'canceled' && "opacity-60")}>
                              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", isTransfer ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" : category?.color || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
                                {isTransfer ? <ArrowRightLeft className="w-6 h-6" /> : getIconComponent(category?.icon || 'WalletIcon')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("font-medium text-gray-900 dark:text-white truncate flex items-center gap-2", tx.status === 'canceled' && "line-through text-gray-500 dark:text-gray-400")}>
                                  {tx.note || (isTransfer ? 'Transfer' : category?.name)}
                                  {tx.status === 'canceled' && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded font-medium no-underline">Dibatalkan</span>}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: id })}</span>
                                  <span>•</span>
                                  <span className="truncate">{isTransfer ? `${wallet?.name} → ${toWallet?.name}` : wallet?.name}</span>
                                </div>
                              </div>
                              <div className={cn("font-semibold whitespace-nowrap text-right", tx.status === 'canceled' ? "text-gray-400 dark:text-gray-500 line-through" : isIncome ? "text-emerald-600 dark:text-emerald-400" : isTransfer ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400")}>
                                {isIncome ? '+' : isTransfer ? '' : '-'}{formatRupiah(tx.amount)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-fit">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daftar Dompet</h2>
                      <button
                        onClick={() => setCurrentView('wallets')}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => setSelectedWalletFilter(null)}
                        className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left", selectedWalletFilter === null ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800" : "hover:bg-gray-50 dark:hover:bg-gray-800")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">Semua Dompet</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatRupiah(totalBalance)}</span>
                      </button>
                      {wallets.map(wallet => (
                        <button
                          key={wallet.id}
                          onClick={() => setSelectedWalletFilter(wallet.id)}
                          className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left", selectedWalletFilter === wallet.id ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800" : "hover:bg-gray-50 dark:hover:bg-gray-800")}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", wallet.color)}>
                              {getIconComponent(wallet.icon)}
                            </div>
                            <div className="font-medium text-gray-900 dark:text-white">{wallet.name}</div>
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">{formatRupiah(wallet.balance)}</div>
                        </button>
                      ))}
                      <button
                        onClick={() => setAddWalletModalOpen(true)}
                        className="w-full mt-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-medium hover:border-blue-300 hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Tambah Dompet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentView === 'reports' ? (
              <ReportsView transactions={transactions} categories={categories} isDarkTheme={isDarkTheme} />
            ) : currentView === 'transactions' ? (
              <TransactionsView
                transactions={filteredTransactions}
                categories={categories}
                wallets={wallets}
                onDelete={handleDeleteTransaction}
                onEdit={(tx) => setEditingTransaction(tx)}
                onShowConfirm={confirmAction}
              />
            ) : currentView === 'wallets' ? (
              <WalletsManageView
                wallets={wallets}
                onEdit={(w) => setEditingWallet(w)}
                onDelete={handleDeleteWallet}
                onAdd={() => setAddWalletModalOpen(true)}
                onShowConfirm={confirmAction}
              />
            ) : (
              <CategoriesManageView
                categories={categories}
                onEdit={(c) => setEditingCategory(c)}
                onDelete={handleDeleteCategory}
                onAdd={() => setAddCategoryModalOpen(true)}
                onShowConfirm={confirmAction}
              />
            )}
          </main>
        </div>
      </div>

      {/* --- ADD TRANSACTION MODAL --- */}
      {(isAddModalOpen || editingTransaction) && (
        <AddTransactionModal
          wallets={wallets}
          categories={categories}
          editingTransaction={editingTransaction}
          onClose={() => {
            setAddModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={(tx) => {
            if ('id' in tx) {
              handleUpdateTransaction(tx as Transaction);
            } else {
              handleAddTransaction(tx);
            }
          }}
        />
      )}

      {/* --- ADD WALLET MODAL --- */}
      {(isAddWalletModalOpen || editingWallet) && (
        <AddWalletModal
          editingWallet={editingWallet}
          onClose={() => {
            setAddWalletModalOpen(false);
            setEditingWallet(null);
          }}
          onSave={(w) => {
            if ('id' in w) {
              handleUpdateWallet(w as Wallet);
            } else {
              handleAddWallet(w);
            }
          }}
        />
      )}

      {/* --- ADD CATEGORY MODAL --- */}
      {(isAddCategoryModalOpen || editingCategory) && (
        <AddCategoryModal
          editingCategory={editingCategory}
          onClose={() => {
            setAddCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={(c) => {
            if ('id' in c) {
              handleUpdateCategory(c as Category);
            } else {
              handleAddCategory(c);
            }
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4", confirmDialog.isDestructive ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{confirmDialog.message}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex gap-3">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className={cn(
                  "flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-colors",
                  confirmDialog.isDestructive ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {confirmDialog.confirmText || (confirmDialog.isDestructive ? 'Hapus' : 'Ya')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetDialogOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isResettingData) {
                setIsResetDialogOpen(false);
              }
            }}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Database</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tindakan ini akan menghapus seluruh data akun dan mengembalikan aplikasi ke data awal.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Untuk melanjutkan, ketik <span className="font-semibold text-gray-900 dark:text-white">hapus</span> pada kolom di bawah.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Konfirmasi Reset
                </label>
                <input
                  type="text"
                  value={resetConfirmationValue}
                  onChange={(event) => setResetConfirmationValue(event.target.value)}
                  placeholder="ketik: hapus"
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex gap-3">
              <button
                onClick={() => {
                  if (!isResettingData) {
                    setIsResetDialogOpen(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-70"
                disabled={isResettingData}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  void confirmResetData();
                }}
                disabled={!isResetConfirmationValid || isResettingData}
                className="flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-colors bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResettingData ? 'Memproses...' : 'Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- REPORTS VIEW COMPONENT ---
function ReportsView({
  transactions,
  categories,
  isDarkTheme
}: {
  transactions: Transaction[],
  categories: Category[],
  isDarkTheme: boolean
}) {
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'thisMonth') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    return transactions.filter(t => {
      if (t.status === 'canceled') return false;
      const d = parseISO(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, period]);

  const barChartData = useMemo(() => {
    if (period === 'thisYear') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return months.map((m, i) => {
        const monthTxs = filteredData.filter(t => parseISO(t.date).getMonth() === i);
        return {
          name: m,
          income: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          expense: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    } else {
      const now = new Date();
      const start = period === 'thisMonth' ? startOfMonth(now) : startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = period === 'thisMonth' ? endOfMonth(now) : endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const days = eachDayOfInterval({ start, end });

      return days.map(d => {
        const dayTxs = filteredData.filter(t => isSameDay(parseISO(t.date), d));
        return {
          name: format(d, 'dd'),
          income: dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          expense: dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
    }
  }, [filteredData, period]);

  const pieChartData = useMemo(() => {
    const expenses = filteredData.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Lainnya';
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredData, categories]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const chartPalette = isDarkTheme ? {
    axis: '#94a3b8',
    grid: '#1e293b',
    tooltipBg: '#0f172a',
    tooltipBorder: '#1e293b',
    tooltipText: '#e2e8f0',
    cursor: 'rgba(51, 65, 85, 0.35)',
  } : {
    axis: '#9ca3af',
    grid: '#f3f4f6',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
    cursor: '#f9fafb',
  };

  const totalIncome = filteredData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analisis Keuangan</h2>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setPeriod('thisMonth')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", period === 'thisMonth' ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400")}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod('lastMonth')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", period === 'lastMonth' ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400")}
          >
            Bulan Lalu
          </button>
          <button
            onClick={() => setPeriod('thisYear')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", period === 'thisYear' ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400")}
          >
            Tahun Ini
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Pemasukan</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalIncome)}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Pengeluaran</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatRupiah(totalExpense)}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Selisih</div>
          <div className={cn("text-2xl font-bold", totalIncome - totalExpense >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400")}>
            {formatRupiah(totalIncome - totalExpense)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Tren Arus Kas</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartPalette.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartPalette.axis }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartPalette.axis }} tickFormatter={(value) => `Rp${value / 1000}k`} />
                <Tooltip
                  cursor={{ fill: chartPalette.cursor }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: `1px solid ${chartPalette.tooltipBorder}`,
                    backgroundColor: chartPalette.tooltipBg,
                    color: chartPalette.tooltipText,
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => formatRupiah(value)}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Masuk" />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Keluar" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Pengeluaran Per Kategori</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: `1px solid ${chartPalette.tooltipBorder}`,
                    backgroundColor: chartPalette.tooltipBg,
                    color: chartPalette.tooltipText,
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => formatRupiah(value)}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: chartPalette.axis }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- TRANSACTIONS VIEW COMPONENT ---
function TransactionsView({
  transactions,
  categories,
  wallets,
  onDelete,
  onEdit,
  onShowConfirm
}: {
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  onDelete: (id: string) => void,
  onEdit: (tx: Transaction) => void,
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchCategory = filterCategory === 'all' || tx.categoryId === filterCategory;

      const txDate = new Date(tx.date);
      const matchStartDate = !startDate || txDate >= new Date(startDate);
      const matchEndDate = !endDate || txDate <= new Date(endDate + 'T23:59:59');

      return matchType && matchCategory && matchStartDate && matchEndDate;
    });
  }, [transactions, filterType, filterCategory, startDate, endDate]);

  const availableCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    if (filterType === 'transfer') return [];
    return categories.filter(c => c.type === filterType);
  }, [categories, filterType]);

  // Reset category filter if it's not available in the new type
  React.useEffect(() => {
    if (filterCategory !== 'all' && filterType !== 'all') {
      const isAvailable = availableCategories.some(c => c.id === filterCategory);
      if (!isAvailable && filterType !== 'transfer') {
        setFilterCategory('all');
      }
    }
    if (filterType === 'transfer') {
      setFilterCategory('all');
    }
  }, [filterType, availableCategories, filterCategory]);

  const resetFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium",
            showFilters || filterType !== 'all' || filterCategory !== 'all' || startDate || endDate
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <Filter className="w-4 h-4" />
          Filter {(!showFilters && (filterType !== 'all' || filterCategory !== 'all' || startDate || endDate)) && "•"}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tipe</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              >
                <option value="all">Semua Tipe</option>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Kategori</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                disabled={filterType === 'transfer'}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 text-gray-900 dark:text-white"
              >
                <option value="all">Semua Kategori</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mulai Dari</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Sampai Dengan</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white"
            >
              Reset Filter
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="w-8 h-8 text-gray-300" />
              </div>
              <p>Tidak ada transaksi yang sesuai dengan filter.</p>
              {(filterType !== 'all' || filterCategory !== 'all' || startDate || endDate) && (
                <button onClick={resetFilters} className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Bersihkan Filter
                </button>
              )}
            </div>
          ) : (
            filteredTransactions.map(tx => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const category = categories.find(c => c.id === tx.categoryId);
              const wallet = wallets.find(w => w.id === tx.walletId);
              const toWallet = wallets.find(w => w.id === tx.toWalletId);

              return (
                <div key={tx.id} className={cn("p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group", tx.status === 'canceled' && "opacity-60")}>
                  <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0", isTransfer ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" : category?.color || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
                    {isTransfer ? <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : getIconComponent(category?.icon || 'WalletIcon')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-bold sm:font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base flex items-center gap-2", tx.status === 'canceled' && "line-through text-gray-500 dark:text-gray-400")}>
                      {tx.note || (isTransfer ? 'Transfer' : category?.name)}
                      {tx.status === 'canceled' && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded font-medium no-underline">Dibatalkan</span>}
                    </div>
                    <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-1.5 mt-0.5">
                      <span>{format(parseISO(tx.date), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">{isTransfer ? `${wallet?.name} → ${toWallet?.name}` : wallet?.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4">
                    <div className={cn("font-bold sm:font-semibold whitespace-nowrap text-right text-sm sm:text-base", tx.status === 'canceled' ? "text-gray-400 dark:text-gray-500 line-through" : isIncome ? "text-emerald-600 dark:text-emerald-400" : isTransfer ? "text-gray-900 dark:text-white" : "text-rose-600 dark:text-rose-400")}>
                      {isIncome ? '+' : isTransfer ? '' : '-'}{formatRupiah(tx.amount)}
                    </div>
                    {tx.status !== 'canceled' && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          aria-label="Edit transaksi"
                          title="Edit transaksi"
                        >
                          <Pencil className="w-3.5 h-3.5 sm:w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onShowConfirm(
                              'Batalkan Transaksi',
                              'Batalkan transaksi ini? Saldo dompet akan dikembalikan.',
                              () => onDelete(tx.id)
                            );
                          }}
                          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          aria-label="Batalkan transaksi"
                          title="Batalkan transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- WALLETS MANAGE VIEW ---
function WalletsManageView({
  wallets,
  onEdit,
  onDelete,
  onAdd,
  onShowConfirm
}: {
  wallets: Wallet[],
  onEdit: (w: Wallet) => void,
  onDelete: (id: string) => void,
  onAdd: () => void,
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Dompet</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map(wallet => (
          <div key={wallet.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", wallet.color)}>
                {getIconComponent(wallet.icon)}
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{wallet.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatRupiah(wallet.balance)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(wallet)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                aria-label={`Edit dompet ${wallet.name}`}
                title={`Edit dompet ${wallet.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onShowConfirm(
                    'Hapus Dompet',
                    `Hapus dompet ${wallet.name}?`,
                    () => onDelete(wallet.id)
                  );
                }}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                aria-label={`Hapus dompet ${wallet.name}`}
                title={`Hapus dompet ${wallet.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CATEGORIES MANAGE VIEW ---
function CategoriesManageView({
  categories,
  onEdit,
  onDelete,
  onAdd,
  onShowConfirm
}: {
  categories: Category[],
  onEdit: (c: Category) => void,
  onDelete: (id: string) => void,
  onAdd: () => void,
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [typeFilter, setTypeFilter] = useState<'expense' | 'income'>('expense');

  const filtered = categories.filter(c => c.type === typeFilter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Kategori</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 w-fit">
        <button
          onClick={() => setTypeFilter('expense')}
          className={cn("px-6 py-2 text-sm font-medium rounded-lg transition-all", typeFilter === 'expense' ? "bg-gray-900 dark:bg-gray-700 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setTypeFilter('income')}
          className={cn("px-6 py-2 text-sm font-medium rounded-lg transition-all", typeFilter === 'income' ? "bg-gray-900 dark:bg-gray-700 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
        >
          Pemasukan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cat.color)}>
                {getIconComponent(cat.icon)}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(cat)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                aria-label={`Edit kategori ${cat.name}`}
                title={`Edit kategori ${cat.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onShowConfirm(
                    'Hapus Kategori',
                    `Hapus kategori ${cat.name}?`,
                    () => onDelete(cat.id)
                  );
                }}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                aria-label={`Hapus kategori ${cat.name}`}
                title={`Hapus kategori ${cat.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- ADD CATEGORY MODAL ---
function AddCategoryModal({
  editingCategory,
  onClose,
  onSave
}: {
  editingCategory: Category | null,
  onClose: () => void,
  onSave: (cat: Category | Omit<Category, 'id'>) => void
}) {
  const [name, setName] = useState(editingCategory?.name || '');
  const [type, setType] = useState<'expense' | 'income'>(editingCategory?.type || 'expense');
  const [icon, setIcon] = useState(editingCategory?.icon || 'Tag');
  const [color, setColor] = useState(editingCategory?.color || 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30');

  const COLORS = [
    { name: 'Blue', value: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
    { name: 'Emerald', value: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
    { name: 'Rose', value: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30' },
    { name: 'Amber', value: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
    { name: 'Purple', value: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30' },
    { name: 'Orange', value: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' },
  ];

  const ICONS = [
    { name: 'Tag', value: 'Tag' },
    { name: 'Coffee', value: 'Coffee' },
    { name: 'Shopping', value: 'ShoppingCart' },
    { name: 'Car', value: 'Car' },
    { name: 'Work', value: 'Briefcase' },
    { name: 'Gift', value: 'Gift' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const data = {
      name,
      type,
      icon,
      color
    };

    if (editingCategory) {
      onSave({ ...data, id: editingCategory.id });
    } else {
      onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", type === 'expense' ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", type === 'income' ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}
            >
              Pemasukan
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Kategori</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cth: Hiburan"
              className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Warna</label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all ring-offset-2",
                    c.value.split(' ')[1], // Get bg class
                    color === c.value ? "ring-2 ring-blue-500 scale-110" : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Ikon</label>
            <div className="flex flex-wrap gap-3">
              {ICONS.map(i => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIcon(i.value)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2",
                    icon === i.value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:border-gray-700"
                  )}
                >
                  {getIconComponent(i.value)}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              Batal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- ADD WALLET MODAL ---
function AddWalletModal({
  editingWallet,
  onClose,
  onSave
}: {
  editingWallet: Wallet | null,
  onClose: () => void,
  onSave: (wallet: Wallet | Omit<Wallet, 'id'>) => void
}) {
  const [name, setName] = useState(editingWallet?.name || '');
  const [balance, setBalance] = useState(editingWallet?.balance.toString() || '');
  const [color, setColor] = useState(editingWallet?.color || 'bg-blue-600');
  const [icon, setIcon] = useState(editingWallet?.icon || 'WalletIcon');

  const COLORS = [
    { name: 'Emerald', value: 'bg-emerald-500' },
    { name: 'Blue', value: 'bg-blue-600' },
    { name: 'Sky', value: 'bg-sky-500' },
    { name: 'Rose', value: 'bg-rose-500' },
    { name: 'Amber', value: 'bg-amber-500' },
    { name: 'Purple', value: 'bg-purple-600' },
  ];

  const ICONS = [
    { name: 'Wallet', value: 'WalletIcon' },
    { name: 'Card', value: 'CreditCard' },
    { name: 'Bank', value: 'Landmark' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    const data = {
      name,
      balance: Number(balance),
      color,
      icon
    };

    if (editingWallet) {
      onSave({ ...data, id: editingWallet.id });
    } else {
      onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingWallet ? 'Edit Dompet' : 'Tambah Dompet Baru'}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Dompet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cth: Tabungan Haji"
              className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Saldo Awal</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">Rp</span>
              </div>
              <input
                type="number"
                required
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Warna</label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all ring-offset-2",
                    c.value,
                    color === c.value ? "ring-2 ring-blue-500 scale-110" : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Ikon</label>
            <div className="flex gap-3">
              {ICONS.map(i => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIcon(i.value)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2",
                    icon === i.value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:border-gray-700"
                  )}
                >
                  {getIconComponent(i.value)}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              Batal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTransactionModal({
  wallets,
  categories,
  editingTransaction,
  onClose,
  onSave
}: {
  wallets: Wallet[],
  categories: Category[],
  editingTransaction: Transaction | null,
  onClose: () => void,
  onSave: (tx: Transaction | Omit<Transaction, 'id'>) => void
}) {
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [walletId, setWalletId] = useState(editingTransaction?.walletId || wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(editingTransaction?.toWalletId || wallets[1]?.id || '');
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [date, setDate] = useState(editingTransaction ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);

  const availableCategories = categories.filter(c => c.type === type);

  React.useEffect(() => {
    if (type !== 'transfer' && availableCategories.length > 0 && !availableCategories.find(c => c.id === categoryId)) {
      setCategoryId(availableCategories[0].id);
    }
  }, [type, availableCategories, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const data = {
      type,
      amount: Number(amount),
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      categoryId: type === 'transfer' ? '' : categoryId,
      note,
      date: new Date(date).toISOString()
    };

    if (editingTransaction) {
      onSave({ ...data, id: editingTransaction.id });
    } else {
      onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all",
                  type === t ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                {t === 'expense' ? 'Keluar' : t === 'income' ? 'Masuk' : 'Transfer'}
              </button>
            ))}
          </div>

          <form id="tx-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Jumlah (Rp)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">Rp</span>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow text-lg font-semibold bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dari Dompet</label>
                  <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ke Dompet</label>
                  <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    {wallets.filter(w => w.id !== walletId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Dompet</label>
                <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            {type !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kategori</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Catatan</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cth: Makan siang" className="block w-full px-3 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 pb-safe">
          <button type="button" onClick={onClose} className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Batal
          </button>
          <button type="submit" form="tx-form" className="px-4 py-3 sm:py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Simpan Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}
