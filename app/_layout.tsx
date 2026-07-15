import React, { useCallback, useEffect, useState } from 'react';
import { Appearance, StyleSheet, View } from 'react-native';
import 'expo-linear-gradient';
import { Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, lightTheme, darkTheme } from '../src/store/theme';
import { initStore, syncThemeWithDevice, useStore } from '../src/store/useStore';
import { subscribeAppLockOnBackground } from '../src/utils/appLock';
import LockScreen from './lock-screen';
import BootstrapSplash, { SPLASH_BG } from '../src/components/BootstrapSplash';
import '../src/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp() {
  const theme = useStore((s) => s.theme);
  const appLocked = useStore((s) => s.appLocked);
  const lockEnabled = useStore((s) => s.lockEnabled);
  const onboarded = useStore((s) => s.onboarded);
  const setAppLocked = useStore((s) => s.setAppLocked);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const pathname = usePathname();
  const segments = useSegments();
  const [splashDismissed, setSplashDismissed] = useState(false);
  const onIndexRoute = pathname === '/' || pathname === '/index';
  const onOnboarding = segments.includes('onboarding');
  const onTabs = segments[0] === '(tabs)';

  // First launch only: loading, or not-yet-onboarded user on index before onboarding opens.
  // Returning users (onboarded) never see this. Modal onboarding leaves pathname on / — dismiss on navigate.
  const showJsSplash =
    !splashDismissed &&
    (onboarded === undefined ||
      !bootstrapDone ||
      (onboarded === false && onIndexRoute));

  useEffect(() => {
    if (splashDismissed) return;
    if (!bootstrapDone || onboarded === undefined) return;

    if (onboarded === true) {
      setSplashDismissed(true);
      return;
    }

    if (onOnboarding || onTabs || !onIndexRoute) {
      setSplashDismissed(true);
    }
  }, [splashDismissed, bootstrapDone, onboarded, onIndexRoute, onOnboarding, onTabs]);
  const showLockOverlay = lockEnabled && appLocked && bootstrapDone;

  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(SPLASH_BG);
  }, []);

  useEffect(() => {
    initStore()
      .catch((err) => console.error('[RootLayout] initStore error:', err))
      .finally(() => setBootstrapDone(true));
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      void AsyncStorage.getItem('theme').then((saved) => {
        if (!saved) syncThemeWithDevice();
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!lockEnabled) return;
    return subscribeAppLockOnBackground(() => setAppLocked(true));
  }, [lockEnabled, setAppLocked]);

  const stackBg = showJsSplash ? SPLASH_BG : theme === 'dark' ? darkTheme.bg : lightTheme.bg;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: stackBg }]}>
      <StatusBar style={showJsSplash || theme === 'dark' ? 'light' : 'dark'} backgroundColor={stackBg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: stackBg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-transaction" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="sms-review" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="budgets" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recurring" options={{ presentation: 'modal' }} />
        <Stack.Screen name="splits" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lock-screen" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      {showJsSplash && <BootstrapSplash onReady={hideNativeSplash} />}
      {showLockOverlay && (
        <View style={styles.lockOverlay} pointerEvents="box-none">
          <LockScreen />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
