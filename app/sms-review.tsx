import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  TextInput, Alert, Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, CheckSquare, Square, ShieldOff } from 'lucide-react-native';

import { useStore } from '../src/store/useStore';
import { useTheme } from '../src/store/theme';
import { useScreenInsets } from '../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../src/utils/currency';
import {
  requestSmsPermission, fetchBankSms, parseSmsList, parseSms, smsToTransaction, hashSms,
} from '../src/utils/smsParser';
import { getSmsHashes } from '../src/database/db';
import { ParsedSmsItem } from '../src/types';
import EmptyState from '../src/components/ui/EmptyState';
import PrimaryActionButton from '../src/components/ui/PrimaryActionButton';

type PermissionState = 'loading' | 'granted' | 'denied';

export default function SmsReviewScreen() {
  const t = useTheme();
  const router = useRouter();
  const { modalContentPadding, top } = useScreenInsets();
  const { t: tr } = useTranslation();
  const addTransaction = useStore((s) => s.addTransaction);
  const loadData = useStore((s) => s.loadData);

  const [items, setItems] = useState<ParsedSmsItem[]>([]);
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [importing, setImporting] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => { loadSms(); }, []);

  const loadSms = async () => {
    setPermission('loading');
    const permitted = await requestSmsPermission();
    if (!permitted) {
      setPermission('denied');
      return;
    }
    setPermission('granted');
    const existing = await getSmsHashes();
    const messages = await fetchBankSms(30);
    const parsed = parseSmsList(messages, existing);
    setItems(parsed);
  };

  const toggleItem = (hash: string) => {
    setItems((prev) =>
      prev.map((i) => (i.smsHash === hash ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleAll = (select: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: select })));
  };

  const handlePaste = () => {
    const parsed = parseSms(pasteText);
    if (!parsed) {
      Alert.alert('Error', tr('noSmsFound'));
      return;
    }
    const smsHash = hashSms(pasteText, parsed.amount);
    setItems((prev) => [
      { ...parsed, smsHash, rawText: pasteText, selected: true },
      ...prev.filter((i) => i.smsHash !== smsHash),
    ]);
    setPasteText('');
  };

  const handleImport = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;

    setImporting(true);
    for (const item of selected) {
      await addTransaction(smsToTransaction(item, item.smsHash));
    }
    await loadData();
    setImporting(false);
    router.back();
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={tr('cancel')}>
          <X size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">{tr('smsReview')}</Text>
        <PrimaryActionButton
          label={`${tr('importSelected')} (${selectedCount})`}
          loadingLabel={tr('importing')}
          loading={importing}
          disabled={selectedCount === 0}
          onPress={handleImport}
          backgroundColor={selectedCount > 0 ? t.upiBlue : t.border}
          accessibilityLabel={tr('importSelected')}
          style={styles.importBtn}
          compact
        />
      </View>

      <View style={[styles.pasteBox, { backgroundColor: t.card }]}>
        <TextInput
          style={[styles.pasteInput, { color: t.text }]}
          placeholder={tr('pasteSms')}
          placeholderTextColor={t.textMuted}
          value={pasteText}
          onChangeText={setPasteText}
          multiline
          accessibilityLabel={tr('pasteSms')}
        />
        <TouchableOpacity onPress={handlePaste} style={[styles.parseBtn, { backgroundColor: t.upiBlue }]}>
          <Text style={styles.parseBtnText}>{tr('parseSms')}</Text>
        </TouchableOpacity>
      </View>

      {permission === 'loading' ? (
        <ActivityIndicator color={t.upiBlue} style={{ marginTop: 40 }} />
      ) : permission === 'denied' ? (
        <EmptyState
          icon={<ShieldOff size={40} color={t.textMuted} />}
          title={tr('smsPermissionDenied')}
          body={tr('smsPermissionDeniedDesc')}
          actionLabel={Platform.OS === 'android' ? tr('openSettings') : tr('retryPermission')}
          onAction={() => {
            if (Platform.OS === 'android') Linking.openSettings();
            else loadSms();
          }}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => toggleAll(true)} accessibilityLabel={tr('selectAll')}>
              <Text style={{ color: t.upiBlue }}>{tr('selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleAll(false)} accessibilityLabel={tr('deselectAll')}>
              <Text style={{ color: t.textMuted }}>{tr('deselectAll')}</Text>
            </TouchableOpacity>
            <Text style={{ color: t.textMuted }}>{tr('found', { count: items.length })}</Text>
          </View>

          {items.length === 0 ? (
            <EmptyState title={tr('noSmsFound')} body={tr('pasteSms')} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: modalContentPadding }}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.smsHash}
                  onPress={() => toggleItem(item.smsHash)}
                  style={[styles.item, { backgroundColor: t.card, borderColor: item.selected ? t.upiBlue : t.border }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.selected }}
                >
                  <View style={styles.itemLeft}>
                    {item.selected ? (
                      <CheckSquare size={22} color={t.upiBlue} />
                    ) : (
                      <Square size={22} color={t.textMuted} />
                    )}
                  </View>
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <Text style={[styles.amount, { color: item.type === 'income' ? t.incomeGreen : t.expenseRed }]}>
                        {item.type === 'income' ? '+' : '-'}{formatIndianCurrency(item.amount)}
                      </Text>
                      <Text style={[styles.mode, { color: t.textMuted }]}>{item.payment_mode}</Text>
                    </View>
                    <Text style={[styles.note, { color: t.text }]} numberOfLines={2}>{item.note}</Text>
                    {item.confidence < 0.7 && (
                      <Text style={{ color: '#f59e0b', fontSize: 11 }}>{tr('lowConfidence')}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  closeBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  importBtn: { maxWidth: 200 },
  pasteBox: { marginHorizontal: 16, borderRadius: 16, padding: 12, marginBottom: 12 },
  pasteInput: { minHeight: 60, fontSize: 13, marginBottom: 8 },
  parseBtn: { padding: 10, borderRadius: 10, alignItems: 'center' },
  parseBtnText: { color: '#fff', fontWeight: 'bold' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  item: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 14, borderWidth: 1 },
  itemLeft: { marginRight: 12 },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  mode: { fontSize: 12 },
  note: { fontSize: 12 },
});
