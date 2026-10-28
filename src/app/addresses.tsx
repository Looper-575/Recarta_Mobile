import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { AppText, Button, Empty, ErrorView, Loading, styles as ui } from '@/components/ui';
import { useAddresses } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import { spacing, useTheme } from '@/theme';

export default function AddressesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addresses = useAddresses();

  if (addresses.isPending) return <Loading />;
  if (addresses.isError) return <ErrorView message={addresses.error.message} onRetry={addresses.refetch} />;

  const act = async (path: string, method: 'POST' | 'DELETE') => {
    try {
      await api(path, { method });
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    } catch (e) {
      Alert.alert('', e instanceof ApiError ? e.message : String(e));
    }
  };

  return (
    <FlatList
      data={addresses.data}
      keyExtractor={(a) => String(a.id)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      ListEmptyComponent={<Empty message={t('addresses.empty')} />}
      ListFooterComponent={
        <Button title={t('addresses.add')} onPress={() => router.push('/address-edit')} style={{ marginTop: spacing.lg }} />
      }
      renderItem={({ item: a }) => (
        <View style={[styles.row, { borderColor: theme.border }]}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <AppText bold>{a.title}</AppText>
            {a.is_default ? <AppText size={12} style={{ color: theme.primary }}>{t('addresses.default')}</AppText> : null}
          </View>
          <AppText>{a.first_name} {a.last_name} · {a.phone}</AppText>
          <AppText muted>{[a.address, a.area].filter(Boolean).join(', ')}</AppText>
          <View style={[ui.row, { gap: spacing.md }]}>
            <Button title={t('addresses.edit')} variant="link" onPress={() => router.push({ pathname: '/address-edit', params: { id: String(a.id) } })} />
            {!a.is_default ? <Button title={t('addresses.makeDefault')} variant="link" onPress={() => act(`addresses/${a.id}/default`, 'POST')} /> : null}
            <Button
              title={t('cart.remove')}
              variant="link"
              onPress={() =>
                Alert.alert(t('addresses.deleteConfirm'), undefined, [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('cart.remove'), style: 'destructive', onPress: () => act(`addresses/${a.id}`, 'DELETE') },
                ])
              }
            />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
});
