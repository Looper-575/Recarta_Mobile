import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card } from '@/components/ui';
import { useMe, useSettings } from '@/hooks/queries';
import { logOut } from '@/lib/auth';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

export default function AccountScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const { data: settings } = useSettings();
  useMe(); // keeps name, wallet and corporate status fresh

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppText size={20} bold style={{ marginBottom: spacing.lg }}>{t('account.title')}</AppText>

        {customer ? (
          <Card>
            <AppText size={17} bold>{t('account.hello', { name: customer.first_name })}</AppText>
            <AppText muted>{customer.email}</AppText>
            {customer.is_corporate ? <AppText style={{ color: theme.primary }}>{t('account.corporate')}</AppText> : null}
            {customer.wallet_balance > 0 ? <AppText style={{ marginTop: spacing.sm }}>{t('account.wallet', { amount: customer.wallet_balance })}</AppText> : null}
          </Card>
        ) : (
          <Card>
            <AppText style={{ marginBottom: spacing.md }}>{t('account.guest')}</AppText>
            <Button title={t('auth.login')} onPress={() => router.push('/login')} />
            <Button title={t('auth.register')} variant="link" onPress={() => router.push('/register')} />
          </Card>
        )}

        {customer ? (
          <>
            <Item label={t('account.orders')} onPress={() => router.push('/orders')} />
            <Item label={t('account.returns')} onPress={() => router.push('/returns')} />
            <Item label={t('account.wishlist')} onPress={() => router.push('/wishlist')} />
            <Item label={t('account.addresses')} onPress={() => router.push('/addresses')} />
            <Item label={t('account.walletLink')} onPress={() => router.push('/wallet')} />
            <Item label={t('account.notifications')} onPress={() => router.push('/notifications')} />
            <Item label={t('account.profile')} onPress={() => router.push('/profile')} />
          </>
        ) : null}
        <Item label={t('account.trackOrder')} onPress={() => router.push('/track')} />
        {settings?.store.website ? <Item label={settings.store.website.replace(/^https?:\/\//, '')} onPress={() => WebBrowser.openBrowserAsync(settings.store.website)} /> : null}
        {settings?.store.phone ? <AppText muted style={{ marginTop: spacing.lg }}>{settings.store.phone}</AppText> : null}

        {customer ? <Button title={t('auth.logout')} variant="danger" onPress={() => logOut(queryClient)} style={{ marginTop: spacing.xl }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[s.item, { borderColor: theme.border }]}>
      <AppText>{label}</AppText>
      <AppText muted>›</AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});

