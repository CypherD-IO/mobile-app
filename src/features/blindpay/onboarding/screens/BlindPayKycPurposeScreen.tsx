import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { t } from 'i18next';
import {
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { blindPayKycPurposeSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

function inputFrameClass(hasError: boolean, multiline: boolean): string {
  const minH = multiline ? ' min-h-[88px]' : '';
  return hasError
    ? `rounded-[12px] bg-n20 px-[14px] py-[14px] border border-errorText text-[16px] font-medium text-base400${minH}`
    : `rounded-[12px] bg-n20 px-[14px] py-[14px] border border-transparent text-[16px] font-medium text-base400${minH}`;
}

export function BlindPayKycPurposeStep({ advance, onReady }: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const [purposeOfTransactions, setPurposeOfTransactions] = useState(
    draft.purposeOfTransactions ?? '',
  );
  const [purposeExplanation, setPurposeExplanation] = useState(
    draft.purposeOfTransactionsExplanation ?? '',
  );
  const [accountPurpose, setAccountPurpose] = useState(
    draft.accountPurpose ?? '',
  );
  const [accountPurposeOther, setAccountPurposeOther] = useState(
    draft.accountPurposeOther ?? '',
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycPurposeSchema.safeParse({
      purposeOfTransactions,
      accountPurpose,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      purposeOfTransactions: parsed.data.purposeOfTransactions,
      purposeOfTransactionsExplanation: purposeExplanation.trim() || undefined,
      accountPurpose: parsed.data.accountPurpose,
      accountPurposeOther: accountPurposeOther.trim() || undefined,
    });
    advance();
  }, [
    accountPurpose,
    accountPurposeOther,
    advance,
    mergeDraft,
    purposeExplanation,
    purposeOfTransactions,
  ]);

  useLayoutEffect(() => {
    onReady({
      canNext: true,
      onNext: handleNext,
    });
  }, [handleNext, onReady]);

  return (
    <>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(
            t(
              'BLINDPAY_PURPOSE_OF_TX',
              'Purpose of transactions',
            ),
          )}
        </CyDText>
        <CyDTextInput
          className={inputFrameClass(!!fieldErrors.purposeOfTransactions, true)}
          value={purposeOfTransactions}
          onChangeText={v => {
            setPurposeOfTransactions(v);
            clearKey('purposeOfTransactions');
          }}
          multiline
          textAlignVertical='top'
          returnKeyType='done'
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
        />
        <BlindPayKycFieldError message={fieldErrors.purposeOfTransactions} />
      </CyDView>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(
            t(
              'BLINDPAY_PURPOSE_OF_TX_DETAIL',
              'Additional details (optional)',
            ),
          )}
        </CyDText>
        <CyDTextInput
          className='rounded-[12px] bg-n20 px-[14px] py-[14px] text-[16px] font-medium text-base400 min-h-[72px] border border-transparent'
          value={purposeExplanation}
          onChangeText={setPurposeExplanation}
          multiline
          textAlignVertical='top'
          returnKeyType='done'
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
        />
      </CyDView>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_ACCOUNT_PURPOSE', 'Account purpose'))}
        </CyDText>
        <CyDTextInput
          className={inputFrameClass(!!fieldErrors.accountPurpose, false)}
          value={accountPurpose}
          onChangeText={v => {
            setAccountPurpose(v);
            clearKey('accountPurpose');
          }}
          placeholder={String(
            t('BLINDPAY_ACCOUNT_PURPOSE_PH', 'e.g. Personal savings'),
          )}
          placeholderTextColor='#8C8C8C'
          returnKeyType='done'
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
        />
        <BlindPayKycFieldError message={fieldErrors.accountPurpose} />
      </CyDView>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(
            t(
              'BLINDPAY_ACCOUNT_PURPOSE_OTHER',
              'More about account purpose (optional)',
            ),
          )}
        </CyDText>
        <CyDTextInput
          className='rounded-[12px] bg-n20 px-[14px] py-[14px] text-[16px] font-medium text-base400 border border-transparent'
          value={accountPurposeOther}
          onChangeText={setAccountPurposeOther}
          returnKeyType='done'
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
        />
      </CyDView>
    </>
  );
}
