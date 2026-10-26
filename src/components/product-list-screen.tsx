import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ProductGrid } from '@/components/product';
import { AppText, Chip, Empty, ErrorView, Loading } from '@/components/ui';
import type { Paginated, Product } from '@/lib/types';
import { spacing } from '@/theme';

/** A category's or brand's products, with the website's sort options. */
export function ProductListScreen<P extends Paginated<Product>>({
  query,
  sort,
  onSort,
}: {
  query: UseInfiniteQueryResult<InfiniteData<P>>;
  sort: string;
  onSort: (sort: string) => void;
}) {
  const { t } = useTranslation();

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorView message={query.error.message} onRetry={query.refetch} />;

  const products = query.data.pages.flatMap((p) => p.data);
  const total = query.data.pages[0]?.meta.total;
  const sorts = [
    { value: '1', label: t('list.sortNewest') },
    { value: '0', label: t('list.sortOldest') },
    { value: '2', label: t('list.sortAZ') },
    { value: '3', label: t('list.sortZA') },
  ];

  return (
    <ProductGrid
      products={products}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      loadingMore={query.isFetchingNextPage}
      header={
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sorts.map((s) => (
              <Chip key={s.value} label={s.label} selected={sort === s.value} onPress={() => onSort(s.value)} />
            ))}
          </ScrollView>
          {typeof total === 'number' ? (
            <AppText muted size={13} style={{ marginBottom: spacing.sm }}>{t('list.count', { count: total })}</AppText>
          ) : null}
        </View>
      }
      empty={<Empty message={t('common.nothingHere')} />}
    />
  );
}
