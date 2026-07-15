import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, Share2, Users, Trash2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/store/theme';
import { useScreenInsets } from '../src/hooks/useScreenInsets';
import { formatIndianCurrency } from '../src/utils/currency';
import { getSplitGroups, getSplitMembers, addSplitGroup, deleteSplitGroup } from '../src/database/db';
import { SplitGroup, SplitMember } from '../src/types';
import EmptyState from '../src/components/ui/EmptyState';
import SectionCard from '../src/components/ui/SectionCard';
import ScreenHeader from '../src/components/ui/ScreenHeader';
import ConfirmModal from '../src/components/ConfirmModal';
import PrimaryActionButton from '../src/components/ui/PrimaryActionButton';

function MemberAvatar({ name }: { name: string }) {
  const t = useTheme();
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <View style={[memberStyles.avatar, { backgroundColor: t.upiBlue + '22' }]}>
      <Text style={[memberStyles.initial, { color: t.upiBlue }]}>{initial}</Text>
    </View>
  );
}

const memberStyles = StyleSheet.create({
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 13, fontWeight: '700' },
});

export default function SplitsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { modalContentPadding, top } = useScreenInsets();
  const { t: tr } = useTranslation();

  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [membersMap, setMembersMap] = useState<Record<number, SplitMember[]>>({});
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [memberNames, setMemberNames] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const g = await getSplitGroups();
    setGroups(g);
    const map: Record<number, SplitMember[]> = {};
    for (const group of g) {
      map[group.id] = await getSplitMembers(group.id);
    }
    setMembersMap(map);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAdd = async () => {
    const totalNum = parseFloat(total);
    const names = memberNames.split(',').map((n) => n.trim()).filter(Boolean);
    if (!title.trim() || isNaN(totalNum) || totalNum <= 0 || names.length < 2) {
      Alert.alert('Error', tr('splitMinMembers'));
      return;
    }

    const share = Math.round((totalNum / names.length) * 100) / 100;
    setSaving(true);
    try {
      await addSplitGroup(
        title.trim(),
        totalNum,
        names.map((name) => ({ name, share_amount: share })),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle('');
      setTotal('');
      setMemberNames('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const buildShareText = (group: SplitGroup, members: SplitMember[]) => {
    const perPersonLabel = tr('splitPerPerson');
    const lines = members.map((m) => `${m.name}: ${formatIndianCurrency(m.share_amount)}`).join('\n');
    return `*${group.title}*\n${formatIndianCurrency(group.total_amount)}\n${perPersonLabel}: ${formatIndianCurrency(members[0]?.share_amount ?? 0)}\n\n${lines}\n\n_KhataTrack_`;
  };

  const shareGroup = async (group: SplitGroup) => {
    const members = membersMap[group.id] || [];
    const text = buildShareText(group, members);
    const path = `${FileSystem.cacheDirectory}split.txt`;
    await FileSystem.writeAsStringAsync(path, text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { dialogTitle: tr('splitShareTitle'), mimeType: 'text/plain' });
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget !== null) {
      await deleteSplitGroup(deleteTarget);
      setDeleteTarget(null);
      await load();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={tr('cancel')}>
          <X size={24} color={t.text} />
        </TouchableOpacity>
      </View>
      <ScreenHeader title={tr('splits')} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: modalContentPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.upiBlue} />}
      >
        <SectionCard style={styles.form}>
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder={tr('splitTitlePlaceholder')}
            placeholderTextColor={t.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder="₹"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
            value={total}
            onChangeText={setTotal}
          />
          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.inputBg }]}
            placeholder={tr('splitNamesPlaceholder')}
            placeholderTextColor={t.textMuted}
            value={memberNames}
            onChangeText={setMemberNames}
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

        {groups.length === 0 ? (
          <EmptyState icon={<Users size={40} color={t.textMuted} />} title={tr('emptySplits')} body={tr('emptySplitsBody')} />
        ) : (
          groups.map((group) => {
            const members = membersMap[group.id] || [];
            const shareEach = members[0]?.share_amount ?? 0;
            return (
              <View key={group.id} style={[styles.groupCard, { backgroundColor: t.card }]}>
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupTitle, { color: t.text }]}>{group.title}</Text>
                    <Text style={[styles.groupTotal, { color: t.upiBlue }]}>{formatIndianCurrency(group.total_amount)}</Text>
                    <Text style={[styles.perPerson, { color: t.textMuted }]}>
                      {tr('splitPerPerson')}: {formatIndianCurrency(shareEach)}
                    </Text>
                  </View>
                  <View style={styles.groupActions}>
                    <TouchableOpacity onPress={() => shareGroup(group)} accessibilityLabel={tr('shareSummary')} style={styles.actionBtn}>
                      <Share2 size={20} color={t.upiBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteTarget(group.id)} accessibilityLabel={tr('delete')} style={styles.actionBtn}>
                      <Trash2 size={20} color={t.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.memberList}>
                  {members.map((m) => (
                    <View key={m.id} style={[styles.memberRow, { backgroundColor: t.inputBg }]}>
                      <MemberAvatar name={m.name} />
                      <Text style={[styles.memberName, { color: t.text }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={[styles.memberShare, { color: t.text }]}>{formatIndianCurrency(m.share_amount)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
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
  groupCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  groupTitle: { fontSize: 17, fontWeight: '700' },
  groupTotal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  perPerson: { fontSize: 12, marginTop: 4 },
  groupActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  memberList: { gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, gap: 10 },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500' },
  memberShare: { fontSize: 14, fontWeight: '700' },
});
