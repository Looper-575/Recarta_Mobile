import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/order';
import { AppText, Button, Card, ErrorView, formatRs, Heading, Loading, Row, styles as ui } from '@/components/ui';
import { useOrder } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import { radius, spacing, useTheme } from '@/theme';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const order = useOrder(Number(id));
  const [busy, setBusy] = useState<'cancel' | 'reorder' | null>(null);

  if (order.isPending) return <Loading />;
  if (order.isError) return <ErrorView message={order.error.message} onRetry={order.refetch} />;

  const o = order.data;

  const act = async (action: 'cancel' | 'reorder') => {
    setBusy(action);
    try {
      const r = await api<{ message: string; skipped?: string[] }>(`orders/${o.id}/${action}`, { method: 'POST' });
      if (action === 'reorder') {
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
        if (r.skipped?.length) Alert.alert('', `${r.message}\n\n${r.skipped.join(', ')}`);
        router.navigate('/(tabs)/cart');
      } else {
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await order.refetch();
        Alert.alert('', r.message);
      }
    } catch (e) {
      Alert.alert('', e instanceof ApiError ? e.field('order') ?? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = () =>
    Alert.alert(t('orders.cancelConfirm'), undefined, [
      { text: t('common.close'), style: 'cancel' },
      { text: t('orders.cancel'), style: 'destructive', onPress: () => act('cancel') },
    ]);

  return (
    <ScrollView contentContainerStyle={ui.screen} refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => void order.refetch()} />}>
      <Stack.Screen options={{ title: t('orders.order', { number: o.order_number }) }} />
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: spacing.md }]}>
        <StatusBadge label={o.status} color={o.status_color} />
        <AppText style={{ color: o.payment_status === 'paid' ? theme.success : theme.textMuted }}>
          {o.payment_method} · {o.payment_status === 'paid' ? t('orders.paid') : t('orders.unpaid')}
        </AppText>
      </View>

      {o.items.map((item) => (
        <View key={item.order_detail_id} style={[styles.item, { borderColor: theme.border }]}>
          <Image source={item.thumbnail} style={styles.image} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <AppText numberOfLines={2}>{item.title}</AppText>
            <AppText muted size={12}>{item.item_title} × {item.quantity}</AppText>
          </View>
          <AppText bold>{formatRs(item.total)}</AppText>
        </View>
      ))}

      <Card style={{ marginTop: spacing.lg }}>
        <Row label={t('checkout.items')} value={formatRs(o.totals.cart_total)} />
        {o.totals.delivery_charges > 0 ? <Row label={t('checkout.deliveryCharges')} value={formatRs(o.totals.delivery_charges)} /> : null}
        {o.totals.discount_amount > 0 ? (
          <Row
            label={`${o.totals.reward_type === 'discount' ? t('checkout.discount') : t('checkout.cashback')}${o.totals.discount_code ? ` (${o.totals.discount_code})` : ''}`}
            value={`${o.totals.reward_type === 'discount' ? '- ' : ''}${formatRs(o.totals.discount_amount)}`}
            color={theme.success}
          />
        ) : null}
        {o.totals.payment_charge !== 0 ? <Row label={o.totals.payment_charge_label} value={formatRs(o.totals.payment_charge)} /> : null}
        {o.totals.wallet_amount > 0 ? <Row label={t('checkout.walletUsed')} value={`- ${formatRs(o.totals.wallet_amount)}`} /> : null}
        <Row label={t('checkout.total')} value={formatRs(o.totals.total)} bold />
      </Card>

      <Heading>{t('orders.deliveryTo')}</Heading>
      <AppText>{o.customer.first_name} {o.customer.last_name} · {o.customer.phone}</AppText>
      {o.delivery.type === 'pickup' ? (
        <AppText muted>{t('checkout.pickup')} · {o.delivery.date} {o.delivery.time}</AppText>
      ) : (
        <AppText muted>{[o.delivery.address, o.delivery.area, o.delivery.city].filter(Boolean).join(', ')}</AppText>
      )}

      {o.timeline.length ? (
        <>
          <Heading>{t('orders.timeline')}</Heading>
          {o.timeline.map((step, i) => (
            <View key={i} style={{ marginBottom: spacing.sm }}>
              <AppText bold>{step.status}</AppText>
              <AppText muted size={12}>{step.created_at ? new Date(step.created_at).toLocaleString() : ''}</AppText>
            </View>
          ))}
        </>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <Button title={t('orders.reorder')} onPress={() => act('reorder')} loading={busy === 'reorder'} />
        <Button title={t('orders.invoice')} variant="outline" onPress={() => WebBrowser.openBrowserAsync(o.invoice_url)} />
        {o.can_cancel ? <Button title={t('orders.cancel')} variant="danger" onPress={confirmCancel} loading={busy === 'cancel'} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: 48, height: 48, borderRadius: radius.sm },
});
