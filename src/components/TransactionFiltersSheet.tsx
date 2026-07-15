import { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../store/theme';
import FilterChip from './ui/FilterChip';
import { paymentModes } from '../utils/categories';
import { getMonthLabels } from '../utils/months';
import {
  DatePreset,
  SortOption,
  TransactionFilterState,
  getAvailableYears,
  getUsedCategories,
} from '../utils/transactionFilters';
import { getCategoryMeta } from '../utils/categories';
import { Transaction } from '../types';
import { formatTagLabel, getAllTagsFromTransactions } from '../utils/tags';

type Props = {
  visible: boolean;
  filters: TransactionFilterState;
  transactions: Transaction[];
  language: 'en' | 'hi';
  onChange: (patch: Partial<TransactionFilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
};

function FilterSection({ title, children, theme }: { title: string; children: ReactNode; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function TransactionFiltersSheet({
  visible,
  filters,
  transactions,
  language,
  onChange,
  onApply,
  onClear,
  onClose,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const MONTHS = getMonthLabels(tr, language);

  const allTags = getAllTagsFromTransactions(transactions);
  const availableYears = getAvailableYears(transactions);
  const usedCategories = getUsedCategories(transactions);

  const datePresets: { key: DatePreset; label: string }[] = [
    { key: 'all_time', label: tr('filterAllTime') },
    { key: 'this_month', label: tr('filterThisMonth') },
    { key: 'last_month', label: tr('filterLastMonth') },
    { key: 'this_year', label: tr('filterThisYear') },
    { key: 'custom', label: tr('filterCustomDate') },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: tr('sortNewest') },
    { key: 'oldest', label: tr('sortOldest') },
    { key: 'amount_desc', label: tr('sortAmountHigh') },
    { key: 'amount_asc', label: tr('sortAmountLow') },
  ];

  const setDatePreset = (preset: DatePreset) => {
    const patch: Partial<TransactionFilterState> = { datePreset: preset };
    if (preset === 'custom') {
      patch.filterYear = new Date().getFullYear();
      patch.filterMonth = new Date().getMonth();
    } else if (preset !== 'all_time') {
      patch.filterMonth = null;
    }
    onChange(patch);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: t.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{tr('filters')}</Text>
            <TouchableOpacity onPress={onClear} accessibilityRole="button">
              <Text style={[styles.clearLink, { color: t.upiBlue }]}>{tr('clearFilters')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} bounces={false}>
            <FilterSection title={tr('filterPeriod')} theme={t}>
              <View style={styles.chipWrap}>
                {datePresets.map(({ key, label }) => (
                  <FilterChip
                    key={key}
                    label={label}
                    active={filters.datePreset === key}
                    onPress={() => setDatePreset(key)}
                  />
                ))}
              </View>
              {filters.datePreset === 'custom' && (
                <View style={styles.customDate}>
                  <Text style={[styles.subLabel, { color: t.textMuted }]}>{tr('filterYear')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {availableYears.map((y) => (
                        <FilterChip
                          key={y}
                          label={String(y)}
                          active={filters.filterYear === y}
                          onPress={() => onChange({ filterYear: y })}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={[styles.subLabel, { color: t.textMuted, marginTop: 10 }]}>{tr('filterMonth')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      <FilterChip
                        label={tr('all')}
                        active={filters.filterMonth === null}
                        onPress={() => onChange({ filterMonth: null })}
                      />
                      {MONTHS.map((m, i) => (
                        <FilterChip
                          key={i}
                          label={m}
                          active={filters.filterMonth === i}
                          onPress={() => onChange({ filterMonth: filters.filterMonth === i ? null : i })}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </FilterSection>

            <FilterSection title={tr('filterCategory')} theme={t}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <FilterChip
                    label={tr('all')}
                    active={filters.filterCategory === 'all'}
                    onPress={() => onChange({ filterCategory: 'all' })}
                  />
                  {usedCategories.map(({ id, type }) => {
                    const { label, emoji } = getCategoryMeta(id, type, language);
                    return (
                      <FilterChip
                        key={id}
                        label={`${emoji} ${label}`}
                        active={filters.filterCategory === id}
                        onPress={() => onChange({ filterCategory: filters.filterCategory === id ? 'all' : id })}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            </FilterSection>

            <FilterSection title={tr('filterPayment')} theme={t}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <FilterChip
                    label={tr('all')}
                    active={filters.filterPayment === 'all'}
                    onPress={() => onChange({ filterPayment: 'all' })}
                  />
                  {paymentModes.map((mode) => (
                    <FilterChip
                      key={mode}
                      label={mode}
                      active={filters.filterPayment === mode}
                      onPress={() => onChange({ filterPayment: filters.filterPayment === mode ? 'all' : mode })}
                    />
                  ))}
                </View>
              </ScrollView>
            </FilterSection>

            <FilterSection title={tr('filterTags')} theme={t}>
              {allTags.length > 0 ? (
                <View style={styles.chipWrap}>
                  {allTags.map((tag) => (
                    <FilterChip
                      key={tag}
                      label={formatTagLabel(tag)}
                      active={filters.selectedTags.some((z) => z === tag)}
                      onPress={() =>
                        onChange({
                          selectedTags: filters.selectedTags.includes(tag)
                            ? filters.selectedTags.filter((z) => z !== tag)
                            : [...filters.selectedTags, tag],
                        })
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyTagsHint, { color: t.textMuted }]}>{tr('noTagsYet')}</Text>
              )}
            </FilterSection>

            <FilterSection title={tr('sortBy')} theme={t}>
              <View style={styles.chipWrap}>
                {sortOptions.map(({ key, label }) => (
                  <FilterChip
                    key={key}
                    label={label}
                    active={filters.sort === key}
                    onPress={() => onChange({ sort: key })}
                  />
                ))}
              </View>
            </FilterSection>
          </ScrollView>

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: t.upiBlue }]}
            onPress={onApply}
            accessibilityRole="button"
          >
            <Text style={styles.applyBtnText}>{tr('applyFilters')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  clearLink: { fontSize: 14, fontWeight: '600' },
  scroll: { maxHeight: 420 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  customDate: { marginTop: 12 },
  subLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  applyBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyTagsHint: { fontSize: 13, lineHeight: 20 },
});
