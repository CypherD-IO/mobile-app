import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
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
  isSpeiInstitutionRequired,
  type FieldDef,
  type FieldGroup,
  type RailDef,
} from './railConfig';

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const PLACEHOLDER_COLOR = '#A6AEBB';

import useBlindPayDropdown from '../components/BlindPayDropdownSheet';

// ── Help bottom sheet ────────────────────────────────────────────
function HelpSheet({
  visible,
  helpText,
  onClose,
}: {
  visible: boolean;
  helpText: string;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <CyDView className='flex-1 justify-end bg-black/40'>
        <CyDTouchView className='flex-1' onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(300)}>
          <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
            <CyDView className='items-center pt-[12px] pb-[16px]'>
              <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
            </CyDView>
            <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[12px]'>
              Help
            </CyDText>
            <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px]'>
              {helpText}
            </CyDText>
            <CyDTouchView
              onPress={onClose}
              className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center mt-[20px]'>
              <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                Got it
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </Animated.View>
      </CyDView>
    </Modal>
  );
}

// ── Grouped card field renderer (floating label pattern) ─────────
function GroupedFieldCard({
  group,
  formValues,
  fieldErrors,
  focusedField,
  onFieldChange,
  onFocus,
  onBlur,
  onDropdownOpen,
}: {
  group: FieldGroup;
  formValues: Record<string, string>;
  fieldErrors: Record<string, string>;
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
        const displayLabel = field.required
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
                  hasError ? 'bg-red20' : ''
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
                <CyDMaterialDesignIcons
                  name='chevron-down'
                  size={20}
                  className='text-n70'
                />
              </CyDTouchView>
              {hasError ? (
                <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                  {fieldErrors[field.key]}
                </CyDText>
              ) : null}
              {!isLast ? <CyDView className='h-px bg-n50' /> : null}
            </CyDView>
          );
        }

        return (
          <CyDView key={field.key}>
            <CyDView
              className={`px-[16px] min-h-[52px] justify-center ${
                hasError ? 'bg-red20' : ''
              }`}>
              <CyDView className='py-[8px]'>
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
            </CyDView>
            {hasError ? (
              <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                {fieldErrors[field.key]}
              </CyDText>
            ) : null}
            {!isLast ? <CyDView className='h-px bg-n50' /> : null}
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
  const { addBankAccount } = useBlindPayApi();
  const { openDropdown: openDropdownSheet } = useBlindPayDropdown();

  // Step 0 = rail + account name, step 1..N = rail-specific field groups
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedRail, setSelectedRail] = useState<RailDef | null>(null);
  const [accountName, setAccountName] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
    } else if (currentGroup) {
      for (const field of currentGroup.fields) {
        const val = (formValues[field.key] ?? '').trim();
        const isRequired =
          field.required ||
          (field.key === 'speiInstitutionCode' &&
            isSpeiInstitutionRequired(formValues));

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
  }, [wizardStep, selectedRail, accountName, currentGroup, formValues]);

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
          onPress={() => setShowHelp(true)}
          className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
          <CyDIcons name='help-circle-outline' size={20} className='text-base400' />
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
                  options: RAIL_TYPES.filter(r => !r.comingSoon).map(r => ({
                    value: r.type,
                    label: r.label,
                    icon: r.flag,
                  })),
                  selected: selectedRail?.type ?? '',
                  onSelect: value => {
                    const rail = RAIL_TYPES.find(r => r.type === value);
                    if (rail) {
                      setSelectedRail(rail);
                      setFormValues({});
                      setFieldErrors({});
                      setWizardStep(0);
                    }
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
        ) : currentGroup ? (
          <GroupedFieldCard
            group={currentGroup}
            formValues={formValues}
            fieldErrors={fieldErrors}
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
                });
              }
            }}
          />
        ) : null}
      </CyDKeyboardAwareScrollView>

      {/* Bottom bar: progress + button inline */}
      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40 flex-row items-center gap-[16px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        {/* Progress bar */}
        <CyDView className='flex-1 h-[6px] rounded-full bg-n40 overflow-hidden'>
          {wizardStep > 0 ? (
            <CyDView
              className='h-full rounded-full bg-base400'
              style={{
                width: `${(((wizardStep + 1) / totalSteps) * 100).toFixed(1)}%` as any,
              }}
            />
          ) : null}
        </CyDView>

        {/* Action button */}
        <CyDTouchView
          onPress={() => {
            void handleNext();
          }}
          disabled={submitting}
          className='rounded-full min-h-[48px] min-w-[120px] bg-[#FBC02D] px-[24px] flex-row items-center justify-center'>
          <CyDView className='relative items-center justify-center'>
            <CyDText
              className={`text-[16px] font-semibold text-black tracking-[-0.8px] ${
                submitting ? 'opacity-0' : ''
              }`}>
              {isLastStep
                ? String(t('ADD_ACCOUNT', 'Add Account'))
                : String(t('NEXT', 'Next'))}
            </CyDText>
            {submitting ? (
              <CyDView className='absolute inset-0 items-center justify-center'>
                <ActivityIndicator color='#0D0D0D' />
              </CyDView>
            ) : null}
          </CyDView>
        </CyDTouchView>
      </CyDView>

      <HelpSheet
        visible={showHelp}
        helpText={helpText}
        onClose={() => setShowHelp(false)}
      />
    </CyDSafeAreaView>
  );
}
