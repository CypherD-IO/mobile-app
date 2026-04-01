import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Modal } from 'react-native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import {
  BlindpayIdDocType,
  BlindpayProofOfAddressDocType,
} from '../../types';
import { blindPayKycDocTypeSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

const ID_TYPE_OPTIONS = [
  { value: BlindpayIdDocType.PASSPORT, label: 'Passport' },
  { value: BlindpayIdDocType.ID_CARD, label: 'ID card' },
  { value: BlindpayIdDocType.DRIVERS, label: "Driver's license" },
] as const;

const POA_TYPE_OPTIONS = [
  {
    value: BlindpayProofOfAddressDocType.UTILITY_BILL,
    label: 'Utility bill',
  },
  {
    value: BlindpayProofOfAddressDocType.BANK_STATEMENT,
    label: 'Bank statement',
  },
  {
    value: BlindpayProofOfAddressDocType.RENTAL_AGREEMENT,
    label: 'Rental agreement',
  },
  {
    value: BlindpayProofOfAddressDocType.TAX_DOCUMENT,
    label: 'Tax document',
  },
  {
    value: BlindpayProofOfAddressDocType.GOVERNMENT_CORRESPONDENCE,
    label: 'Government correspondence',
  },
] as const;

function selectorClass(hasError: boolean): string {
  return `rounded-[8px] bg-n20 px-[12px] h-[58px] flex-row items-center justify-between border ${
    hasError ? 'border-errorText' : 'border-transparent'
  }`;
}

export function BlindPayKycDocTypeStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();

  const [idDocType, setIdDocType] = useState<BlindpayIdDocType | undefined>(
    draft.idDocType,
  );
  const [poaDocType, setPoaDocType] = useState<
    BlindpayProofOfAddressDocType | undefined
  >(draft.proofOfAddressDocType);
  const [idTypeOpen, setIdTypeOpen] = useState(false);
  const [poaTypeOpen, setPoaTypeOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycDocTypeSchema.safeParse({
      idDocType,
      proofOfAddressDocType: poaDocType,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      idDocType: parsed.data.idDocType,
      proofOfAddressDocType: parsed.data.proofOfAddressDocType,
    });
    advance();
  }, [advance, idDocType, poaDocType, mergeDraft]);

  useLayoutEffect(() => {
    onReady({ canNext: true, onNext: handleNext });
  }, [handleNext, onReady]);

  return (
    <>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[14px] font-normal text-n200 leading-[1.45] tracking-[-0.6px]'>
          {String(t('BLINDPAY_IDENTITY_DOC', 'Identity Document'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setIdTypeOpen(true);
          }}
          className={selectorClass(!!fieldErrors.idDocType)}>
          <CyDText
            className={`text-[20px] font-medium tracking-[-1px] leading-[1.3] ${
              idDocType ? 'text-base400' : 'text-n200'
            }`}>
            {idDocType
              ? ID_TYPE_OPTIONS.find(o => o.value === idDocType)?.label
              : String(t('SELECT', 'Select'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.idDocType} />
      </CyDView>

      <CyDView className='gap-[4px]'>
        <CyDText className='text-[14px] font-normal text-n200 leading-[1.45] tracking-[-0.6px]'>
          {String(t('BLINDPAY_POA_DOC', 'Proof of address'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setPoaTypeOpen(true);
          }}
          className={selectorClass(!!fieldErrors.proofOfAddressDocType)}>
          <CyDText
            className={`text-[20px] font-medium tracking-[-1px] leading-[1.3] ${
              poaDocType ? 'text-base400' : 'text-n200'
            }`}>
            {poaDocType
              ? POA_TYPE_OPTIONS.find(o => o.value === poaDocType)?.label
              : String(t('SELECT', 'Select'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.proofOfAddressDocType} />
      </CyDView>

      <Modal
        visible={idTypeOpen}
        transparent
        animationType='fade'
        onRequestClose={() => {
          setIdTypeOpen(false);
        }}>
        <CyDView className='flex-1 justify-end bg-black/40'>
          <CyDTouchView
            className='flex-1'
            onPress={() => {
              setIdTypeOpen(false);
            }}
          />
          <Animated.View entering={SlideInDown.duration(300)}>
            <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
              <CyDView className='items-center pt-[12px] pb-[16px]'>
                <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
              </CyDView>
              <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
                {String(t('BLINDPAY_IDENTITY_DOC', 'Identity Document'))}
              </CyDText>
              {ID_TYPE_OPTIONS.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => {
                    setIdDocType(opt.value);
                    mergeDraft({ idDocType: opt.value });
                    setIdTypeOpen(false);
                    clearKey('idDocType');
                  }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>
                    {opt.label}
                  </CyDText>
                  {idDocType === opt.value ? (
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

      <Modal
        visible={poaTypeOpen}
        transparent
        animationType='fade'
        onRequestClose={() => {
          setPoaTypeOpen(false);
        }}>
        <CyDView className='flex-1 justify-end bg-black/40'>
          <CyDTouchView
            className='flex-1'
            onPress={() => {
              setPoaTypeOpen(false);
            }}
          />
          <Animated.View entering={SlideInDown.duration(300)}>
            <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
              <CyDView className='items-center pt-[12px] pb-[16px]'>
                <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
              </CyDView>
              <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
                {String(t('BLINDPAY_POA_DOC', 'Proof of address'))}
              </CyDText>
              {POA_TYPE_OPTIONS.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => {
                    setPoaDocType(opt.value);
                    mergeDraft({ proofOfAddressDocType: opt.value });
                    setPoaTypeOpen(false);
                    clearKey('proofOfAddressDocType');
                  }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>
                    {opt.label}
                  </CyDText>
                  {poaDocType === opt.value ? (
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
