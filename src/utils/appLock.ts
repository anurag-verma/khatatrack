import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';

/** True when running inside Expo Go (limited native APIs). */
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

let authenticating = false;
let unlockGraceUntil = 0;

const UNLOCK_GRACE_MS = 4000;

let backgroundLockTimer: ReturnType<typeof setTimeout> | null = null;

export function isLockAuthenticating(): boolean {
  return authenticating;
}

export function isInUnlockGracePeriod(): boolean {
  return Date.now() < unlockGraceUntil;
}

export function shouldSkipBackgroundLock(): boolean {
  return authenticating || isInUnlockGracePeriod();
}

function markUnlockGrace(): void {
  unlockGraceUntil = Date.now() + UNLOCK_GRACE_MS;
}

/** Cancel any pending background lock (call after successful unlock). */
export function cancelPendingBackgroundLock(): void {
  if (backgroundLockTimer) {
    clearTimeout(backgroundLockTimer);
    backgroundLockTimer = null;
  }
}

export type AuthResult = {
  success: boolean;
  error?: string;
};

/** Prompt biometric or device PIN/passcode. */
export async function authenticateUser(
  promptMessage: string,
  cancelLabel: string,
): Promise<AuthResult> {
  cancelPendingBackgroundLock();
  authenticating = true;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false,
      ...(Platform.OS === 'android' ? { biometricsSecurityLevel: 'weak' as const } : {}),
    });
    if (result.success) {
      markUnlockGrace();
      cancelPendingBackgroundLock();
      return { success: true };
    }
    return { success: false, error: 'error' in result ? result.error : undefined };
  } catch {
    return { success: false, error: 'unknown' };
  } finally {
    authenticating = false;
  }
}

/** Check if lock can be offered (hardware or device credential). */
export async function getAppLockAvailability(): Promise<{
  available: boolean;
  biometricsEnrolled: boolean;
  hasBiometricHardware: boolean;
}> {
  const [hasBiometricHardware, biometricsEnrolled, securityLevel] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE),
  ]);

  const hasDeviceSecurity =
    securityLevel !== LocalAuthentication.SecurityLevel.NONE || biometricsEnrolled;

  return {
    available: hasBiometricHardware || hasDeviceSecurity,
    biometricsEnrolled,
    hasBiometricHardware,
  };
}

/** Only lock when the user actually left the app (not tab switches or biometric overlay). */
export function subscribeAppLockOnBackground(onLock: () => void): () => void {
  let previous = AppState.currentState;

  const subscription = AppState.addEventListener('change', (next) => {
    const wasActive = previous === 'active';
    previous = next;

    if (next === 'active') {
      cancelPendingBackgroundLock();
    }

    if (shouldSkipBackgroundLock()) return;

    // Lock only on a real leave (active → background), not active → inactive (biometric sheet).
    if (wasActive && next === 'background') {
      cancelPendingBackgroundLock();
      backgroundLockTimer = setTimeout(() => {
        backgroundLockTimer = null;
        if (AppState.currentState !== 'background') return;
        if (shouldSkipBackgroundLock()) return;
        onLock();
      }, 800);
    }
  });

  return () => {
    cancelPendingBackgroundLock();
    subscription.remove();
  };
}
