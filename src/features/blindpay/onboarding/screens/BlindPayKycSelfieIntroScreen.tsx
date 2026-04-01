import React, { useLayoutEffect } from 'react';
import { t } from 'i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { BLINDPAY_FIGMA_ASSETS } from '../../figmaAssets';

export function BlindPayKycSelfieIntroStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  useLayoutEffect(() => {
    onReady({ canNext: true, onNext: advance });
  }, [advance, onReady]);

  return (
    <CyDView className='gap-[16px]'>
      <CyDView className='items-center py-[24px]'>
        <CyDImage
          source={{ uri: BLINDPAY_FIGMA_ASSETS.selfieVerification }}
          className='h-[170px] w-[146px]'
          resizeMode='contain'
        />
      </CyDView>

      <CyDView className='gap-[6px]'>
        <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {String(
            t('BLINDPAY_SELFIE_INTRO_TITLE', 'Selfie Verification'),
          )}
        </CyDText>
        <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px]'>
          {String(
            t(
              'BLINDPAY_SELFIE_INTRO_DESC',
              'We will conduct a dynamic facial recognition check for enhanced security.',
            ),
          )}
        </CyDText>
      </CyDView>

      <CyDText className='text-[14px] font-semibold text-n200 leading-[1.45] tracking-[-0.6px]'>
        {String(
          t(
            'BLINDPAY_SELFIE_INTRO_WARNING',
            'Please ensure to look directly at the camera during facial dynamic recognition authentication.',
          ),
        )}
      </CyDText>
    </CyDView>
  );
}
