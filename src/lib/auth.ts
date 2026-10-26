import type { QueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';

import { api } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';
import { useSession } from '@/state/session';

/** Names the login token after this phone, so it can be told apart later. */
export const deviceName = () => [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Phone';

/** Stores a login and refreshes everything that depends on who is logged in. */
export async function completeLogin(response: LoginResponse, queryClient: QueryClient) {
  await useSession.getState().logIn(response.token, response.customer);
  await queryClient.invalidateQueries();
}

export async function logOut(queryClient: QueryClient) {
  try {
    await api('auth/logout', { method: 'POST' });
  } catch {
    // Logged out on this phone either way.
  }
  await useSession.getState().logOut();
  queryClient.clear();
}
