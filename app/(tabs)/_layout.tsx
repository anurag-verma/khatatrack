import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart3, Plus, User, List } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../src/store/theme';
import { hydrateAppData, useStore } from '../../src/store/useStore';
import AddTransactionSheet from '../../src/components/AddTransactionSheet';

function CustomTabBar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t: tr } = useTranslation();

  const isAnalytics = pathname.includes('analytics');
  const isProfile = pathname.includes('profile');
  const isTransactions = pathname.includes('transactions');
  const activeTab = isAnalytics ? 'analytics' : isProfile ? 'profile' : isTransactions ? 'transactions' : 'home';

  const goToTab = (tab: 'index' | 'transactions' | 'analytics' | 'profile') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate(tab === 'index' ? '/(tabs)' : `/(tabs)/${tab}`);
  };

  const openTransactionSheet = useStore((s) => s.openTransactionSheet);

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    openTransactionSheet();
  };

  const tabs = [
    { id: 'home' as const, route: 'index' as const, icon: Home, label: tr('home') },
    { id: 'transactions' as const, route: 'transactions' as const, icon: List, label: tr('transactions') },
    { id: 'analytics' as const, route: 'analytics' as const, icon: BarChart3, label: tr('analytics') },
    { id: 'profile' as const, route: 'profile' as const, icon: User, label: tr('profile') },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: t.bg }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border }]}>
        {tabs.slice(0, 2).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => goToTab(tab.route)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrapper}>
              {activeTab === tab.id ? <View style={[styles.activeDot, { backgroundColor: t.upiBlue }]} /> : null}
              <tab.icon size={22} color={activeTab === tab.id ? t.upiBlue : t.textMuted} />
            </View>
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? t.upiBlue : t.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleAddPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={tr('addTransaction')}
          >
            <View style={[styles.fabInner, { backgroundColor: t.upiBlue, borderColor: t.card }]}>
              <Plus size={28} color="#fff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </View>

        {tabs.slice(2).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => goToTab(tab.route)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrapper}>
              {activeTab === tab.id ? <View style={[styles.activeDot, { backgroundColor: t.upiBlue }]} /> : null}
              <tab.icon size={22} color={activeTab === tab.id ? t.upiBlue : t.textMuted} />
            </View>
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? t.upiBlue : t.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const t = useTheme();

  useEffect(() => {
    void hydrateAppData();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="transactions" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <CustomTabBar />
      <AddTransactionSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 70, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minHeight: 48 },
  iconWrapper: { alignItems: 'center', justifyContent: 'center', height: 30, marginBottom: 2 },
  activeDot: { position: 'absolute', top: -4, width: 4, height: 4, borderRadius: 2 },
  tabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  fabContainer: { alignItems: 'center', justifyContent: 'center', width: 60, marginBottom: 6 },
  fabButton: { alignItems: 'center', justifyContent: 'center', minWidth: 52, minHeight: 52 },
  fabInner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
