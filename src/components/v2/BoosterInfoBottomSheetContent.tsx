/**
 * Booster Info Bottom Sheet Component
 *
 * Displays educational information about boosters (veCYPR) and how they work
 * to increase merchant rewards in the Cypher ecosystem.
 *
 * @component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDScrollView,
  CyDImage,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

/**
 * BoosterInfoBottomSheetContent Component
 *
 * Renders the content explaining what a booster is and how to use it
 */
const BoosterInfoBottomSheetContent: React.FC = () => {
  const { t } = useTranslation();

  // Theme hooks
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  return (
    <CyDScrollView
      className='flex-1 bg-n0 px-6'
      showsVerticalScrollIndicator={false}>
      <CyDView className='py-6'>
        {/* Header */}
        <CyDView className='mb-6 items-center'>
          <CyDImage
            source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
            className='w-16 h-16 mb-4'
            resizeMode='contain'
          />
          <CyDText className='text-2xl font-bold text-primaryText text-center mb-2'>
            {t('WHAT_IS_BOOSTER_TITLE') ?? 'What is a Booster?'}
          </CyDText>
        </CyDView>

        {/* Main Content Card */}
        <CyDView
          className={`rounded-[16px] p-5 mb-4 ${
            isDarkMode ? 'bg-base40' : 'bg-n20'
          }`}>
          {/* veCYPR Explanation */}
          <CyDView className='mb-5'>
            <CyDText className='text-base leading-relaxed text-primaryText'>
              {t(
                'BOOSTER_VECYPR_EXPLANATION',
                'veCYPR is your voting power token earned by locking CYPR. Use it to boost merchants and earn higher rewards. veCYPR decays over time as locks approach expiration.',
              )}
            </CyDText>
          </CyDView>

          {/* Tip Section */}
          <CyDView
            className={`rounded-[12px] p-4 border-l-4 bg-base20 border-p50`}>
            <CyDView className='flex-row items-start'>
              <CyDText className='text-lg mr-2'>💡</CyDText>
              <CyDView className='flex-1'>
                <CyDText className='text-sm font-semibold text-primaryText mb-1'>
                  {t('TIP', 'Tip')}
                </CyDText>
                <CyDText className='text-sm text-primaryText leading-relaxed'>
                  {t(
                    'BOOSTER_TIP',
                    'Use all your veCYPR to maximize merchant boost benefits.',
                  )}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Additional Info Cards */}
        <CyDView className='gap-y-4'>
          {/* How to Get veCYPR */}
          <CyDView
            className={`rounded-[12px] p-4 ${
              isDarkMode ? 'bg-base40' : 'bg-n20'
            }`}>
            <CyDText className='text-base font-semibold text-primaryText mb-2'>
              {t('HOW_TO_GET_VECYPR', 'How to Get veCYPR')}
            </CyDText>
            <CyDText className='text-sm text-n200 leading-relaxed'>
              {t(
                'HOW_TO_GET_VECYPR_DESC',
                'Lock your CYPR tokens to receive veCYPR. The longer you lock, the more veCYPR you receive.',
              )}
            </CyDText>
          </CyDView>

          {/* Boost Benefits */}
          <CyDView
            className={`rounded-[12px] p-4 ${
              isDarkMode ? 'bg-base40' : 'bg-n20'
            }`}>
            <CyDText className='text-base font-semibold text-primaryText mb-2'>
              {t('BOOST_BENEFITS', 'Boost Benefits')}
            </CyDText>
            <CyDText className='text-sm text-n200 leading-relaxed'>
              {t(
                'BOOST_BENEFITS_DESC',
                'Boosting merchants increases your reward multiplier, allowing you to earn more $CYPR tokens on every transaction.',
              )}
            </CyDText>
          </CyDView>

          {/* Decay Information */}
          <CyDView
            className={`rounded-[12px] p-4 ${
              isDarkMode ? 'bg-base40' : 'bg-n20'
            }`}>
            <CyDText className='text-base font-semibold text-primaryText mb-2'>
              {t('UNDERSTANDING_DECAY', 'Understanding Decay')}
            </CyDText>
            <CyDText className='text-sm text-n200 leading-relaxed'>
              {t(
                'UNDERSTANDING_DECAY_DESC',
                'Your veCYPR balance gradually decreases as your lock period nears its end. Extend your lock or add more CYPR to maintain your voting power.',
              )}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Bottom Spacing */}
        <CyDView className='h-6' />
      </CyDView>
    </CyDScrollView>
  );
};

export default BoosterInfoBottomSheetContent;
