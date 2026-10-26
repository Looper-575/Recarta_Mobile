import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, styles } from '@/components/ui';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

export default function OrderPlacedScreen() {
  const { id, number, total } = useLocalSearchParams<{ id: string; number: string; total: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const loggedIn = useSession((s) => !!s.token);

  return (
    <View style={[styles.center, { gap: spacing.md }]}>
      <AppText size={48} style={{ color: theme.success }}>✓</AppText>
      <AppText size={18} bold style={{ textAlign: 'center' }}>{t('placed.thanks', { number })}</AppText>
      <AppText muted>{t('placed.total', { amount: total })}</AppText>
      {loggedIn ? (
        <Button title={t('placed.viewOrder')} variant="outline" onPress={() => router.replace({ pathname: '/orders/[id]', params: { id } })} style={{ alignSelf: 'stretch' }} />
      ) : null}
      <Button title={t('placed.keepShopping')} onPress={() => router.dismissTo('/(tabs)')} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
