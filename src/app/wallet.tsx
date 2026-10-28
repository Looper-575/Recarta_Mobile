import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Empty, ErrorView, formatRs, Loading } from '@/components/ui';
import { useWallet } from '@/hooks/queries';
import { spacing, useTheme } from '@/theme';

/** Balance and movements (wallet_transactions_view: credit, debit, type, transaction_date). */
export default function WalletScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const wallet = useWallet();

  if (wallet.isPending) return <Loading />;
  if (wallet.isError) return <ErrorView message={wallet.error.message} onRetry={wallet.refetch} />;

  return (
    <FlatList
      data={wallet.data.pages.flatMap((p) => p.data)}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      ListHeaderComponent={
        <Card>
          <AppText muted>{t('wallet.balance')}</AppText>
          <AppText size={24} bold style={{ color: theme.primary }}>{formatRs(wallet.data.pages[0]?.balance ?? 0)}</AppText>
        </Card>
      }
      ListEmptyComponent={<Empty message={t('wallet.empty')} />}
      onEndReached={() => wallet.hasNextPage && !wallet.isFetchingNextPage && wallet.fetchNextPage()}
      ListFooterComponent={wallet.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} /> : undefined}
      renderItem={({ item }) => {
        const credit = Number(item.credit ?? 0);
        const amount = credit > 0 ? credit : -Number(item.debit ?? 0);
        return (
          <Pressable
            disabled={!item.order_id}
            onPress={() => item.order_id && router.push({ pathname: '/orders/[id]', params: { id: String(item.order_id) } })}
            style={[styles.row, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <AppText>{item.type ?? ''}</AppText>
              <AppText muted size={12}>{item.transaction_date ? new Date(item.transaction_date).toLocaleString() : ''}</AppText>
            </View>
            <AppText bold style={{ color: amount < 0 ? theme.danger : theme.success }}>
              {amount < 0 ? '- ' : '+ '}{formatRs(Math.abs(amount))}
            </AppText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
