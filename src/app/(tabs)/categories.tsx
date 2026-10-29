import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, ErrorView, Loading } from '@/components/ui';
import { useCategories } from '@/hooks/queries';
import type { Category } from '@/lib/types';
import { radius, spacing, useTheme } from '@/theme';

/**
 * "All" and the parent categories on the left; on the right, the chosen parent and its
 * sub-categories, or for "All" every parent followed by its own. A parent row opens all
 * of that category's products, sub-categories included.
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
  const open = (c: Category) => router.push({ pathname: '/category/[id]', params: { id: String(c.id), title: c.title } });

  const rows = (selected ? [selected] : parents).flatMap((parent) => [
    { category: parent, isParent: true },
    ...(parent.children ?? []).map((child) => ({ category: child, isParent: false })),
  ]);

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
          keyExtractor={(r) => String(r.category.id)}
          renderItem={({ item: { category, isParent }, index }) => (
            <Pressable
              onPress={() => open(category)}
              style={[styles.child, { borderColor: theme.border }, isParent && index > 0 && { marginTop: spacing.md }]}>
              {category.image ? <Image source={category.image} style={styles.childImage} contentFit="contain" /> : null}
              <AppText bold={isParent} style={{ flex: 1 }}>
                {isParent ? `${t('common.seeAll')}: ${category.title}` : category.title}
              </AppText>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  parent: { paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  child: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  childImage: { width: 40, height: 40 },
});
