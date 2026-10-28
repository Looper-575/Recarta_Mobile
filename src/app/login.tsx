import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AppleSignIn } from '@/components/apple-sign-in';
import { Button, ErrorText, styles, TextField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { completeLogin, deviceName } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';
import { spacing } from '@/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await api<LoginResponse>('auth/login', {
        method: 'POST',
        body: { email: email.trim(), password, device_name: deviceName() },
      });
      await completeLogin(response, queryClient);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={error?.field('email')}
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          error={error?.field('password')}
        />
        {error && !error.field('email') && !error.field('password') ? <ErrorText>{error.message}</ErrorText> : null}
        <Button title={t('auth.login')} onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
        <AppleSignIn />
        <Button title={t('auth.forgot')} variant="link" onPress={() => router.replace('/forgot-password')} />
        <Button title={t('auth.noAccount')} variant="link" onPress={() => router.replace('/register')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
