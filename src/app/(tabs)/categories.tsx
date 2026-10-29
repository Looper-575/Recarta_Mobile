import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { openCategory } from '@/components/category';
import { AppText, ErrorView, Loading } from '@/components/ui';
import { useCategories } from '@/hooks/queries';
import type { Category } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

/**
 * "All" and the parent categories on the left; on the right, the chosen parent and every
 * level of sub-category under it (indented by depth), or for "All" a row for every product
 * followed by each parent's tree. A row opens that category's products, sub-categories included.
 */
export default function CategoriesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const categories = useCategories();
  // "all" (the first entry) or a parent category's id.
  const [selectedId, setSelectedId] = useState<number | 'all'>('all');

  if (categories.isPending) return <Loading />;
  if (categories.isError) return <ErrorView message={categories.error.message} onRetry={categories.refetch} />;

  const parents = categories.data;
  const selected = selectedId === 'all' ? null : (parents.find((c) => c.id === selectedId) ?? null);
  const rows: Row[] = [
    ...(selected ? [] : [{ category: 'all' as const, depth: 0 }]),
    ...(selected ? [selected] : parents).flatMap((parent) => flatten(parent, 0)),
  ];

  const sidebar: { id: number | 'all'; title: string }[] = [{ id: 'all', title: t('categories.all') }, ...parents];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <AppText size={20} bold style={{ padding: spacing.lg }}>{t('tabs.categories')}</AppText>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <FlatList
          style={{ width: 120, flexGrow: 0, backgroundColor: theme.surface }}
          data={sidebar}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => {
            const active = item.id === selectedId;
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={[styles.parent, active && { backgroundColor: theme.background, borderLeftColor: theme.primary }]}>
                <AppText size={13} bold={active} style={active ? { color: theme.primary } : undefined}>
                  {item.title}
                </AppText>
              </Pressable>
            );
          }}
        />
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md }}
          data={rows}
          keyExtractor={(r) => (r.category === 'all' ? 'all' : String(r.category.id))}
          renderItem={({ item: { category, depth }, index }) =>
            category === 'all' ? (
              <Pressable onPress={() => openCategory('all', t('categories.allProducts'))} style={[styles.child, { borderColor: theme.border }]}>
                <AppText bold style={{ flex: 1, color: theme.primary }}>{t('categories.allProducts')}</AppText>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => openCategory(category)}
                style={[
                  styles.child,
                  { borderColor: theme.border, paddingLeft: spacing.md + Math.max(depth - 1, 0) * spacing.lg },
                  depth === 0 && index > 0 && { marginTop: spacing.md },
                ]}>
                {category.image && depth < 2 ? <Image source={category.image} style={styles.childImage} contentFit="contain" /> : null}
                <AppText bold={depth === 0} size={depth > 1 ? 14 : 15} muted={depth > 1} style={{ flex: 1 }}>
                  {depth === 0 ? `${t('common.seeAll')}: ${category.title}` : category.title}
                </AppText>
              </Pressable>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

type Row = { category: Category | 'all'; depth: number };

/** A category and every level under it, depth first. */
function flatten(category: Category, depth: number): Row[] {
  return [{ category, depth }, ...(category.children ?? []).flatMap((c) => flatten(c, depth + 1))];
}

const styles = StyleSheet.create({
  parent: { paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  child: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  childImage: { width: 40, height: 40 },
});
