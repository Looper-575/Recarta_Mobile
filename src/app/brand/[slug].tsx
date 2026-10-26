import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ProductListScreen } from '@/components/product-list-screen';
import { useBrandProducts } from '@/hooks/queries';

export default function BrandScreen() {
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const [sort, setSort] = useState('1');
  const query = useBrandProducts(slug, { sort });

  return (
    <>
      <Stack.Screen options={{ title: title ?? query.data?.pages[0]?.meta.brand?.title ?? '' }} />
      <ProductListScreen query={query} sort={sort} onSort={setSort} />
    </>
  );
}
