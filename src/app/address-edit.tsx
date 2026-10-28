import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';

import { AppText, Button, ErrorText, SelectField, styles, TextField } from '@/components/ui';
import { useAddresses, useAreas, useCities, useRegions } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

/** Add an address, or edit one when `id` is given. */
export default function AddressEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const existing = useAddresses().data?.find((a) => String(a.id) === id);

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    first_name: existing?.first_name ?? customer?.first_name ?? '',
    last_name: existing?.last_name ?? customer?.last_name ?? '',
    email: existing?.email ?? customer?.email ?? '',
    phone: existing?.phone ?? customer?.phone_number ?? '',
    address: existing?.address ?? '',
    instructions: existing?.instructions ?? '',
  });
  const [regionId, setRegionId] = useState<number | null>(existing?.region_id ?? null);
  const [cityId, setCityId] = useState<number | null>(existing?.city_id ?? null);
  const [areaId, setAreaId] = useState<number | null>(existing?.area_id ?? null);
  const [isDefault, setIsDefault] = useState(existing?.is_default ?? false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const regions = useRegions();
  const allCities = useCities(null);
  const areas = useAreas(cityId);
  const cities = useMemo(() => (allCities.data ?? []).filter((c) => !regionId || c.region_id === regionId), [allCities.data, regionId]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, area_id: areaId, is_default: isDefault };
      await api(existing ? `addresses/${existing.id}` : 'addresses', { method: existing ? 'PATCH' : 'POST', body });
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? t('addresses.edit') : t('addresses.add') }} />
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <TextField label={t('addresses.title')} placeholder={t('addresses.titleHint')} value={form.title} onChangeText={set('title')} error={error?.field('title')} />
        <TextField label={t('checkout.firstName')} value={form.first_name} onChangeText={set('first_name')} error={error?.field('first_name')} />
        <TextField label={t('checkout.lastName')} value={form.last_name} onChangeText={set('last_name')} error={error?.field('last_name')} />
        <TextField label={t('checkout.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={error?.field('email')} />
        <TextField label={t('checkout.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={11} error={error?.field('phone')} />
        <SelectField
          label={t('checkout.region')}
          value={regions.data?.find((r) => r.id === regionId) ?? null}
          options={regions.data ?? []}
          getLabel={(r) => r.name}
          getKey={(r) => r.id}
          onChange={(r) => {
            setRegionId(r.id);
            setCityId(null);
            setAreaId(null);
          }}
        />
        <SelectField
          label={t('checkout.city')}
          value={allCities.data?.find((c) => c.id === cityId) ?? null}
          options={cities}
          getLabel={(c) => c.name}
          getKey={(c) => c.id}
          onChange={(c) => {
            setCityId(c.id);
            setAreaId(null);
          }}
          disabled={!regionId}
        />
        <SelectField
          label={t('checkout.area')}
          value={areas.data?.find((a) => a.id === areaId) ?? null}
          options={areas.data ?? []}
          getLabel={(a) => a.title}
          getKey={(a) => a.id}
          onChange={(a) => setAreaId(a.id)}
          disabled={!cityId}
          error={error?.field('area_id')}
        />
        <TextField label={t('checkout.address')} value={form.address} onChangeText={set('address')} multiline error={error?.field('address')} />
        <TextField label={t('checkout.instructions')} value={form.instructions} onChangeText={set('instructions')} />
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.md }]}>
          <AppText>{t('addresses.makeDefault')}</AppText>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: theme.primary }} />
        </View>
        {error && !Object.keys(error.errors).length ? <ErrorText>{error.message}</ErrorText> : null}
        <Button title={t('common.save')} onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
