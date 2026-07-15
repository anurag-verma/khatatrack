import { Transaction } from '../types';
import { getCategoryMeta } from './categories';
import { normalizeTag } from './tags';

export type DatePreset = 'all_time' | 'this_month' | 'last_month' | 'this_year' | 'custom';
export type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
export type FilterType = 'all' | 'income' | 'expense';

export interface TransactionFilterState {
  search: string;
  filterType: FilterType;
  filterPayment: string;
  filterCategory: string;
  datePreset: DatePreset;
  filterYear: number;
  filterMonth: number | null;
  selectedTags: string[];
  sort: SortOption;
}

export const defaultFilters = (): TransactionFilterState => ({
  search: '',
  filterType: 'all',
  filterPayment: 'all',
  filterCategory: 'all',
  datePreset: 'all_time',
  filterYear: new Date().getFullYear(),
  filterMonth: null,
  selectedTags: [],
  sort: 'newest',
});

function matchesDatePreset(txnDate: Date, preset: DatePreset, year: number, month: number | null): boolean {
  const now = new Date();
  switch (preset) {
    case 'all_time':
      return true;
    case 'this_month':
      return txnDate.getFullYear() === now.getFullYear() && txnDate.getMonth() === now.getMonth();
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return txnDate.getFullYear() === lm.getFullYear() && txnDate.getMonth() === lm.getMonth();
    }
    case 'this_year':
      return txnDate.getFullYear() === now.getFullYear();
    case 'custom':
      if (txnDate.getFullYear() !== year) return false;
      if (month !== null && txnDate.getMonth() !== month) return false;
      return true;
    default:
      return true;
  }
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilterState): Transaction[] {
  const q = filters.search.trim().toLowerCase();

  return transactions.filter((txn) => {
    const date = new Date(txn.date);
    if (filters.filterType !== 'all' && txn.type !== filters.filterType) return false;
    if (filters.filterPayment !== 'all' && txn.payment_mode !== filters.filterPayment) return false;
    if (filters.filterCategory !== 'all' && txn.category !== filters.filterCategory) return false;
    if (!matchesDatePreset(date, filters.datePreset, filters.filterYear, filters.filterMonth)) return false;
    if (
      filters.selectedTags.length > 0 &&
      !filters.selectedTags.some((filterTag) =>
        txn.tags.some((txnTag) => {
          const a = normalizeTag(filterTag);
          const b = normalizeTag(txnTag);
          return a !== null && a === b;
        }),
      )
    ) {
      return false;
    }
    if (q) {
      const inCategory = txn.category.toLowerCase().includes(q);
      const inNote = txn.note.toLowerCase().includes(q);
      const inTags = txn.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!inCategory && !inNote && !inTags) return false;
    }
    return true;
  });
}

export function sortTransactions(transactions: Transaction[], sort: SortOption): Transaction[] {
  const copy = [...transactions];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    case 'amount_desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'amount_asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export function groupByDate(transactions: Transaction[]): { keys: string[]; grouped: Record<string, Transaction[]> } {
  const grouped = transactions.reduce((acc, txn) => {
    const date = new Date(txn.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(txn);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const keys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  return { keys, grouped };
}

export function countActiveFilters(filters: TransactionFilterState): number {
  let n = 0;
  if (filters.filterType !== 'all') n++;
  if (filters.filterPayment !== 'all') n++;
  if (filters.filterCategory !== 'all') n++;
  if (filters.datePreset !== 'all_time') n++;
  if (filters.selectedTags.length > 0) n += filters.selectedTags.length;
  if (filters.search.trim()) n++;
  if (filters.sort !== 'newest') n++;
  return n;
}

export function hasAnyFilter(filters: TransactionFilterState): boolean {
  return countActiveFilters(filters) > 0;
}

export type ActiveFilterPill = {
  id: string;
  label: string;
  onRemove: () => void;
};

export function buildActiveFilterPills(
  filters: TransactionFilterState,
  transactions: Transaction[],
  language: 'en' | 'hi',
  labels: {
    income: string;
    expense: string;
    allTime: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
    customPeriod: string;
    sortNewest: string;
    sortOldest: string;
    sortAmountHigh: string;
    sortAmountLow: string;
    monthNames: string[];
  },
  onUpdate: (patch: Partial<TransactionFilterState>) => void,
): ActiveFilterPill[] {
  const pills: ActiveFilterPill[] = [];

  if (filters.filterPayment !== 'all') {
    pills.push({
      id: 'payment',
      label: filters.filterPayment,
      onRemove: () => onUpdate({ filterPayment: 'all' }),
    });
  }

  if (filters.filterCategory !== 'all') {
    const catTxn = transactions.find((t) => t.category === filters.filterCategory);
    const catType = catTxn?.type ?? 'expense';
    const { label } = getCategoryMeta(filters.filterCategory, catType, language);
    pills.push({
      id: 'category',
      label,
      onRemove: () => onUpdate({ filterCategory: 'all' }),
    });
  }

  if (filters.datePreset !== 'all_time') {
    const presetLabels: Record<DatePreset, string> = {
      all_time: labels.allTime,
      this_month: labels.thisMonth,
      last_month: labels.lastMonth,
      this_year: labels.thisYear,
      custom:
        filters.filterMonth !== null
          ? `${labels.monthNames[filters.filterMonth]} ${filters.filterYear}`
          : String(filters.filterYear),
    };
    pills.push({
      id: 'date',
      label: presetLabels[filters.datePreset],
      onRemove: () => onUpdate({ datePreset: 'all_time', filterMonth: null }),
    });
  }

  if (filters.sort !== 'newest') {
    const sortLabels: Record<SortOption, string> = {
      newest: labels.sortNewest,
      oldest: labels.sortOldest,
      amount_desc: labels.sortAmountHigh,
      amount_asc: labels.sortAmountLow,
    };
    pills.push({
      id: 'sort',
      label: sortLabels[filters.sort],
      onRemove: () => onUpdate({ sort: 'newest' }),
    });
  }

  return pills;
}

export function getUsedCategories(transactions: Transaction[]): { id: string; type: 'income' | 'expense' }[] {
  const seen = new Map<string, 'income' | 'expense'>();
  for (const txn of transactions) {
    if (!seen.has(txn.category)) seen.set(txn.category, txn.type);
  }
  return Array.from(seen.entries())
    .map(([id, type]) => ({ id, type }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getAvailableYears(transactions: Transaction[]): number[] {
  const years = Array.from(new Set(transactions.map((z) => new Date(z.date).getFullYear())));
  if (years.length === 0) years.push(new Date().getFullYear());
  return [...new Set([new Date().getFullYear(), ...years])].sort((a, b) => b - a);
}
