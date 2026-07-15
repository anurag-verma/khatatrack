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
import { Pencil, Trash2 } from 'lucide-react-native';
import { Transaction } from '../types';
import { formatIndianCurrency } from '../utils/currency';
import { getCategoryMeta, paymentModeColors } from '../utils/categories';
import { formatTagLabel, normalizeTag } from '../utils/tags';
import { useTheme } from '../store/theme';

type Props = {
  visible: boolean;
  transaction: Transaction | null;
  language: 'en' | 'hi';
  onClose: () => void;
  onEdit: (txn: Transaction) => void;
  onDelete: (txn: Transaction) => void;
  onTagPress?: (tag: string) => void;
};

export default function TransactionDetailSheet({
  visible,
  transaction,
  language,
  onClose,
  onEdit,
  onDelete,
  onTagPress,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();

  if (!transaction) return null;

  const categoryLabel = getCategoryMeta(transaction.category, transaction.type, language).label;
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const date = new Date(transaction.date);
  const dateTimeStr = date.toLocaleString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const modeColor = paymentModeColors[transaction.payment_mode] || t.textMuted;
  const amountColor = transaction.type === 'income' ? t.incomeGreen : t.expenseRed;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: t.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={[styles.sheetTitle, { color: t.textMuted }]}>{tr('transactionDetails')}</Text>

            <Text style={[styles.amount, { color: amountColor }]}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatIndianCurrency(transaction.amount)}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: amountColor + '20' }]}>
              <Text style={[styles.typeText, { color: amountColor }]}>
                {transaction.type === 'income' ? tr('income') : tr('expense')}
              </Text>
            </View>

            <View style={styles.metaBlock}>
              <MetaRow label={tr('category')} value={categoryLabel} theme={t} />
              <MetaRow label={tr('paymentMode')} value={transaction.payment_mode} theme={t} valueColor={modeColor} />
              <MetaRow label={tr('date')} value={dateTimeStr} theme={t} />
            </View>

            <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>{tr('note')}</Text>
            <View style={[styles.noteBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <Text style={[styles.noteText, { color: transaction.note?.trim() ? t.text : t.textMuted }]}>
                {transaction.note?.trim() ? transaction.note : tr('noNote')}
              </Text>
            </View>

            {transaction.tags.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>{tr('tags')}</Text>
                <View style={styles.tagRow}>
                  {transaction.tags.map((tag) => {
                    const label = formatTagLabel(tag);
                    const normalized = normalizeTag(tag) ?? label;
                    if (onTagPress) {
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => onTagPress(normalized)}
                          style={[styles.tag, { backgroundColor: t.upiBlue + '18' }]}
                          accessibilityRole="button"
                          accessibilityLabel={`${tr('filterByTag')}: ${label}`}
                        >
                          <Text style={[styles.tagText, { color: t.upiBlue }]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <View key={tag} style={[styles.tag, { backgroundColor: t.upiBlue + '18' }]}>
                        <Text style={[styles.tagText, { color: t.upiBlue }]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onEdit(transaction)}
              style={[styles.editBtn, { backgroundColor: t.upiBlue }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tr('editTransaction')}
            >
              <Pencil size={18} color="#fff" />
              <Text style={styles.editBtnText}>{tr('editTransaction')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(transaction)}
              style={[styles.deleteBtn, { borderColor: t.expenseRed }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tr('delete')}
            >
              <Trash2 size={18} color={t.expenseRed} />
              <Text style={[styles.deleteBtnText, { color: t.expenseRed }]}>{tr('delete')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
  theme,
  valueColor,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  valueColor?: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: valueColor || theme.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  typeText: { fontSize: 13, fontWeight: '700' },
  metaBlock: { gap: 12, marginBottom: 20 },
  metaRow: { gap: 4 },
  metaLabel: { fontSize: 12, fontWeight: '500' },
  metaValue: { fontSize: 15, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  noteBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  noteText: { fontSize: 15, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },
});
