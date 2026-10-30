import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, styles } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { handleNotificationTaps, registerForPush } from '@/lib/push';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // A 4xx won't change by asking again; a dropped connection might.
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

export default function RootLayout() {
  const hydrated = useSession((s) => s.hydrated);

  useEffect(() => {
    useSession.getState().hydrate().finally(() => SplashScreen.hideAsync());
  }, []);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppStack />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const theme = useTheme();
  const { t } = useTranslation();
  const updateRequired = useSession((s) => s.updateRequired);

  // Order updates by push: register this phone, and open an order when its update is tapped.
  useEffect(() => {
    registerForPush();
    return handleNotificationTaps();
  }, []);

  if (updateRequired) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <AppText size={20} bold style={{ marginBottom: 12 }}>{t('update.title')}</AppText>
        <AppText muted style={{ textAlign: 'center' }}>{t('update.body')}</AppText>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: '' }} />
      <Stack.Screen name="category/[id]" options={{ title: '' }} />
      <Stack.Screen name="brand/[slug]" options={{ title: '' }} />
      <Stack.Screen name="checkout" options={{ title: t('checkout.title') }} />
      <Stack.Screen name="order-placed/[id]" options={{ title: t('placed.title'), headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="login" options={{ title: t('auth.login'), presentation: 'modal' }} />
      <Stack.Screen name="register" options={{ title: t('auth.register'), presentation: 'modal' }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.resetPassword'), presentation: 'modal' }} />
      <Stack.Screen name="orders/index" options={{ title: t('orders.title') }} />
      <Stack.Screen name="orders/[id]" options={{ title: '' }} />
      <Stack.Screen name="invoice/[id]" options={{ title: t('orders.invoiceTitle') }} />
      <Stack.Screen name="track" options={{ title: t('track.title') }} />
      <Stack.Screen name="profile" options={{ title: t('account.profile') }} />
      <Stack.Screen name="addresses" options={{ title: t('account.addresses') }} />
      <Stack.Screen name="address-edit" options={{ title: '' }} />
      <Stack.Screen name="wishlist" options={{ title: t('account.wishlist') }} />
      <Stack.Screen name="wallet" options={{ title: t('account.walletLink') }} />
      <Stack.Screen name="notifications" options={{ title: t('account.notifications') }} />
      <Stack.Screen name="returns" options={{ title: t('account.returns') }} />
      <Stack.Screen name="return/[orderId]" options={{ title: t('returns.request') }} />
      <Stack.Screen name="pay/[id]" options={{ title: t('pay.title'), gestureEnabled: false }} />
    </Stack>
  );
}
