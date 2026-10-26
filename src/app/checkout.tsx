import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ErrorText,
  formatRs,
  Heading,
  Loading,
  Row,
  SelectField,
  styles,
  TextField,
} from '@/components/ui';
import { useAreas, useCart, useCities, usePickupLocations, usePickupSlots, useRegions, useSettings } from '@/hooks/queries';
import { api, ApiError } from '@/lib/api';
import type { Address, CheckoutBody, PlacedOrder, Quote } from '@/lib/types';
import { useSession } from '@/state/session';
import { spacing, useTheme } from '@/theme';

/** PayFast opens the gateway in a browser, which comes with Phase 4 of the app. */
const METHODS_NOT_YET_IN_APP = ['PayFast'];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const savedCityId = useSession((s) => s.cityId);
  const settings = useSettings();
  const cart = useCart();

  const [contact, setContact] = useState({
    first_name: customer?.first_name ?? '',
    last_name: customer?.last_name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone_number ?? '',
  });
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('delivery');
  const [regionChoice, setRegionId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(savedCityId);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [savedAddressId, setSavedAddressId] = useState<number | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [pickupLocationChoice, setPickupLocationId] = useState<number | null>(null);
  const [pickupSlotChoice, setPickupSlot] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [payFromWallet, setPayFromWallet] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [placing, setPlacing] = useState(false);
  // One key per visit to checkout: a retry after a dropped connection can't order twice.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const regions = useRegions();
  const allCities = useCities(null);
  const areas = useAreas(cityId);
  const pickupLocations = usePickupLocations(cityId);
  // One pickup point in the city: it is the choice until the customer picks another.
  const pickupLocationId = pickupLocationChoice ?? (pickupLocations.data?.length === 1 ? pickupLocations.data[0].id : null);
  const pickupSlots = usePickupSlots(fulfilment === 'pickup' ? pickupLocationId : null);
  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<{ data: Address[] }>('addresses').then((r) => r.data),
    enabled: !!customer,
  });

  const city = allCities.data?.find((c) => c.id === cityId) ?? null;
  // Region follows the remembered "deliver to" city until one is chosen.
  const regionId = regionChoice ?? city?.region_id ?? null;
  const cities = useMemo(() => (allCities.data ?? []).filter((c) => !regionId || c.region_id === regionId), [allCities.data, regionId]);
  const area = areas.data?.find((a) => a.id === areaId) ?? null;
  const pickupAvailable = (pickupLocations.data?.length ?? 0) > 0;
  // The first window on offer, unless the customer chose one that is still offered.
  const pickupSlot = pickupSlots.data?.some((s) => s.value === pickupSlotChoice) ? pickupSlotChoice : (pickupSlots.data?.[0]?.value ?? null);
  const methods = (settings.data?.payment_methods ?? []).filter((m) => !METHODS_NOT_YET_IN_APP.includes(m.code));

  // A saved default address fills the form once, as on the website.
  if (!prefilled && addresses.data) {
    setPrefilled(true);
    const preferred = addresses.data.find((a) => a.is_default) ?? addresses.data[0];
    if (preferred) fillFromAddress(preferred);
  }

  function fillFromAddress(a: Address) {
    setSavedAddressId(a.id);
    setContact({ first_name: a.first_name, last_name: a.last_name, email: a.email, phone: a.phone });
    setRegionId(a.region_id);
    setCityId(a.city_id);
    setAreaId(a.area_id);
    setAddress(a.address);
    setInstructions(a.instructions ?? '');
  }

  const body: CheckoutBody = {
    ...contact,
    fulfilment,
    city_id: cityId,
    area_id: fulfilment === 'delivery' ? areaId : null,
    address: fulfilment === 'delivery' ? address : undefined,
    instructions,
    pickup_location_id: fulfilment === 'pickup' ? pickupLocationId : null,
    pickup_slot: fulfilment === 'pickup' ? pickupSlot : null,
    delivery_type: 'standard',
    payment_method: paymentMethod,
    discount_code: discountCode,
    pay_from_wallet: payFromWallet,
    save_address: !!customer && fulfilment === 'delivery' && !savedAddressId && saveAddress,
  };

  // The summary follows every choice that changes the price.
  const quoteKey = { cityId, areaId, fulfilment, pickupLocationId, paymentMethod, discountCode, payFromWallet, count: cart.data?.count, subtotal: cart.data?.subtotal };
  const quote = useQuery({
    queryKey: ['quote', quoteKey],
    queryFn: () => api<Quote>('checkout/quote', { method: 'POST', body: { ...body, first_name: undefined, last_name: undefined, email: undefined, phone: undefined } }),
    placeholderData: (previous) => previous,
  });

  const applyCode = async () => {
    setError(null);
    try {
      const r = await api<{ code: string }>('checkout/discount', { method: 'POST', body: { code: codeInput.trim() } });
      setDiscountCode(r.code);
    } catch (e) {
      setError(e instanceof ApiError ? e : null);
    }
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setReceipt(result.assets[0]);
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      let payload: CheckoutBody | FormData = body;
      if (paymentMethod === 'Bank Transfer' && receipt) {
        const form = new FormData();
        for (const [key, value] of Object.entries(body)) {
          if (value === null || value === undefined) continue;
          form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
        }
        form.append('payment_attachment', {
          uri: receipt.uri,
          name: receipt.fileName ?? 'receipt.jpg',
          type: receipt.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        payload = form;
      }
      const order = await api<PlacedOrder>('orders', { method: 'POST', body: payload, headers: { 'Idempotency-Key': idempotencyKey } });
      if (cityId) await useSession.getState().setCityId(cityId);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace({
        pathname: '/order-placed/[id]',
        params: { id: String(order.order_id), number: order.order_number, total: String(order.total) },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e), 0));
    } finally {
      setPlacing(false);
    }
  };

  if (cart.isPending || settings.isPending) return <Loading />;

  const q = quote.data;
  const fieldErrors = error?.errors ?? {};
  const shownFields = ['first_name', 'last_name', 'email', 'phone', 'city_id', 'area_id', 'address', 'pickup_location_id', 'pickup_slot', 'payment_attachment', 'code', 'discount_code'];
  const otherError = error && (Object.keys(fieldErrors).length === 0 || !Object.keys(fieldErrors).some((k) => shownFields.includes(k))) ? error.message : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {addresses.data?.length ? (
          <>
            <Heading>{t('checkout.savedAddress')}</Heading>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {addresses.data.map((a) => (
                <Chip key={a.id} label={a.title} selected={savedAddressId === a.id} onPress={() => fillFromAddress(a)} />
              ))}
              <Chip label={t('checkout.newAddress')} selected={savedAddressId === null} onPress={() => setSavedAddressId(null)} />
            </View>
          </>
        ) : null}

        <Heading>{t('checkout.contact')}</Heading>
        <TextField label={t('checkout.firstName')} value={contact.first_name} onChangeText={(v) => setContact({ ...contact, first_name: v })} error={error?.field('first_name')} />
        <TextField label={t('checkout.lastName')} value={contact.last_name} onChangeText={(v) => setContact({ ...contact, last_name: v })} error={error?.field('last_name')} />
        <TextField label={t('checkout.email')} value={contact.email} onChangeText={(v) => setContact({ ...contact, email: v })} keyboardType="email-address" autoCapitalize="none" error={error?.field('email')} />
        <TextField label={t('checkout.phone')} value={contact.phone} onChangeText={(v) => setContact({ ...contact, phone: v })} keyboardType="phone-pad" maxLength={11} error={error?.field('phone')} />

        {q?.fulfilment !== 'digital' ? (
          <>
            <Heading>{t('checkout.howToGetIt')}</Heading>
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
                setSavedAddressId(null);
              }}
            />
            <SelectField
              label={t('checkout.city')}
              value={city}
              options={cities}
              getLabel={(c) => c.name}
              getKey={(c) => c.id}
              onChange={(c) => {
                setCityId(c.id);
                setAreaId(null);
                setPickupLocationId(null);
                setSavedAddressId(null);
              }}
              disabled={!regionId}
              error={error?.field('city_id')}
            />

            {pickupAvailable ? (
              <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
                <Chip label={t('checkout.delivery')} selected={fulfilment === 'delivery'} onPress={() => setFulfilment('delivery')} />
                <Chip label={t('checkout.pickup')} selected={fulfilment === 'pickup'} onPress={() => setFulfilment('pickup')} />
              </View>
            ) : null}

            {fulfilment === 'delivery' ? (
              <>
                {areas.data?.length ? (
                  <SelectField
                    label={t('checkout.area')}
                    value={area}
                    options={areas.data}
                    getLabel={(a) => a.title}
                    getKey={(a) => a.id}
                    onChange={(a) => {
                      setAreaId(a.id);
                      setSavedAddressId(null);
                    }}
                    error={error?.field('area_id')}
                  />
                ) : null}
                <TextField label={t('checkout.address')} value={address} onChangeText={setAddress} multiline error={error?.field('address')} />
                <TextField label={t('checkout.instructions')} value={instructions} onChangeText={setInstructions} />
                {customer && !savedAddressId ? (
                  <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.md }]}>
                    <AppText>{t('checkout.saveAddress')}</AppText>
                    <Switch value={saveAddress} onValueChange={setSaveAddress} trackColor={{ true: theme.primary }} />
                  </View>
                ) : null}
                {q?.delivery.covered === false ? <ErrorText>{t('checkout.notCovered')}</ErrorText> : null}
              </>
            ) : (
              <>
                <SelectField
                  label={t('checkout.pickupLocation')}
                  value={pickupLocations.data?.find((l) => l.id === pickupLocationId) ?? null}
                  options={pickupLocations.data ?? []}
                  getLabel={(l) => (l.address ? `${l.title} — ${l.address}` : l.title)}
                  getKey={(l) => l.id}
                  onChange={(l) => {
                    setPickupLocationId(l.id);
                    setPickupSlot(null);
                  }}
                  error={error?.field('pickup_location_id')}
                />
                <SelectField
                  label={t('checkout.pickupSlot')}
                  value={pickupSlots.data?.find((s) => s.value === pickupSlot) ?? null}
                  options={pickupSlots.data ?? []}
                  getLabel={(s) => s.label}
                  getKey={(s) => s.value}
                  onChange={(s) => setPickupSlot(s.value)}
                  disabled={!pickupLocationId}
                  error={error?.field('pickup_slot')}
                />
              </>
            )}
          </>
        ) : null}

        <Heading>{t('checkout.payment')}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {methods.map((m) => (
            <Chip key={m.code} label={m.name} selected={paymentMethod === m.code} onPress={() => setPaymentMethod(m.code)} />
          ))}
        </View>
        {(settings.data?.payment_methods ?? []).some((m) => METHODS_NOT_YET_IN_APP.includes(m.code)) ? (
          <AppText muted size={12} style={{ marginBottom: spacing.sm }}>{t('checkout.payfastSoon')}</AppText>
        ) : null}
        {q?.payment_method_error ? <ErrorText>{q.payment_method_error}</ErrorText> : null}
        {paymentMethod === 'Bank Transfer' ? (
          <Card>
            {settings.data?.bank_transfer_details ? (
              <>
                <AppText bold>{t('checkout.bankDetails')}</AppText>
                <AppText muted style={{ marginBottom: spacing.md }}>{settings.data.bank_transfer_details.replace(/<[^>]+>/g, '\n').trim()}</AppText>
              </>
            ) : null}
            <Button title={receipt ? t('checkout.receiptAttached') : t('checkout.attachReceipt')} variant="outline" onPress={pickReceipt} />
            {error?.field('payment_attachment') ? <ErrorText>{error.field('payment_attachment')}</ErrorText> : null}
          </Card>
        ) : null}

        <Heading>{t('checkout.discountCode')}</Heading>
        {discountCode ? (
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <AppText bold>{discountCode}</AppText>
            <Button title={t('checkout.remove')} variant="link" onPress={() => setDiscountCode(null)} />
          </View>
        ) : (
          <View style={[styles.row, { gap: spacing.sm, alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <TextField label={t('checkout.discountCode')} value={codeInput} onChangeText={setCodeInput} autoCapitalize="characters" error={error?.field('code')} />
            </View>
            <Button title={t('checkout.apply')} variant="outline" onPress={applyCode} disabled={!codeInput.trim()} style={{ marginTop: 22 }} />
          </View>
        )}
        {q?.discount_error ? <ErrorText>{q.discount_error}</ErrorText> : null}

        {customer && (q?.wallet_balance ?? 0) > 0 ? (
          <View style={[styles.row, { justifyContent: 'space-between', marginVertical: spacing.md }]}>
            <AppText>{t('checkout.wallet', { amount: q!.wallet_balance })}</AppText>
            <Switch value={payFromWallet} onValueChange={setPayFromWallet} trackColor={{ true: theme.primary }} />
          </View>
        ) : null}

        <Heading>{t('checkout.summary')}</Heading>
        <Card>
          {q ? (
            <>
              <Row label={t('checkout.items')} value={formatRs(q.cart_total)} />
              {q.fulfilment === 'delivery' && q.delivery.covered !== false ? (
                <Row label={t('checkout.deliveryCharges')} value={q.delivery.charge > 0 ? formatRs(q.delivery.charge) : t('common.free')} color={q.delivery.charge > 0 ? undefined : theme.success} />
              ) : null}
              {q.discount ? (
                <Row
                  label={q.discount.reward_type === 'discount' ? t('checkout.discount') : t('checkout.cashback')}
                  value={`${q.discount.reward_type === 'discount' ? '- ' : ''}${formatRs(q.discount.amount)}`}
                  color={theme.success}
                />
              ) : null}
              {q.payment_charge !== 0 ? (
                <Row label={q.payment_charge_label ?? ''} value={`${q.payment_charge < 0 ? '- ' : ''}${formatRs(Math.abs(q.payment_charge))}`} color={q.payment_charge < 0 ? theme.success : undefined} />
              ) : null}
              {q.wallet_used > 0 ? <Row label={t('checkout.walletUsed')} value={`- ${formatRs(q.wallet_used)}`} /> : null}
              <Row label={t('checkout.total')} value={formatRs(q.total)} bold />
              {q.delivery.free_threshold && q.delivery.charge > 0 && q.cart_total < q.delivery.free_threshold ? (
                <AppText muted size={12}>{t('checkout.freeDeliveryGap', { amount: Math.ceil(q.delivery.free_threshold - q.cart_total) })}</AppText>
              ) : null}
              {q.problems.map((p) => (
                <ErrorText key={p}>{p}</ErrorText>
              ))}
            </>
          ) : quote.isError ? (
            <ErrorText>{quote.error.message}</ErrorText>
          ) : (
            <Loading />
          )}
        </Card>

        {otherError ? <ErrorText>{otherError}</ErrorText> : null}
        <Button
          title={q ? `${t('checkout.placeOrder')} · ${formatRs(q.total)}` : t('checkout.placeOrder')}
          onPress={placeOrder}
          loading={placing}
          disabled={!q || q.problems.length > 0 || (q.fulfilment === 'delivery' && q.delivery.covered === false)}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
