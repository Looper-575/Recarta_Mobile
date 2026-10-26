import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ProductListScreen } from '@/components/product-list-screen';
import { useCategoryProducts } from '@/hooks/queries';

export default function CategoryScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [sort, setSort] = useState('1');
  const query = useCategoryProducts(Number(id), { sort });

  return (
    <>
      <Stack.Screen options={{ title: title ?? query.data?.pages[0]?.meta.category?.title ?? '' }} />
      <ProductListScreen query={query} sort={sort} onSort={setSort} />
    </>
  );
}
