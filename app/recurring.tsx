import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, RefreshControl, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, Bell, Trash2 } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/store/theme';
import { useScreenInsets } from '../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../src/utils/currency';
import { daysUntilDue } from '../src/utils/recurringDue';
import { getRecurringReminders, addRecurringReminder, deleteRecurringReminder, toggleRecurringReminder } from '../src/database/db';
import { RecurringReminder } from '../src/types';
import EmptyState from '../src/components/ui/EmptyState';
import SectionCard from '../src/components/ui/SectionCard';
import ScreenHeader from '../src/components/ui/ScreenHeader';
import ConfirmModal from '../src/components/ConfirmModal';
import ToastBanner from '../src/components/ui/ToastBanner';
import PrimaryActionButton from '../src/components/ui/PrimaryActionButton';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RecurringScreen() {
  const t = useTheme();
  const router = useRouter();
  const { modalContentPadding, top } = useScreenInsets();
  const { t: tr } = useTranslation();

  const dueLabel = (dayOfMonth: number) => {
    const days = daysUntilDue(dayOfMonth);
    if (days === 0) return tr('dueToday');
    if (days === 1) return tr('dueTomorrow');
    return tr('dueInDays', { count: days });
  };

  const [items, setItems] = useState<RecurringReminder[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setItems(await getRecurringReminders());
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const scheduleNotification = async (reminder: RecurringReminder) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const now = new Date();
    const trigger = new Date(now.getFullYear(), now.getMonth(), reminder.day_of_month, 9, 0);
    if (trigger < now) trigger.setMonth(trigger.getMonth() + 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: `${formatIndianCurrency(reminder.amount)} due today`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  };

  const rescheduleAllEnabled = async (list: RecurringReminder[]) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const item of list) {
      if (item.enabled) await scheduleNotification(item);
    }
  };

  const handleAdd = async () => {
    const num = parseFloat(amount);
    const dayNum = parseInt(day.trim(), 10);
    if (!title.trim() || isNaN(num) || num <= 0) {
      Alert.alert('Error', tr('invalidAmount'));
      return;
    }
    if (!day.trim() || isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
      Alert.alert('Error', tr('recurringInvalidDay'));
      return;
    }

    setSaving(true);
    try {
      await addRecurringReminder({
        title: title.trim(),
        amount: num,
        type: 'expense',
        category: 'other',
        payment_mode: 'UPI',
        day_of_month: dayNum,
        enabled: 1,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle('');
      setAmount('');
      setDay('');
      const list = await getRecurringReminders();
      setItems(list);
      await rescheduleAllEnabled(list);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget !== null) {
      await deleteRecurringReminder(deleteTarget);
      setDeleteTarget(null);
      const list = await getRecurringReminders();
      setItems(list);
      await rescheduleAllEnabled(list);
    }
  };

  const handleToggle = async (item: RecurringReminder, value: boolean) => {
    const next = value ? 1 : 0;
    await toggleRecurringReminder(item.id, next);
    const list = await getRecurringReminders();
    setItems(list);
    await rescheduleAllEnabled(list);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToastMessage(value ? tr('recurringReminderOn') : tr('recurringReminderOff'));
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={tr('cancel')}>
          <X size={24} color={t.text} />
        </TouchableOpacity>
      </View>
      <ScreenHeader title={tr('recurring')} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: modalContentPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.upiBlue} />}
      >
        <SectionCard style={styles.form}>
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder={tr('recurringTitlePlaceholder')}
            placeholderTextColor={t.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder="₹"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder={tr('recurringDayPlaceholder')}
            placeholderTextColor={t.textMuted}
            keyboardType="number-pad"
            value={day}
            onChangeText={setDay}
          />
          <PrimaryActionButton
            label={tr('save')}
            loadingLabel={tr('saving')}
            loading={saving}
            onPress={handleAdd}
            backgroundColor={t.upiBlue}
            accessibilityLabel={tr('save')}
            style={styles.addBtn}
          />
        </SectionCard>

        {items.length === 0 ? (
          <EmptyState icon={<Bell size={40} color={t.textMuted} />} title={tr('emptyRecurring')} body={tr('emptyRecurringBody')} />
        ) : (
          items.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: t.card }]}>
              <View style={[styles.itemIcon, { backgroundColor: (item.enabled ? t.upiBlue : t.textMuted) + '18' }]}>
                <Bell size={20} color={item.enabled ? t.upiBlue : t.textMuted} />
              </View>
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, { color: t.text }]}>{item.title}</Text>
                <Text style={[styles.itemAmount, { color: t.text }]}>{formatIndianCurrency(item.amount)}</Text>
                <Text style={[styles.itemDue, { color: item.enabled ? t.upiBlue : t.textMuted }]}>
                  {item.enabled ? dueLabel(item.day_of_month) : tr('dueOnDay', { day: item.day_of_month })}
                </Text>
              </View>
              <View style={styles.itemActions}>
                <Switch
                  value={!!item.enabled}
                  onValueChange={(v) => handleToggle(item, v)}
                  trackColor={{ false: t.border, true: t.upiBlue }}
                  accessibilityLabel={item.title}
                />
                <TouchableOpacity onPress={() => setDeleteTarget(item.id)} accessibilityLabel={tr('delete')} style={styles.deleteBtn}>
                  <Trash2 size={18} color={t.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmModal
        visible={deleteTarget !== null}
        title={tr('delete') + '?'}
        message={tr('deleteConfirmMessage')}
        confirmText={tr('delete')}
        cancelText={tr('cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastBanner
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16 },
  closeBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  form: { marginBottom: 20 },
  input: { borderRadius: 10, padding: 12, marginBottom: 10 },
  addBtn: { padding: 14, borderRadius: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  itemDue: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  itemActions: { alignItems: 'flex-end', gap: 8 },
  deleteBtn: { padding: 4 },
});
