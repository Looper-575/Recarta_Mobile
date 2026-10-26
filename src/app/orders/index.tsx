import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';

import { OrderRow } from '@/components/order';
import { Empty, ErrorView, Loading } from '@/components/ui';
import { useOrders } from '@/hooks/queries';
import { spacing } from '@/theme';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const orders = useOrders();

  if (orders.isPending) return <Loading />;
  if (orders.isError) return <ErrorView message={orders.error.message} onRetry={orders.refetch} />;

  return (
    <FlatList
      data={orders.data.pages.flatMap((p) => p.data)}
      keyExtractor={(o) => String(o.id)}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, flexGrow: 1 }}
      renderItem={({ item }) => <OrderRow order={item} />}
      refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} />}
      onEndReached={() => orders.hasNextPage && !orders.isFetchingNextPage && orders.fetchNextPage()}
      ListFooterComponent={orders.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
      ListEmptyComponent={<Empty message={t('orders.empty')} />}
    />
  );
}
