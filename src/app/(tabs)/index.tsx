import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySlider, openCategory } from '@/components/category';
import { ProductCard } from '@/components/product';
import { AppText, Chip, ErrorView, Heading, Loading } from '@/components/ui';
import { useCategories, useCategoryProducts, useHome, useSettings } from '@/hooks/queries';
import { openStoreLink } from '@/lib/links';
import type { Category, Home, Product } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

const { width } = Dimensions.get('window');

type Banner = Home['banners'][string][number];

/**
 * The website's home page, top to bottom: slides, promo cards, categories, featured
 * products, two banners, services, four banners, featured categories (tabs), a slim
 * banner, top brands. Banners and cards are set up in the admin; empty sections hide.
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
          {settings?.store.logo ? (
            <Image source={settings.store.logo} style={styles.logo} contentFit="contain" />
          ) : (
            <AppText size={20} bold>{settings?.store.name}</AppText>
          )}
        </View>

        {slides.length ? <Slides slides={slides} onPress={open} /> : null}

        <View style={{ paddingHorizontal: spacing.lg }}>
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

          <Heading action={{ label: t('common.seeAll'), onPress: () => router.navigate('/(tabs)/categories') }}>
            {t('home.shopByCategory')}
          </Heading>
          <CategorySlider categories={parent_categories} />

          {featured_products.length ? (
            <>
              <Heading>{t('home.featured')}</Heading>
              <ProductRows products={featured_products} />
            </>
          ) : null}

          {twoBanners.length >= 2 ? (
            <View style={styles.section}>
              {twoBanners.slice(0, 2).map((b, i) => (
                <BannerImage key={i} banner={b} onPress={open} style={styles.wideBanner} />
              ))}
            </View>
          ) : null}

          <Services />

          {fourBanners.length ? (
            <View style={[styles.section, styles.grid]}>
              {fourBanners.map((b, i) => (
                <BannerImage key={i} banner={b} onPress={open} style={styles.gridBanner} fixed />
              ))}
            </View>
          ) : null}

          {featured_categories.length ? <FeaturedCategories categories={featured_categories} /> : null}

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

/** Two product cards a row. */
function ProductRows({ products }: { products: Product[] }) {
  return (
    <View style={styles.productRow}>
      {products.map((p) => (
        <View key={p.id} style={styles.productCell}>
          <ProductCard product={p} />
        </View>
      ))}
    </View>
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

/** A tab per featured category and its newest products, like the website's tabs. */
function FeaturedCategories({ categories }: { categories: Category[] }) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(categories[0].id);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];
  const products = useCategoryProducts(active.id, { sort: '1' });
  const list = products.data?.pages[0]?.data.slice(0, 6) ?? [];

  return (
    <>
      <Heading action={{ label: t('common.seeAll'), onPress: () => openCategory(active) }}>{t('home.featuredCategories')}</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((c) => (
          <Chip key={c.id} label={c.title} selected={c.id === active.id} onPress={() => setActiveId(c.id)} />
        ))}
      </ScrollView>
      {products.isPending ? (
        <ActivityIndicator style={{ margin: spacing.xl }} />
      ) : list.length ? (
        <ProductRows products={list} />
      ) : (
        <AppText muted style={{ textAlign: 'center', margin: spacing.lg }}>{t('common.nothingHere')}</AppText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'flex-start' },
  logo: { width: 140, height: 40 },
  // rowGap, not gap: a column gap in the two-a-row grids would push the second item to its own row.
  section: { marginTop: spacing.xl, rowGap: spacing.md },
  // Two a row: percentages, so rounding can never push the second item to its own row.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  productCell: { width: '48.5%' },
  banner: { borderRadius: radius.md, overflow: 'hidden' },
  promo: { width: width * 0.8, aspectRatio: 2 },
  wideBanner: { width: '100%', aspectRatio: 2.2 },
  // Exact sizes: a percentage width with an aspectRatio in a wrapping row lays out at zero width.
  gridBanner: { width: (width - 2 * spacing.lg) * 0.485, height: ((width - 2 * spacing.lg) * 0.485) / 2 },
  slimBanner: { width: '100%', aspectRatio: 4 },
  service: { width: '48.5%', padding: spacing.md, borderRadius: radius.md, gap: 2 },
  brand: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginRight: spacing.sm, minWidth: 88, height: 64, alignItems: 'center', justifyContent: 'center' },
});
