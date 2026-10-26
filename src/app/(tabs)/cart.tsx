import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, Empty, ErrorView, formatRs, Loading, Row, styles as ui } from '@/components/ui';
import { useCart, useRemoveFromCart, useSetCartQuantity } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import type { CartLine } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

export default function CartScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const cart = useCart();

  if (cart.isPending) return <Loading />;
  if (cart.isError) return <ErrorView message={cart.error.message} onRetry={cart.refetch} />;

  const c = cart.data;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <AppText size={20} bold style={{ padding: spacing.lg }}>{t('cart.title')}</AppText>
      {c.items.length === 0 ? (
        <Empty message={t('cart.empty')} action={<Button title={t('cart.startShopping')} onPress={() => router.navigate('/(tabs)')} />} />
      ) : (
        <>
          <FlatList
            data={c.items}
            keyExtractor={(l) => String(l.item_id)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            refreshControl={<RefreshControl refreshing={cart.isRefetching} onRefresh={() => void cart.refetch()} />}
            renderItem={({ item }) => <Line line={item} />}
            ListFooterComponent={
              <View style={{ marginTop: spacing.md }}>
                {c.campaigns.map((camp) => (
                  <AppText key={camp.campaign_title} size={13} style={{ color: theme.success, marginBottom: spacing.xs }}>
                    {camp.fully_applied
                      ? t('cart.campaignApplied', { pct: camp.next_discount, title: camp.campaign_title })
                      : t('cart.campaignNeeded', { needed: camp.needed, pct: camp.next_discount, title: camp.campaign_title })}
                  </AppText>
                ))}
                {c.free_delivery_from ? (
                  <AppText muted size={13}>{t('cart.freeDeliveryFrom', { amount: c.free_delivery_from })}</AppText>
                ) : null}
              </View>
            }
          />
          <Card style={{ margin: spacing.lg, marginBottom: spacing.md }}>
            {c.bulk_discount > 0 ? <Row label={t('cart.bulkDiscount')} value={`- ${formatRs(c.bulk_discount)}`} color={theme.success} /> : null}
            <Row label={t('cart.subtotal')} value={formatRs(c.subtotal)} bold />
            <Button title={t('cart.checkout')} disabled={!c.can_checkout} onPress={() => router.push('/checkout')} style={{ marginTop: spacing.md }} />
          </Card>
        </>
      )}
    </SafeAreaView>
  );
}

function Line({ line }: { line: CartLine }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const setQty = useSetCartQuantity();
  const remove = useRemoveFromCart();
  const busy = setQty.isPending || remove.isPending;

  const change = (quantity: number) =>
    setQty.mutate(
      { item_id: line.item_id, quantity },
      { onError: (e) => Alert.alert('', e instanceof ApiError ? e.field('quantity') ?? e.message : e.message) },
    );

  return (
    <View style={[styles.line, { borderColor: theme.border, opacity: busy ? 0.6 : 1 }]}>
      <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(line.product_id) } })}>
        <Image source={line.image} style={styles.image} contentFit="contain" />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2}>{line.product_title}</AppText>
        <AppText muted size={12}>{line.item_title}</AppText>
        <View style={[ui.row, { gap: spacing.sm }]}>
          <AppText bold style={{ color: theme.primary }}>{formatRs(line.effective_price)}</AppText>
          {line.effective_price < line.price ? (
            <AppText muted size={12} style={{ textDecorationLine: 'line-through' }}>{formatRs(line.price)}</AppText>
          ) : null}
        </View>
        {line.problem ? <AppText size={12} style={{ color: theme.danger }}>{line.problem}</AppText> : null}
        <View style={[ui.row, { justifyContent: 'space-between', marginTop: spacing.xs }]}>
          <View style={[ui.row, styles.stepper, { borderColor: theme.border }]}>
            <StepButton label="−" disabled={busy} onPress={() => (line.quantity > 1 ? change(line.quantity - 1) : remove.mutate(line.item_id))} />
            <AppText style={{ minWidth: 32, textAlign: 'center' }}>{line.quantity}</AppText>
            <StepButton label="+" disabled={busy || !line.available} onPress={() => change(line.quantity + 1)} />
          </View>
          <Button title={t('cart.remove')} variant="link" onPress={() => remove.mutate(line.item_id)} />
        </View>
      </View>
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, opacity: disabled ? 0.4 : 1 }}>
      <AppText size={18} bold style={{ color: theme.primary }}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: 72, height: 72, borderRadius: radius.sm },
  stepper: { borderWidth: 1, borderRadius: radius.md },
});
