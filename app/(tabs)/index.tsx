import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Wallet, ScanLine, TrendingDown, TrendingUp, Receipt, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Logo from '../../src/components/Logo';
import ConfirmModal from '../../src/components/ConfirmModal';
import UndoSnackbar from '../../src/components/UndoSnackbar';
import TransactionListItem from '../../src/components/TransactionListItem';
import TransactionDetailSheet from '../../src/components/TransactionDetailSheet';
import FilterChip from '../../src/components/ui/FilterChip';
import EmptyState from '../../src/components/ui/EmptyState';
import SectionCard from '../../src/components/ui/SectionCard';
import BudgetProgressRow from '../../src/components/BudgetProgressRow';
import RecurringAlerts from '../../src/components/home/RecurringAlerts';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/store/theme';
import { useScreenInsets } from '../../src/hooks/useScreenInsets';
import { formatIndianCurrency, formatIndianCurrencyShort } from '../../src/utils/currency';
import { paymentModes, getCategoryMeta } from '../../src/utils/categories';
import { Transaction, Budget, RecurringReminder } from '../../src/types';
import { formatTagLabel, getAllTagsFromTransactions, normalizeTag } from '../../src/utils/tags';
import { budgetUrgencyScore } from '../../src/utils/budgetProgress';
import {
  getBudgets,
  getExpenseByCategoryForMonth,
  getTotalExpenseForMonth,
  getRecurringReminders,
} from '../../src/database/db';

function BalanceCard({ title, amount, color, icon, large }: { title: string; amount: string; color: string; icon: React.ReactNode; large?: boolean }) {
  const t = useTheme();
  return (
    <SectionCard style={large ? styles.cardLarge : styles.card} elevated={!large}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: t.textSecondary }]}>{title}</Text>
        {icon}
      </View>
      <Text style={[styles.cardAmount, large && styles.cardAmountLarge, { color }]}>{amount}</Text>
      {large && <View style={[styles.cardAccent, { backgroundColor: color }]} />}
    </SectionCard>
  );
}

