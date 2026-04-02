import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, TextInput } from 'react-native';
import { t } from 'i18next';
import {
  CyDIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { BLINDPAY_COUNTRY_OPTIONS } from '../blindpayCountryList';
import BlindPayCountryPickerModal from '../BlindPayCountryPickerModal';
import { blindPayKycAddressSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const INPUT_CLASS =
  'flex-1 bg-transparent text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] py-0';
const PLACEHOLDER_COLOR = '#A6AEBB';

export function BlindPayKycAddressStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();

  const [country, setCountry] = useState(draft.country ?? '');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [addressLine1, setAddressLine1] = useState(draft.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(draft.addressLine2 ?? '');
  const [city, setCity] = useState(draft.city ?? '');
  const [stateProvinceRegion, setStateProvinceRegion] = useState(
    draft.stateProvinceRegion ?? '',
  );
  const [postalCode, setPostalCode] = useState(draft.postalCode ?? '');
  const [phoneInput, setPhoneInput] = useState(draft.phoneNumber ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const countryLabel =
    BLINDPAY_COUNTRY_OPTIONS.find(c => c.code === country)?.name ?? '';

  const addr2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const postalRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycAddressSchema.safeParse({
      country,
      phoneNumber: phoneInput.trim(),
      addressLine1,
      city,
      stateProvinceRegion,
      postalCode,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      country: parsed.data.country,
      phoneNumber: parsed.data.phoneNumber,
      addressLine1: parsed.data.addressLine1,
      addressLine2: addressLine2.trim() || undefined,
      city: parsed.data.city,
      stateProvinceRegion: parsed.data.stateProvinceRegion,
      postalCode: parsed.data.postalCode,
    });
    advance();
  }, [
    advance,
    addressLine1,
    addressLine2,
    city,
    country,
    mergeDraft,
    phoneInput,
    postalCode,
    stateProvinceRegion,
  ]);

  useLayoutEffect(() => {
    onReady({ canNext: true, onNext: handleNext });
  }, [handleNext, onReady]);

  return (
    <>
      <BlindPayCountryPickerModal
        visible={countryPickerOpen}
        selectedCode={country}
        onSelect={code => {
          setCountry(code);
          clearKey('country');
        }}
        onClose={() => setCountryPickerOpen(false)}
      />

      {/* ── Country ── */}
      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('COUNTRY', 'Country'))}
        </CyDText>
        <CyDTouchView
          onPress={() => setCountryPickerOpen(true)}
          className={`min-h-[48px] rounded-[8px] bg-n20 flex-row items-center justify-between px-[12px] border ${
            fieldErrors.country ? 'border-errorText' : 'border-transparent'
          }`}>
          <CyDText
            className={`text-[16px] font-medium tracking-[-0.8px] ${
              countryLabel ? 'text-base400' : 'text-n200'
            }`}>
            {countryLabel || String(t('SELECT_COUNTRY', 'Select country'))}
          </CyDText>
          <CyDIcons name='chevron-down' size={20} className='text-base400' />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.country} />
      </CyDView>

      {/* ── Address Card ── */}
      <CyDView className='gap-[4px]'>
        <CyDView className='rounded-[8px] bg-n20'>
          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              className={INPUT_CLASS}
              value={addressLine1}
              onChangeText={v => {
                setAddressLine1(v);
                clearKey('addressLine1');
              }}
              placeholder={String(
                t('BLINDPAY_STREET_ADDRESS', 'Street address'),
              )}
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize='words'
              returnKeyType='next'
              onSubmitEditing={() => addr2Ref.current?.focus()}
            />
          </CyDView>

          <CyDView className='h-[0.5px] bg-n50' />

          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              ref={addr2Ref}
              className={INPUT_CLASS}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder={String(
                t(
                  'BLINDPAY_APARTMENT',
                  'Apartment, Suite, etc (if applicable)',
                ),
              )}
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize='words'
              returnKeyType='next'
              onSubmitEditing={() => cityRef.current?.focus()}
            />
          </CyDView>

          <CyDView className='h-[0.5px] bg-n50' />

          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              ref={cityRef}
              className={INPUT_CLASS}
              value={city}
              onChangeText={v => {
                setCity(v);
                clearKey('city');
              }}
              placeholder={String(t('CITY', 'City'))}
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize='words'
              returnKeyType='next'
              onSubmitEditing={() => stateRef.current?.focus()}
            />
          </CyDView>

          <CyDView className='h-[0.5px] bg-n50' />

          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              ref={stateRef}
              className={INPUT_CLASS}
              value={stateProvinceRegion}
              onChangeText={v => {
                const upper = v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
                setStateProvinceRegion(upper);
                clearKey('stateProvinceRegion');
              }}
              placeholder={String(
                t('STATE_PROVINCE', 'State code (e.g. CA, NY)'),
              )}
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize='characters'
              maxLength={2}
              returnKeyType='next'
              onSubmitEditing={() => postalRef.current?.focus()}
            />
          </CyDView>

          <CyDView className='h-[0.5px] bg-n50' />

          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              ref={postalRef}
              className={INPUT_CLASS}
              value={postalCode}
              onChangeText={v => {
                setPostalCode(v);
                clearKey('postalCode');
              }}
              placeholder={String(t('POSTAL_CODE', 'Postal code'))}
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize='characters'
              returnKeyType='next'
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          </CyDView>
        </CyDView>

        <BlindPayKycFieldError message={fieldErrors.addressLine1} />
        <BlindPayKycFieldError message={fieldErrors.city} />
        <BlindPayKycFieldError message={fieldErrors.stateProvinceRegion} />
        <BlindPayKycFieldError message={fieldErrors.postalCode} />
      </CyDView>

      {/* ── Phone Number ── */}
      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('PHONE_NUMBER', 'Phone Number'))}
        </CyDText>

        <CyDView className='min-h-[48px] rounded-[8px] bg-n20 justify-center px-[12px]'>
          <CyDTextInput
            ref={phoneRef}
            className={INPUT_CLASS}
            value={phoneInput}
            onChangeText={v => {
              setPhoneInput(v);
              clearKey('phoneNumber');
            }}
            placeholder='+12025551234'
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType='phone-pad'
            autoCorrect={false}
            returnKeyType='done'
            blurOnSubmit
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
          />
        </CyDView>

        <BlindPayKycFieldError message={fieldErrors.phoneNumber} />
      </CyDView>
    </>
  );
}
