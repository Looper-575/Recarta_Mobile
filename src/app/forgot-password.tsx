import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AppText, Button, ErrorText, styles, TextField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { spacing } from '@/theme';

/** Email → code → new password, the website's three steps. */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

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

  const generalError = error && Object.keys(error.errors).length === 0 ? error.message : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <TextField label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={error?.field('email')} />
            <Button
              title={t('common.continue')}
              loading={busy}
              onPress={() =>
                run(async () => {
                  await api('auth/password/forgot', { method: 'POST', body: { email: email.trim() } });
                  setStep('code');
                })
              }
            />
          </>
        ) : step === 'code' ? (
          <>
            <AppText style={{ marginBottom: spacing.lg }}>{t('auth.codeSent', { email: email.trim() })}</AppText>
            <TextField label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" error={error?.field('code')} />
            <Button
              title={t('auth.verify')}
              loading={busy}
              onPress={() =>
                run(async () => {
                  const r = await api<{ reset_token: string }>('auth/password/verify', { method: 'POST', body: { email: email.trim(), code: code.trim() } });
                  setResetToken(r.reset_token);
                  setStep('password');
                })
              }
            />
          </>
        ) : (
          <>
            <TextField label={t('auth.newPassword')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" error={error?.field('password') ?? error?.field('reset_token')} />
            <TextField label={t('auth.confirmPassword')} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
            <Button
              title={t('auth.resetPassword')}
              loading={busy}
              onPress={() =>
                run(async () => {
                  await api('auth/password/reset', {
                    method: 'POST',
                    body: { email: email.trim(), reset_token: resetToken, password, password_confirmation: confirmation },
                  });
                  Alert.alert('', t('auth.resetDone'));
                  router.replace('/login');
                })
              }
            />
          </>
        )}
        {generalError ? <ErrorText>{generalError}</ErrorText> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
