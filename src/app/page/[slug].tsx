import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ErrorView, Loading } from '@/components/ui';
import { usePage } from '@/hooks/queries';
import { storeConfig } from '@/lib/config';

/** A CMS page from the admin (About Us, policies), as the website shows it. */
export default function PageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = usePage(slug);

  if (page.isPending) return <Loading />;
  if (page.isError) return <ErrorView message={page.error.message} onRetry={page.refetch} />;

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:-apple-system,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#222;margin:16px;word-wrap:break-word}img{max-width:100%;height:auto}table{max-width:100%}</style>
</head><body>${page.data.html ?? ''}</body></html>`;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: page.data.title }} />
      {/* baseUrl: images and links in the page are relative to the website. */}
      <WebView source={{ html, baseUrl: storeConfig.website }} originWhitelist={['*']} />
    </View>
  );
}
