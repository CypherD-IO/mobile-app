import React, { useLayoutEffect } from 'react';
import { t } from 'i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { BLINDPAY_FIGMA_ASSETS } from '../../figmaAssets';

export function BlindPayKycDocVerificationStep({
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
          source={{ uri: BLINDPAY_FIGMA_ASSETS.docVerification }}
          className='h-[234px] w-[234px]'
          resizeMode='contain'
        />
      </CyDView>

      <CyDView className='gap-[11px]'>

        <CyDView className='gap-[12px]'>
          <CyDText className='text-[32px] font-normal text-base400 tracking-[-1x] leading-[1.4]'>
            {String(
              t('BLINDPAY_DOC_VERIFY_TITLE', 'Document Verification'),
            )}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px]'>
            {String(
              t(
                'BLINDPAY_DOC_VERIFY_DESC',
                "To set up your account, just bring your ID. We'll need two different ID: one for identification and another to prove your address.",
              ),
            )}
          </CyDText>
          <CyDText className='text-[14px] font-semibold text-[#C99200] leading-[1.45] tracking-[-0.6px]'>
            {String(
              t(
                'BLINDPAY_DOC_VERIFY_WARNING',
                'Also, make sure the country you choose matches your documents.',
              ),
            )}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
