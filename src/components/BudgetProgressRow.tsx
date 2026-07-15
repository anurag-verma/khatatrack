import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../store/theme';
import { formatIndianCurrency } from '../utils/currency';
import { computeBudgetProgress } from '../utils/budgetProgress';

const AMBER = '#f59e0b';

type Props = {
  label: string;
  emoji?: string;
  used: number;
  budget: number;
  compact?: boolean;
};

export default function BudgetProgressRow({ label, emoji, used, budget, compact }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { pct, over, left, barColor } = computeBudgetProgress(used, budget, {
    green: t.incomeGreen,
    amber: AMBER,
    red: t.expenseRed,
  });

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {emoji ? <Text style={[styles.emoji, compact && styles.emojiCompact]}>{emoji}</Text> : null}
          <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={[styles.amounts, { color: t.textMuted }]}>
          {formatIndianCurrency(used)} / {formatIndianCurrency(budget)}
        </Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: t.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.footer}>
        <Text style={[styles.meta, { color: t.textSecondary }]}>
          {tr('budgetPercentUsed', { percent: Math.round(pct) })}
        </Text>
        {over ? (
          <Text style={[styles.meta, { color: t.expenseRed, fontWeight: '600' }]}>{tr('overBudget')}</Text>
        ) : (
          <Text style={[styles.meta, { color: t.incomeGreen }]}>
            {tr('budgetLeft', { amount: formatIndianCurrency(left) })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  wrapCompact: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  emoji: { fontSize: 22 },
  emojiCompact: { fontSize: 18 },
  label: { fontSize: 14, fontWeight: '600', flex: 1 },
  amounts: { fontSize: 11 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  meta: { fontSize: 11 },
});
