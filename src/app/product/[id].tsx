import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, FlatList, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Price } from '@/components/product';
import { AppText, Button, Card, Chip, ErrorText, ErrorView, Heading, Loading, TextField } from '@/components/ui';
import { useAddToCart, useCart, useProduct, useToggleWishlist, useWishlist } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

const { width } = Dimensions.get('window');

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const product = useProduct(id);
  const cart = useCart();
  const add = useAddToCart();
  const wishlist = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const customer = useSession((s) => s.customer);
  const [itemId, setItemId] = useState<number | null>(null);
  const [notifyEmail, setNotifyEmail] = useState(customer?.email ?? '');
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyError, setNotifyError] = useState<string>();

  if (product.isPending) return <Loading />;
  if (product.isError) return <ErrorView message={product.error.message} onRetry={product.refetch} />;

  const p = product.data;
  const item = p.items.find((i) => i.id === itemId) ?? p.items[0];
  const stock = item ? p.stock[String(item.id)] : undefined;
  const canBuy = p.sellable && stock?.status !== 'out_of_stock' && stock?.status !== 'unavailable';
  const inCart = cart.data?.items.find((l) => l.item_id === item?.id)?.quantity ?? 0;
  const images = item?.images.length ? item.images : p.thumbnail ? [p.thumbnail] : [];
  const inWishlist = !!item && !!wishlist.data?.some((w) => w.item_id === item.id);
  const notifyRequested = notifyDone || (item ? p.notify_requested.includes(item.id) : false);

  const addToCart = () =>
    item &&
    add.mutate(
      { item_id: item.id },
      { onError: (e) => Alert.alert('', e instanceof ApiError ? e.field('quantity') ?? e.field('item_id') ?? e.message : e.message) },
    );

  const requestNotify = async () => {
    if (!item) return;
    setNotifyError(undefined);
    try {
      await api(`products/${p.id}/stock-notification`, { method: 'POST', body: { item_id: item.id, email: notifyEmail } });
      setNotifyDone(true);
    } catch (e) {
      setNotifyError(e instanceof ApiError ? e.field('email') ?? e.message : String(e));
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: p.url ? () => <Button title={t('product.share')} variant="link" onPress={() => Share.share({ message: `${p.title} ${p.url}` })} /> : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          renderItem={({ item: uri }) => <Image source={uri} style={{ width, height: width * 0.8 }} contentFit="contain" />}
        />
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {p.brand ? <AppText muted size={13}>{p.brand.title}</AppText> : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <AppText size={20} bold style={{ flex: 1 }}>{p.title}</AppText>
            {item ? (
              <Button
                title={inWishlist ? '♥' : '♡'}
                variant="link"
                onPress={() => (customer ? toggleWishlist.mutate({ itemId: item.id, add: !inWishlist }) : router.push('/login'))}
              />
            ) : null}
          </View>
          {item ? <Price price={item.price} original={item.original_price} size={20} /> : null}
          {stock ? (
            <AppText size={13} style={{ color: stock.status === 'in_stock' ? theme.success : stock.status === 'low_stock' ? theme.warning : theme.danger }}>
              {stock.label}
            </AppText>
          ) : null}

          {p.items.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
              {p.items.map((i) => (
                <Chip key={i.id} label={i.title} selected={i.id === item?.id} onPress={() => setItemId(i.id)} />
              ))}
            </View>
          ) : null}

          {p.campaign ? (
            <Card style={{ marginTop: spacing.sm }}>
              <AppText bold>{t('product.buyMore')}</AppText>
              {p.campaign.tiers.map((tier) => (
                <AppText key={tier.min_qty} size={13}>{t('product.tier', { min: tier.min_qty, pct: tier.discount_percentage })}</AppText>
              ))}
            </Card>
          ) : null}

          {canBuy ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Button title={t('product.addToCart')} onPress={addToCart} loading={add.isPending} />
              {inCart > 0 ? (
                <Button title={t('product.inCart', { count: inCart })} variant="link" onPress={() => router.navigate('/(tabs)/cart')} />
              ) : null}
            </View>
          ) : (
            <Card style={{ marginTop: spacing.md }}>
              <AppText bold style={{ color: theme.danger, marginBottom: spacing.sm }}>{stock?.label ?? t('product.outOfStock')}</AppText>
              {notifyRequested ? (
                <AppText>{t('product.notifyRequested')}</AppText>
              ) : (
                <>
                  <TextField label={t('product.notifyEmail')} value={notifyEmail} onChangeText={setNotifyEmail} keyboardType="email-address" autoCapitalize="none" />
                  {notifyError ? <ErrorText>{notifyError}</ErrorText> : null}
                  <Button title={t('product.notifyMe')} variant="outline" onPress={requestNotify} />
                </>
              )}
            </Card>
          )}

          {p.description ? (
            <>
              <Heading>{t('product.description')}</Heading>
              <AppText muted>{stripHtml(p.description)}</AppText>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Descriptions are HTML from the admin editor; shown as plain text for now. */
function stripHtml(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

