import { useSettings } from '@/hooks/queries';
import { storeConfig } from '@/lib/config';

/**
 * Colours for the current store. The accent is the store's primary_color setting, so
 * a change in the admin shows on the next launch; until settings load (or if they
 * can't), the build-time colour from stores/<store>.json stands in.
 */
export type Theme = {
  primary: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  background: string;
  surface: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
};

const base = {
  text: '#1B1D21',
  textMuted: '#6B7078',
  background: '#FFFFFF',
  surface: '#F4F5F7',
  border: '#E2E4E8',
  danger: '#C62828',
  success: '#2E7D32',
  warning: '#B26A00',
};

function isHex(color: unknown): color is string {
  return typeof color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim());
}

/** Black or white text, whichever reads better on the accent. */
function contrastOn(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#111111' : '#FFFFFF';
}

export function useTheme(): Theme {
  const { data } = useSettings();
  const primary = isHex(data?.store.primary_color) ? data.store.primary_color.trim() : storeConfig.primaryColor;

  return { ...base, primary, onPrimary: contrastOn(primary) };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16 } as const;
