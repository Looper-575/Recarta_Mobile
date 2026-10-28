import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { StatusBadge } from '@/components/order';
import { AppText, Button, Card, ErrorText, formatRs, styles, TextField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { OrderSummary } from '@/lib/types';
import { spacing } from '@/theme';

type Tracked = OrderSummary & { timeline: { status: string; created_at: string | null }[] };

/** Guest tracking: the order number plus the phone number it was placed with. */
export default function TrackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ number?: string }>();
  const [number, setNumber] = useState(params.number ?? '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Tracked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const r = await api<{ data: Tracked }>(`track/${encodeURIComponent(number.trim())}`, { query: { phone: phone.trim() } });
      setOrder(r.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.field('phone') ?? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <TextField label={t('track.number')} value={number} onChangeText={setNumber} autoCapitalize="characters" />
      <TextField label={t('track.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title={t('track.find')} onPress={find} loading={busy} disabled={!number.trim() || !phone.trim()} />

      {order ? (
        <Card style={{ marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <AppText bold size={17}>{t('orders.order', { number: order.order_number })}</AppText>
            <StatusBadge label={order.status} color={order.status_color} />
            <AppText>{formatRs(order.total)} · {order.payment_status === 'paid' ? t('orders.paid') : t('orders.unpaid')}</AppText>
            {order.timeline.map((step, i) => (
              <AppText key={i} muted size={13}>
                {step.status} · {step.created_at ? new Date(step.created_at).toLocaleString() : ''}
              </AppText>
            ))}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
