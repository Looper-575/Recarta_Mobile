import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { AppText, Button, Loading, styles } from '@/components/ui';
import { api } from '@/lib/api';
import type { OrderDetail } from '@/lib/types';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

/**
 * PayFast's hosted payment page, inside the app. PayFast sends the customer back to the
 * website's /order-success/{id} or /order-failed/{id}; the app stops there and asks the
 * API whether the order is actually paid, never trusting the page it landed on (the
 * server only marks it paid on a callback signed by PayFast).
 */
export default function PayScreen() {
  const { id, url, number, total, phone } = useLocalSearchParams<{ id: string; url: string; number: string; total: string; phone?: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const loggedIn = useSession((s) => !!s.token);
  const [result, setResult] = useState<'checking' | 'paid' | 'unpaid' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const done = useRef(false);

  const isReturn = (target: string) => /\/order-(success|failed)\/\d+/.test(target);

  const checkPayment = async () => {
    setResult('checking');
    let paid = false;
    try {
      if (loggedIn) {
        const order = await api<{ data: OrderDetail }>(`orders/${id}`).then((r) => r.data);
        paid = order.payment_status === 'paid';
      } else if (number && phone) {
        const tracked = await api<{ data: { payment_status: string } }>(`track/${encodeURIComponent(number)}`, { query: { phone } });
        paid = tracked.data.payment_status === 'paid';
      }
    } catch {
      paid = false;
    }
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await queryClient.invalidateQueries({ queryKey: ['order', Number(id)] });
    setResult(paid ? 'paid' : 'unpaid');
  };

  const onNavigation = (nav: WebViewNavigation) => {
    if (!done.current && isReturn(nav.url)) {
      done.current = true;
      checkPayment();
    }
  };

  if (result === 'checking') return <Loading />;

  if (result) {
    const goToOrder = () =>
      loggedIn
        ? router.replace({ pathname: '/orders/[id]', params: { id } })
        : router.replace({ pathname: '/order-placed/[id]', params: { id, number, total } });

    return (
      <View style={[styles.center, { gap: spacing.md }]}>
        <Stack.Screen options={{ title: t('pay.title'), headerBackVisible: false }} />
        <AppText size={48} style={{ color: result === 'paid' ? theme.success : theme.danger }}>{result === 'paid' ? '✓' : '!'}</AppText>
        <AppText size={18} bold style={{ textAlign: 'center' }}>{result === 'paid' ? t('pay.paid') : t('pay.notPaid')}</AppText>
        {result === 'unpaid' ? <AppText muted style={{ textAlign: 'center' }}>{t('pay.notPaidBody')}</AppText> : null}
        {result === 'unpaid' ? (
          <Button
            title={t('pay.tryAgain')}
            onPress={() => {
              done.current = false;
              setAttempt((a) => a + 1);
              setResult(null);
            }}
            style={{ alignSelf: 'stretch' }}
          />
        ) : null}
        <Button title={result === 'paid' ? t('placed.viewOrder') : t('pay.later')} variant={result === 'paid' ? 'primary' : 'outline'} onPress={goToOrder} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('pay.title') }} />
      <WebView
        key={attempt}
        source={{ uri: url }}
        startInLoadingState
        renderLoading={() => <Loading />}
        onNavigationStateChange={onNavigation}
        onShouldStartLoadWithRequest={(request) => {
          if (isReturn(request.url)) {
            onNavigation(request as unknown as WebViewNavigation);
            return false;
          }
          return true;
        }}
      />
    </>
  );
}
