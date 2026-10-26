import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, formatRs } from '@/components/ui';
import type { OrderSummary } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

export function StatusBadge({ label, color }: { label: string; color?: string | null }) {
  const theme = useTheme();
  const tint = color && /^#/.test(color) ? color : theme.primary;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: `${tint}22` }}>
      <AppText size={12} bold style={{ color: tint }}>{label}</AppText>
    </View>
  );
}

export function OrderRow({ order }: { order: OrderSummary }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(order.id) } })}
      style={[styles.row, { borderColor: theme.border }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText bold>{t('orders.order', { number: order.order_number })}</AppText>
        <AppText muted size={12}>
          {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''} · {t('orders.items', { count: order.items_count })}
        </AppText>
        <StatusBadge label={order.status} color={order.status_color} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText bold>{formatRs(order.total)}</AppText>
        <AppText size={12} style={{ color: order.payment_status === 'paid' ? theme.success : theme.textMuted }}>
          {order.payment_status === 'paid' ? t('orders.paid') : t('orders.unpaid')}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md },
});
