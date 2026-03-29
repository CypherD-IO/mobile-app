import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { t } from 'i18next';
import {
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { blindPayKycTaxSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

function inputFrameClass(hasError: boolean): string {
  return hasError
    ? 'rounded-[12px] bg-n20 px-[14px] py-[14px] border border-errorText text-[16px] font-medium text-base400'
    : 'rounded-[12px] bg-n20 px-[14px] py-[14px] border border-transparent text-[16px] font-medium text-base400';
}

export function BlindPayKycTaxStep({ advance, onReady }: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const [taxId, setTaxId] = useState(draft.taxId ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleNext = useCallback(() => {
    const parsed = blindPayKycTaxSchema.safeParse({ taxId });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({ taxId: parsed.data.taxId });
    advance();
  }, [advance, mergeDraft, taxId]);

  useLayoutEffect(() => {
    onReady({
      canNext: true,
      onNext: handleNext,
    });
  }, [handleNext, onReady]);

  return (
    <CyDView className='gap-[4px]'>
      <CyDText className='text-[12px] font-bold text-base400'>
        {String(t('BLINDPAY_TAX_ID_LABEL', 'Tax ID'))}
      </CyDText>
      <CyDTextInput
        className={inputFrameClass(!!fieldErrors.taxId)}
        value={taxId}
        onChangeText={v => {
          setTaxId(v);
          setFieldErrors(prev => omitFieldError(prev, 'taxId'));
        }}
        autoCapitalize='characters'
        autoCorrect={false}
        returnKeyType='done'
        blurOnSubmit
        onSubmitEditing={() => {
          Keyboard.dismiss();
        }}
      />
      <BlindPayKycFieldError message={fieldErrors.taxId} />
    </CyDView>
  );
}
