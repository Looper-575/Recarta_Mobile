import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { Customer } from '@/lib/types';

/**
 * What the app remembers between launches. The login token lives in the device's
 * secure store; the guest cart token and "deliver to" city are plain preferences.
 */
const TOKEN_KEY = 'auth_token';
const CUSTOMER_KEY = 'customer';
const CART_TOKEN_KEY = 'cart_token';
const CITY_KEY = 'city_id';

type SessionState = {
  hydrated: boolean;
  token: string | null;
  customer: Customer | null;
  cartToken: string | null;
  cityId: number | null;
  /** Set when the server says this app version is too old (HTTP 426). */
  updateRequired: boolean;

  hydrate: () => Promise<void>;
  logIn: (token: string, customer: Customer) => Promise<void>;
  setCustomer: (customer: Customer) => Promise<void>;
  logOut: () => Promise<void>;
  setCartToken: (token: string | null) => Promise<void>;
  setCityId: (cityId: number | null) => Promise<void>;
  setUpdateRequired: () => void;
};

export const useSession = create<SessionState>((set) => ({
  hydrated: false,
  token: null,
  customer: null,
  cartToken: null,
  cityId: null,
  updateRequired: false,

  hydrate: async () => {
    const [token, customer, cartToken, cityId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(CUSTOMER_KEY),
      AsyncStorage.getItem(CART_TOKEN_KEY),
      AsyncStorage.getItem(CITY_KEY),
    ]);
    set({
      hydrated: true,
      token,
      customer: token && customer ? (JSON.parse(customer) as Customer) : null,
      cartToken,
      cityId: cityId ? Number(cityId) : null,
    });
  },

  logIn: async (token, customer) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    // The server adopted the guest cart on login, so the guest token is spent.
    await AsyncStorage.removeItem(CART_TOKEN_KEY);
    set({ token, customer, cartToken: null });
  },

  setCustomer: async (customer) => {
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    set({ customer });
  },

  logOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(CUSTOMER_KEY);
    set({ token: null, customer: null });
  },

  setCartToken: async (cartToken) => {
    if (cartToken) {
      await AsyncStorage.setItem(CART_TOKEN_KEY, cartToken);
    } else {
      await AsyncStorage.removeItem(CART_TOKEN_KEY);
    }
    set({ cartToken });
  },

  setCityId: async (cityId) => {
    if (cityId) {
      await AsyncStorage.setItem(CITY_KEY, String(cityId));
    } else {
      await AsyncStorage.removeItem(CITY_KEY);
    }
    set({ cityId });
  },

  setUpdateRequired: () => set({ updateRequired: true }),
}));
