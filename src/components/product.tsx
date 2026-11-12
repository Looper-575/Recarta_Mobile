import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, formatRs, styles as ui } from '@/components/ui';
import { useAddToCart, useCart, useSetCartQuantity, useToggleWishlist, useWishlist } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import type { Product, ProductItem } from '@/lib/types';
import { useSession } from '@/state/session';
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

/**
 * A product box like the website's: picture with its discount, wishlist heart and
 * campaign badge; title; the variant (a choice when there's more than one); price; and
 * Add to cart, or a - qty + stepper once it's in the cart, or Out of stock.
 * Tapping elsewhere opens the product. `compact` is the small box for three across.
 */
export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const add = useAddToCart();
  const setQuantity = useSetCartQuantity();
  const cart = useCart();
  const wishlist = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const customer = useSession((s) => s.customer);
  const [itemId, setItemId] = useState(product.items[0]?.id);
  const item = product.items.find((i) => i.id === itemId) ?? product.items[0];

  // Lists send each variant's stock; without it (an older server) the product's status decides.
  const stock = item ? product.stock?.[item.id] : undefined;
  const purchasable = product.sellable && !!item && stock !== 'out_of_stock' && stock !== 'unavailable';
  const inCart = (item && cart.data?.items.find((l) => l.item_id === item.id)?.quantity) || 0;
  const inWishlist = !!item && !!wishlist.data?.some((w) => w.item_id === item.id);
  const busy = add.isPending || setQuantity.isPending;

  const onError = (e: Error) =>
    Alert.alert('', e instanceof ApiError ? e.field('quantity') ?? e.field('item_id') ?? e.message : e.message);
  const changeQuantity = (quantity: number) => item && setQuantity.mutate({ item_id: item.id, quantity }, { onError });
  // Text sizes for the full box, or the compact one.
  const fs = compact ? { title: 12, price: 12, small: 10, step: 15 } : { title: 14, price: 14, small: 12, step: 18 };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
      style={[styles.card, compact && styles.compactCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View>
        <Image source={product.thumbnail} style={styles.image} contentFit="contain" transition={150} />
        {item && item.discount > 0 ? (
          <View style={[styles.discount, compact && styles.compactBadge, { backgroundColor: theme.primary }]}>
            <AppText size={compact ? 9 : 11} bold style={{ color: theme.onPrimary }}>{Math.round(item.discount)}%</AppText>
          </View>
        ) : null}
        {item ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('product.wishlist')}
            onPress={() => (customer ? toggleWishlist.mutate({ itemId: item.id, add: !inWishlist }) : router.push('/login'))}
            style={[styles.heart, compact && styles.compactBadge, { backgroundColor: theme.background }]}>
            <AppText size={compact ? 13 : 16} style={{ color: theme.primary }}>{inWishlist ? '♥' : '♡'}</AppText>
          </Pressable>
        ) : null}
        {product.save_up_to ? (
          <View style={[styles.campaign, { backgroundColor: theme.success }]}>
            <AppText size={compact ? 8 : 10} bold style={{ color: '#fff' }} numberOfLines={1}>
              ⚡ {t('product.saveUpTo', { pct: product.save_up_to })}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText numberOfLines={2} size={fs.title} style={{ minHeight: compact ? 32 : 38 }}>
        {product.title}
      </AppText>
      {product.items.length > 1 && item ? (
        <VariantPicker items={product.items} value={item} onChange={(i) => setItemId(i.id)} size={fs.small} />
      ) : item ? (
        <View style={[styles.variant, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <AppText size={fs.small} muted numberOfLines={1}>{item.title}</AppText>
        </View>
      ) : null}
      {item ? <Price price={item.price} original={item.original_price} size={fs.price} /> : null}
      <View style={{ marginTop: 'auto', paddingTop: spacing.xs }}>
        {inCart > 0 ? (
          <View style={[styles.button, styles.stepper, compact && styles.compactButton, { borderColor: theme.primary }]}>
            <Pressable hitSlop={6} disabled={busy} onPress={() => changeQuantity(inCart - 1)} style={[styles.step, compact && styles.compactStep]} accessibilityLabel="−">
              <AppText bold size={fs.step} style={{ color: theme.primary }}>−</AppText>
            </Pressable>
            {busy ? <ActivityIndicator size="small" color={theme.primary} /> : <AppText bold size={compact ? 13 : 15}>{inCart}</AppText>}
            <Pressable hitSlop={6} disabled={busy} onPress={() => changeQuantity(inCart + 1)} style={[styles.step, compact && styles.compactStep]} accessibilityLabel="+">
              <AppText bold size={fs.step} style={{ color: theme.primary }}>+</AppText>
            </Pressable>
          </View>
        ) : purchasable && compact ? (
          <Pressable
            accessibilityRole="button"
            disabled={add.isPending}
            onPress={() => item && add.mutate({ item_id: item.id }, { onError })}
            style={[styles.button, styles.compactButton, styles.soldOut, { backgroundColor: theme.primary }]}>
            {add.isPending ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <AppText size={12} bold style={{ color: theme.onPrimary }}>{t('product.add')}</AppText>
            )}
          </Pressable>
        ) : purchasable ? (
          <Button
            title={t('product.addToCart')}
            onPress={() => item && add.mutate({ item_id: item.id }, { onError })}
            loading={add.isPending}
            style={styles.button}
          />
        ) : (
          <View style={[styles.button, styles.soldOut, compact && styles.compactButton, { backgroundColor: theme.surface }]}>
            <AppText size={compact ? 11 : 13} muted numberOfLines={1}>{product.sellable ? t('product.outOfStock') : product.status_label || t('product.outOfStock')}</AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** A compact variant box that opens a small list to pick from. */
function VariantPicker({
  items,
  value,
  onChange,
  size = 12,
}: {
  items: ProductItem[];
  value: ProductItem;
  onChange: (item: ProductItem) => void;
  size?: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.variant, { borderColor: theme.border }]}>
        <AppText size={size} numberOfLines={1} style={{ flex: 1 }}>{value.title}</AppText>
        <AppText size={size} muted>▾</AppText>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            {items.map((i) => (
              <Pressable
                key={i.id}
                onPress={() => {
                  onChange(i);
                  setOpen(false);
                }}
                style={[styles.option, { borderColor: theme.border }]}>
                <AppText bold={i.id === value.id} style={{ flex: 1 }}>{i.title}</AppText>
                <AppText size={13} muted>{formatRs(i.price)}</AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * The products of every loaded page, each once. A product the server listed on two
 * pages (pages shifted between loads) would otherwise appear twice.
 */
export function productsOf(pages: { data: Product[] }[] | undefined): Product[] {
  const seen = new Set<number>();
  return (pages ?? []).flatMap((p) => p.data).filter((p) => !seen.has(p.id) && seen.add(p.id));
}

/** Product list, three compact boxes a row, that loads the next page as it scrolls. */
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
      numColumns={3}
      columnWrapperStyle={{ gap: spacing.sm }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / 3 }}>
          <ProductCard product={item} compact />
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
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  button: { minHeight: 38, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  soldOut: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  // The compact box (three across): tighter padding, smaller button and badges.
  compactCard: { padding: 6, gap: 3 },
  compactButton: { minHeight: 30, paddingVertical: 2, paddingHorizontal: 4 },
  compactStep: { paddingHorizontal: spacing.sm, paddingVertical: 0 },
  compactBadge: { transform: [{ scale: 0.8 }], top: 0 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md },
  step: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  // Over the picture: discount top left, heart top right, campaign along the bottom.
  discount: { position: 'absolute', top: 4, left: 4, minWidth: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  heart: { position: 'absolute', top: 4, right: 4, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  campaign: { position: 'absolute', bottom: spacing.xs, left: 0, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  variant: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { borderRadius: radius.md, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, marginBottom: spacing.xs },
});
