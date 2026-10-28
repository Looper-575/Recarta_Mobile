import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, ErrorText, ErrorView, Loading, styles as ui, TextField } from '@/components/ui';
import { useOrder } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import { radius, spacing, useTheme } from '@/theme';

/** Ask to return some or all of a delivered order, as on the website's order list. */
export default function ReturnRequestScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const order = useOrder(Number(orderId));
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [full, setFull] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (order.isPending) return <Loading />;
  if (order.isError) return <ErrorView message={order.error.message} onRetry={order.refetch} />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ message: string }>(`orders/${orderId}/returns`, {
        method: 'POST',
        body: { reason, full, quantities: full ? {} : quantities },
      });
      await queryClient.invalidateQueries({ queryKey: ['returns'] });
      await queryClient.invalidateQueries({ queryKey: ['order', Number(orderId)] });
      Alert.alert('', r.message);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: spacing.md }]}>
          <AppText bold>{t('returns.everything')}</AppText>
          <Switch value={full} onValueChange={setFull} trackColor={{ true: theme.primary }} />
        </View>

        {!full
          ? order.data.items.map((item) => {
              const max = item.quantity - item.returned_quantity;
              const qty = quantities[item.order_detail_id] ?? 0;
              const set = (q: number) => setQuantities({ ...quantities, [item.order_detail_id]: Math.max(0, Math.min(max, q)) });
              return (
                <View key={item.order_detail_id} style={[styles.item, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={2}>{item.title}</AppText>
                    <AppText muted size={12}>{item.item_title} · {t('returns.ordered', { count: item.quantity })}</AppText>
                  </View>
                  {max > 0 ? (
                    <View style={[ui.row, styles.stepper, { borderColor: theme.border }]}>
                      <Pressable onPress={() => set(qty - 1)} hitSlop={8} style={styles.step}><AppText bold style={{ color: theme.primary }}>−</AppText></Pressable>
                      <AppText style={{ minWidth: 28, textAlign: 'center' }}>{qty}</AppText>
                      <Pressable onPress={() => set(qty + 1)} hitSlop={8} style={styles.step}><AppText bold style={{ color: theme.primary }}>+</AppText></Pressable>
                    </View>
                  ) : (
                    <AppText muted size={12}>{t('returns.alreadyReturned')}</AppText>
                  )}
                </View>
              );
            })
          : null}

        <TextField label={t('returns.reason')} value={reason} onChangeText={setReason} multiline style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }} error={error?.field('reason')} />
        {error && !error.field('reason') ? <ErrorText>{error.field('order') ?? error.message}</ErrorText> : null}
        <Button title={t('returns.submit')} onPress={submit} loading={busy} disabled={!reason.trim() || (!full && !Object.values(quantities).some((q) => q > 0))} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  stepper: { borderWidth: 1, borderRadius: radius.md },
  step: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
