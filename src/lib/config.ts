import Constants from 'expo-constants';

/** Build-time store config (stores/<store>.json, via app.config.ts). */
type Extra = {
  store: string;
  apiUrl: string;
  website: string;
  primaryColor: string;
  googleWebClientId: string;
  googleIosClientId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const storeConfig = {
  store: extra.store ?? 'keryana',
  apiUrl: (extra.apiUrl ?? '').replace(/\/+$/, ''),
  website: extra.website ?? '',
  primaryColor: extra.primaryColor ?? '#4CAF50',
  googleWebClientId: extra.googleWebClientId ?? '',
  googleIosClientId: extra.googleIosClientId ?? '',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  name: Constants.expoConfig?.name ?? 'Store',
};
