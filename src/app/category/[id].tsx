import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CategorySlider, findCategory } from '@/components/category';
import { ProductListScreen } from '@/components/product-list-screen';
import { useCategories, useCategoryProducts } from '@/hooks/queries';
import { spacing } from '@/theme';

/** A category's products (id 'all': every product), with its sub-categories in a row on top. */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const categoryId = id === 'all' ? 'all' : Number(id);
  const [sort, setSort] = useState('1');
  const query = useCategoryProducts(categoryId, { sort });
  const tree = useCategories().data ?? [];

  // For "all", the top-level categories; otherwise this category's own children.
  const subcategories = categoryId === 'all' ? tree : (findCategory(tree, categoryId)?.children ?? []);
  const fallbackTitle = categoryId === 'all' ? t('categories.allProducts') : (query.data?.pages[0]?.meta.category?.title ?? '');

  return (
    <>
      <Stack.Screen options={{ title: title ?? fallbackTitle }} />
      <ProductListScreen
        query={query}
        sort={sort}
        onSort={setSort}
        top={subcategories.length ? <View style={{ marginBottom: spacing.md }}><CategorySlider categories={subcategories} /></View> : undefined}
      />
    </>
  );
}
