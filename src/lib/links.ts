import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { storeConfig } from '@/lib/config';
import type { Category } from '@/lib/types';

/**
 * Banner and slide links point at the website. The ones the app has a screen for open
 * that screen; anything else opens in the in-app browser.
 *
 *   /brand/{slug}             -> brand
 *   /{category_slug}/{slug}   -> product (the API looks products up by slug too)
 *   /{category_slug}          -> category, when `categories` (the menu tree) has that slug
 *   /all-categories           -> every product
 *   /                         -> nothing (the app's Home is the website's home page)
 */
export function openStoreLink(link: string, categories: Category[] = []) {
  let url: URL;
  try {
    url = new URL(link, storeConfig.website || undefined);
  } catch {
    return;
  }

  const site = storeConfig.website ? new URL(storeConfig.website).host : null;
  const parts = url.pathname.split('/').filter(Boolean);

  if (site && url.host === site) {
    // The website's home page: the app is already on its own.
    if (parts.length === 0) return;
    if (parts[0] === 'brand' && parts[1]) {
      router.push({ pathname: '/brand/[slug]', params: { slug: parts[1] } });
      return;
    }
    if (parts.length === 1 && parts[0] === 'all-categories') {
      router.push({ pathname: '/category/[id]', params: { id: 'all' } });
      return;
    }
    const category = parts.length === 1 ? findBySlug(categories, decodeURIComponent(parts[0])) : undefined;
    if (category) {
      router.push({ pathname: '/category/[id]', params: { id: String(category.id), title: category.title } });
      return;
    }
    if (parts.length === 2 && !['order-success', 'order-failed', 'order-invoice', 'track-order', 'payfast'].includes(parts[0])) {
      router.push({ pathname: '/product/[id]', params: { id: parts[1] } });
      return;
    }
  }

  WebBrowser.openBrowserAsync(url.toString());
}

function findBySlug(tree: Category[], slug: string): Category | undefined {
  for (const c of tree) {
    if (c.slug === slug) return c;
    const found = findBySlug(c.children ?? [], slug);
    if (found) return found;
  }
  return undefined;
}
