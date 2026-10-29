import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySlider } from '@/components/category';
import { ProductCard } from '@/components/product';
import { AppText, ErrorView, Heading, Loading } from '@/components/ui';
import { useHome, useSettings } from '@/hooks/queries';
import { openStoreLink } from '@/lib/links';
import { radius, spacing, useTheme } from '@/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: settings } = useSettings();
  const home = useHome();

  if (home.isPending) return <Loading />;
  if (home.isError) return <ErrorView message={home.error.message} onRetry={home.refetch} />;

  const { slides, parent_categories, featured_products, brands } = home.data;

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

        {slides.length ? (
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={slides}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <Pressable onPress={() => item.link && openStoreLink(item.link)}>
                <Image source={item.image} style={{ width, height: width * 0.45 }} contentFit="cover" />
              </Pressable>
            )}
          />
        ) : null}

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Heading action={{ label: t('common.seeAll'), onPress: () => router.navigate('/(tabs)/categories') }}>
            {t('home.shopByCategory')}
          </Heading>
          <CategorySlider categories={parent_categories} />

          {featured_products.length ? (
            <>
              <Heading>{t('home.featured')}</Heading>
              <View style={styles.productRow}>
                {featured_products.map((p) => (
                  <View key={p.id} style={styles.productCell}>
                    <ProductCard product={p} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {brands.length ? (
            <>
              <Heading>{t('home.brands')}</Heading>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'flex-start' },
  logo: { width: 140, height: 40 },
  // Two cards a row: percentages, so rounding can never push the second card to its own row.
  productRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  productCell: { width: '48.5%' },
  brand: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginRight: spacing.sm, minWidth: 88, height: 64, alignItems: 'center', justifyContent: 'center' },
});
