import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { getLocales } from 'expo-localization';
import { Transaction, TransactionInput, PaymentMode, BalanceSummary } from '../types';
import * as db from '../database/db';
import { initI18n } from '../i18n';
import i18n from '../i18n';

function getDeviceLanguage(): 'en' | 'hi' {
  try {
    const locales = getLocales();
    const locale = locales[0]?.languageCode || 'en';
    return locale.startsWith('hi') ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

function getDeviceTheme(): 'dark' | 'light' {
  try {
    const scheme = Appearance.getColorScheme();
    return scheme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

interface AppState {
  transactions: Transaction[];
  balance: BalanceSummary;
  isLoading: boolean;
  filterPaymentMode: PaymentMode | 'all';
  filterCategory: string | 'all';
  pendingTagFilter: string | null;
  language: 'en' | 'hi';
  userName: string;
  theme: 'dark' | 'light';
  onboarded: boolean | undefined;
  appLocked: boolean;
  lockEnabled: boolean;
  transactionSheetVisible: boolean;
  transactionSheetEditId: number | null;

  setLanguage: (lang: 'en' | 'hi') => void;
  setUserName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAppLocked: (locked: boolean) => void;
  setLockEnabled: (enabled: boolean) => void;
  loadData: () => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: number, input: TransactionInput) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  restoreTransaction: (txn: Transaction) => Promise<void>;
  setFilterPaymentMode: (mode: PaymentMode | 'all') => void;
  setFilterCategory: (cat: string | 'all') => void;
  setPendingTagFilter: (tag: string | null) => void;
  openTransactionSheet: (editId?: number) => void;
  closeTransactionSheet: () => void;
}

const defaultBalance: BalanceSummary = {
  available: 0,
  totalSpent: 0,
  totalIncome: 0,
  thisMonthSpent: 0,
  thisMonthIncome: 0,
};

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  balance: defaultBalance,
  isLoading: true,
  filterPaymentMode: 'all',
  filterCategory: 'all',
  pendingTagFilter: null,
  language: 'en',
  userName: '',
  theme: getDeviceTheme(),
  onboarded: undefined,
  appLocked: false,
  lockEnabled: false,
  transactionSheetVisible: false,
  transactionSheetEditId: null,

  setLanguage: (lang) => {
    set({ language: lang });
    void i18n.changeLanguage(lang);
    void AsyncStorage.setItem('language', lang);
  },

  setUserName: (name) => {
    set({ userName: name });
    void AsyncStorage.setItem('userName', name);
  },

  setTheme: (theme) => {
    set({ theme });
    void AsyncStorage.setItem('theme', theme);
  },

  setAppLocked: (locked) => set({ appLocked: locked }),
  setLockEnabled: (enabled) => {
    set({ lockEnabled: enabled });
    void AsyncStorage.setItem('lockEnabled', enabled ? 'true' : 'false');
  },

  loadData: async () => {
    try {
      await db.initDatabase();
      const [transactions, balance] = await Promise.all([
        db.getAllTransactions(),
        db.getBalanceSummary(),
      ]);
      set({ transactions, balance, isLoading: false });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ isLoading: false });
    }
  },

  addTransaction: async (input) => {
    await db.initDatabase();
    await db.addTransaction(input);
    await get().loadData();
  },

  updateTransaction: async (id, input) => {
    await db.initDatabase();
    await db.updateTransaction(id, input);
    await get().loadData();
  },

  deleteTransaction: async (id) => {
    await db.deleteTransaction(id);
    await get().loadData();
  },

  restoreTransaction: async (txn) => {
    await db.addTransaction({
      amount: txn.amount,
      type: txn.type,
      category: txn.category,
      payment_mode: txn.payment_mode,
      note: txn.note,
      tags: txn.tags,
      date: txn.date,
      sms_hash: txn.sms_hash,
    });
    await get().loadData();
  },

  setFilterPaymentMode: (mode) => set({ filterPaymentMode: mode }),
  setFilterCategory: (cat) => set({ filterCategory: cat }),
  setPendingTagFilter: (tag) => set({ pendingTagFilter: tag }),

  openTransactionSheet: (editId) =>
    set({
      transactionSheetVisible: true,
      transactionSheetEditId: editId ?? null,
    }),

  closeTransactionSheet: () =>
    set({
      transactionSheetVisible: false,
      transactionSheetEditId: null,
    }),
}));

export async function initStore() {
  try {
    await initI18n();
    await db.initDatabase();
  } catch (e) {
    console.error('[initStore] init error:', e);
  }

  const [savedLang, savedName, savedTheme, isOnboarded, lockEnabled] = await Promise.all([
    AsyncStorage.getItem('language'),
    AsyncStorage.getItem('userName'),
    AsyncStorage.getItem('theme'),
    AsyncStorage.getItem('onboarded'),
    AsyncStorage.getItem('lockEnabled'),
  ]);

  const defaultLang = getDeviceLanguage();
  const defaultTheme = getDeviceTheme();

  if (!isOnboarded) {
    useStore.setState({
      language: defaultLang,
      userName: '',
      theme: defaultTheme,
      onboarded: false,
      lockEnabled: lockEnabled === 'true',
      isLoading: false,
    });
    return;
  }

  const lang = (savedLang as 'en' | 'hi') || defaultLang;
  // Use saved theme only if user explicitly chose one in Settings; otherwise follow device
  const theme = savedTheme ? (savedTheme as 'dark' | 'light') : defaultTheme;

  useStore.setState({
    language: lang,
    userName: savedName || '',
    theme,
    onboarded: true,
    lockEnabled: lockEnabled === 'true',
    appLocked: lockEnabled === 'true',
    isLoading: true,
  });

  if (lang) void i18n.changeLanguage(lang);
}

/** Load transactions after splash/navigation (deferred from initStore). */
export async function hydrateAppData() {
  const { onboarded, isLoading } = useStore.getState();
  if (!onboarded || !isLoading) return;
  await useStore.getState().loadData();
}

export function syncThemeWithDevice(): void {
  const scheme = Appearance.getColorScheme();
  const deviceTheme = scheme === 'light' ? 'light' : 'dark';
  useStore.setState({ theme: deviceTheme });
}

export async function applyDeviceThemeIfNoPreference(): Promise<void> {
  const savedTheme = await AsyncStorage.getItem('theme');
  if (!savedTheme) {
    syncThemeWithDevice();
  }
}
