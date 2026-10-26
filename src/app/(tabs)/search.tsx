import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductGrid } from '@/components/product';
import { AppText, Empty, ErrorView, Heading, Loading } from '@/components/ui';
import { useSearch, useSuggest } from '@/hooks/queries';
import { radius, spacing, useTheme } from '@/theme';

/** Suggestions while typing; full results once the search is submitted. */
export default function SearchScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState('');

  // Wait for a pause in typing before asking for suggestions.
  useEffect(() => {
    const timer = setTimeout(() => setTyped(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const suggest = useSuggest(submitted ? '' : typed);
  const results = useSearch(submitted);
  const products = results.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSubmitted('');
          }}
          onSubmitEditing={() => setSubmitted(text.trim())}
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
        />
      </View>

      {submitted ? (
        results.isPending ? (
          <Loading />
        ) : results.isError ? (
          <ErrorView message={results.error.message} onRetry={results.refetch} />
        ) : (
          <ProductGrid
            products={products}
            onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
            loadingMore={results.isFetchingNextPage}
            empty={<Empty message={t('search.noResults', { q: submitted })} />}
          />
        )
      ) : suggest.data ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg }} keyboardShouldPersistTaps="handled">
          {suggest.data.products.length ? <Heading>{t('search.products')}</Heading> : null}
          {suggest.data.products.map((p) => (
            <Suggestion key={`p${p.id}`} label={p.title} hint={p.category} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(p.id) } })} />
          ))}
          {suggest.data.categories.length ? <Heading>{t('search.categories')}</Heading> : null}
          {suggest.data.categories.map((c) => (
            <Suggestion key={`c${c.id}`} label={c.title} onPress={() => router.push({ pathname: '/category/[id]', params: { id: String(c.id), title: c.title } })} />
          ))}
          {suggest.data.brands.length ? <Heading>{t('search.brands')}</Heading> : null}
          {suggest.data.brands.map((b) => (
            <Suggestion key={`b${b.id}`} label={b.title} onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: b.slug, title: b.title } })} />
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function Suggestion({ label, hint, onPress }: { label: string; hint?: string | null; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
      <AppText>{label}</AppText>
      {hint ? <AppText muted size={12}>{hint}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { height: 46, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15 },
});
