import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { BarChart3 } from 'lucide-react-native';

void LinearGradient;

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/store/theme';
import { useScreenInsets } from '../../src/hooks/useScreenInsets';
import { formatIndianCurrencyShort } from '../../src/utils/currency';
import { getCategoryMeta, paymentModeColors } from '../../src/utils/categories';
import {
  getExpenseByCategory,
  getExpenseByCategoryForMonth,
  getExpenseByCategoryForMonthSpan,
  getExpenseByCategoryInRange,
  getMonthlyIncomeExpense,
  getExpenseByPaymentMode,
  getExpenseByPaymentModeForMonth,
  getExpenseByPaymentModeForMonthSpan,
  getExpenseByPaymentModeInRange,
  getBudgets,
  getTotalExpenseForMonth,
  getIncomeExpenseInRange,
  getIncomeExpenseForMonth,
  getIncomeExpenseForMonthSpan,
} from '../../src/database/db';
import ScreenHeader from '../../src/components/ui/ScreenHeader';
import SectionCard from '../../src/components/ui/SectionCard';
import EmptyState from '../../src/components/ui/EmptyState';
import BudgetProgressRow from '../../src/components/BudgetProgressRow';
import AnalyticsPeriodFilter from '../../src/components/analytics/AnalyticsPeriodFilter';
import {
  AnalyticsPeriod,
  CustomDateRange,
  defaultCustomRange,
  getAnalyticsRange,
  getPeriodRangeLabel,
  filterMonthlyBarDataByRange,
} from '../../src/utils/analyticsPeriod';

async function loadBudgetRows(
  month: string,
  lang: 'en' | 'hi',
  tr: (key: string) => string,
) {
  const [budgets, expenses, total] = await Promise.all([
    getBudgets(month),
    getExpenseByCategoryForMonth(month),
    getTotalExpenseForMonth(month),
  ]);
  const spent: Record<string, number> = {};
  expenses.forEach((e) => {
    spent[e.category] = e.total;
  });
  spent.all = total;
  return budgets.map((b) => {
    const meta =
      b.category === 'all'
        ? { label: tr('overall'), emoji: '📊' }
        : getCategoryMeta(b.category, 'expense', lang);
    return {
      category: b.category,
      label: meta.label,
      emoji: meta.emoji,
      used: spent[b.category] || 0,
      budget: b.amount,
    };
  });
}

