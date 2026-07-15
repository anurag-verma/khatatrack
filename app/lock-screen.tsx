import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../src/store/theme';
import { useStore } from '../src/store/useStore';
import Logo from '../src/components/Logo';
import { authenticateUser, cancelPendingBackgroundLock, isExpoGo } from '../src/utils/appLock';

export default function LockScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const setAppLocked = useStore((s) => s.setAppLocked);
  const setLockEnabled = useStore((s) => s.setLockEnabled);
  const [authenticating, setAuthenticating] = useState(false);
  const busy = useRef(false);

  const handleUnlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setAuthenticating(true);
    try {
      const { success, error } = await authenticateUser(tr('unlock'), tr('cancel'));
      if (success) {
        cancelPendingBackgroundLock();
        setAppLocked(false);
        return;
      }
      if (error && error !== 'user_cancel' && error !== 'system_cancel' && error !== 'app_cancel') {
        Alert.alert(tr('lockAuthFailed'), tr('lockAuthFailedDesc'));
      }
    } finally {
      setAuthenticating(false);
      busy.current = false;
    }
  }, [setAppLocked, tr]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top + 60 }]}>
      <Logo size="large" />
      <Text style={[styles.title, { color: t.text }]}>KhataTrack</Text>
      <Text style={[styles.subtitle, { color: t.textMuted }]}>{tr('lockApp')}</Text>

      {isExpoGo && (
        <Text style={[styles.expoHint, { color: t.textMuted }]}>{tr('expoGoLockHint')}</Text>
      )}

      <TouchableOpacity
        onPress={handleUnlock}
        disabled={authenticating}
        style={[styles.unlockBtn, { backgroundColor: t.upiBlue, opacity: authenticating ? 0.7 : 1 }]}
      >
        <Fingerprint size={24} color="#fff" />
        <Text style={styles.unlockText}>{authenticating ? tr('authenticating') : tr('unlock')}</Text>
      </TouchableOpacity>

      {isExpoGo && (
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.setItem('lockEnabled', 'false');
            setLockEnabled(false);
            setAppLocked(false);
          }}
          style={styles.disableLockBtn}
        >
          <Text style={[styles.disableLockText, { color: t.textMuted }]}>{tr('disableLockExpoGo')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 24 },
  subtitle: { fontSize: 14, marginTop: 8, marginBottom: 16, textAlign: 'center' },
  expoHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20, paddingHorizontal: 8 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
  unlockText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disableLockBtn: { marginTop: 28, padding: 12 },
  disableLockText: { fontSize: 13, textDecorationLine: 'underline' },
});
