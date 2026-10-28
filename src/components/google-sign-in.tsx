import { useQueryClient } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';

import { Button } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { completeLogin, deviceName } from '@/lib/auth';
import { storeConfig } from '@/lib/config';
import type { LoginResponse } from '@/lib/types';
import { spacing } from '@/theme';

/**
 * Continue with Google: the native Google sign-in sheet gives an ID token issued for
 * the store's web client id, and the server checks it (GOOGLE_APP_CLIENT_IDS in its
 * .env must include that id). Hidden where it can't work: in Expo Go (the module isn't
 * part of it), with no web client id, and on iPhone until an iOS client id is set.
 */
const supported =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  !!storeConfig.googleWebClientId &&
  (Platform.OS !== 'ios' || !!storeConfig.googleIosClientId);

export function GoogleSignIn() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!supported) return null;

  const signIn = async () => {
    setBusy(true);
    try {
      // Loaded only here, so Expo Go never touches the native module.
      const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: storeConfig.googleWebClientId,
        iosClientId: storeConfig.googleIosClientId || undefined,
      });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result) || !result.data.idToken) return; // cancelled

      const response = await api<LoginResponse>('auth/google', {
        method: 'POST',
        body: { id_token: result.data.idToken, device_name: deviceName() },
      });
      await completeLogin(response, queryClient);
      router.back();
    } catch (e) {
      Alert.alert('', e instanceof ApiError ? e.field('id_token') ?? e.message : t('auth.googleFailed'));
    } finally {
      setBusy(false);
    }
  };

  return <Button title={t('auth.google')} variant="outline" onPress={signIn} loading={busy} style={{ marginTop: spacing.md }} />;
}
