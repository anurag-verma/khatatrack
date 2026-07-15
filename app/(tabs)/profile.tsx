import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, ChevronRight, Moon, Sun, Download, Upload, FileSpreadsheet, Share2, Wallet, Bell, Users, Lock, Pencil, ArrowLeftRight, IndianRupee } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import Logo from '../../src/components/Logo';
import ScreenHeader from '../../src/components/ui/ScreenHeader';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/store/theme';
import { useScreenInsets } from '../../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../../src/utils/currency';
import { exportBackup, importBackup, exportCsv, formatWhatsAppSummary } from '../../src/utils/backup';
import { authenticateUser, getAppLockAvailability } from '../../src/utils/appLock';

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

function ProfileHeroCard({
  userName,
  editingName,
  nameInput,
  setNameInput,
  setEditingName,
  setUserName,
  transactionCount,
  availableBalance,
}: {
  userName: string;
  editingName: boolean;
  nameInput: string;
  setNameInput: (v: string) => void;
  setEditingName: (v: boolean) => void;
  setUserName: (v: string) => void;
  transactionCount: number;
  availableBalance: number;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const initial = (userName.trim()[0] || '?').toUpperCase();
  const hasName = Boolean(userName.trim());
  const displayName = hasName ? userName.trim() : tr('addName');
  const greeting = tr(getGreetingKey());
  const balanceColor = availableBalance >= 0 ? t.incomeGreen : t.expenseRed;

  const gradientColors = useMemo(
    () => [t.upiBlue + (t.isDark ? '33' : '22'), t.card] as const,
    [t.upiBlue, t.card, t.isDark]
  );

  const commitName = () => {
    setUserName(nameInput.trim());
    setEditingName(false);
  };

  const heroFrameStyle = t.isDark
    ? [styles.heroOuter, t.shadow]
    : [styles.heroOuter, { backgroundColor: t.card }, t.shadow];

  return (
    <View style={heroFrameStyle}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
        <View style={styles.heroBody}>
          <View style={[styles.avatarRing, { borderColor: t.upiBlue + '55' }]}>
            <View style={[styles.avatar, { backgroundColor: t.upiBlue + '30' }]}>
              <Text style={[styles.avatarText, { color: t.upiBlue }]}>{initial}</Text>
            </View>
          </View>

          <Text style={[styles.greeting, { color: t.textMuted }]}>
            {hasName ? `${greeting},` : greeting}
          </Text>

          {editingName ? (
            <TextInput
              style={[styles.nameInput, { color: t.text, borderColor: t.upiBlue, backgroundColor: t.inputBg }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={tr('enterName')}
              placeholderTextColor={t.textMuted}
              autoFocus
              onBlur={commitName}
              onSubmitEditing={commitName}
              returnKeyType="done"
            />
          ) : (
            <Text style={[styles.profileName, { color: t.text }]} numberOfLines={1}>
              {displayName}
            </Text>
          )}

          {!editingName && (
            <TouchableOpacity
              onPress={() => { setNameInput(userName); setEditingName(true); }}
              style={[styles.editPill, { backgroundColor: t.upiBlue + (t.isDark ? '18' : '12') }]}
              accessibilityRole="button"
              accessibilityLabel={tr('profileEditName')}
            >
              <Pencil size={13} color={t.upiBlue} />
              <Text style={[styles.editPillText, { color: t.upiBlue }]}>{tr('profileEditName')}</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.statsStrip, { borderTopColor: t.border }]}>
            <View style={styles.statCell}>
              <View style={[styles.statIconWrap, { backgroundColor: t.upiBlue + '22' }]}>
                <ArrowLeftRight size={18} color={t.upiBlue} strokeWidth={2.25} />
              </View>
              <Text style={[styles.statValue, { color: t.text }]}>{transactionCount}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>{tr('totalTransactions')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: t.border }]} />
            <View style={styles.statCell}>
              <View style={[styles.statIconWrap, { backgroundColor: balanceColor + '22' }]}>
                <IndianRupee size={18} color={balanceColor} strokeWidth={2.25} />
              </View>
              <Text style={[styles.statValue, { color: balanceColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatIndianCurrency(availableBalance)}
              </Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>{tr('bachat')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  subtitle,
  onPress,
  right,
  accessibilityLabel,
}: {
  icon: typeof Wallet;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const content = (
    <View style={[styles.settingsItem, { backgroundColor: t.card }]}>
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: t.upiBlue + '20' }]}>
          <Icon size={18} color={t.upiBlue} />
        </View>
        <View style={styles.settingsTextCol}>
          <Text style={[styles.settingsLabel, { color: t.text }]}>{label}</Text>
          {subtitle ? <Text style={[styles.settingsSubtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ?? <ChevronRight size={18} color={t.textMuted} />}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} style={{ minHeight: 48 }}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={{ minHeight: 48 }}>{content}</View>;
}

export default function ProfileScreen() {
  const t = useTheme();
  const { tabContentPadding, top } = useScreenInsets();
  const router = useRouter();
  const { t: tr } = useTranslation();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const userName = useStore((s) => s.userName);
  const setUserName = useStore((s) => s.setUserName);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const transactions = useStore((s) => s.transactions);
  const balance = useStore((s) => s.balance);
  const loadData = useStore((s) => s.loadData);
  const lockEnabled = useStore((s) => s.lockEnabled);
  const setLockEnabled = useStore((s) => s.setLockEnabled);
  const setAppLocked = useStore((s) => s.setAppLocked);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  const handleLockToggle = async (value: boolean) => {
    if (!value) {
      setLockEnabled(false);
      setAppLocked(false);
      return;
    }
    const { available } = await getAppLockAvailability();
    if (!available) {
      Alert.alert(tr('lockNotAvailable'), tr('lockNotAvailableDesc'));
      return;
    }
    const { success } = await authenticateUser(tr('lockEnablePrompt'), tr('cancel'));
    if (!success) return;
    setLockEnabled(true);
    setAppLocked(false);
    Alert.alert('✓', tr('lockEnabledSuccess'));
  };

  const handleBackup = async () => {
    const ok = await exportBackup();
    if (ok) Alert.alert('✓', tr('backupSuccess'));
  };

  const handleRestore = async () => {
    const result = await importBackup();
    if (result.success) {
      await loadData();
      Alert.alert('✓', tr('restoreSuccess', { count: result.count }));
    } else if (result.error !== 'cancelled') {
      Alert.alert('Error', tr('restoreFailed'));
    }
  };

  const handleExportCsv = async () => { await exportCsv(); };

  const handleShareSummary = async () => {
    const text = formatWhatsAppSummary(balance, language);
    const FileSystem = await import('expo-file-system/legacy');
    const path = `${FileSystem.cacheDirectory}summary.txt`;
    await FileSystem.writeAsStringAsync(path, text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { dialogTitle: tr('shareSummary') });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: top + 10, backgroundColor: t.bg }]}>
      <ScreenHeader title={tr('profile')} />

      <ScrollView contentContainerStyle={{ paddingBottom: tabContentPadding }}>
        <ProfileHeroCard
          userName={userName}
          editingName={editingName}
          nameInput={nameInput}
          setNameInput={setNameInput}
          setEditingName={setEditingName}
          setUserName={setUserName}
          transactionCount={transactions.length}
          availableBalance={balance.available}
        />

        <Text style={[styles.sectionTitle, { color: t.textSecondary, marginTop: 8 }]}>{tr('sectionFeatures')}</Text>
        <SettingsRow
          icon={Wallet}
          label={tr('budgets')}
          subtitle={tr('featureBudgetsHint')}
          onPress={() => router.push('/budgets')}
        />
        <SettingsRow
          icon={Bell}
          label={tr('recurring')}
          subtitle={tr('featureRecurringHint')}
          onPress={() => router.push('/recurring')}
        />
        <SettingsRow
          icon={Users}
          label={tr('splits')}
          subtitle={tr('featureSplitsHint')}
          onPress={() => router.push('/splits')}
        />

        <Text style={[styles.sectionTitle, { color: t.textSecondary, marginTop: 16 }]}>{tr('sectionData')}</Text>
        <SettingsRow icon={Download} label={tr('backup')} subtitle={tr('dataBackupHint')} onPress={handleBackup} />
        <SettingsRow icon={Upload} label={tr('restore')} subtitle={tr('dataRestoreHint')} onPress={handleRestore} />
        <SettingsRow icon={FileSpreadsheet} label={tr('exportCsv')} subtitle={tr('dataExportCsvHint')} onPress={handleExportCsv} />
        <SettingsRow icon={Share2} label={tr('shareSummary')} subtitle={tr('dataShareSummaryHint')} onPress={handleShareSummary} />

        <Text style={[styles.sectionTitle, { color: t.textSecondary, marginTop: 16 }]}>{tr('sectionAppearance')}</Text>
        <SettingsRow
          icon={Globe}
          label={tr('language')}
          right={<Text style={{ color: t.textMuted }}>{language === 'hi' ? 'हिंदी' : 'English'}</Text>}
          onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        />
        <View style={[styles.settingsItem, { backgroundColor: t.card }]}>
          <View style={styles.settingsLeft}>
            <View style={[styles.settingsIcon, { backgroundColor: t.upiBlue + '20' }]}>
              {theme === 'dark' ? <Moon size={18} color={t.upiBlue} /> : <Sun size={18} color={t.upiBlue} />}
            </View>
            <Text style={[styles.settingsLabel, { color: t.text }]}>{tr('theme')}</Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            trackColor={{ false: t.border, true: t.upiBlue }}
            accessibilityLabel={tr('theme')}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: t.textSecondary, marginTop: 16 }]}>{tr('sectionSecurity')}</Text>
        <View style={[styles.settingsItem, { backgroundColor: t.card }]}>
          <View style={styles.settingsLeft}>
            <View style={[styles.settingsIcon, { backgroundColor: t.upiBlue + '20' }]}>
              <Lock size={18} color={t.upiBlue} />
            </View>
            <Text style={[styles.settingsLabel, { color: t.text }]}>{tr('appLock')}</Text>
          </View>
          <Switch
            value={lockEnabled}
            onValueChange={handleLockToggle}
            trackColor={{ false: t.border, true: t.upiBlue }}
            accessibilityLabel={tr('appLock')}
          />
        </View>

        <View style={styles.footer}>
          <Logo size="footer" />
          <Text style={[styles.footerVersion, { color: t.upiBlue }]}>v1.0.0</Text>
          <Text style={[styles.footerDesc, { color: t.textMuted }]}>{tr('freeOfflinePrivate')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroOuter: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: { borderRadius: 20 },
  heroBody: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 20, paddingBottom: 4 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  greeting: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  profileName: { fontSize: 24, fontWeight: '700', textAlign: 'center', maxWidth: '100%' },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    marginTop: 4,
    marginBottom: 8,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  editPillText: { fontSize: 13, fontWeight: '600' },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 48 },
  sectionTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginLeft: 20 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 8 },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  settingsTextCol: { flex: 1 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingsLabel: { fontSize: 16, fontWeight: '500' },
  settingsSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  footer: { marginHorizontal: 16, marginTop: 32, marginBottom: 8, alignItems: 'center', gap: 10 },
  footerVersion: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  footerDesc: { fontSize: 11, textAlign: 'center' },
});
