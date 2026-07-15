import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, Wallet, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/store/theme';
import { useStore } from '../src/store/useStore';
import { useScreenInsets } from '../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../src/utils/currency';
import { getBudgets, setBudget, deleteBudget, getExpenseByCategoryForMonth, getTotalExpenseForMonth } from '../src/database/db';
import { Budget } from '../src/types';
import { expenseCategories, getCategoryMeta } from '../src/utils/categories';
import FilterChip from '../src/components/ui/FilterChip';
import EmptyState from '../src/components/ui/EmptyState';
import ScreenHeader from '../src/components/ui/ScreenHeader';
import ConfirmModal from '../src/components/ConfirmModal';
import PrimaryActionButton from '../src/components/ui/PrimaryActionButton';

function formatBudgetMonth(month: string, locale: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export default function BudgetsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { modalContentPadding, top } = useScreenInsets();
  const { t: tr, i18n } = useTranslation();
  const language = useStore((s) => s.language);

  const month = new Date().toISOString().slice(0, 7);
  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
  const monthLabel = formatBudgetMonth(month, locale);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('all');
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [b, expenses, total] = await Promise.all([
      getBudgets(month),
      getExpenseByCategoryForMonth(month),
      getTotalExpenseForMonth(month),
    ]);
    setBudgets(b);
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = e.total; });
    map['all'] = total;
    setSpent(map);
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setSaving(true);
    try {
      await setBudget(category, num, month);
      setAmount('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget !== null) {
      await deleteBudget(deleteTarget);
      setDeleteTarget(null);
      await load();
    }
  };

  const cats = [{ id: 'all', name: tr('overall'), nameHi: tr('overall') }, ...expenseCategories];

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={tr('cancel')}>
          <X size={24} color={t.text} />
        </TouchableOpacity>
      </View>
      <ScreenHeader title={tr('budgets')} subtitle={`${tr('setBudget')} · ${monthLabel}`} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: modalContentPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.upiBlue} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.chipRow}>
            {cats.map((c) => (
              <FilterChip
                key={c.id}
                label={c.id === 'all' ? tr('overall') : (language === 'hi' ? c.nameHi : c.name)}
                active={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder="₹"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            accessibilityLabel={tr('amount')}
          />
          <PrimaryActionButton
            label={tr('save')}
            loadingLabel={tr('saving')}
            loading={saving}
            onPress={handleSave}
            backgroundColor={t.upiBlue}
            accessibilityLabel={tr('save')}
            style={styles.saveBtn}
            compact
          />
        </View>

        {budgets.length === 0 ? (
          <EmptyState icon={<Wallet size={40} color={t.textMuted} />} title={tr('emptyBudgets')} body={tr('emptyBudgetsBody')} />
        ) : (
          budgets.map((b) => {
            const used = spent[b.category] || 0;
            const pct = b.amount > 0 ? Math.min((used / b.amount) * 100, 100) : 0;
            const over = used > b.amount;
            const left = Math.max(b.amount - used, 0);
            const meta = b.category === 'all'
              ? { label: tr('overall'), emoji: '📊', color: t.upiBlue }
              : getCategoryMeta(b.category, 'expense', language);
            const barColor = over ? t.expenseRed : pct > 80 ? '#f59e0b' : t.incomeGreen;

            return (
              <View key={b.id} style={[styles.budgetCard, { backgroundColor: t.card }]}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetTitleRow}>
                    <Text style={styles.budgetEmoji}>{meta.emoji}</Text>
                    <View>
                      <Text style={[styles.budgetCat, { color: t.text }]}>{meta.label}</Text>
                      <Text style={[styles.budgetSub, { color: t.textMuted }]}>
                        {formatIndianCurrency(used)} / {formatIndianCurrency(b.amount)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDeleteTarget(b.id)} accessibilityLabel={tr('delete')} hitSlop={8}>
                    <Trash2 size={18} color={t.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.progressBg, { backgroundColor: t.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.budgetFooter}>
                  <Text style={[styles.budgetMeta, { color: t.textSecondary }]}>
                    {tr('budgetPercentUsed', { percent: Math.round(pct) })}
                  </Text>
                  {over ? (
                    <Text style={[styles.budgetMeta, { color: t.expenseRed, fontWeight: '600' }]}>{tr('overBudget')}</Text>
                  ) : (
                    <Text style={[styles.budgetMeta, { color: t.incomeGreen }]}>
                      {tr('budgetLeft', { amount: formatIndianCurrency(left) })}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={deleteTarget !== null}
        title={tr('delete') + '?'}
        message={tr('deleteConfirmMessage')}
        confirmText={tr('delete')}
        cancelText={tr('cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16 },
  closeBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', gap: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 16, height: 48 },
  saveBtn: { paddingHorizontal: 16, minHeight: 48, minWidth: 88 },
  budgetCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  budgetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  budgetEmoji: { fontSize: 28 },
  budgetCat: { fontSize: 16, fontWeight: '600' },
  budgetSub: { fontSize: 12, marginTop: 2 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  budgetMeta: { fontSize: 12 },
});
