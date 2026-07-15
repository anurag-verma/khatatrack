import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  unstable_batchedUpdates,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  X,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { useStore } from '../store/useStore';
import { useTheme } from '../store/theme';
import { paymentModes, getAllCategories } from '../utils/categories';
import { Transaction, TransactionType, PaymentMode, TransactionInput } from '../types';
import { getTransactionById } from '../database/db';
import { getLastTransactionPrefs, setLastTransactionPrefs } from '../utils/lastTransactionPrefs';
import { commitPendingTag, finalizeTags, formatTagLabel, normalizeTag } from '../utils/tags';
import FilterChip from './ui/FilterChip';
import PrimaryActionButton from './ui/PrimaryActionButton';

const TAG_PRESETS = ['#GoaTrip', '#Diwali', '#Wedding', '#Office', '#Home'];
const NUMPAD_KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'del']] as const;

type FormSnapshot = {
  amount: string;
  type: TransactionType;
  category: string;
  paymentMode: PaymentMode;
  note: string;
  tags: string[];
  dateIso: string;
};

function snapshotFromState(
  amount: string,
  type: TransactionType,
  category: string,
  paymentMode: PaymentMode,
  note: string,
  tags: string[],
  txnDate: Date,
): FormSnapshot {
  return {
    amount,
    type,
    category,
    paymentMode,
    note,
    tags: [...tags],
    dateIso: txnDate.toISOString(),
  };
}

function transactionToSnapshot(txn: Transaction): FormSnapshot {
  return snapshotFromState(
    String(txn.amount),
    txn.type,
    txn.category,
    txn.payment_mode,
    txn.note ?? '',
    txn.tags,
    new Date(txn.date),
  );
}

function snapshotsEqual(a: FormSnapshot, b: FormSnapshot): boolean {
  return (
    a.amount === b.amount &&
    a.type === b.type &&
    a.category === b.category &&
    a.paymentMode === b.paymentMode &&
    a.note === b.note &&
    a.dateIso === b.dateIso &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i])
  );
}

