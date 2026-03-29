import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Keyboard, Modal } from 'react-native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { BlindpayPurposeOfTransactions } from '../../types';
import { blindPayKycPurposeOfTxSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

const PURPOSE_OPTIONS = [
  { value: BlindpayPurposeOfTransactions.RECEIVE_SALARY, label: 'Receive salary' },
  { value: BlindpayPurposeOfTransactions.BUSINESS_TRANSACTIONS, label: 'Business transactions' },
  { value: BlindpayPurposeOfTransactions.INVESTMENT_PURPOSES, label: 'Investment purposes' },
  { value: BlindpayPurposeOfTransactions.PERSONAL_OR_LIVING_EXPENSES, label: 'Personal or living expenses' },
  { value: BlindpayPurposeOfTransactions.RECEIVE_PAYMENT_FOR_FREELANCING, label: 'Receive payment for freelancing' },
  { value: BlindpayPurposeOfTransactions.PAYMENTS_TO_FRIENDS_OR_FAMILY_ABROAD, label: 'Payments to friends or family abroad' },
  { value: BlindpayPurposeOfTransactions.PURCHASE_GOOD_AND_SERVICES, label: 'Purchase goods and services' },
  { value: BlindpayPurposeOfTransactions.CHARITABLE_DONATIONS, label: 'Charitable donations' },
  { value: BlindpayPurposeOfTransactions.PROTECT_WEALTH, label: 'Protect wealth' },
  { value: BlindpayPurposeOfTransactions.OTHER, label: 'Other' },
] as const;

export function BlindPayKycPurposeOfTxStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();

  const [purpose, setPurpose] = useState<
    BlindpayPurposeOfTransactions | undefined
  >(draft.purposeOfTransactions as BlindpayPurposeOfTransactions | undefined);
  const [explanation, setExplanation] = useState(
    draft.purposeOfTransactionsExplanation ?? '',
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const purposeLabel = PURPOSE_OPTIONS.find(o => o.value === purpose)?.label;
  const showExplanation = purpose === BlindpayPurposeOfTransactions.OTHER;

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycPurposeOfTxSchema.safeParse({
      purposeOfTransactions: purpose,
      purposeOfTransactionsExplanation: showExplanation
        ? explanation
        : undefined,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      purposeOfTransactions: parsed.data.purposeOfTransactions,
      purposeOfTransactionsExplanation: showExplanation
        ? parsed.data.purposeOfTransactionsExplanation
        : undefined,
    });
    advance();
  }, [advance, explanation, mergeDraft, purpose, showExplanation]);

  useLayoutEffect(() => {
    onReady({ canNext: true, onNext: handleNext });
  }, [handleNext, onReady]);

  return (
    <>
      {/* Purpose selector */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(
            t('BLINDPAY_PURPOSE_OF_TX', 'Purpose of transactions'),
          )}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setPickerOpen(true);
          }}
          className={`rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border ${
            fieldErrors.purposeOfTransactions
              ? 'border-errorText'
              : 'border-transparent'
          }`}>
          <CyDText
            className={`text-[16px] font-medium ${
              purpose ? 'text-base400' : 'text-n200'
            }`}>
            {purposeLabel ?? String(t('SELECT', 'Select'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-down'
            size={22}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.purposeOfTransactions} />
      </CyDView>

      {/* Explanation (shown only when OTHER is selected) */}
      {showExplanation ? (
        <CyDView className='gap-[4px]'>
          <CyDText className='text-[12px] font-bold text-base400'>
            {String(
              t('BLINDPAY_PURPOSE_EXPLAIN', 'Please explain'),
            )}
          </CyDText>
          <CyDTextInput
            className={`rounded-[12px] bg-n20 px-[14px] py-[14px] min-h-[88px] text-[16px] font-medium text-base400 border ${
              fieldErrors.purposeOfTransactionsExplanation
                ? 'border-errorText'
                : 'border-transparent'
            }`}
            value={explanation}
            onChangeText={v => {
              setExplanation(v);
              clearKey('purposeOfTransactionsExplanation');
            }}
            placeholder={String(
              t(
                'BLINDPAY_PURPOSE_EXPLAIN_PH',
                'Describe the purpose of your transactions...',
              ),
            )}
            placeholderTextColor='#A6AEBB'
            multiline
            textAlignVertical='top'
            returnKeyType='done'
            blurOnSubmit
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
          />
          <BlindPayKycFieldError
            message={fieldErrors.purposeOfTransactionsExplanation}
          />
        </CyDView>
      ) : null}

      {/* Picker bottom sheet */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType='fade'
        onRequestClose={() => {
          setPickerOpen(false);
        }}>
        <CyDView className='flex-1 justify-end bg-black/40'>
          <CyDTouchView
            className='flex-1'
            onPress={() => {
              setPickerOpen(false);
            }}
          />
          <Animated.View entering={SlideInDown.duration(300)}>
            <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
              <CyDView className='items-center pt-[12px] pb-[16px]'>
                <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
              </CyDView>
              <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
                {String(
                  t(
                    'BLINDPAY_PURPOSE_OF_TX',
                    'Purpose of transactions',
                  ),
                )}
              </CyDText>
              {PURPOSE_OPTIONS.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => {
                    setPurpose(opt.value);
                    mergeDraft({
                      purposeOfTransactions: opt.value,
                    });
                    setPickerOpen(false);
                    clearKey('purposeOfTransactions');
                  }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>
                    {opt.label}
                  </CyDText>
                  {purpose === opt.value ? (
                    <CyDMaterialDesignIcons
                      name='check'
                      size={20}
                      className='text-[#FBC02D]'
                    />
                  ) : null}
                </CyDTouchView>
              ))}
            </CyDView>
          </Animated.View>
        </CyDView>
      </Modal>
    </>
  );
}
