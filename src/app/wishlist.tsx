import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Price } from '@/components/product';
import { AppText, Button, Empty, ErrorView, Loading } from '@/components/ui';
import { useAddToCart, useToggleWishlist, useWishlist } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { radius, spacing, useTheme } from '@/theme';

export default function WishlistScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const wishlist = useWishlist();
  const toggle = useToggleWishlist();
  const add = useAddToCart();

  if (wishlist.isPending) return <Loading />;
  if (wishlist.isError) return <ErrorView message={wishlist.error.message} onRetry={wishlist.refetch} />;

  return (
    <FlatList
      data={wishlist.data}
      keyExtractor={(w) => String(w.item_id)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      ListEmptyComponent={<Empty message={t('wishlist.empty')} />}
      renderItem={({ item: w }) => (
        <View style={[styles.row, { borderColor: theme.border }]}>
          <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(w.product_id) } })}>
            <Image source={w.thumbnail} style={styles.image} contentFit="contain" />
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText numberOfLines={2}>{w.title}</AppText>
            <AppText muted size={12}>{w.item_title}</AppText>
            <Price price={w.price} original={w.original_price} size={14} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {w.sellable ? (
                <Button
                  title={t('product.addToCart')}
                  variant="link"
                  onPress={() =>
                    add.mutate(
                      { item_id: w.item_id },
                      {
                        onSuccess: () => Alert.alert('', t('product.added')),
                        onError: (e) => Alert.alert('', e instanceof ApiError ? e.field('quantity') ?? e.message : e.message),
                      },
                    )
                  }
                />
              ) : (
                <AppText size={12} style={{ color: theme.danger, paddingVertical: spacing.sm }}>{t('product.outOfStock')}</AppText>
              )}
              <Button title={t('cart.remove')} variant="link" onPress={() => toggle.mutate({ itemId: w.item_id, add: false })} />
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: 72, height: 72, borderRadius: radius.sm },
});
