import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestSmsPermission } from './smsParser';

export type OnboardingPermissionResult = {
  smsGranted: boolean;
  notificationsGranted: boolean;
};

/** Request SMS (Android) and notification permissions during onboarding. */
export async function requestOnboardingPermissions(): Promise<OnboardingPermissionResult> {
  let smsGranted = true;
  let notificationsGranted = true;

  if (Platform.OS === 'android') {
    smsGranted = await requestSmsPermission();
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    notificationsGranted = status === 'granted';
  }

  return { smsGranted, notificationsGranted };
}
