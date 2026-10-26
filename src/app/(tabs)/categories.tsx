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

/** Parent categories on the left, the chosen one's sub-categories on the right. */
export default function CategoriesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const categories = useCategories();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (categories.isPending) return <Loading />;
  if (categories.isError) return <ErrorView message={categories.error.message} onRetry={categories.refetch} />;

  const parents = categories.data;
  const selected = parents.find((c) => c.id === selectedId) ?? parents[0];
  const open = (c: Category) => router.push({ pathname: '/category/[id]', params: { id: String(c.id), title: c.title } });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <AppText size={20} bold style={{ padding: spacing.lg }}>{t('tabs.categories')}</AppText>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <FlatList
          style={{ width: 120, flexGrow: 0, backgroundColor: theme.surface }}
          data={parents}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => {
            const active = item.id === selected?.id;
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
        {selected ? (
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.md }}
            data={[selected, ...(selected.children ?? [])]}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => open(item)} style={[styles.child, { borderColor: theme.border }]}>
                {item.image ? <Image source={item.image} style={styles.childImage} contentFit="contain" /> : null}
                <AppText bold={index === 0} style={{ flex: 1 }}>
                  {index === 0 ? `${t('common.seeAll')}: ${item.title}` : item.title}
                </AppText>
              </Pressable>
            )}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  parent: { paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  child: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  childImage: { width: 40, height: 40 },
});
