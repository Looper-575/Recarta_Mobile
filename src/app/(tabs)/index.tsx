import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySlider, openCategory } from '@/components/category';
import { CityPicker } from '@/components/city-picker';
import { ProductCard } from '@/components/product';
import { SideMenu } from '@/components/side-menu';
import { AppText, ErrorView, Heading, Loading } from '@/components/ui';
import { useCategories, useCategoryProducts, useHome, useSettings } from '@/hooks/queries';
import { openStoreLink } from '@/lib/links';
import type { Category, Home, Product } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

const { width } = Dimensions.get('window');
// Three compact cards across the screen, as the website shows them on a phone.
const cardGap = spacing.sm;
const cardWidth = (width - 2 * spacing.lg - 2 * cardGap) / 3;

type Banner = Home['banners'][string][number];

/**
 * The website's home page, top to bottom: slides, categories, promo cards, featured
 * products, then a carousel per featured category with the banners between them
 * (first banner, 2 categories, second banner, 2 more, services and four banners, the
 * rest), a slim
 * banner, top brands. Banners and cards are set up in the admin; empty sections hide.
 * The header has the ☰ menu, the logo and the "Deliver to" city picker.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: settings } = useSettings();
  const home = useHome();
  const tree = useCategories().data ?? [];

  if (home.isPending) return <Loading />;
  if (home.isError) return <ErrorView message={home.error.message} onRetry={home.refetch} />;

  const { slides, banners, promo_cards, parent_categories, featured_categories, featured_products, brands } = home.data;
  const open = (link: string | null) => link && openStoreLink(link, tree);
  const twoBanners = banners.two_banner_section ?? [];
  const fourBanners = banners.four_banner_section ?? [];
  const slimBanner = banners.slim_banner_section?.[0];
  // Videos need a native player the app doesn't ship yet; image cards only.
  const promoCards = promo_cards.filter((c) => c.media && c.media_type !== 'video');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} />}>
        <View style={styles.header}>
          <SideMenu />
          {settings?.store.logo ? (
            <Image source={settings.store.logo} style={styles.logo} contentFit="contain" />
          ) : (
            <AppText size={20} bold style={{ flexShrink: 1 }}>{settings?.store.name}</AppText>
          )}
          <View style={{ flex: 1 }} />
          <CityPicker />
        </View>

        {slides.length ? <Slides slides={slides} onPress={open} /> : null}

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Heading action={{ label: t('common.seeAll'), onPress: () => router.navigate('/(tabs)/categories') }}>
            {t('home.shopByCategory')}
          </Heading>
          <CategorySlider categories={parent_categories} />

          {promoCards.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -spacing.lg, marginTop: spacing.lg }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              {promoCards.map((c, i) => (
                <BannerImage key={i} banner={{ title: null, image: c.media, link: c.link }} onPress={open} style={styles.promo} />
              ))}
            </ScrollView>
          ) : null}

          {featured_products.length ? (
            <>
              <Heading>{t('home.featured')}</Heading>
              <ProductCarousel products={featured_products} />
            </>
          ) : null}

          {/* The two banners' first above the featured categories, the second after two of them. */}
          {twoBanners[0] ? (
            <View style={styles.section}>
              <BannerImage banner={twoBanners[0]} onPress={open} style={styles.wideBanner} />
            </View>
          ) : null}

          {/* Featured categories two at a time, with the banners and services between them. */}
          {featured_categories.slice(0, 2).map((c) => (
            <FeaturedCategory key={c.id} category={c} />
          ))}

          {twoBanners[1] ? (
            <View style={styles.section}>
              <BannerImage banner={twoBanners[1]} onPress={open} style={styles.wideBanner} />
            </View>
          ) : null}

          {featured_categories.slice(2, 4).map((c) => (
            <FeaturedCategory key={c.id} category={c} />
          ))}

          <Services />

          {fourBanners.length ? (
            <View style={[styles.section, styles.grid]}>
              {fourBanners.map((b, i) => (
                <BannerImage key={i} banner={b} onPress={open} style={styles.gridBanner} fixed />
              ))}
            </View>
          ) : null}

          {featured_categories.slice(4).map((c) => (
            <FeaturedCategory key={c.id} category={c} />
          ))}

          {slimBanner ? (
            <View style={styles.section}>
              <BannerImage banner={slimBanner} onPress={open} style={styles.slimBanner} />
            </View>
          ) : null}

          {brands.length ? (
            <>
              <Heading>{t('home.brands')}</Heading>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
                {brands.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: b.slug, title: b.title } })}
                    style={[styles.brand, { borderColor: theme.border }]}>
                    {b.image ? <Image source={b.image} style={{ width: 72, height: 48 }} contentFit="contain" /> : <AppText size={12}>{b.title}</AppText>}
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The slider, as tall as its first image's shape (the admin's mobile images are square). */
function Slides({ slides, onPress }: { slides: Home['slides']; onPress: (link: string | null) => void }) {
  const [aspectRatio, setAspectRatio] = useState(2);
  return (
    <FlatList
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      data={slides}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => onPress(item.link)}>
          <Image
            source={item.image}
            style={{ width, aspectRatio }}
            contentFit="cover"
            onLoad={index === 0 ? (e) => setAspectRatio(e.source.width / e.source.height) : undefined}
          />
        </Pressable>
      )}
    />
  );
}

