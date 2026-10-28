/// <reference types="node" />
import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

/**
 * One codebase, one app per store. The store is picked at build time:
 *
 *   STORE=keryana npx expo start
 *   STORE=keryana npx eas-cli@latest build --profile production
 *
 * and its server, name and app ids come from stores/<store>.json. Branding that can
 * change without a release (colours, logo, contact details) is read from the store's
 * /api/v1/settings at launch instead.
 */
type StoreConfig = {
  name: string;
  slug: string;
  scheme: string;
  website: string;
  apiUrl: string;
  iosBundleId: string;
  androidPackage: string;
  primaryColor: string;
  easProjectId?: string;
  /** Google sign-in: the OAuth web client id (used on Android, and checked by the server). */
  googleWebClientId?: string;
  /** Google sign-in on iPhone: the OAuth iOS client id. Without it, iOS shows no Google button. */
  googleIosClientId?: string;
};

const store = process.env.STORE ?? 'keryana';
const storeFile = path.join(__dirname, 'stores', `${store}.json`);
if (!fs.existsSync(storeFile)) {
  throw new Error(`Unknown STORE "${store}": add stores/${store}.json`);
}
const config: StoreConfig = JSON.parse(fs.readFileSync(storeFile, 'utf8'));

// A dev machine can point the app at another server without editing the store file.
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? config.apiUrl;
// App links (shared website links opening the app) only work on the standard https
// port, so a site on another port (a test server) builds without them.
const website = new URL(config.website);
const websiteHost = website.port === '' ? website.hostname : null;
const appLinks = websiteHost
  ? {
      ios: { associatedDomains: [`applinks:${websiteHost}`] },
      android: {
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host: websiteHost }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
    }
  : { ios: {}, android: {} };

// Google sign-in on iOS registers a URL scheme: the iOS client id, reversed.
const googleIosScheme = config.googleIosClientId
  ? `com.googleusercontent.apps.${config.googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`
  : null;

export default ({ config: base }: ConfigContext): ExpoConfig => ({
  ...base,
  name: config.name,
  slug: config.slug,
  version: '1.0.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: config.scheme,
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: config.iosBundleId,
    supportsTablet: false,
    // Shared product links on the store's website open the app.
    ...appLinks.ios,
    usesAppleSignIn: true,
  },
  android: {
    package: config.androidPackage,
    adaptiveIcon: {
      backgroundColor: config.primaryColor,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    ...appLinks.android,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: config.primaryColor,
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'Used to attach your bank transfer receipt to an order.' },
    ],
    'expo-notifications',
    ...(googleIosScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosScheme }] as [string, object]] : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    store,
    apiUrl,
    website: config.website,
    primaryColor: config.primaryColor,
    googleWebClientId: config.googleWebClientId ?? '',
    googleIosClientId: config.googleIosClientId ?? '',
    ...(config.easProjectId ? { eas: { projectId: config.easProjectId } } : {}),
  },
});