export default function AddTransactionSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();

  const visible = useStore((s) => s.transactionSheetVisible);
  const editId = useStore((s) => s.transactionSheetEditId);
  const closeTransactionSheet = useStore((s) => s.closeTransactionSheet);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const transactions = useStore((s) => s.transactions);
  const language = useStore((s) => s.language);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('food');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txnDate, setTxnDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const initialSnapshot = useRef<FormSnapshot | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const moreSectionOffset = useRef(0);
  const delLongPressHandled = useRef(false);
  const wasVisibleRef = useRef(false);
  const loadGenerationRef = useRef(0);

  const resetForm = useCallback(() => {
    setAmount('');
    setType('expense');
    setCategory('food');
    setPaymentMode('UPI');
    setNote('');
    setTags([]);
    setTagInput('');
    setTxnDate(new Date());
    setShowDatePicker(false);
    setShowMore(false);
    initialSnapshot.current = null;
  }, []);

  const applySnapshot = useCallback((snap: FormSnapshot) => {
    unstable_batchedUpdates(() => {
      setAmount(snap.amount);
      setType(snap.type);
      setCategory(snap.category);
      setPaymentMode(snap.paymentMode);
      setNote(snap.note);
      setTags([...snap.tags]);
      setTxnDate(new Date(snap.dateIso));
    });
    initialSnapshot.current = {
      ...snap,
      tags: [...snap.tags],
    };
  }, []);

  useEffect(() => {
    if (wasVisibleRef.current && !visible) {
      resetForm();
    }
    wasVisibleRef.current = visible;
  }, [visible, resetForm]);

  useEffect(() => {
    if (!visible) return;

    const generation = ++loadGenerationRef.current;
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        if (editId) {
          const cached = transactions.find((t) => t.id === editId);
          if (cached && !cancelled && loadGenerationRef.current === generation) {
            applySnapshot(transactionToSnapshot(cached));
            setShowMore(Boolean(cached.note?.trim()) || cached.tags.length > 0);
            setLoading(false);
          }

          const txn = await getTransactionById(editId);
          if (cancelled || loadGenerationRef.current !== generation) return;
          if (!txn) {
            closeTransactionSheet();
            return;
          }
          applySnapshot(transactionToSnapshot(txn));
          setShowMore(Boolean(txn.note?.trim()) || txn.tags.length > 0);
        } else {
          const prefs = await getLastTransactionPrefs();
          if (cancelled || loadGenerationRef.current !== generation) return;
          applySnapshot(
            snapshotFromState('', prefs.type, prefs.category, prefs.paymentMode, '', [], new Date()),
          );
          setShowMore(false);
        }
      } finally {
        if (!cancelled && loadGenerationRef.current === generation) {
          setLoading(false);
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [visible, editId, transactions, applySnapshot, closeTransactionSheet]);

  useEffect(() => {
    if (!visible || loading) return;
    const cats = getAllCategories(type, language);
    if (!cats.find((c) => c.id === category)) {
      setCategory(cats[0]?.id ?? 'other');
    }
  }, [type, visible, language, category, loading]);

  const categories = getAllCategories(type, language);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const dateLabel = txnDate.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isDirty = useCallback(() => {
    if (!initialSnapshot.current) return false;
    const current = snapshotFromState(amount, type, category, paymentMode, note, tags, txnDate);
    return !snapshotsEqual(current, initialSnapshot.current);
  }, [amount, type, category, paymentMode, note, tags, txnDate]);

  const requestClose = useCallback(() => {
    if (isDirty()) {
      Alert.alert(tr('discardChangesTitle'), tr('discardChangesMessage'), [
        { text: tr('keepEditing'), style: 'cancel' },
        {
          text: tr('discard'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            closeTransactionSheet();
          },
        },
      ]);
      return;
    }
    closeTransactionSheet();
  }, [isDirty, tr, closeTransactionSheet]);

  const handleKeyPress = (key: string) => {
    Haptics.selectionAsync();
    if (key === 'del') setAmount((a) => a.slice(0, -1));
    else if (key === '.') setAmount((a) => (!a.includes('.') ? a + '.' : a));
    else setAmount((a) => a + key);
  };

  const clearAmount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setAmount('');
  };

  const toggleMoreDetails = () => setShowMore((v) => !v);

  const scrollToMoreSection = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: moreSectionOffset.current, animated: true });
    });
  }, []);

  const addTag = () => {
    const { tags: next, pending } = commitPendingTag(tags, tagInput);
    setTags(next);
    setTagInput(pending);
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setTxnDate(selected);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(tr('cancel'), tr('invalidAmount'));
      return;
    }

    const finalTags = finalizeTags(tags, tagInput);
    setTags(finalTags);
    setTagInput('');

    const existing = editId ? transactions.find((t) => t.id === editId) : null;

    setSaving(true);
    const input: TransactionInput = {
      amount: numAmount,
      type,
      category,
      payment_mode: paymentMode,
      note,
      tags: finalTags,
      date: txnDate.toISOString(),
      sms_hash: existing?.sms_hash ?? null,
    };

    try {
      if (editId) {
        await updateTransaction(editId, input);
      } else {
        await addTransaction(input);
      }
      await setLastTransactionPrefs({ type, category, paymentMode });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeTransactionSheet();
    } catch (e) {
      console.error('[AddTransactionSheet] save failed:', e);
      Alert.alert(tr('saveFailedTitle'), tr('saveFailedMessage'));
    } finally {
      setSaving(false);
    }
  };

  const accentColor = type === 'expense' ? t.expenseRed : t.incomeGreen;
  const displayAmount = amount || '0';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={requestClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: t.bg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: t.border }]} />

            <View style={styles.header}>
              <TouchableOpacity
                onPress={requestClose}
                style={styles.iconBtn}
                accessibilityLabel={tr('cancel')}
                hitSlop={8}
              >
                <X size={22} color={t.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: t.text }]}>
                {editId ? tr('editTransaction') : tr('addTransaction')}
              </Text>
              <View style={styles.iconBtn} />
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={t.upiBlue} />
                <Text style={[styles.loadingText, { color: t.textMuted }]}>{tr('loading')}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.typeToggle, { backgroundColor: t.card }]}>
                  <TouchableOpacity
                    onPress={() => setType('expense')}
                    style={[styles.typeButton, type === 'expense' && { backgroundColor: t.expenseRed + '22' }]}
                  >
                    <ArrowDownFromLine size={18} color={type === 'expense' ? t.expenseRed : t.textMuted} />
                    <Text style={[styles.typeButtonText, { color: type === 'expense' ? t.expenseRed : t.textMuted }]}>
                      {tr('kharcha')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setType('income')}
                    style={[styles.typeButton, type === 'income' && { backgroundColor: t.incomeGreen + '22' }]}
                  >
                    <ArrowUpFromLine size={18} color={type === 'income' ? t.incomeGreen : t.textMuted} />
                    <Text style={[styles.typeButtonText, { color: type === 'income' ? t.incomeGreen : t.textMuted }]}>
                      {tr('kamai')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={scrollRef}
                  style={styles.scroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.amountRow}>
                    <Text style={[styles.rupee, { color: t.textMuted }]}>₹</Text>
                    <Text
                      style={[styles.amountDisplay, { color: amount ? t.text : t.textMuted }]}
                      accessibilityLabel={tr('amount')}
                    >
                      {displayAmount}
                    </Text>
                  </View>

                  <View style={styles.numpad}>
                    {NUMPAD_KEYS.map((row, ri) => (
                      <View key={ri} style={styles.numpadRow}>
                        {row.map((key) => (
                          <TouchableOpacity
                            key={key}
                            onPress={() => {
                              if (key === 'del' && delLongPressHandled.current) {
                                delLongPressHandled.current = false;
                                return;
                              }
                              handleKeyPress(key);
                            }}
                            onLongPress={
                              key === 'del'
                                ? () => {
                                    delLongPressHandled.current = true;
                                    clearAmount();
                                  }
                                : undefined
                            }
                            delayLongPress={400}
                            style={[styles.numpadKey, { backgroundColor: t.card }]}
                            activeOpacity={0.7}
                            accessibilityLabel={key === 'del' ? tr('clearAmount') : key}
                            accessibilityHint={key === 'del' ? tr('clearAmountHint') : undefined}
                          >
                            {key === 'del' ? (
                              <Text style={{ fontSize: 22, color: t.expenseRed }}>⌫</Text>
                            ) : (
                              <Text style={[styles.numpadKeyText, { color: t.text }]}>{key}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>{tr('category')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                    <View style={styles.chipRow}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setCategory(cat.id);
                          }}
                          style={[
                            styles.categoryItem,
                            category === cat.id && { borderColor: cat.color, borderWidth: 2, borderRadius: 12 },
                          ]}
                        >
                          <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                          <Text
                            style={[styles.categoryName, { color: category === cat.id ? cat.color : t.textMuted }]}
                            numberOfLines={1}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>{tr('paymentMode')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
                    <View style={styles.chipRow}>
                      {paymentModes.map((mode) => (
                        <FilterChip
                          key={mode}
                          label={mode}
                          active={paymentMode === mode}
                          onPress={() => setPaymentMode(mode)}
                        />
                      ))}
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.dateRow, { backgroundColor: t.card }]}
                    accessibilityRole="button"
                    accessibilityLabel={tr('selectDate')}
                  >
                    <Calendar size={18} color={t.upiBlue} />
                    <Text style={[styles.dateText, { color: t.text }]}>{dateLabel}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={txnDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateDone}>
                      <Text style={{ color: t.upiBlue, fontWeight: '600' }}>{tr('done')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={toggleMoreDetails}
                    style={[styles.moreToggle, { borderTopColor: t.border }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showMore }}
                  >
                    <Text style={[styles.moreToggleText, { color: t.textSecondary }]}>{tr('moreDetails')}</Text>
                    {showMore ? (
                      <ChevronUp size={18} color={t.textMuted} />
                    ) : (
                      <ChevronDown size={18} color={t.textMuted} />
                    )}
                  </TouchableOpacity>

                  {showMore && (
                    <View
                      style={styles.moreBlock}
                      onLayout={(e) => {
                        moreSectionOffset.current = e.nativeEvent.layout.y;
                        scrollToMoreSection();
                      }}
                    >
                      <Text style={[styles.sectionLabel, { color: t.textSecondary, marginTop: 0 }]}>
                        {tr('note')}
                      </Text>
                      <View style={[styles.noteInput, { backgroundColor: t.inputBg }]}>
                        <TextInput
                          placeholder={tr('note')}
                          placeholderTextColor={t.textMuted}
                          value={note}
                          onChangeText={setNote}
                          style={[styles.noteInputText, { color: t.text }]}
                        />
                      </View>

                      <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>{tr('tags')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hPad}>
                        {TAG_PRESETS.map((preset) => {
                          const normalized = normalizeTag(preset);
                          if (!normalized) return null;
                          const active = tags.some((tg) => normalizeTag(tg) === normalized);
                          return (
                            <TouchableOpacity
                              key={preset}
                              onPress={() => {
                                if (active) {
                                  setTags(tags.filter((tg) => normalizeTag(tg) !== normalized));
                                } else {
                                  setTags([...tags, normalized]);
                                }
                              }}
                              style={[
                                styles.presetTag,
                                { backgroundColor: active ? t.upiBlue + '22' : t.card, borderColor: active ? t.upiBlue : 'transparent', borderWidth: 1 },
                              ]}
                            >
                              <Text style={{ color: t.upiBlue, fontSize: 12 }}>{formatTagLabel(normalized)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      <View style={styles.tagInputRow}>
                        <View style={[styles.tagInputContainer, { backgroundColor: t.inputBg }]}>
                          <Hash size={16} color={t.textMuted} />
                          <TextInput
                            placeholder={tr('addTag')}
                            placeholderTextColor={t.textMuted}
                            value={tagInput}
                            onChangeText={setTagInput}
                            onSubmitEditing={addTag}
                            onBlur={addTag}
                            returnKeyType="done"
                            style={[styles.tagInput, { color: t.text }]}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={addTag}
                          disabled={!tagInput.trim()}
                          style={[
                            styles.addTagBtn,
                            { backgroundColor: t.upiBlue, opacity: tagInput.trim() ? 1 : 0.45 },
                          ]}
                          accessibilityLabel={tr('addTagButton')}
                        >
                          <Text style={styles.addTagBtnText}>{tr('add')}</Text>
                        </TouchableOpacity>
                      </View>
                      {tags.length > 0 && (
                        <View style={styles.tagsRow}>
                          {tags.map((tag) => (
                            <TouchableOpacity
                              key={tag}
                              onPress={() => setTags(tags.filter((z) => z !== tag))}
                              style={[styles.tagBadge, { backgroundColor: t.border }]}
                            >
                              <Text style={[styles.tagBadgeText, { color: t.upiBlue }]}>{formatTagLabel(tag)}</Text>
                              <Text style={{ color: t.textMuted }}>×</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>

                <PrimaryActionButton
                  label={tr('save')}
                  loadingLabel={tr('saving')}
                  loading={saving}
                  disabled={!amount}
                  onPress={handleSave}
                  backgroundColor={accentColor}
                  accessibilityLabel={tr('save')}
                  style={{ ...styles.saveBtn, marginBottom: Math.max(insets.bottom, 8) }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  loadingWrap: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  typeButtonText: { fontSize: 14, fontWeight: 'bold' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingBottom: 4 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  rupee: { fontSize: 32, marginRight: 4 },
  amountDisplay: { fontSize: 44, fontWeight: '300', letterSpacing: -1 },
  numpad: { paddingHorizontal: 24, marginBottom: 8 },
  numpadRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 10 },
  numpadKey: {
    width: 72,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyText: { fontSize: 22, fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginLeft: 16, marginTop: 12, marginBottom: 8 },
  hPad: { paddingHorizontal: 16, paddingBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 8 },
  categoryItem: { alignItems: 'center', width: 64, padding: 4 },
  categoryEmoji: { fontSize: 26, marginBottom: 4 },
  categoryName: { fontSize: 10, textAlign: 'center' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },
  dateText: { fontSize: 15, fontWeight: '500' },
  dateDone: { alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 4 },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreToggleText: { fontSize: 14, fontWeight: '600' },
  moreBlock: { paddingBottom: 8 },
  noteInput: { marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 16 },
  noteInputText: { fontSize: 14, height: 48 },
  presetTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  tagInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  tagInput: { flex: 1, fontSize: 14, marginLeft: 8 },
  addTagBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 8, gap: 8 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 4,
  },
  tagBadgeText: { fontSize: 12 },
  saveBtn: { marginHorizontal: 16, marginTop: 8 },
});
