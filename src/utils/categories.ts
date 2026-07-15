import { Category } from '../types';

export const expenseCategories: Category[] = [
  { id: 'food', name: 'Food', nameHi: 'खाना', icon: 'UtensilsCrossed', color: '#ef4444' },
  { id: 'groceries', name: 'Groceries', nameHi: 'किराना', icon: 'ShoppingCart', color: '#f97316' },
  { id: 'rent', name: 'Rent', nameHi: 'किराया', icon: 'Home', color: '#8b5cf6' },
  { id: 'fuel', name: 'Fuel', nameHi: 'ईंधन', icon: 'Fuel', color: '#06b6d4' },
  { id: 'tea', name: 'Tea/Chai', nameHi: 'चाय', icon: 'Coffee', color: '#92400e' },
  { id: 'utilities', name: 'Utilities', nameHi: 'बिजली-पानी', icon: 'Zap', color: '#eab308' },
  { id: 'transport', name: 'Transport', nameHi: 'यातायात', icon: 'Bus', color: '#3b82f6' },
  { id: 'entertainment', name: 'Entertainment', nameHi: 'मनोरंजन', icon: 'Film', color: '#ec4899' },
  { id: 'health', name: 'Health', nameHi: 'स्वास्थ्य', icon: 'Heart', color: '#22c55e' },
  { id: 'shopping', name: 'Shopping', nameHi: 'खरीदारी', icon: 'ShoppingBag', color: '#a855f7' },
  { id: 'education', name: 'Education', nameHi: 'शिक्षा', icon: 'BookOpen', color: '#6366f1' },
  { id: 'other', name: 'Other', nameHi: 'अन्य', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const incomeCategories: Category[] = [
  { id: 'salary', name: 'Salary', nameHi: 'वेतन', icon: 'Briefcase', color: '#22c55e' },
  { id: 'freelance', name: 'Freelance', nameHi: 'फ्रीलांस', icon: 'Laptop', color: '#06b6d4' },
  { id: 'investment', name: 'Investment', nameHi: 'निवेश', icon: 'TrendingUp', color: '#8b5cf6' },
  { id: 'gift', name: 'Gift', nameHi: 'उपहार', icon: 'Gift', color: '#ec4899' },
  { id: 'other', name: 'Other', nameHi: 'अन्य', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const paymentModes = ['UPI', 'Cash', 'Bank', 'Credit Card'] as const;

export const paymentModeColors: Record<string, string> = {
  UPI: '#00baf2',
  Cash: '#22c55e',
  Bank: '#8b5cf6',
  'Credit Card': '#ef4444',
};

export const categoryEmojis: Record<string, string> = {
  food: '🍔', groceries: '🛒', rent: '🏠', fuel: '⛽',
  tea: '☕', utilities: '💡', transport: '🚌', entertainment: '🎬',
  health: '💊', shopping: '🛍️', education: '📚', other: '📦',
  salary: '💰', freelance: '💻', investment: '📈', gift: '🎁',
};

export function getCategoryById(id: string, type: 'income' | 'expense'): Category | undefined {
  const list = type === 'expense' ? expenseCategories : incomeCategories;
  return list.find((c) => c.id === id);
}

export function getCategoryMeta(
  id: string,
  type: 'income' | 'expense',
  language: 'en' | 'hi' = 'en'
) {
  const cat = getCategoryById(id, type);
  return {
    id,
    label: language === 'hi' ? cat?.nameHi ?? id : cat?.name ?? id,
    emoji: categoryEmojis[id] ?? '📦',
    color: cat?.color ?? '#6b7280',
  };
}

export function getAllCategories(type: 'income' | 'expense', language: 'en' | 'hi' = 'en') {
  const list = type === 'expense' ? expenseCategories : incomeCategories;
  return list.map((c) => getCategoryMeta(c.id, type, language));
}
