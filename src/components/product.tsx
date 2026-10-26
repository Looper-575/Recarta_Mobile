import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, formatRs, styles as ui } from '@/components/ui';
import type { Product } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

/** Price with the struck-through list price when it's discounted. */
export function Price({ price, original, size = 15 }: { price: number; original?: number; size?: number }) {
  const theme = useTheme();
  return (
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <AppText bold size={size} style={{ color: theme.primary, marginRight: spacing.sm }}>
        {formatRs(price)}
      </AppText>
      {original && original > price ? (
        <AppText muted size={size - 2} style={{ textDecorationLine: 'line-through' }}>
          {formatRs(original)}
        </AppText>
      ) : null}
    </View>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const item = product.items[0];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <Image source={product.thumbnail} style={styles.image} contentFit="contain" transition={150} />
      <AppText numberOfLines={2} size={14} style={{ minHeight: 38 }}>
        {product.title}
      </AppText>
      {item ? <Price price={item.price} original={item.original_price} size={14} /> : null}
      {!product.sellable ? (
        <AppText size={12} style={{ color: theme.danger }}>{product.status_label || t('product.outOfStock')}</AppText>
      ) : null}
    </Pressable>
  );
}

/** Two-column product list that loads the next page as it scrolls. */
export function ProductGrid({
  products,
  onEndReached,
  loadingMore,
  header,
  empty,
}: {
  products: Product[];
  onEndReached?: () => void;
  loadingMore?: boolean;
  header?: React.ReactElement;
  empty?: React.ReactElement;
}) {
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: spacing.md }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / 2 }}>
          <ProductCard product={item} />
        </View>
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, marginBottom: spacing.xs },
});