function pickDashboardBudgets(budgets: Budget[], spent: Record<string, number>) {
  const scored = budgets
    .map((b) => ({
      budget: b,
      used: spent[b.category] || 0,
      score: budgetUrgencyScore(spent[b.category] || 0, b.amount),
    }))
    .sort((a, b) => b.score - a.score);

  const overall = scored.find((x) => x.budget.category === 'all');
  const others = scored.filter((x) => x.budget.category !== 'all').slice(0, overall ? 2 : 3);
  return overall ? [overall, ...others] : others.slice(0, 3);
}

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { tabContentPadding, top } = useScreenInsets();
  const { t: tr, i18n } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deletedTxn, setDeletedTxn] = useState<Transaction | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [homeTagFilter, setHomeTagFilter] = useState<string | null>(null);
  const [budgetRows, setBudgetRows] = useState<{ budget: Budget; used: number }[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringReminder[]>([]);

  const month = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const transactions = useStore((s) => s.transactions);
  const balance = useStore((s) => s.balance);
  const loadData = useStore((s) => s.loadData);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);
  const filterPaymentMode = useStore((s) => s.filterPaymentMode);
  const setFilterPaymentMode = useStore((s) => s.setFilterPaymentMode);
  const userName = useStore((s) => s.userName);
  const language = useStore((s) => s.language);

  const loadHomeExtras = useCallback(async () => {
    const [budgets, expenses, total, recurring] = await Promise.all([
      getBudgets(month),
      getExpenseByCategoryForMonth(month),
      getTotalExpenseForMonth(month),
      getRecurringReminders(),
    ]);
    const spent: Record<string, number> = {};
    expenses.forEach((e) => {
      spent[e.category] = e.total;
    });
    spent.all = total;
    setBudgetRows(pickDashboardBudgets(budgets, spent).map((x) => ({ budget: x.budget, used: x.used })));
    setRecurringItems(recurring);
  }, [month]);

  useEffect(() => {
    void loadData();
    void loadHomeExtras();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadHomeExtras()]);
    setRefreshing(false);
  }, [loadData, loadHomeExtras]);

  const confirmDelete = () => {
    if (deleteTarget !== null) {
      const txn = transactions.find((x) => x.id === deleteTarget);
      if (txn) {
        setDeletedTxn(txn);
        deleteTransaction(deleteTarget);
        setShowUndo(true);
      }
      setDeleteTarget(null);
    }
  };

  const handleUndo = async () => {
    if (deletedTxn) {
      await restoreTransaction(deletedTxn);
      setDeletedTxn(null);
    }
    setShowUndo(false);
  };

  const openTransactionSheet = useStore((s) => s.openTransactionSheet);
  const setPendingTagFilter = useStore((s) => s.setPendingTagFilter);

  const allTags = useMemo(() => getAllTagsFromTransactions(transactions), [transactions]);

  const handleEdit = (txn: Transaction) => {
    setSelectedTxn(null);
    openTransactionSheet(txn.id);
  };

  const handleDeleteRequest = (txn: Transaction) => {
    setSelectedTxn(null);
    setDeleteTarget(txn.id);
  };

  const handleScanSms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sms-review');
  };

  const filteredTxns = useMemo(() => {
    let list =
      filterPaymentMode === 'all'
        ? transactions
        : transactions.filter((tx) => tx.payment_mode === filterPaymentMode);
    if (homeTagFilter) {
      list = list.filter((tx) =>
        tx.tags.some((tag) => normalizeTag(tag) === homeTagFilter),
      );
    }
    return list;
  }, [transactions, filterPaymentMode, homeTagFilter]);

  const handleTagPress = useCallback(
    (tag: string) => {
      setSelectedTxn(null);
      setPendingTagFilter(tag);
      router.navigate('/(tabs)/transactions');
    },
    [router, setPendingTagFilter],
  );

  const lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
  const today = new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: top + 10, paddingBottom: tabContentPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.upiBlue} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Logo size="default" />
            <TouchableOpacity
              onPress={handleScanSms}
              style={[styles.scanButton, { backgroundColor: t.card }]}
              accessibilityRole="button"
              accessibilityLabel={tr('scanSms')}
            >
              <ScanLine size={16} color={t.upiBlue} />
              <Text style={[styles.scanButtonText, { color: t.upiBlue }]}>{tr('scanSms')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerWelcome, { color: t.text }]}>
            {userName ? tr('welcomeUser', { name: userName }) : tr('welcome')}
          </Text>
          <Text style={[styles.headerDate, { color: t.textMuted }]}>{today}</Text>
        </View>

        <RecurringAlerts items={recurringItems} onPress={() => router.push('/recurring')} />

        <View style={styles.cardContainer}>
          <BalanceCard title={tr('availableBalance')} amount={formatIndianCurrency(balance.available)} color={balance.available >= 0 ? t.incomeGreen : t.expenseRed} icon={<Wallet size={22} color={t.incomeGreen} />} large />
          <View style={styles.cardRow}>
            <BalanceCard title={tr('thisMonthIncome')} amount={formatIndianCurrencyShort(balance.thisMonthIncome)} color={t.incomeGreen} icon={<TrendingUp size={18} color={t.incomeGreen} />} />
            <BalanceCard title={tr('thisMonthSpent')} amount={formatIndianCurrencyShort(balance.thisMonthSpent)} color={t.expenseRed} icon={<TrendingDown size={18} color={t.expenseRed} />} />
          </View>
        </View>

        <View style={styles.budgetSection}>
          <View style={styles.budgetSectionHeader}>
            <Text style={[styles.sectionTitleInline, { color: t.text }]}>{tr('budgetAtAGlance')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/budgets')}
              style={styles.seeAllBtn}
              accessibilityRole="button"
              accessibilityLabel={tr('seeAllBudgets')}
            >
              <Text style={[styles.seeAllText, { color: t.upiBlue }]}>{tr('seeAllBudgets')}</Text>
              <ChevronRight size={16} color={t.upiBlue} />
            </TouchableOpacity>
          </View>
          {budgetRows.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/budgets')} activeOpacity={0.85}>
              <SectionCard>
                <Text style={[styles.budgetEmptyText, { color: t.textMuted }]}>{tr('emptyBudgetsBody')}</Text>
                <Text style={[styles.setBudgetCta, { color: t.upiBlue }]}>{tr('setBudgetCta')} →</Text>
              </SectionCard>
            </TouchableOpacity>
          ) : (
            <SectionCard>
              {budgetRows.map(({ budget, used }) => {
                const meta =
                  budget.category === 'all'
                    ? { label: tr('overall'), emoji: '📊' }
                    : getCategoryMeta(budget.category, 'expense', language);
                return (
                  <BudgetProgressRow
                    key={budget.id}
                    label={meta.label}
                    emoji={meta.emoji}
                    used={used}
                    budget={budget.amount}
                    compact
                  />
                );
              })}
            </SectionCard>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {['all', ...paymentModes].map((mode) => (
              <FilterChip
                key={mode}
                label={mode === 'all' ? tr('all') : mode}
                active={filterPaymentMode === mode}
                onPress={() => setFilterPaymentMode(mode as typeof filterPaymentMode)}
              />
            ))}
          </View>
        </ScrollView>

        {allTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilterScroll}>
            <View style={styles.filterRow}>
              <FilterChip
                label={tr('all')}
                active={homeTagFilter === null}
                onPress={() => setHomeTagFilter(null)}
              />
              {allTags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={formatTagLabel(tag)}
                  active={homeTagFilter === tag}
                  onPress={() => setHomeTagFilter(homeTagFilter === tag ? null : tag)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={[styles.sectionTitle, { color: t.text }]}>{tr('recentTransactions')}</Text>
        {filteredTxns.length === 0 ? (
          <EmptyState
            icon={<Receipt size={40} color={t.textMuted} />}
            title={tr('emptyHomeTitle')}
            body={tr('emptyHomeBody')}
            actionLabel={tr('addTransaction')}
            onAction={() => openTransactionSheet()}
          />
        ) : (
          filteredTxns.slice(0, 20).map((txn) => (
            <TransactionListItem
              key={txn.id}
              txn={txn}
              language={language}
              onPress={setSelectedTxn}
              onTagPress={handleTagPress}
            />
          ))
        )}
      </ScrollView>

      <TransactionDetailSheet
        visible={selectedTxn !== null}
        transaction={selectedTxn}
        language={language}
        onClose={() => setSelectedTxn(null)}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onTagPress={handleTagPress}
      />

      <ConfirmModal
        visible={deleteTarget !== null}
        title={tr('delete') + '?'}
        message={tr('deleteConfirmMessage')}
        confirmText={tr('delete')}
        cancelText={tr('cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <UndoSnackbar visible={showUndo} message={tr('deleted')} undoLabel={tr('undo')} onUndo={handleUndo} onDismiss={() => { setShowUndo(false); setDeletedTxn(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerWelcome: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  headerDate: { fontSize: 12 },
  scanButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  scanButtonText: { fontSize: 12 },
  cardContainer: { paddingHorizontal: 16, gap: 12 },
  card: { flex: 1 },
  cardLarge: { flex: 0 },
  cardRow: { flexDirection: 'row', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '500' },
  cardAmount: { fontSize: 24, fontWeight: 'bold' },
  cardAmountLarge: { fontSize: 36 },
  cardAccent: { height: 4, width: 64, borderRadius: 2, marginTop: 12 },
  budgetSection: { paddingHorizontal: 16, marginBottom: 4, marginTop:8 },
  budgetSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitleInline: { fontSize: 16, fontWeight: '700' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  budgetEmptyText: { fontSize: 13, marginBottom: 6 },
  setBudgetCta: { fontSize: 13, fontWeight: '600' },
  filterScroll: { paddingVertical: 16, paddingHorizontal: 16 },
  tagFilterScroll: { paddingBottom: 8, paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
});
