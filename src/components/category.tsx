import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { Category } from '@/lib/types';
import { spacing, useTheme } from '@/theme';

/** Opens a category's products; 'all' opens every product. */
export function openCategory(category: Category | 'all', allTitle?: string) {
  router.push({
    pathname: '/category/[id]',
    params: category === 'all' ? { id: 'all', title: allTitle } : { id: String(category.id), title: category.title },
  });
}

/** Finds a category anywhere in the menu tree. */
export function findCategory(tree: Category[], id: number): Category | undefined {
  for (const c of tree) {
    if (c.id === id) return c;
    const found = findCategory(c.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

/** A small round tile: the category's image and title. */
export function CategoryTile({ category }: { category: Category }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => openCategory(category)} style={styles.tile}>
      <View style={[styles.tileImage, { backgroundColor: theme.surface }]}>
        {category.image ? <Image source={category.image} style={{ width: '70%', height: '70%' }} contentFit="contain" /> : null}
      </View>
      <AppText size={12} numberOfLines={2} style={{ textAlign: 'center' }}>
        {category.title}
      </AppText>
    </Pressable>
  );
}

/** A row of category tiles that scrolls sideways, edge to edge of a padded screen. */
export function CategorySlider({ categories, inset = spacing.lg }: { categories: Category[]; inset?: number }) {
  if (!categories.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={{ paddingHorizontal: inset, gap: spacing.md }}>
      {categories.map((c) => (
        <CategoryTile key={c.id} category={c} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tile: { width: 72, alignItems: 'center', gap: spacing.xs },
  tileImage: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
