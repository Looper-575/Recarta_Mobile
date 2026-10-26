import { Platform } from 'react-native';

import { storeConfig } from '@/lib/config';
import { useSession } from '@/state/session';

/** A failed API call: the server's message, and per-field messages for a 422. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** The first message for a field, for showing under that input. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null | (string | number)[]>;
  headers?: Record<string, string>;
};

function queryString(query: Options['query']): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Calls the store's /api/v1. Sends the login token, or the guest cart token, plus
 * the app version (the server answers 426 when it is too old) and platform.
 * A FormData body is sent as multipart (bank transfer receipts).
 */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { token, cartToken } = useSession.getState();
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Version': storeConfig.appVersion,
    'X-Platform': Platform.OS,
    ...options.headers,
  };
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (cartToken) headers['X-Cart-Token'] = cartToken;

  let response: Response;
  try {
    response = await fetch(`${storeConfig.apiUrl}/${path.replace(/^\/+/, '')}${queryString(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('No connection. Please check your internet and try again.', 0);
  }

  const data = await response.json().catch(() => null);

  if (response.ok) {
    // A guest's first cart call creates their cart; keep its token.
    const newCartToken = data && typeof data === 'object' && 'cart_token' in data ? (data as { cart_token: string | null }).cart_token : null;
    if (!token && newCartToken && newCartToken !== cartToken) {
      await useSession.getState().setCartToken(newCartToken);
    }
    return data as T;
  }

  if (response.status === 401 && token) {
    // The token was revoked (logged out elsewhere, password reset, account deleted).
    await useSession.getState().logOut();
  }
  if (response.status === 426) {
    useSession.getState().setUpdateRequired();
  }

  const message = (data && typeof data === 'object' && 'message' in data && String((data as { message: string }).message)) || 'Something went wrong. Please try again.';
  const errors = (data && typeof data === 'object' && 'errors' in data ? (data as { errors: Record<string, string[]> }).errors : {}) ?? {};
  throw new ApiError(message, response.status, errors);
}