export default function AnalyticsScreen() {
  const t = useTheme();
  const { tabContentPadding, top } = useScreenInsets();
  const { t: tr, i18n } = useTranslation();
  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
  const language = useStore((s) => s.language);
  const lang = language as 'en' | 'hi';

  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [customRange, setCustomRange] = useState<CustomDateRange>(defaultCustomRange);
  const [pieData, setPieData] = useState<{ category: string; total: number }[]>([]);
  const [barData, setBarData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [paymentData, setPaymentData] = useState<{ payment_mode: string; total: number }[]>([]);
  const [budgetRows, setBudgetRows] = useState<{ category: string; label: string; emoji: string; used: number; budget: number }[]>([]);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const customRangeKey = `${customRange.start.getTime()}-${customRange.end.getTime()}`;

  const loadAnalytics = useCallback(async () => {
    const range = getAnalyticsRange(period, period === 'custom' ? customRange : undefined);
    const monthly = await getMonthlyIncomeExpense();
    setBarData(filterMonthlyBarDataByRange(monthly, range));

    if (period === 'all') {
      const [categories, payments] = await Promise.all([getExpenseByCategory(), getExpenseByPaymentMode()]);
      setPieData(categories);
      setPaymentData(payments);
      setBudgetRows([]);
      setMonthIncome(0);
      setMonthExpense(0);
      return;
    }

    if (range.showBudgets && range.month) {
      const month = range.month;
      const [categories, payments, rows, totals] = await Promise.all([
        getExpenseByCategoryForMonth(month),
        getExpenseByPaymentModeForMonth(month),
        loadBudgetRows(month, lang, tr),
        getIncomeExpenseForMonth(month),
      ]);
      setPieData(categories);
      setPaymentData(payments);
      setBudgetRows(rows);
      setMonthIncome(totals.income);
      setMonthExpense(totals.expense);
      return;
    }

    if (range.startMonth && range.endMonth) {
      const { startMonth, endMonth } = range;
      const [categories, payments, totals] = await Promise.all([
        getExpenseByCategoryForMonthSpan(startMonth, endMonth),
        getExpenseByPaymentModeForMonthSpan(startMonth, endMonth),
        getIncomeExpenseForMonthSpan(startMonth, endMonth),
      ]);
      setPieData(categories);
      setPaymentData(payments);
      setBudgetRows([]);
      setMonthIncome(totals.income);
      setMonthExpense(totals.expense);
      return;
    }

    if (range.start && range.end) {
      const [categories, payments, totals] = await Promise.all([
        getExpenseByCategoryInRange(range.start, range.end),
        getExpenseByPaymentModeInRange(range.start, range.end),
        getIncomeExpenseInRange(range.start, range.end),
      ]);
      setPieData(categories);
      setPaymentData(payments);
      setBudgetRows([]);
      setMonthIncome(totals.income);
      setMonthExpense(totals.expense);
      return;
    }

    setPieData([]);
    setPaymentData([]);
    setBudgetRows([]);
    setMonthIncome(0);
    setMonthExpense(0);
  }, [period, customRangeKey, lang, tr, customRange]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  const totalExpense = pieData.reduce((s, e) => s + e.total, 0);
  const hasAnyData = pieData.length > 0 || barData.length > 0 || paymentData.length > 0;

  const savingsRate = useMemo(() => {
    if (period === 'all' || monthIncome <= 0) return null;
    return Math.round(((monthIncome - monthExpense) / monthIncome) * 100);
  }, [period, monthIncome, monthExpense]);

  const periodLabel = useMemo(
    () =>
      getPeriodRangeLabel(
        period,
        locale,
        { allTime: tr('analyticsPeriodAll'), custom: tr('filterCustomDate') },
        customRange,
      ),
    [period, locale, tr, customRange],
  );

  const showBudgetSection = period === 'month' || period === 'lastMonth';

  const pieChartData = pieData.map((e) => {
    const meta = getCategoryMeta(e.category, 'expense', lang);
    return { value: e.total, color: meta.color, text: meta.label };
  });

  const paymentChartData = paymentData.map((e) => ({
    value: e.total,
    color: paymentModeColors[e.payment_mode] || '#6b7280',
    text: e.payment_mode,
  }));

  const maxVal = Math.max(...barData.flatMap((m) => [m.income, m.expense]), 1);
  const interleavedData = barData.flatMap((m) => [
    { value: m.income, label: m.month.slice(5), frontColor: t.incomeGreen },
    { value: m.expense, label: '', frontColor: t.expenseRed },
  ]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: t.bg }]}
      contentContainerStyle={{ paddingTop: top + 10, paddingBottom: tabContentPadding }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.upiBlue} />}
    >
      <ScreenHeader title={tr('analytics')} />

      <AnalyticsPeriodFilter
        period={period}
        onPeriodChange={setPeriod}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      {savingsRate !== null && monthIncome > 0 && (
        <SectionCard style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: t.textMuted }]}>{tr('savingsRate')}</Text>
          <Text style={[styles.summaryValue, { color: savingsRate >= 0 ? t.incomeGreen : t.expenseRed }]}>
            {savingsRate >= 0 ? '+' : ''}
            {savingsRate}%
          </Text>
        </SectionCard>
      )}

      {!hasAnyData ? (
        <EmptyState
          icon={<BarChart3 size={40} color={t.textMuted} />}
          title={tr('emptyAnalyticsPeriod', { period: periodLabel })}
          body={tr('emptyAnalyticsPeriodHint')}
        />
      ) : (
        <>
          {showBudgetSection && (
            <SectionCard style={styles.chartCard}>
              <Text style={[styles.chartTitle, { color: t.text }]}>{tr('budgetVsActual')}</Text>
              {budgetRows.length === 0 ? (
                <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('noBudgetForPeriod')}</Text>
              ) : (
                budgetRows.map((row) => (
                  <BudgetProgressRow
                    key={row.category}
                    label={row.label}
                    emoji={row.emoji}
                    used={row.used}
                    budget={row.budget}
                    compact
                  />
                ))
              )}
            </SectionCard>
          )}

          <SectionCard style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: t.text }]}>{tr('expenseBreakdown')}</Text>
            {pieData.length === 0 ? (
              <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('noTransactions')}</Text>
            ) : (
              <>
                <View style={styles.pieContainer}>
                  <PieChart
                    data={pieChartData}
                    donut
                    showText
                    textColor={t.text}
                    textSize={10}
                    radius={80}
                    innerRadius={50}
                    centerLabelComponent={() => (
                      <Text style={[styles.pieCenterText, { color: t.text }]}>{formatIndianCurrencyShort(totalExpense)}</Text>
                    )}
                  />
                </View>
                <View style={styles.pieLegend}>
                  {pieChartData.map((d, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.legendText, { color: t.textSecondary }]}>{d.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </SectionCard>

          <SectionCard style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: t.text }]}>{tr('upiVsCash')}</Text>
            {paymentData.length === 0 ? (
              <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('noTransactions')}</Text>
            ) : (
              <>
                <View style={styles.pieContainer}>
                  <PieChart
                    data={paymentChartData}
                    donut
                    radius={70}
                    innerRadius={45}
                    centerLabelComponent={() => (
                      <Text style={{ color: t.text, fontSize: 12, fontWeight: 'bold' }}>
                        {formatIndianCurrencyShort(paymentData.reduce((s, p) => s + p.total, 0))}
                      </Text>
                    )}
                  />
                </View>
                <View style={styles.pieLegend}>
                  {paymentChartData.map((d, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.legendText, { color: t.textSecondary }]}>{d.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </SectionCard>

          <SectionCard style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: t.text }]}>{tr('incomeVsExpense')}</Text>
            {barData.length === 0 ? (
              <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('noTransactions')}</Text>
            ) : (
              <>
                <BarChart
                  data={interleavedData}
                  barWidth={12}
                  spacing={4}
                  roundedTop
                  hideRules
                  yAxisThickness={0}
                  xAxisColor={t.border}
                  maxValue={maxVal * 1.3}
                  yAxisTextStyle={{ color: t.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: t.textMuted, fontSize: 9 }}
                  isAnimated
                />
                <View style={styles.barLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: t.incomeGreen }]} />
                    <Text style={[styles.legendText, { color: t.textSecondary }]}>{tr('kamai')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: t.expenseRed }]} />
                    <Text style={[styles.legendText, { color: t.textSecondary }]}>{tr('kharcha')}</Text>
                  </View>
                </View>
              </>
            )}
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: 'bold' },
  chartCard: { marginHorizontal: 16, marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  pieContainer: { alignItems: 'center', marginBottom: 16 },
  pieCenterText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  pieLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  barLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
});
