import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AppleSignIn } from '@/components/apple-sign-in';
import { GoogleSignIn } from '@/components/google-sign-in';
import { AppText, Button, ErrorText, styles, TextField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { completeLogin, deviceName } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';
import { spacing } from '@/theme';

/** Sign-up in two steps, as on the website: details, then the code emailed to them. */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '', password: '', password_confirmation: '' });
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const run = async (request: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await request();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await api('auth/register', { method: 'POST', body: { ...form, email: form.email.trim() } });
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const response = await api<LoginResponse>('auth/register/verify', {
        method: 'POST',
        body: { email: form.email.trim(), code: code.trim(), device_name: deviceName() },
      });
      await completeLogin(response, queryClient);
      router.back();
    });

  const generalError = error && Object.keys(error.errors).length === 0 ? error.message : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {step === 'details' ? (
          <>
            <TextField label={t('checkout.firstName')} value={form.first_name} onChangeText={set('first_name')} autoComplete="given-name" error={error?.field('first_name')} />
            <TextField label={t('checkout.lastName')} value={form.last_name} onChangeText={set('last_name')} autoComplete="family-name" error={error?.field('last_name')} />
            <TextField label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error?.field('email')} />
            <TextField label={t('auth.phoneNumber')} value={form.phone_number} onChangeText={set('phone_number')} keyboardType="phone-pad" autoComplete="tel" error={error?.field('phone_number')} />
            <TextField label={t('auth.password')} value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" error={error?.field('password')} />
            <TextField label={t('auth.confirmPassword')} value={form.password_confirmation} onChangeText={set('password_confirmation')} secureTextEntry autoComplete="new-password" />
            {generalError ? <ErrorText>{generalError}</ErrorText> : null}
            <Button title={t('common.continue')} onPress={sendCode} loading={busy} style={{ marginTop: spacing.sm }} />
            <AppleSignIn />
            <GoogleSignIn />
            <Button title={t('auth.haveAccount')} variant="link" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <AppText style={{ marginBottom: spacing.lg }}>{t('auth.codeSent', { email: form.email.trim() })}</AppText>
            <TextField label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" error={error?.field('code') ?? error?.field('email')} />
            {generalError ? <ErrorText>{generalError}</ErrorText> : null}
            <Button title={t('auth.verify')} onPress={verify} loading={busy} />
            <Button title={t('auth.resend')} variant="link" onPress={sendCode} disabled={busy} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
