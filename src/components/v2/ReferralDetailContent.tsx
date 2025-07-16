import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDScrollView,
  CyDView,
  CyDText,
  CyDImage,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { useColorScheme } from 'react-native';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { ReferralOnboardingStatus } from '../../constants/enum';
import { getMaskedAddress } from '../../core/util';

export interface RefereeDetail {
  address: string;
  totalRewardsEarned: number;
  onboardingStatus: string;
  signupDate?: number;
  epoch: number;
}

export interface VotedMerchant {
  candidateId: string;
  brand: string;
  logoUrl?: string;
  category?: string;
  historicalMultiplier?: {
    current: number;
  };
}

interface Props {
  referralDetail: RefereeDetail;
  votedMerchants?: VotedMerchant[];
}

const ReferralDetailContent: React.FC<Props> = ({
  referralDetail,
  votedMerchants = [],
}) => {
  // console.log('V O T E D  M E R C H A N T S :', votedMerchants);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  return (
    <CyDScrollView className={`flex-1 px-4 ${isDarkMode ? 'bg-n0' : 'bg-n30'}`}>
      {/* Address */}
      <CyDText className='text-[20px] font-bold mb-4'>
        {getMaskedAddress(referralDetail.address, 6)}
      </CyDText>

      {/* Header Summary */}
      <CyDView className='flex flex-row items-center justify-between py-6'>
        <CyDView>
          <CyDView className='flex-row items-center'>
            <CyDImage
              source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
              className='w-[34px] h-[34px] mr-1'
              resizeMode='contain'
            />
            <CyDText className='text-[22px] font-medium'>
              {referralDetail.totalRewardsEarned.toFixed(2)}
            </CyDText>
          </CyDView>
          <CyDText className='text-n200 text-[12px]'>
            {t('TOTAL_REWARDS_EARNED', 'Total rewards earned')}
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Signup Rewards Section */}
      <CyDView className='mb-6'>
        <CyDText className='text-[18px] font-bold mb-4'>
          {t('SIGNUP_REWARDS', 'Signup Rewards')}
        </CyDText>

        <CyDView
          className={`rounded-[12px] p-4 mb-4 ${
            isDarkMode ? 'bg-base40' : 'bg-n0'
          }`}>
          <CyDView className='gap-y-4'>
            {/* First spend milestone */}
            <CyDView className='flex-row items-center'>
              {referralDetail.onboardingStatus ===
              ReferralOnboardingStatus.FIRST_SPEND ? (
                <CyDView className='w-6 h-6 bg-p150 rounded-full items-center justify-center mr-3'>
                  <CyDMaterialDesignIcons
                    name='check'
                    size={16}
                    className='text-base400'
                  />
                </CyDView>
              ) : (
                <CyDView className='w-6 h-6 bg-n0 border border-n200 border-dashed rounded-full items-center justify-center mr-3' />
              )}
              <CyDText className='text-[16px] font-medium flex-1'>
                {t(
                  'FIRST_SPEND_COMPLETED',
                  'Successfully completed first spend',
                )}
              </CyDText>
            </CyDView>

            {referralDetail.onboardingStatus ===
            ReferralOnboardingStatus.FIRST_SPEND ? (
              <CyDView className='bg-green-600 rounded-[12px] p-4'>
                <CyDView className='flex-row items-center'>
                  <CyDText className='text-[28px] mr-2'>🎉</CyDText>
                  <CyDView className='mt-1'>
                    <CyDText className='text-white text-[16px] font-medium flex-1'>
                      {t('HURRAY_REWARDS_EARNED', 'Hurray! You have earned')}
                    </CyDText>
                    <CyDView className='flex-row items-center'>
                      <CyDImage
                        source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                        className='w-8 h-8 mr-2'
                        resizeMode='contain'
                      />
                      <CyDText className='text-white text-[20px] font-bold'>
                        {referralDetail.totalRewardsEarned.toFixed(2)}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>
            ) : (
              <CyDView className='bg-n0 rounded-[12px] p-4'>
                <CyDText className='text-n200 text-[14px]'>
                  {t(
                    'PENDING_FIRST_SPEND',
                    "You'll earn rewards when this Referral completes their first spend at any merchant",
                  )}
                </CyDText>
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Merchant Bonus Section */}
      {votedMerchants.length > 0 && (
        <>
          <CyDText className='text-[18px] font-bold mb-4'>
            {t('MERCHANT_BONUS', 'Merchant Bonus')}
          </CyDText>
          <CyDView
            className={`mb-6 rounded-[12px] p-4 ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            <CyDView className='flex-col mb-4'>
              <CyDImage
                source={AppImages.SHOP_3D}
                className='w-12 h-12'
                resizeMode='contain'
              />
              <CyDText className='text-[14px]'>
                {t(
                  'MERCHANT_BONUS_DESC',
                  'Earn rewards when your friend uses their Cypher card at businesses where you activated for extra rewards.',
                )}
              </CyDText>
            </CyDView>

            {votedMerchants.map(merchant => (
              <CyDView
                key={merchant.candidateId}
                className={`rounded-[12px] p-4 mb-4 ${
                  isDarkMode ? 'bg-n40' : 'bg-n20'
                }`}>
                <CyDView className='flex-row items-center mb-3'>
                  {merchant.logoUrl ? (
                    <CyDImage
                      source={{ uri: merchant.logoUrl }}
                      className='w-8 h-8 mr-3 rounded-full'
                      resizeMode='contain'
                    />
                  ) : (
                    <CyDView className='w-8 h-8 bg-n60 rounded-full items-center justify-center mr-3'>
                      <CyDText className='text-[10px] font-bold'>
                        {merchant.brand.slice(0, 2).toUpperCase()}
                      </CyDText>
                    </CyDView>
                  )}
                  <CyDText className='text-[16px] font-medium'>
                    {merchant.brand}
                  </CyDText>
                </CyDView>

                {merchant.category && (
                  <CyDText className='text-n200 text-[14px] mb-3'>
                    {merchant.category}
                  </CyDText>
                )}

                <CyDView className='flex-row items-center'>
                  <CyDText className='text-n200 text-[14px] mr-2'>
                    {t('ANY_REFERRAL_SPEND', 'Any referral spend at')}{' '}
                    {merchant.brand}, {t('GETS_YOU', 'gets you')}
                  </CyDText>
                </CyDView>

                <CyDView className='flex-row items-center mt-2'>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-2'
                      resizeMode='contain'
                    />
                  </CyDView>
                  <CyDText className='text-[14px] font-medium'>
                    {/* {(merchant.historicalMultiplier?.current ?? 1).toFixed(1)}X */}
                  </CyDText>
                </CyDView>
              </CyDView>
            ))}
          </CyDView>
        </>
      )}
    </CyDScrollView>
  );
};

export default ReferralDetailContent;
