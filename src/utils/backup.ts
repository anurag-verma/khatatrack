import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportAllData, importAllData } from '../database/db';
import { TransactionInput } from '../types';
import { formatIndianCurrency } from './currency';

const BACKUP_VERSION = 1;

export async function exportBackup(): Promise<boolean> {
  const data = await exportAllData();
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'KhataTrack',
    ...data,
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `khatatrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export KhataTrack Backup',
    });
    return true;
  }
  return false;
}

export async function exportCsv(): Promise<boolean> {
  const data = await exportAllData();
  const headers = 'id,amount,type,category,payment_mode,note,tags,date\n';
  const rows = data.transactions
    .map(
      (t) =>
        `${t.id},${t.amount},${t.type},${t.category},${t.payment_mode},"${(t.note || '').replace(/"/g, '""')}","${t.tags.join(';')}",${t.date}`
    )
    .join('\n');

  const csv = headers + rows;
  const filename = `khatatrack_${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export KhataTrack CSV',
    });
    return true;
  }
  return false;
}

export async function importBackup(): Promise<{ success: boolean; count: number; error?: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, count: 0, error: 'cancelled' };
  }

  try {
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const parsed = JSON.parse(content);

    const transactions: TransactionInput[] = (parsed.transactions || []).map(
      (t: TransactionInput) => ({
        amount: t.amount,
        type: t.type,
        category: t.category,
        payment_mode: t.payment_mode,
        note: t.note || '',
        tags: t.tags || [],
        date: t.date,
        sms_hash: t.sms_hash || null,
      })
    );

    await importAllData({
      transactions,
      budgets: parsed.budgets,
      recurring: parsed.recurring,
    });

    return { success: true, count: transactions.length };
  } catch (e) {
    return { success: false, count: 0, error: String(e) };
  }
}

export function formatWhatsAppSummary(
  balance: { available: number; thisMonthSpent: number; thisMonthIncome: number },
  lang: 'en' | 'hi'
): string {
  if (lang === 'hi') {
    return (
      `📊 *KhataTrack सारांश*\n` +
      `इस महीने की आय: ${formatIndianCurrency(balance.thisMonthIncome)}\n` +
      `इस महीने का खर्च: ${formatIndianCurrency(balance.thisMonthSpent)}\n` +
      `कुल शेष: ${formatIndianCurrency(balance.available)}\n` +
      `_100% मुफ़्त • ऑफ़लाइन • निजी_`
    );
  }
  return (
    `📊 *KhataTrack Summary*\n` +
    `This month income: ${formatIndianCurrency(balance.thisMonthIncome)}\n` +
    `This month expense: ${formatIndianCurrency(balance.thisMonthSpent)}\n` +
    `Balance: ${formatIndianCurrency(balance.available)}\n` +
    `_100% Free • Offline • Private_`
  );
}
