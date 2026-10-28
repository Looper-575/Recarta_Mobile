import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { AppText, Empty, ErrorView, Loading } from '@/components/ui';
import { useNotifications } from '@/hooks/queries';
import { spacing, useTheme } from '@/theme';

/** Status changes on the customer's orders, as on the website's Notifications tab. */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const notifications = useNotifications();

  if (notifications.isPending) return <Loading />;
  if (notifications.isError) return <ErrorView message={notifications.error.message} onRetry={notifications.refetch} />;

  return (
    <FlatList
      data={notifications.data.pages.flatMap((p) => p.data)}
      keyExtractor={(n, i) => `${n.order_id}-${i}`}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={notifications.isRefetching} onRefresh={() => void notifications.refetch()} />}
      ListEmptyComponent={<Empty message={t('notifications.empty')} />}
      onEndReached={() => notifications.hasNextPage && !notifications.isFetchingNextPage && notifications.fetchNextPage()}
      ListFooterComponent={notifications.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
      renderItem={({ item: n }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(n.order_id) } })}
          style={[styles.row, { borderColor: theme.border }]}>
          <AppText bold>{t('orders.order', { number: n.order_number })} · {n.status}</AppText>
          {n.notes ? <AppText muted size={13}>{n.notes}</AppText> : null}
          <AppText muted size={12}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</AppText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
});
