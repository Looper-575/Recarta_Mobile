import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon, findCategory } from '@/components/category';
import { ProductCard, productsOf } from '@/components/product';
import { AppText, Chip, Empty, ErrorView, Loading } from '@/components/ui';
import { useCategories, useCategoryProducts } from '@/hooks/queries';
import type { Category } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

type TopId = number | 'all';

/**
 * A category's products. The top-level categories are down the left (and "All" for
 * every product); on the right, pills to narrow to one of the chosen category's
 * sub-categories, its banner, and its products, three a row. Opening a deeper
 * category picks its top-level category on the left and that category's pill.
 */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string; title?: string }>();
  const categories = useCategories();
  const tree = categories.data ?? [];
  const opened: TopId = id === 'all' ? 'all' : Number(id);

  // Where the screen opened, until the customer picks something else.
  const path = opened === 'all' ? [] : pathTo(tree, opened);
  const [picked, setPicked] = useState<{ top: TopId; filter: number | null } | null>(null);
  const top: TopId = picked?.top ?? (opened === 'all' ? 'all' : (path[0]?.id ?? opened));
  const filter = picked ? picked.filter : opened !== 'all' && path.length > 1 ? opened : null;

  const [sort, setSort] = useState('1');
  const query = useCategoryProducts(filter ?? top, { sort });

  const topCategory = top === 'all' ? null : (tree.find((c) => c.id === top) ?? null);
  const current = filter ? (findCategory(tree, filter) ?? topCategory) : topCategory;
  // A row of pills per level, down to the chosen one: "All" and the level's sub-categories.
  // Picking one that has its own sub-categories opens the next row under it.
  const chain = topCategory ? (filter ? pathTo([topCategory], filter) : [topCategory]) : [];
  const pillRows = chain
    .map((parent, level) => ({ parent, level, options: parent.children ?? [], selected: chain[level + 1]?.id ?? null }))
    .filter((row) => row.options.length);
  // "All" in a row shows everything under that row's parent.
  const pickLevel = (parent: Category, level: number) => setPicked({ top, filter: level === 0 ? null : parent.id });

  const sidebar: { id: TopId; title: string; image: string | null }[] = [
    { id: 'all', title: t('categories.all'), image: null },
    ...tree.map((c) => ({ id: c.id, title: c.title, image: c.image })),
  ];
  const products = productsOf(query.data?.pages);
  const total = query.data?.pages[0]?.meta.total;
  const heading = current?.title ?? t('categories.allProducts');

  return (
    <>
      <Stack.Screen options={{ title: topCategory?.title ?? t('categories.allProducts') }} />
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.background }}>
        <FlatList
          style={[styles.sidebar, { backgroundColor: theme.surface }]}
          data={sidebar}
          keyExtractor={(c) => String(c.id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.id === top;
            return (
              <Pressable
                onPress={() => setPicked({ top: item.id, filter: null })}
                style={[styles.side, active && { backgroundColor: theme.background, borderRightColor: theme.primary }]}>
                <CategoryIcon image={item.image} title={item.title} size={44} all={item.id === 'all'} />
                <AppText size={11} bold={active} numberOfLines={2} style={[{ textAlign: 'center' }, active && { color: theme.primary }]}>
                  {item.title}
                </AppText>
              </Pressable>
            );
          }}
        />

        {categories.isPending ? (
          <Loading />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={products}
            keyExtractor={(p) => String(p.id)}
            numColumns={3}
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ padding: spacing.sm, gap: 6 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1 / 3 }}>
                <ProductCard product={item} compact />
              </View>
            )}
            onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View>
                {pillRows.length ? (
                  pillRows.map(({ parent, level, options, selected }) => (
                    <ScrollView
                      key={parent.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -spacing.sm }}
                      contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
                      {level === 0 ? <SortPill sort={sort} onSort={setSort} /> : null}
                      <Chip label={t('categories.all')} selected={selected === null} onPress={() => pickLevel(parent, level)} />
                      {options.map((p) => (
                        <Chip key={p.id} label={p.title} selected={selected === p.id} onPress={() => setPicked({ top, filter: p.id })} />
                      ))}
                    </ScrollView>
                  ))
                ) : (
                  <View style={{ flexDirection: 'row' }}>
                    <SortPill sort={sort} onSort={setSort} />
                  </View>
                )}
                {current?.banner ? <Banner key={current.banner} uri={current.banner} /> : null}
                <View style={styles.headingRow}>
                  <AppText size={17} bold style={{ flex: 1 }}>{heading}</AppText>
                  {typeof total === 'number' ? <AppText muted size={12}>{t('list.count', { count: total })}</AppText> : null}
                </View>
              </View>
            }
            ListEmptyComponent={
              query.isPending ? (
                <ActivityIndicator style={{ margin: spacing.xl }} />
              ) : query.isError ? (
                <ErrorView message={query.error.message} onRetry={query.refetch} />
              ) : (
                <Empty message={t('common.nothingHere')} />
              )
            }
            ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
          />
        )}
      </View>
    </>
  );
}

/** The categories from the top level down to `id`, or none when it isn't in the tree. */
function pathTo(tree: Category[], id: number): Category[] {
  for (const c of tree) {
    if (c.id === id) return [c];
    const below = pathTo(c.children ?? [], id);
    if (below.length) return [c, ...below];
  }
  return [];
}

/** The category's banner from the admin, at its own shape once it has loaded. */
function Banner({ uri }: { uri: string }) {
  const theme = useTheme();
  const [aspectRatio, setAspectRatio] = useState(2.5);
  return (
    <Image
      source={uri}
      style={[styles.banner, { aspectRatio, backgroundColor: theme.surface }]}
      contentFit="cover"
      onLoad={(e) => setAspectRatio(e.source.width / e.source.height)}
    />
  );
}

/** "⇅ Newest": the first pill; opens the website's four sort orders. */
function SortPill({ sort, onSort }: { sort: string; onSort: (sort: string) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const sorts = [
    { value: '1', label: t('list.sortNewest') },
    { value: '0', label: t('list.sortOldest') },
    { value: '2', label: t('list.sortAZ') },
    { value: '3', label: t('list.sortZA') },
  ];
  const current = sorts.find((s) => s.value === sort) ?? sorts[0];

  return (
    <>
      <Chip label={`⇅ ${current.label}`} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <AppText bold size={16} style={{ padding: spacing.lg }}>{t('list.sort')}</AppText>
            {sorts.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => {
                  onSort(s.value);
                  setOpen(false);
                }}
                style={[styles.option, { borderColor: theme.border }]}>
                <AppText bold={s.value === sort} style={{ flex: 1, color: s.value === sort ? theme.primary : theme.text }}>{s.label}</AppText>
                {s.value === sort ? <AppText style={{ color: theme.primary }}>✓</AppText> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Narrow, to leave room for three products a row.
  sidebar: { width: 76, flexGrow: 0 },
  side: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderRightWidth: 3, borderRightColor: 'transparent' },
  banner: { width: '100%', borderRadius: radius.md, marginBottom: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { borderRadius: radius.md, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
