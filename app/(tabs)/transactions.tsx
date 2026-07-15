import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ListX, X } from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/store/theme';
import { useScreenInsets } from '../../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../../src/utils/currency';
import ConfirmModal from '../../src/components/ConfirmModal';
import UndoSnackbar from '../../src/components/UndoSnackbar';
import TransactionListItem from '../../src/components/TransactionListItem';
import TransactionDetailSheet from '../../src/components/TransactionDetailSheet';
import TransactionFiltersSheet from '../../src/components/TransactionFiltersSheet';
import FilterChip from '../../src/components/ui/FilterChip';
import ActiveFilterPill from '../../src/components/ui/ActiveFilterPill';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import EmptyState from '../../src/components/ui/EmptyState';
import { Transaction } from '../../src/types';
import {
  defaultFilters,
  filterTransactions,
  sortTransactions,
  groupByDate,
  countActiveFilters,
  hasAnyFilter,
  buildActiveFilterPills,
  TransactionFilterState,
  FilterType,
} from '../../src/utils/transactionFilters';
import { getMonthLabels } from '../../src/utils/months';

export default function TransactionsScreen() {
  const t = useTheme();
  const { tabContentPadding, top } = useScreenInsets();
  const { t: tr } = useTranslation();
  const transactions = useStore((s) => s.transactions);
  const setPendingTagFilter = useStore((s) => s.setPendingTagFilter);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);
  const language = useStore((s) => s.language);
  const MONTHS = getMonthLabels(tr, language);

  const [filters, setFilters] = useState<TransactionFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<TransactionFilterState>(defaultFilters);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletedTxn, setDeletedTxn] = useState<Transaction | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const updateFilters = useCallback((patch: Partial<TransactionFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateDraft = useCallback((patch: Partial<TransactionFilterState>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setShowFilterSheet(false);
  };

  const clearFilters = () => {
    const cleared = defaultFilters();
    setFilters(cleared);
    setDraftFilters(cleared);
  };

  const setTypeQuick = (type: FilterType) => {
    updateFilters({ filterType: type });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      setDeletedTxn(deleteTarget);
      deleteTransaction(deleteTarget.id);
      setShowUndo(true);
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

  useFocusEffect(
    useCallback(() => {
      const tag = useStore.getState().pendingTagFilter;
      if (!tag) return;
      setPendingTagFilter(null);
      const apply = (prev: TransactionFilterState) =>
        prev.selectedTags.includes(tag) ? prev : { ...prev, selectedTags: [...prev.selectedTags, tag] };
      setFilters(apply);
      setDraftFilters(apply);
    }, [setPendingTagFilter]),
  );

  const handleTagPress = useCallback((tag: string) => {
    setSelectedTxn(null);
    setFilters((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag) ? prev.selectedTags : [tag],
    }));
  }, []);

  const handleEdit = (txn: Transaction) => {
    setSelectedTxn(null);
    openTransactionSheet(txn.id);
  };

  const handleDeleteRequest = (txn: Transaction) => {
    setSelectedTxn(null);
    setDeleteTarget(txn);
  };

  const filtered = useMemo(() => {
    const matched = filterTransactions(transactions, filters);
    return sortTransactions(matched, filters.sort);
  }, [transactions, filters]);

  const { keys: sortedKeys, grouped } = useMemo(() => groupByDate(filtered), [filtered]);

  const activeFilterCount = countActiveFilters(filters);
  const filtersActive = hasAnyFilter(filters);

  const activePills = useMemo(
    () =>
      buildActiveFilterPills(filters, transactions, language, {
        income: tr('income'),
        expense: tr('expense'),
        allTime: tr('filterAllTime'),
        thisMonth: tr('filterThisMonth'),
        lastMonth: tr('filterLastMonth'),
        thisYear: tr('filterThisYear'),
        customPeriod: tr('filterCustomDate'),
        sortNewest: tr('sortNewest'),
        sortOldest: tr('sortOldest'),
        sortAmountHigh: tr('sortAmountHigh'),
        sortAmountLow: tr('sortAmountLow'),
        monthNames: MONTHS,
      }, updateFilters),
    [filters, transactions, language, tr, MONTHS, updateFilters],
  );

  return (
    <View style={[styles.container, { paddingTop: top + 10, backgroundColor: t.bg }]}>
      <ScreenHeader
        title={tr('transactions')}
        subtitle={
          filtersActive
            ? tr('filteredItemsCount', { count: filtered.length })
            : tr('itemsCount', { count: filtered.length })
        }
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: t.card, borderColor: filters.search ? t.upiBlue + '50' : 'transparent' }]}>
          <Search size={16} color={t.textMuted} />
          <TextInput
            placeholder={tr('searchPlaceholder')}
            placeholderTextColor={t.textMuted}
            value={filters.search}
            onChangeText={(text) => updateFilters({ search: text })}
            style={[styles.searchInput, { color: t.text }]}
            accessibilityLabel={tr('searchPlaceholder')}
            returnKeyType="search"
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => updateFilters({ search: '' })} accessibilityLabel={tr('cancel')} hitSlop={8}>
              <X size={16} color={t.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: showFilterSheet || activeFilterCount > 0 ? t.upiBlue : t.card }]}
          onPress={openFilterSheet}
          accessibilityRole="button"
          accessibilityLabel={tr('filters')}
        >
          <Filter size={18} color={showFilterSheet || activeFilterCount > 0 ? '#fff' : t.textMuted} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterCountBadge, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.filterCountText}>{activeFilterCount > 9 ? '9+' : activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTypeScroll}>
        <View style={styles.quickTypeRow}>
          <FilterChip
            label={tr('all')}
            active={filters.filterType === 'all'}
            onPress={() => setTypeQuick('all')}
            style={filters.filterType === 'all' ? undefined : { opacity: 0.9 }}
          />
          <FilterChip
            label={tr('income')}
            active={filters.filterType === 'income'}
            onPress={() => setTypeQuick(filters.filterType === 'income' ? 'all' : 'income')}
            style={filters.filterType === 'income' ? { backgroundColor: t.incomeGreen } : undefined}
          />
          <FilterChip
            label={tr('expense')}
            active={filters.filterType === 'expense'}
            onPress={() => setTypeQuick(filters.filterType === 'expense' ? 'all' : 'expense')}
            style={filters.filterType === 'expense' ? { backgroundColor: t.expenseRed } : undefined}
          />
        </View>
      </ScrollView>

      {(activePills.length > 0 || filters.search) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activePillsScroll}
          contentContainerStyle={styles.activePillsRow}
        >
          {filters.search ? (
            <ActiveFilterPill
              label={`"${filters.search}"`}
              onRemove={() => updateFilters({ search: '' })}
            />
          ) : null}
          {activePills.map((pill) => (
            <ActiveFilterPill key={pill.id} label={pill.label} onRemove={pill.onRemove} />
          ))}
          {filtersActive && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearAllBtn} accessibilityRole="button">
              <Text style={[styles.clearAllText, { color: t.upiBlue }]}>{tr('clearAll')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: tabContentPadding }}>
        {sortedKeys.length === 0 ? (
          <EmptyState
            icon={<ListX size={40} color={t.textMuted} />}
            title={tr('noTransactionsFound')}
            body={filtersActive ? tr('noTransactionsFiltered') : tr('emptyHomeBody')}
            actionLabel={filtersActive ? tr('clearFilters') : tr('addTransaction')}
            onAction={filtersActive ? clearFilters : () => openTransactionSheet()}
          />
        ) : (
          sortedKeys.map((dateKey) => {
            const [year, month, day] = dateKey.split('-');
            const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const dateLabel = d.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            const dayTotal = grouped[dateKey].reduce(
              (s, z) => (z.type === 'income' ? s + z.amount : s - z.amount),
              0,
            );
            return (
              <View key={dateKey}>
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateHeaderText, { color: t.textSecondary }]}>{dateLabel}</Text>
                  <Text style={[styles.dateTotal, { color: dayTotal >= 0 ? t.incomeGreen : t.expenseRed }]}>
                    {dayTotal >= 0 ? '+' : ''}
                    {formatIndianCurrency(dayTotal)}
                  </Text>
                </View>
                {grouped[dateKey].map((txn) => (
                  <TransactionListItem
                    key={txn.id}
                    txn={txn}
                    language={language}
                    showTime
                    onPress={setSelectedTxn}
                    onTagPress={handleTagPress}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <TransactionFiltersSheet
        visible={showFilterSheet}
        filters={draftFilters}
        transactions={transactions}
        language={language}
        onChange={updateDraft}
        onApply={applyFilters}
        onClear={() => setDraftFilters(defaultFilters())}
        onClose={() => setShowFilterSheet(false)}
      />

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

      <UndoSnackbar
        visible={showUndo}
        message={tr('deleted')}
        undoLabel={tr('undo')}
        onUndo={handleUndo}
        onDismiss={() => {
          setShowUndo(false);
          setDeletedTxn(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  quickTypeScroll: { marginBottom: 10, flexGrow: 0, paddingVertical: 2 },
  quickTypeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  activePillsScroll: { marginBottom: 12, flexGrow: 0, maxHeight: 36 },
  activePillsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  clearAllBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  clearAllText: { fontSize: 12, fontWeight: '700' },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  dateHeaderText: { fontSize: 12, fontWeight: '500' },
  dateTotal: { fontSize: 12, fontWeight: '600' },
});
