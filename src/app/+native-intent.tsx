/**
 * Links that open the app from outside it: a shared product link from the store's
 * website (once app links are set up on the live domain), or the app's own scheme.
 * Website paths are turned into the app's screens; anything else opens Home.
 *
 *   /{category_slug}/{product_slug}  -> product (the API looks products up by slug too)
 *   /brand/{slug}                    -> brand
 *   /track-order/{number}            -> tracking
 *   /order-success/{id}, /order-failed/{id}, /order-invoice/{id} -> that order
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, 'app://local');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

    if (parts.length === 0) return '/';

    const [first, second] = parts;
    if (['order-success', 'order-failed', 'order-invoice'].includes(first) && /^\d+$/.test(second ?? '')) {
      return `/orders/${second}`;
    }
    if (first === 'track-order') {
      return second ? `/track?number=${encodeURIComponent(second)}` : '/track';
    }
    if (first === 'brand' && second) {
      return `/brand/${encodeURIComponent(second)}`;
    }
    if (parts.length === 2 && !['payfast', 'payment', 'admin', 'api'].includes(first)) {
      return `/product/${encodeURIComponent(second)}`;
    }
    // Paths the app already knows (its own scheme) go through as they are.
    if (['product', 'category', 'orders', 'cart', 'search', 'categories', 'account', 'track'].includes(first)) {
      return url.pathname + url.search;
    }
    return '/';
  } catch {
    return '/';
  }
}
