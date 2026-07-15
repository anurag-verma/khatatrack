export type TransactionType = 'income' | 'expense';

export type PaymentMode = 'UPI' | 'Cash' | 'Bank' | 'Credit Card';

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category: string;
  payment_mode: PaymentMode;
  note: string;
  tags: string[];
  date: string;
  sms_hash?: string | null;
}

export type TransactionInput = Omit<Transaction, 'id'>;

export interface Category {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  color: string;
}

export interface ChartDataItem {
  value: number;
  label: string;
  color: string;
  text?: string;
}

export interface BalanceSummary {
  available: number;
  totalSpent: number;
  totalIncome: number;
  thisMonthSpent: number;
  thisMonthIncome: number;
}

export interface Budget {
  id: number;
  category: string;
  amount: number;
  month: string;
}

export interface RecurringReminder {
  id: number;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment_mode: PaymentMode;
  day_of_month: number;
  enabled: number;
}

export interface SplitGroup {
  id: number;
  title: string;
  total_amount: number;
  created_at: string;
}

export interface SplitMember {
  id: number;
  group_id: number;
  name: string;
  share_amount: number;
  paid: number;
}

export interface ParsedSmsItem {
  amount: number;
  type: TransactionType;
  payment_mode: PaymentMode;
  note: string;
  category: string;
  confidence: number;
  smsHash: string;
  rawText: string;
  selected?: boolean;
}
