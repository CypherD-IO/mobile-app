import React from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { t } from 'i18next';

interface PremiumFeaturesSummaryProps {
  /** Pro plan data containing fee percentages */
  proPlanData: {
    fxMarkup?: number;
    usdcFee?: number;
    nonUsdcFee?: number;
  };
}

/**
 * Premium Features Summary Component
 * Displays a checklist of premium features with their values:
 * - Virtual Card
 * - Apple & Google Pay
 * - Physical Card (Free)
 * - Forex Markup percentage
 * - USDC Load Fee
 * - Non-USDC Load Fee
 */
export default function PremiumFeaturesSummary({
  proPlanData,
}: PremiumFeaturesSummaryProps) {
  return (
    <CyDTouchView className='mt-[16px] px-[16px]' activeOpacity={1}>
      {/* Virtual Card */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDMaterialDesignIcons
          name='check'
          size={24}
          className='text-base400'
        />
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('VIRTUAL_CARD')}
        </CyDText>
      </CyDView>

      {/* Apple & Google Pay */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDMaterialDesignIcons
          name='check'
          size={24}
          className='text-base400'
        />
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('APPLE_GOOGLE_PAY')}
        </CyDText>
      </CyDView>

      {/* Physical Card */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDText className='text-[14px] font-bold w-[36px]'>
          {t('Free')}
        </CyDText>
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('PHYSICAL_CARD')}
        </CyDText>
      </CyDView>

      {/* Forex Markup */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDText className='text-[14px] font-bold w-[36px]'>
          {`${proPlanData?.fxMarkup}%`}
        </CyDText>
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('FOREX_MARKUP')}
        </CyDText>
      </CyDView>

      {/* USDC Load Fee */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDText className='text-[14px] font-bold w-[36px]'>
          {`${
            proPlanData?.usdcFee === 0 ? 'FREE' : `${proPlanData?.usdcFee}%`
          } `}
        </CyDText>
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('CARD_LOAD_FEE_USDC')}
        </CyDText>
      </CyDView>

      {/* Non-USDC Load Fee */}
      <CyDView className='flex-row items-center mt-[8px]'>
        <CyDText className='text-[14px] font-bold w-[36px]'>
          {`${proPlanData?.nonUsdcFee}%`}
        </CyDText>
        <CyDText className='text-[14px] ml-[8px] font-medium'>
          {t('CARD_LOAD_FEE_NON_USDC')}
        </CyDText>
      </CyDView>
    </CyDTouchView>
  );
}
