import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
  CyDKeyboardAwareScrollView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import type { AddBankAccountRequest } from '../types';
import {
  RAIL_TYPES,
  type FieldDef,
  type FieldGroup,
  type RailDef,
} from './railConfig';
import { BLINDPAY_COUNTRIES } from '../countries';
import { transformApiSchemaToRailDef, evaluateRequiredWhen } from './transformSchema';

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const PLACEHOLDER_COLOR = '#A6AEBB';

import useBlindPaySheet from '../components/BlindPayDropdownSheet';
import ProgressBarButton from '../../../components/v2/ProgressBarButton';


// ── Grouped card field renderer (floating label pattern) ─────────
function GroupedFieldCard({
  group,
  formValues,
  fieldErrors,
  fieldLoading,
  fieldInfo,
  focusedField,
  onFieldChange,
  onFocus,
  onBlur,
  onDropdownOpen,
}: {
  group: FieldGroup;
  formValues: Record<string, string>;
  fieldErrors: Record<string, string>;
  fieldLoading?: Record<string, boolean>;
  fieldInfo?: Record<string, { message: string; success: boolean }>;
  focusedField: string | null;
  onFieldChange: (key: string, value: string) => void;
  onFocus: (key: string) => void;
  onBlur: (field: FieldDef) => void;
  onDropdownOpen: (field: FieldDef) => void;
}) {
  return (
    <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
      {group.fields.map((field, idx) => {
        const isLast = idx === group.fields.length - 1;
        const hasError = !!fieldErrors[field.key];
        const hasValue = !!(formValues[field.key] ?? '').trim();
        const isRequired = field.required ||
          (field.requiredWhen ? evaluateRequiredWhen(field.requiredWhen, formValues) : false);
        const displayLabel = isRequired
          ? field.label
          : `${field.label} (optional)`;

        if (field.type === 'dropdown') {
          const selectedLabel = field.options?.find(
            o => o.value === formValues[field.key],
          )?.label;
          return (
            <CyDView key={field.key}>
              <CyDTouchView
                onPress={() => onDropdownOpen(field)}
                className={`px-[16px] min-h-[52px] flex-row items-center justify-between ${
                  hasError ? 'bg-n20' : ''
                }`}>
                <CyDView className='flex-1 py-[8px]'>
                  {hasValue ? (
                    <>
                      <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                        {displayLabel}
                      </CyDText>
                      <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                        {selectedLabel}
                      </CyDText>
                    </>
                  ) : (
                    <CyDText className='text-[16px] font-normal text-n70 tracking-[-0.8px]'>
                      {displayLabel}
                    </CyDText>
                  )}
                </CyDView>
                {fieldLoading?.[field.key] ? (
                  <ActivityIndicator size='small' color='#A6AEBB' />
                ) : (
                  <CyDMaterialDesignIcons
                    name='chevron-down'
                    size={20}
                    className='text-n70'
                  />
                )}
              </CyDTouchView>
              {hasError ? (
                <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                  {fieldErrors[field.key]}
                </CyDText>
              ) : null}
              {!isLast ? <CyDView className='h-[0.5px] bg-n50' /> : null}
            </CyDView>
          );
        }

        const isLoading = !!fieldLoading?.[field.key];
        const info = fieldInfo?.[field.key];

        return (
          <CyDView key={field.key}>
            <CyDView
              className={`px-[16px] min-h-[52px] justify-center ${
                hasError ? 'bg-n20' : ''
              }`}>
              <CyDView className='flex-row items-center'>
                <CyDView className='flex-1 py-[8px]'>
                  {hasValue ? (
                    <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                      {displayLabel}
                    </CyDText>
                  ) : null}
                  <CyDTextInput
                    className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                    value={formValues[field.key] ?? ''}
                    onChangeText={v => {
                      let processed = v;
                      if (field.autoCapitalize === 'characters') {
                        processed = v.toUpperCase();
                      }
                      if (field.maxLength) {
                        processed = processed.slice(0, field.maxLength);
                      }
                      onFieldChange(field.key, processed);
                    }}
                    placeholder={hasValue ? '' : displayLabel}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    autoCapitalize={field.autoCapitalize ?? 'none'}
                    keyboardType={field.keyboardType ?? 'default'}
                    maxLength={field.maxLength}
                    returnKeyType='next'
                    autoCorrect={false}
                    onFocus={() => onFocus(field.key)}
                    onBlur={() => onBlur(field)}
                  />
                </CyDView>
                {isLoading ? (
                  <ActivityIndicator size='small' color='#A6AEBB' />
                ) : null}
              </CyDView>
            </CyDView>
            {hasError ? (
              <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                {fieldErrors[field.key]}
              </CyDText>
            ) : null}
            {!hasError && info ? (
              <CyDText className={`text-[11px] px-[16px] pb-[4px] ${info.success ? 'text-successTextGreen' : 'text-errorText'}`}>
                {info.message}
              </CyDText>
            ) : null}
            {!isLast ? <CyDView className='h-[0.5px] bg-n50' /> : null}
          </CyDView>
        );
      })}
    </CyDView>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function BlindPayAddBankAccountScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { addBankAccount, getAvailableRails, getBankAccountFields, lookupSwift } = useBlindPayApi();
  const { openDropdown: openDropdownSheet, openHelpSheet } = useBlindPaySheet();
  const [availableRails, setAvailableRails] = useState<Array<{ value: string; label: string; icon: string }>>([]);

  // Fetch available rails on mount
  useEffect(() => {
    void getAvailableRails().then(res => {
      if (!res.isError && res.data) {
        const COUNTRY_FLAGS: Record<string, string> = {
          US: '\uD83C\uDDFA\uD83C\uDDF8', BR: '\uD83C\uDDE7\uD83C\uDDF7',
          MX: '\uD83C\uDDF2\uD83C\uDDFD', AR: '\uD83C\uDDE6\uD83C\uDDF7',
          CO: '\uD83C\uDDE8\uD83C\uDDF4', '': '\uD83C\uDF10',
        };
        setAvailableRails(res.data.map(r => ({
          value: r.value,
          label: r.label,
          icon: COUNTRY_FLAGS[r.country] ?? '\uD83C\uDF10',
        })));
      }
    });
  }, []);

  // Step 0 = rail + account name, step 1..N = rail-specific field groups
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedRail, setSelectedRail] = useState<RailDef | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const schemaRequestRef = useRef('');
  const [accountName, setAccountName] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Total steps: 1 (rail+name) + number of rail step groups
  const totalSteps = 1 + (selectedRail?.steps.length ?? 0);
  const isLastStep = wizardStep === totalSteps - 1;
  const currentGroup: FieldGroup | null =
    wizardStep > 0 && selectedRail
      ? selectedRail.steps[wizardStep - 1] ?? null
      : null;

  const setField = useCallback((key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ── SWIFT code lookup: auto-fill bank name, country & city ──
  const swiftLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSwiftLookup = useRef('');
  const [swiftLookupLoading, setSwiftLookupLoading] = useState(false);
  const [swiftLookupInfo, setSwiftLookupInfo] = useState<{ message: string; success: boolean } | null>(null);

  useEffect(() => {
    if (selectedRail?.type !== 'international_swift') return;
    const code = (formValues.swiftCodeBic ?? '').trim();
    const isValid = /^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/i.test(code);

    if (!isValid) {
      setSwiftLookupInfo(null);
      return;
    }
    if (code === lastSwiftLookup.current) return;

    if (swiftLookupTimer.current) clearTimeout(swiftLookupTimer.current);
    swiftLookupTimer.current = setTimeout(() => {
      lastSwiftLookup.current = code;
      setSwiftLookupLoading(true);
      setSwiftLookupInfo(null);
      void lookupSwift(code).then(res => {
        setSwiftLookupLoading(false);
        if (!res.isError && res.data) {
          // Resolve country name (e.g. "India") to 2-letter code (e.g. "IN")
          const countryName = (res.data.country ?? '').trim().toLowerCase();
          const match = BLINDPAY_COUNTRIES.find(
            c => c.label.toLowerCase() === countryName,
          );
          const countryCode = match?.value ?? res.data.countrySlug?.toUpperCase() ?? '';

          const updates: Record<string, string> = {};
          if (res.data!.bank) updates.swiftBankName = res.data!.bank;
          if (res.data!.city) updates.swiftBankCity = res.data!.city;
          if (countryCode) updates.swiftBankCountry = countryCode;
          setFormValues(prev => ({ ...prev, ...updates }));
          setFieldErrors(prev => {
            const next = { ...prev };
            delete next.swiftCodeBic;
            delete next.swiftBankName;
            delete next.swiftBankCountry;
            delete next.swiftBankCity;
            return next;
          });
          setSwiftLookupInfo({ message: 'Bank details found', success: true });
        } else {
          setFieldErrors(prev => ({
            ...prev,
            swiftCodeBic: 'Invalid SWIFT/BIC code',
          }));
          setSwiftLookupInfo({ message: 'No bank details found', success: false });
        }
      });
    }, 500);

    return () => {
      if (swiftLookupTimer.current) clearTimeout(swiftLookupTimer.current);
    };
  }, [formValues.swiftCodeBic, selectedRail?.type]);

  // ── Dynamic field augmentation ──
  const displayGroup = useMemo((): FieldGroup | null => {
    if (!currentGroup) return null;

    let group = currentGroup;

    // SWIFT: filter payment purpose code options by selected bank country
    const hasPurposeField = group.fields.some(f => f.key === 'swiftPaymentCode');
    if (hasPurposeField && selectedRail?.type === 'international_swift') {
      const country = (formValues.swiftBankCountry ?? '').trim();
      if (country && country.length === 2) {
        const prefix = `${country.toLowerCase()}_swift_`;
        group = {
          ...group,
          fields: group.fields.map(f => {
            if (f.key !== 'swiftPaymentCode') return f;
            const filtered = (f.options ?? []).filter(o => o.value.startsWith(prefix));
            // Hide field entirely if no codes match this country
            if (filtered.length === 0) return null;
            return { ...f, options: filtered };
          }).filter(Boolean) as FieldDef[],
        };
      } else {
        // No country selected — hide purpose code field
        group = {
          ...group,
          fields: group.fields.filter(f => f.key !== 'swiftPaymentCode'),
        };
      }
    }

    return group;
  }, [currentGroup, selectedRail?.type, formValues.swiftBankCountry]);

  // Clear stale purpose code when country changes
  useEffect(() => {
    if (selectedRail?.type !== 'international_swift') return;
    const country = (formValues.swiftBankCountry ?? '').trim();
    const purposeCode = (formValues.swiftPaymentCode ?? '').trim();
    if (!purposeCode) return;
    const prefix = country.length === 2 ? `${country.toLowerCase()}_swift_` : '';
    if (!prefix || !purposeCode.startsWith(prefix)) {
      setFormValues(prev => {
        const next = { ...prev };
        delete next.swiftPaymentCode;
        return next;
      });
    }
  }, [formValues.swiftBankCountry, selectedRail?.type]);

  const validateCurrentStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const req = String(t('FIELD_REQUIRED', 'This field is required'));

    if (wizardStep === 0) {
      if (!selectedRail) {
        errors.type = String(t('SELECT_RAIL', 'Select a payment method'));
      }
      if (!accountName.trim()) {
        errors.name = req;
      }
    } else if (displayGroup) {
      for (const field of displayGroup.fields) {
        const val = (formValues[field.key] ?? '').trim();
        const isRequired =
          field.required ||
          (field.requiredWhen ? evaluateRequiredWhen(field.requiredWhen, formValues) : false);

        if (isRequired && !val) {
          errors[field.key] = req;
        } else if (val && field.regex && !field.regex.test(val)) {
          errors[field.key] = field.regexMessage ?? 'Invalid format';
        }
        if (
          field.key === 'achCopEmail' &&
          val &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
        ) {
          errors[field.key] = String(
            t('INVALID_EMAIL', 'Enter a valid email address'),
          );
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [wizardStep, selectedRail, accountName, displayGroup, formValues]);

  const handleNext = useCallback(async () => {
    Keyboard.dismiss();
    if (!validateCurrentStep()) return;

    if (!isLastStep) {
      setWizardStep(s => s + 1);
      return;
    }

    // Final step — submit
    if (!selectedRail) return;
    const body: Record<string, any> = {
      type: selectedRail.type,
      name: accountName.trim(),
    };
    for (const field of selectedRail.fields) {
      const val = (formValues[field.key] ?? '').trim();
      if (val) body[field.key] = val;
    }
    // Include dynamic purpose code (not in static rail fields)
    const purposeCode = (formValues.swiftPaymentCode ?? '').trim();
    if (purposeCode) body.swiftPaymentCode = purposeCode;

    setSubmitting(true);
    const res = await addBankAccount(body as AddBankAccountRequest);
    setSubmitting(false);

    if (res.isError) {
      showToast(
        res.errorMessage ??
          t('UNEXPECTED_ERROR', 'Something went wrong'),
        'error',
      );
      return;
    }

    showToast(t('BANK_ACCOUNT_ADDED', 'Bank account added successfully'));
    navigation.goBack();
  }, [
    validateCurrentStep,
    isLastStep,
    selectedRail,
    accountName,
    formValues,
    addBankAccount,
    navigation,
  ]);

  const handleBack = useCallback(() => {
    if (wizardStep > 0) {
      setWizardStep(s => s - 1);
    } else {
      navigation.goBack();
    }
  }, [wizardStep, navigation]);

  const stepTitle = useMemo(() => {
    if (wizardStep === 0) return String(t('ADD_BANK_ACCOUNT', 'Add Bank Account'));
    return currentGroup?.title ?? '';
  }, [wizardStep, currentGroup]);

  const helpText = useMemo(() => {
    if (wizardStep === 0) {
      return 'Select a payment method (e.g. ACH for US bank transfers, PIX for Brazil, SWIFT for international). Then give your account a name you\'ll recognize, like "My US Checking" or "Business PIX".';
    }
    return currentGroup?.helpText ?? `Fill in the ${currentGroup?.title ?? 'details'} fields. All required fields must be completed before proceeding.`;
  }, [wizardStep, currentGroup]);

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      {/* Header */}
      <CyDView className='flex-row items-center justify-between px-[16px] h-[64px]'>
        <CyDTouchView onPress={handleBack} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => openHelpSheet({ title: 'Help', text: helpText })}
          className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
          <CyDMaterialDesignIcons name='help-circle-outline' size={18} className='text-base400' />
          <CyDText className='text-[14px] font-normal text-base400 tracking-[-0.6px]'>
            Questions
          </CyDText>
        </CyDTouchView>
      </CyDView>

      {/* Title */}
      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {stepTitle}
        </CyDText>
      </CyDView>

      <CyDKeyboardAwareScrollView
        className='flex-1'
        enableOnAndroid
        enableAutomaticScroll
        keyboardShouldPersistTaps='handled'
        extraScrollHeight={32}
        extraHeight={88}
        contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>
        {wizardStep === 0 ? (
          <>
            {/* Rail type selector */}
            <CyDView className='gap-[4px]'>
              <CyDText className={LABEL_CLASS}>
                {String(t('PAYMENT_METHOD', 'Payment Method'))}
              </CyDText>
              <CyDTouchView
                onPress={() => openDropdownSheet({
                  title: 'Transfer method',
                  options: availableRails.length > 0
                    ? availableRails
                    : RAIL_TYPES.filter(r => !r.comingSoon).map(r => ({
                        value: r.type,
                        label: r.label,
                        icon: r.flag,
                      })),
                  selected: selectedRail?.type ?? '',
                  onSelect: value => {
                    setFormValues({});
                    setFieldErrors({});
                    setWizardStep(0);
                    // Fetch dynamic schema from API, fallback to static config
                    const railMeta = availableRails.find(r => r.value === value);
                    schemaRequestRef.current = value;
                    setSchemaLoading(true);
                    void getBankAccountFields(value).then(res => {
                      if (schemaRequestRef.current !== value) return; // stale
                      setSchemaLoading(false);
                      if (!res.isError && res.data?.length) {
                        setSelectedRail(transformApiSchemaToRailDef(
                          value,
                          railMeta?.label ?? value,
                          railMeta?.icon ?? '\uD83C\uDF10',
                          res.data,
                        ));
                      } else {
                        // Fallback to static rail config
                        const rail = RAIL_TYPES.find(r => r.type === value);
                        if (rail) setSelectedRail(rail);
                      }
                    });
                  },
                })}
                className={`bg-n0 border ${
                  fieldErrors.type ? 'border-errorText' : 'border-n40'
                } rounded-[8px] px-[12px] h-[48px] flex-row items-center justify-between`}>
                {selectedRail ? (
                  <CyDView className='flex-row items-center gap-[8px]'>
                    <CyDText className='text-[16px]'>
                      {selectedRail.flag}
                    </CyDText>
                    <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                      {selectedRail.label}
                    </CyDText>
                  </CyDView>
                ) : (
                  <CyDText className='text-[16px] font-medium text-n70 tracking-[-0.8px]'>
                    {String(
                      t('SELECT_METHOD', 'Select payment method'),
                    )}
                  </CyDText>
                )}
                <CyDMaterialDesignIcons
                  name='chevron-down'
                  size={22}
                  className='text-base400'
                />
              </CyDTouchView>
              {fieldErrors.type ? (
                <CyDText className='text-[12px] text-errorText'>
                  {fieldErrors.type}
                </CyDText>
              ) : null}
            </CyDView>

            {/* Account name */}
            <CyDView className='gap-[4px]'>
              <CyDText className={LABEL_CLASS}>
                {String(t('ACCOUNT_NAME', 'Account Name'))}
              </CyDText>
              <CyDView
                className={`bg-n0 border ${
                  fieldErrors.name
                    ? 'border-errorText'
                    : focusedField === 'name'
                      ? 'border-base400'
                      : 'border-n40'
                } rounded-[8px] px-[12px] h-[48px] justify-center`}>
                <CyDTextInput
                  className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                  value={accountName}
                  onChangeText={v => {
                    setAccountName(v);
                    if (fieldErrors.name) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }
                  }}
                  placeholder={String(
                    t('ACCOUNT_NAME_PH', 'e.g. My US Checking'),
                  )}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  autoCapitalize='words'
                  returnKeyType='next'
                  maxLength={128}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </CyDView>
              {fieldErrors.name ? (
                <CyDText className='text-[12px] text-errorText'>
                  {fieldErrors.name}
                </CyDText>
              ) : null}
            </CyDView>
          </>
        ) : displayGroup ? (
          <GroupedFieldCard
            group={displayGroup}
            formValues={formValues}
            fieldErrors={fieldErrors}
            fieldLoading={selectedRail?.type === 'international_swift' && swiftLookupLoading ? { swiftCodeBic: true } : undefined}
            fieldInfo={selectedRail?.type === 'international_swift' && swiftLookupInfo ? { swiftCodeBic: swiftLookupInfo } : undefined}
            focusedField={focusedField}
            onFieldChange={setField}
            onFocus={setFocusedField}
            onBlur={field => {
              setFocusedField(null);
              const val = (formValues[field.key] ?? '').trim();
              if (val && field.regex && !field.regex.test(val)) {
                setFieldErrors(prev => ({
                  ...prev,
                  [field.key]:
                    field.regexMessage ?? 'Invalid format',
                }));
              }
            }}
            onDropdownOpen={(field: FieldDef) => {
              if (field.options) {
                openDropdownSheet({
                  title: field.label,
                  options: field.options,
                  selected: formValues[field.key] ?? '',
                  onSelect: value => setField(field.key, value),
                  ...(field.searchable ? { searchable: true } : {}),
                });
              }
            }}
          />
        ) : null}
      </CyDKeyboardAwareScrollView>

      {/* Bottom bar: progress + button */}
      <CyDView className='h-[0.5px] bg-n50' />
      <CyDView className='px-[16px] pt-[12px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <ProgressBarButton
          step={wizardStep}
          totalSteps={totalSteps}
          onPress={() => { void handleNext(); }}
          disabled={submitting || schemaLoading}
          loading={submitting || schemaLoading}
          isLastStep={isLastStep}
          lastStepLabel={String(t('ADD_ACCOUNT', 'Add Account'))}
        />
      </CyDView>

    </CyDSafeAreaView>
  );
}
