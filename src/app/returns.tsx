import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { StatusBadge } from '@/components/order';
import { AppText, Empty, ErrorView, formatRs, Loading } from '@/components/ui';
import { useReturns } from '@/hooks/queries';
import { spacing, useTheme } from '@/theme';

export default function ReturnsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const returns = useReturns();

  if (returns.isPending) return <Loading />;
  if (returns.isError) return <ErrorView message={returns.error.message} onRetry={returns.refetch} />;

  return (
    <FlatList
      data={returns.data.pages.flatMap((p) => p.data)}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={returns.isRefetching} onRefresh={() => void returns.refetch()} />}
      ListEmptyComponent={<Empty message={t('returns.empty')} />}
      onEndReached={() => returns.hasNextPage && !returns.isFetchingNextPage && returns.fetchNextPage()}
      ListFooterComponent={returns.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
      renderItem={({ item: r }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(r.order_id) } })}
          style={[styles.row, { borderColor: theme.border }]}>
          <AppText bold>{t('orders.order', { number: r.order_number })}</AppText>
          <StatusBadge label={r.status} />
          <AppText muted size={13}>{r.reason}</AppText>
          <AppText size={13}>
            {t('returns.itemsAmount', {
              count: r.items.reduce((sum, i) => sum + i.quantity, 0),
              amount: formatRs(r.items.reduce((sum, i) => sum + i.amount, 0)),
            })}
          </AppText>
          <AppText muted size={12}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</AppText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
});
