import { useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { completeLogin, deviceName } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';
import { radius } from '@/theme';

/**
 * Sign in with Apple, on iPhones only. Apple's rules require it in any iOS app that
 * offers another social login. The server checks Apple's identity token
 * (APPLE_CLIENT_IDS in its .env must list this app's bundle id).
 */
export function AppleSignIn() {
  const queryClient = useQueryClient();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (!available) return null;

  const signIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) return;

      const response = await api<LoginResponse>('auth/apple', {
        method: 'POST',
        body: {
          identity_token: credential.identityToken,
          // Apple gives the name only the first time someone signs in.
          first_name: credential.fullName?.givenName ?? undefined,
          last_name: credential.fullName?.familyName ?? undefined,
          device_name: deviceName(),
        },
      });
      await completeLogin(response, queryClient);
      router.back();
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('', e instanceof ApiError ? e.field('identity_token') ?? e.message : String(e));
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.md}
      style={{ height: 48, marginTop: 16 }}
      onPress={signIn}
    />
  );
}
