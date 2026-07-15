import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../store/theme';
import { formatIndianCurrency } from '../../utils/currency';
import { daysUntilDue } from '../../utils/recurringDue';
import { RecurringReminder } from '../../types';

type Props = {
  items: RecurringReminder[];
  onPress: () => void;
};

export function getRecurringDueGroups(items: RecurringReminder[]) {
  const enabled = items.filter((i) => i.enabled);
  const dueToday = enabled.filter((i) => daysUntilDue(i.day_of_month) === 0);
  const dueSoon = enabled.filter((i) => {
    const d = daysUntilDue(i.day_of_month);
    return d > 0 && d <= 3;
  });
  return { dueToday, dueSoon };
}

export default function RecurringAlerts({ items, onPress }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { dueToday, dueSoon } = getRecurringDueGroups(items);

  if (dueToday.length === 0 && dueSoon.length === 0) return null;

  const todayTotal = dueToday.reduce((s, i) => s + i.amount, 0);
  const urgent = dueToday.length > 0;

  const summary =
    dueToday.length === 1
      ? `${dueToday[0].title} · ${formatIndianCurrency(dueToday[0].amount)}`
      : dueToday.length > 1
        ? tr('billsDueTodayCount', { count: dueToday.length, amount: formatIndianCurrency(todayTotal) })
        : dueSoon.length === 1
          ? `${dueSoon[0].title} · ${tr('dueInDays', { count: daysUntilDue(dueSoon[0].day_of_month) })}`
          : tr('billsDueSoonCount', { count: dueSoon.length });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.banner,
        {
          backgroundColor: urgent ? t.expenseRed + '14' : t.upiBlue + '14',
          borderColor: urgent ? t.expenseRed + '40' : t.upiBlue + '40',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={summary}
    >
      <View style={[styles.iconWrap, { backgroundColor: (urgent ? t.expenseRed : t.upiBlue) + '22' }]}>
        <Bell size={18} color={urgent ? t.expenseRed : t.upiBlue} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: urgent ? t.expenseRed : t.upiBlue }]}>
          {urgent ? tr('billsDueToday') : tr('billsDueSoon')}
        </Text>
        <Text style={[styles.sub, { color: t.textSecondary }]} numberOfLines={2}>
          {summary}
        </Text>
        {urgent && dueSoon.length > 0 && (
          <Text style={[styles.sub, { color: t.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {tr('billsDueSoonCount', { count: dueSoon.length })}
          </Text>
        )}
      </View>
      <ChevronRight size={18} color={t.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12 },
});
