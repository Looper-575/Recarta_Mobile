import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import { storeConfig } from '@/lib/config';

/**
 * Order updates by push. The token is sent to the store at every launch (and again
 * after logging in, so the server knows whose phone it is); the server sends through
 * Expo whenever an order's status changes. Push needs a development or store build:
 * Expo Go on Android has no remote push, and an EAS project id must be set.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      // Android 13+ shows the permission prompt only once a channel exists.
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const status = existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await api('devices', {
      method: 'POST',
      body: { expo_push_token: token, platform: Platform.OS, app_version: storeConfig.appVersion },
    });
  } catch {
    // No push on this device or build (Expo Go, simulator, no network): the app works without it.
  }
}

/** Before logging out: this phone stops getting that customer's order updates. */
export async function forgetPushDevice(): Promise<void> {
  if (!currentToken) return;
  try {
    await api('devices', { method: 'DELETE', body: { expo_push_token: currentToken } });
  } catch {
    // Logged out either way.
  }
}

/** Tapping an order update opens that order. Returns the unsubscribe. */
export function handleNotificationTaps(): () => void {
  const open = (data: Record<string, unknown> | undefined) => {
    const orderId = data?.order_id;
    if (orderId) router.push({ pathname: '/orders/[id]', params: { id: String(orderId) } });
  };

  // The app was opened by tapping a notification.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) open(response.notification.request.content.data);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    open(response.notification.request.content.data),
  );
  return () => subscription.remove();
}
