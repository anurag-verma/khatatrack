import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Transaction } from '../types';
import { formatIndianCurrency } from '../utils/currency';
import { getCategoryMeta, paymentModeColors } from '../utils/categories';
import { formatTagLabel, normalizeTag } from '../utils/tags';
import { useTheme } from '../store/theme';

type Props = {
  txn: Transaction;
  onPress: (txn: Transaction) => void;
  onTagPress?: (tag: string) => void;
  language: 'en' | 'hi';
  showTime?: boolean;
};

export default function TransactionListItem({ txn, onPress, onTagPress, language, showTime = false }: Props) {
  const t = useTheme();
  const meta = getCategoryMeta(txn.category, txn.type, language);
  const categoryLabel = meta.label;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const date = new Date(txn.date);
  const dateStr = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const categoryColor = meta.color;
  const paymentColor = paymentModeColors[txn.payment_mode] || t.textMuted;
  const dateLabel = showTime ? `${dateStr} ${timeStr}` : dateStr;

  return (
    <TouchableOpacity
      onPress={() => onPress(txn)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${categoryLabel}, ${txn.type === 'income' ? 'income' : 'expense'} ${txn.amount}`}
      style={[styles.row, { backgroundColor: t.card }]}
    >
      <View style={[styles.icon, { backgroundColor: t.border }]}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {txn.note?.trim() ? txn.note : categoryLabel}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: categoryColor + '22' }]}>
            <Text style={[styles.chipText, { color: categoryColor }]}>{categoryLabel}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: paymentColor + '22' }]}>
            <Text style={[styles.chipText, { color: paymentColor }]}>{txn.payment_mode}</Text>
          </View>
          <Text style={[styles.dateMeta, { color: t.textMuted }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        {txn.tags.length > 0 && (
          <View style={styles.tagRow}>
            {txn.tags.map((tag) => {
              const label = formatTagLabel(tag);
              const normalized = normalizeTag(tag) ?? label;
              if (onTagPress) {
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => onTagPress(normalized)}
                    style={[styles.tagChip, { backgroundColor: t.upiBlue + '14' }]}
                    hitSlop={4}
                  >
                    <Text style={[styles.tagChipText, { color: t.upiBlue }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <View key={tag} style={[styles.tagChip, { backgroundColor: t.border }]}>
                  <Text style={[styles.tagChipText, { color: t.textMuted }]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: txn.type === 'income' ? t.incomeGreen : t.expenseRed }]}>
          {txn.type === 'income' ? '+' : '-'}{formatIndianCurrency(txn.amount)}
        </Text>
        <ChevronRight size={16} color={t.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 22 },
  body: { flex: 1, minWidth: 0, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  dateMeta: { fontSize: 11, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tagChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, maxWidth: 120 },
  tagChipText: { fontSize: 10, fontWeight: '600' },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  amount: { fontSize: 15, fontWeight: '700' },
});
