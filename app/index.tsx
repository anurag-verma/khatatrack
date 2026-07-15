import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SPLASH_BG } from '../src/components/BootstrapSplash';
import { useStore } from '../src/store/useStore';

export default function Index() {
  const router = useRouter();
  const onboarded = useStore((s) => s.onboarded);
  const lockEnabled = useStore((s) => s.lockEnabled);
  const appLocked = useStore((s) => s.appLocked);

  useEffect(() => {
    if (onboarded === undefined) return;
    if (!onboarded) {
      router.replace('/onboarding');
      return;
    }
    if (lockEnabled && appLocked) return;
    router.replace('/(tabs)');
  }, [onboarded, lockEnabled, appLocked, router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
});
