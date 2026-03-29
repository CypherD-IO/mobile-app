import React, { useCallback, useLayoutEffect, useState } from 'react';
import { t } from 'i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { blindPayKycLocationSchema } from '../blindpayKycFormSchemas';
import BlindPayCountryPickerModal from '../BlindPayCountryPickerModal';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import { BLINDPAY_COUNTRY_OPTIONS } from '../blindpayCountryList';

function rowFrameClass(hasError: boolean): string {
  return hasError
    ? 'rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border border-errorText'
    : 'rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border border-transparent';
}

export function BlindPayKycLocationStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const [country, setCountry] = useState(draft.country ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const label = BLINDPAY_COUNTRY_OPTIONS.find(c => c.code === country)?.name;

  const handleNext = useCallback(() => {
    const parsed = blindPayKycLocationSchema.safeParse({ country });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({ country: parsed.data.country });
    advance();
  }, [advance, country, mergeDraft]);

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
          {String(t('COUNTRY', 'Country'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setPickerOpen(true);
          }}
          className={rowFrameClass(!!fieldErrors.country)}>
          <CyDText
            className={`text-[16px] font-medium ${
              label ? 'text-base400' : 'text-n200'
            }`}>
            {label ?? String(t('SELECT_COUNTRY', 'Select country'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-down'
            size={22}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.country} />
      </CyDView>

      <BlindPayCountryPickerModal
        visible={pickerOpen}
        selectedCode={country}
        onSelect={code => {
          setCountry(code);
          setFieldErrors(prev => omitFieldError(prev, 'country'));
        }}
        onClose={() => {
          setPickerOpen(false);
        }}
      />
    </>
  );
}
