import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AppText, Button, ErrorText, Heading, styles, TextField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { logOut } from '@/lib/auth';
import type { Customer } from '@/lib/types';
import { useSession } from '@/state/session';
import { spacing } from '@/theme';

/** Name and phone, password, and deleting the account (required by both app stores). */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);

  const [profile, setProfile] = useState({
    first_name: customer?.first_name ?? '',
    last_name: customer?.last_name ?? '',
    phone_number: customer?.phone_number ?? '',
  });
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordError, setPasswordError] = useState<ApiError | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!customer) return null;

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      const r = await api<{ data: Customer }>('me', { method: 'PATCH', body: profile });
      await useSession.getState().setCustomer(r.data);
      Alert.alert('', t('profile.saved'));
    } catch (e) {
      setProfileError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordError(null);
    try {
      const r = await api<{ message: string }>('me/password', { method: 'POST', body: passwords });
      setPasswords({ current_password: '', password: '', password_confirmation: '' });
      Alert.alert('', r.message);
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteAccount = () =>
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api('me', { method: 'DELETE', body: { confirm: 'DELETE' } });
            await logOut(queryClient);
            router.dismissTo('/(tabs)/account');
            Alert.alert('', t('profile.deleted'));
          } catch (e) {
            Alert.alert('', e instanceof ApiError ? e.message : String(e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Heading>{t('profile.details')}</Heading>
        <AppText muted style={{ marginBottom: spacing.md }}>{customer.email}</AppText>
        <TextField label={t('checkout.firstName')} value={profile.first_name} onChangeText={(v) => setProfile({ ...profile, first_name: v })} error={profileError?.field('first_name')} />
        <TextField label={t('checkout.lastName')} value={profile.last_name} onChangeText={(v) => setProfile({ ...profile, last_name: v })} error={profileError?.field('last_name')} />
        <TextField label={t('auth.phoneNumber')} value={profile.phone_number} onChangeText={(v) => setProfile({ ...profile, phone_number: v })} keyboardType="phone-pad" error={profileError?.field('phone_number')} />
        {profileError && !Object.keys(profileError.errors).length ? <ErrorText>{profileError.message}</ErrorText> : null}
        <Button title={t('common.save')} onPress={saveProfile} loading={savingProfile} />

        <Heading style={{ marginTop: spacing.xl }}>{t('profile.password')}</Heading>
        {customer.has_password_login ? (
          <TextField label={t('profile.currentPassword')} value={passwords.current_password} onChangeText={(v) => setPasswords({ ...passwords, current_password: v })} secureTextEntry autoComplete="current-password" error={passwordError?.field('current_password')} />
        ) : (
          <AppText muted style={{ marginBottom: spacing.md }}>{t('profile.socialPassword')}</AppText>
        )}
        <TextField label={t('auth.newPassword')} value={passwords.password} onChangeText={(v) => setPasswords({ ...passwords, password: v })} secureTextEntry autoComplete="new-password" error={passwordError?.field('password')} />
        <TextField label={t('auth.confirmPassword')} value={passwords.password_confirmation} onChangeText={(v) => setPasswords({ ...passwords, password_confirmation: v })} secureTextEntry autoComplete="new-password" />
        <Button title={t('profile.changePassword')} variant="outline" onPress={savePassword} loading={savingPassword} />

        <Heading style={{ marginTop: spacing.xl }}>{t('profile.deleteTitle')}</Heading>
        <AppText muted style={{ marginBottom: spacing.md }}>{t('profile.deleteBody')}</AppText>
        <TextField label={t('profile.typeDelete')} value={deleteConfirm} onChangeText={setDeleteConfirm} autoCapitalize="characters" />
        <Button title={t('profile.deleteButton')} variant="danger" onPress={deleteAccount} loading={deleting} disabled={deleteConfirm.trim() !== 'DELETE'} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
