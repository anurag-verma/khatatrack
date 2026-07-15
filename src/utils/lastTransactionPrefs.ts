import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentMode, TransactionType } from '../types';

const KEY = 'lastTransactionPrefs';

type Prefs = {
  type: TransactionType;
  category: string;
  paymentMode: PaymentMode;
};

const defaults: Prefs = {
  type: 'expense',
  category: 'food',
  paymentMode: 'UPI',
};

export async function getLastTransactionPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      category: typeof parsed.category === 'string' ? parsed.category : defaults.category,
      paymentMode: (parsed.paymentMode as PaymentMode) || defaults.paymentMode,
    };
  } catch {
    return { ...defaults };
  }
}

export async function setLastTransactionPrefs(prefs: Prefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
