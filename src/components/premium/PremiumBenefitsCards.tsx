import React from 'react';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';

/**
 * Premium Benefits Cards Component
 * Displays the 6 benefit cards for premium membership:
 * - Free Metal Card
 * - 0.75% Forex Markup
 * - Free Stable Token Load
 * - Fraud Protection
 * - Higher Spending Limit
 * - Free Worldwide Shipping
 */
export default function PremiumBenefitsCards() {
  return (
    <CyDTouchView className='bg-n30 p-[16px]' activeOpacity={1}>
      {/* Metal Card Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            Free Metal card for all
          </CyDText>
          <CyDText className='text-[16px] font-semibold'>premium users</CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            Sleek, shiny and durable
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.CARDS_FRONT_AND_BACK_3D}
            className='h-[63px] w-[62px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>

      {/* Forex Markup Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            0.75% Forex Markup
          </CyDText>
          <CyDText className='text-[16px] font-semibold'>
            without any spending limit
          </CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            lowest among the other crypto cards
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.CASH_FLOW}
            className='h-[68px] w-[57px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>

      {/* Stable Token Load Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            Free stable token card load
          </CyDText>
          <CyDText className='text-[16px] font-semibold'>
            & its unlimited
          </CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            Discounted flat 0.5% for other tokens
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.MOBILE_AND_COINS_3D}
            className='h-[68px] w-[57px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>

      {/* Fraud Protection Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            Protection against Fraud
          </CyDText>
          <CyDText className='text-[16px] font-semibold'>
            covered up to $300
          </CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            Only fraud protection card in the industry
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.SHIELD_3D}
            className='h-[54px] w-[54px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>

      {/* Spending Limit Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            Higher spending limit per
          </CyDText>
          <CyDText className='text-[16px] font-semibold'>
            month on premium
          </CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            Unlock full potential of a crypto card
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.SHOPPING_WOMEN}
            className='h-[66px] w-[66px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>

      {/* Free Shipping Benefit */}
      <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
        <CyDView>
          <CyDText className='text-[16px] font-semibold'>
            {'Free Shipping \nworldwide'}
          </CyDText>
          <CyDText className='text-[12px] font-bold text-n300'>
            {t('Ships anywhere in the world*')}
          </CyDText>
        </CyDView>
        <CyDView className='pr-[12px]'>
          <CyDFastImage
            source={AppImages.POST_CARD}
            className='h-[60px] w-[57px] mx-auto'
            resizeMode='contain'
          />
        </CyDView>
      </CyDView>
    </CyDTouchView>
  );
}
