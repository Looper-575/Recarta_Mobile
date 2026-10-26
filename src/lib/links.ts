import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { storeConfig } from '@/lib/config';

/**
 * Banner and slide links point at the website. The ones the app has a screen for open
 * that screen; anything else opens in the in-app browser.
 *
 *   /brand/{slug}             -> brand
 *   /{category_slug}/{slug}   -> product (the API looks products up by slug too)
 */
export function openStoreLink(link: string) {
  let url: URL;
  try {
    url = new URL(link, storeConfig.website || undefined);
  } catch {
    return;
  }

  const site = storeConfig.website ? new URL(storeConfig.website).host : null;
  const parts = url.pathname.split('/').filter(Boolean);

  if (site && url.host === site) {
    if (parts[0] === 'brand' && parts[1]) {
      router.push({ pathname: '/brand/[slug]', params: { slug: parts[1] } });
      return;
    }
    if (parts.length === 2 && !['order-success', 'order-failed', 'order-invoice', 'track-order', 'payfast'].includes(parts[0])) {
      router.push({ pathname: '/product/[id]', params: { id: parts[1] } });
      return;
    }
  }

  WebBrowser.openBrowserAsync(url.toString());
}
