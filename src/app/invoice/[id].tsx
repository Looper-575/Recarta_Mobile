import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ErrorView, Loading } from '@/components/ui';
import { storeConfig } from '@/lib/config';
import { useSession } from '@/state/session';

/**
 * An order's invoice: the website's on-screen invoice, fetched from the API with the
 * customer's token (GET orders/{id}/invoice), so it needs no signed website link.
 */
export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const token = useSession((s) => s.token);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        key={attempt}
        source={{
          uri: `${storeConfig.apiUrl}/orders/${id}/invoice`,
          headers: {
            Accept: 'text/html',
            Authorization: `Bearer ${token ?? ''}`,
            'X-App-Version': storeConfig.appVersion,
            'X-Platform': Platform.OS,
          },
        }}
        startInLoadingState
        renderLoading={() => <Loading />}
        // The invoice is an A4 page: start zoomed to fit, and let the customer zoom in.
        scalesPageToFit
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        onHttpError={(e) => setError(t('orders.invoiceError', { status: e.nativeEvent.statusCode }))}
        onError={() => setError(t('common.noConnection'))}
      />
    </View>
  );
}
