import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import FilterChip from '../ui/FilterChip';
import SectionCard from '../ui/SectionCard';
import { useTheme } from '../../store/theme';
import {
  AnalyticsPeriod,
  CustomDateRange,
  currentMonthKey,
  defaultCustomRange,
  formatCustomRangeLabel,
  formatMonthLabel,
  formatThreeMonthChipLabel,
  lastMonthKey,
  normalizeCustomRange,
} from '../../utils/analyticsPeriod';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  customRange: CustomDateRange;
  onCustomRangeChange: (range: CustomDateRange) => void;
};

type PickerField = 'start' | 'end' | null;

export default function AnalyticsPeriodFilter({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const scrollRef = useRef<ScrollView>(null);

  const chips = useMemo(
    () => [
      { id: 'month' as const, label: formatMonthLabel(currentMonthKey(), locale) },
      { id: 'lastMonth' as const, label: formatMonthLabel(lastMonthKey(), locale) },
      { id: '3months' as const, label: formatThreeMonthChipLabel(locale) },
      { id: 'all' as const, label: tr('analyticsPeriodAll') },
      { id: 'custom' as const, label: tr('filterCustomDate') },
    ],
    [locale, tr],
  );

  useEffect(() => {
    if (period !== 'custom') return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [period]);

  const handlePeriodPress = (id: AnalyticsPeriod) => {
    if (id === 'custom' && period !== 'custom') {
      onCustomRangeChange(defaultCustomRange());
    }
    onPeriodChange(id);
    setPickerField(null);
  };

  const onDateChange = (field: 'start' | 'end', event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerField(null);
    if (event.type === 'dismissed' || !selected) return;
    const next = normalizeCustomRange(
      field === 'start' ? selected : customRange.start,
      field === 'end' ? selected : customRange.end,
    );
    onCustomRangeChange(next);
  };

  const dateFmt = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.periodScroll}
        contentContainerStyle={styles.periodRow}
      >
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            active={period === chip.id}
            onPress={() => handlePeriodPress(chip.id)}
          />
        ))}
      </ScrollView>

      {period === '3months' && (
        <Text style={[styles.hint, { color: t.textMuted }]}>
          {tr('analytics3MonthsHint', { range: formatThreeMonthChipLabel(locale) })}
        </Text>
      )}

      {period === 'custom' && (
        <SectionCard style={styles.customCard}>
          <Text style={[styles.customTitle, { color: t.textMuted }]}>{tr('analyticsCustomRange')}</Text>
          <Text style={[styles.customSummary, { color: t.textSecondary }]}>
            {formatCustomRangeLabel(customRange.start, customRange.end, locale)}
          </Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: t.inputBg }]}
              onPress={() => setPickerField('start')}
              accessibilityRole="button"
              accessibilityLabel={tr('analyticsDateFrom')}
            >
              <Calendar size={16} color={t.upiBlue} />
              <View>
                <Text style={[styles.dateLabel, { color: t.textMuted }]}>{tr('analyticsDateFrom')}</Text>
                <Text style={[styles.dateValue, { color: t.text }]}>{dateFmt(customRange.start)}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: t.inputBg }]}
              onPress={() => setPickerField('end')}
              accessibilityRole="button"
              accessibilityLabel={tr('analyticsDateTo')}
            >
              <Calendar size={16} color={t.upiBlue} />
              <View>
                <Text style={[styles.dateLabel, { color: t.textMuted }]}>{tr('analyticsDateTo')}</Text>
                <Text style={[styles.dateValue, { color: t.text }]}>{dateFmt(customRange.end)}</Text>
              </View>
            </TouchableOpacity>
          </View>
          {pickerField === 'start' && (
            <DateTimePicker
              value={customRange.start}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => onDateChange('start', e, d)}
              maximumDate={customRange.end}
            />
          )}
          {pickerField === 'end' && (
            <DateTimePicker
              value={customRange.end}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => onDateChange('end', e, d)}
              minimumDate={customRange.start}
              maximumDate={new Date()}
            />
          )}
          {Platform.OS === 'ios' && pickerField !== null && (
            <TouchableOpacity onPress={() => setPickerField(null)} style={styles.doneBtn}>
              <Text style={{ color: t.upiBlue, fontWeight: '600' }}>{tr('done')}</Text>
            </TouchableOpacity>
          )}
        </SectionCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  periodScroll: { flexGrow: 0 },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 20,
    alignItems: 'center',
  },
  hint: { fontSize: 12, paddingHorizontal: 16, marginTop: 6 },
  customCard: { marginHorizontal: 16, marginTop: 10 },
  customTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  customSummary: { fontSize: 13, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  dateLabel: { fontSize: 11, marginBottom: 2 },
  dateValue: { fontSize: 13, fontWeight: '600' },
  doneBtn: { alignItems: 'flex-end', marginTop: 8 },
});