/**
 * A banner at its own shape once loaded (admins upload all sizes), `style.aspectRatio`
 * until then, or always when `fixed`.
 */
function BannerImage({
  banner,
  onPress,
  style,
  fixed,
}: {
  banner: Banner;
  onPress: (link: string | null) => void;
  style: ViewStyle;
  /** Keep `style`'s shape (a grid whose cells must line up). */
  fixed?: boolean;
}) {
  const theme = useTheme();
  const [aspectRatio, setAspectRatio] = useState<number | undefined>();
  if (!banner.image) return null;
  return (
    <Pressable onPress={() => onPress(banner.link)} style={[styles.banner, { backgroundColor: theme.surface }, style, aspectRatio && !fixed ? { aspectRatio } : null]}>
      <Image
        source={banner.image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={banner.title ?? undefined}
        onLoad={fixed ? undefined : (e) => setAspectRatio(e.source.width / e.source.height)}
      />
    </Pressable>
  );
}

/** Three compact product cards at a time, in a row that scrolls sideways a card at a time. */
function ProductCarousel({ products }: { products: Product[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + cardGap}
      style={{ marginHorizontal: -spacing.lg }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: cardGap }}>
      {products.map((p) => (
        <View key={p.id} style={{ width: cardWidth }}>
          <ProductCard product={p} compact />
        </View>
      ))}
    </ScrollView>
  );
}

/** The website's "Fast shipping / Free returns / ..." strip. */
function Services() {
  const { t } = useTranslation();
  const theme = useTheme();
  const items = [
    [t('home.services.shipping'), t('home.services.shippingNote')],
    [t('home.services.returns'), t('home.services.returnsNote')],
    [t('home.services.cod'), t('home.services.codNote')],
    [t('home.services.support'), t('home.services.supportNote')],
  ];
  return (
    <View style={[styles.section, styles.grid]}>
      {items.map(([title, note]) => (
        <View key={title} style={[styles.service, { backgroundColor: theme.surface }]}>
          <AppText size={14} bold style={{ color: theme.primary }}>{title}</AppText>
          <AppText size={12} muted>{note}</AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * A featured category's newest products in a carousel, under its own title, as the
 * website shows them on a phone. A category with no products hides.
 */
function FeaturedCategory({ category }: { category: Category }) {
  const { t } = useTranslation();
  const products = useCategoryProducts(category.id, { sort: '1' });
  const list = products.data?.pages[0]?.data.slice(0, 10) ?? [];

  if (!products.isPending && !list.length) return null;

  return (
    <>
      <Heading action={{ label: t('common.seeAll'), onPress: () => openCategory(category) }}>{category.title}</Heading>
      {products.isPending ? <ActivityIndicator style={{ margin: spacing.xl }} /> : <ProductCarousel products={list} />}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  logo: { width: 104, height: 36 },
  // rowGap, not gap: a column gap in the two-a-row grids would push the second item to its own row.
  section: { marginTop: spacing.xl, rowGap: spacing.md },
  // Two a row: percentages, so rounding can never push the second item to its own row.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  banner: { borderRadius: radius.md, overflow: 'hidden' },
  promo: { width: width * 0.8, aspectRatio: 2 },
  wideBanner: { width: '100%', aspectRatio: 2.2 },
  // Exact sizes: a percentage width with an aspectRatio in a wrapping row lays out at zero width.
  gridBanner: { width: (width - 2 * spacing.lg) * 0.485, height: ((width - 2 * spacing.lg) * 0.485) / 2 },
  slimBanner: { width: '100%', aspectRatio: 4 },
  service: { width: '48.5%', padding: spacing.md, borderRadius: radius.md, gap: 2 },
  brand: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginRight: spacing.sm, minWidth: 88, height: 64, alignItems: 'center', justifyContent: 'center' },
});
