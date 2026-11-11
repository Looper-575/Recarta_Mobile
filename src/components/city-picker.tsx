import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useCities } from '@/hooks/queries';
import { useSession } from '@/state/session';
import { radius, spacing, useTheme } from '@/theme';

/**
 * The website's "Deliver to {city}" picker. The city is remembered on the phone and
 * filled in at checkout; it is the same list of cities the website offers.
 */
export function CityPicker() {
  const theme = useTheme();
  const { t } = useTranslation();
  const cityId = useSession((s) => s.cityId);
  const cities = useCities(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = cities.data?.find((c) => c.id === cityId) ?? null;
  const shown = (cities.data ?? []).filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  const choose = (id: number | null) => {
    void useSession.getState().setCityId(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <AppText size={13} style={{ color: theme.primary }}>⌖</AppText>
        <AppText size={13} numberOfLines={1} style={{ flexShrink: 1 }}>
          {selected ? (
            <>
              {t('city.deliverTo')} <AppText size={13} bold style={{ color: theme.primary }}>{selected.name}</AppText>
            </>
          ) : (
            t('city.select')
          )}
        </AppText>
        <AppText size={11} muted>▾</AppText>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.top, { borderColor: theme.border }]}>
            <AppText size={18} bold>{t('city.title')}</AppText>
            <Button title={t('common.close')} variant="link" onPress={() => setOpen(false)} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('city.search')}
            placeholderTextColor={theme.textMuted}
            autoCorrect={false}
            style={[styles.search, { borderColor: theme.border, color: theme.text }]}
          />
          <FlatList
            data={shown}
            keyExtractor={(c) => String(c.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => choose(item.id)} style={[styles.option, { borderColor: theme.border }]}>
                <AppText bold={item.id === cityId} style={{ flex: 1, color: item.id === cityId ? theme.primary : theme.text }}>
                  {item.name}
                </AppText>
                {item.id === cityId ? <AppText style={{ color: theme.primary }}>✓</AppText> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <AppText muted style={{ padding: spacing.lg }}>{cities.isPending ? '' : t('city.noMatch')}</AppText>
            }
            ListFooterComponent={
              selected ? <Button title={t('city.clear')} variant="link" onPress={() => choose(null)} style={{ margin: spacing.md }} /> : undefined
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, maxWidth: 190, flexShrink: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  search: { borderWidth: 1, borderRadius: radius.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
