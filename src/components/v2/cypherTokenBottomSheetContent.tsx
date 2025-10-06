import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';

/**
 * Bottom Sheet Content for Cypher Token Information
 * Displays information about how to earn and use CYPR tokens
 */
const CypherTokenBottomSheetContent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <CyDView className='flex-1 px-[20px] rounded-t-[24px] bg-rgba(15, 15, 15, 0.95)'>
      {/* Header */}
      <CyDView className='flex flex-col py-[20px] mb-[24px]'>
        <CyDImage
          source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
          className='w-[48px] h-[44px] mb-[8px]'
        />
        <CyDView className='flex-row items-center gap-x-[4px]'>
          <CyDText className='text-[20px] font-bold text-white'>
            {t('CYPHER_TOKEN_TITLE')}
          </CyDText>
          <CyDText className='text-[20px] text-n200 font-bold'>
            {t('CYPHER_TOKEN_SUBTITLE')}
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerClassName='pb-[24px]'>
        {/* How you can earn it section */}
        <CyDView className='mb-[32px]'>
          <CyDText className='font-medium mb-[8px] text-white'>
            {t('HOW_YOU_CAN_EARN_IT')}
          </CyDText>

          <CyDView className='flex flex-col gap-y-[24px] p-6 bg-[#202020] rounded-[12px]'>
            {/* On Purchases */}
            <CyDView className='flex-row items-center'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.SHOPPING_BAG_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('ON_PURCHASES')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('SPEND_USING_CYPHER_CARD_TO_EARN_TOKEN')}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Referrals */}
            <CyDView className='flex-row items-start'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.PERSON_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('CYPHER_TOKEN_REFERRALS')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('REFER_OTHERS_TO_CYPHER_PLATFORM')}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Additional rewards */}
            <CyDView className='flex-row items-start'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.SHOP_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('ADDITIONAL_REWARDS')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('ACTIVATE_MERCHANTS_FOR_REWARDS_MULTIPLIER')}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* How to use it section */}
        <CyDView className='mb-[32px]'>
          <CyDText className='font-medium mb-[8px] text-white'>
            {t('HOW_TO_USE_IT')}
          </CyDText>

          {/* Compound your reward */}
          <CyDView className='bg-[#202020] gap-y-[24px] rounded-[12px] p-[16px] mb-[12px]'>
            <CyDView className='flex-row items-center'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.COIN_STACK_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('COMPOUND_YOUR_REWARD')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('USE_CYPR_TO_ACTIVATE_BRANDS')}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Load you card & Spend */}
            <CyDView className='flex-row items-center'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.CARD_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('LOAD_YOUR_CARD_AND_SPEND')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('LOAD_CARD_WITH_CYPHER_TOKEN')}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Grow with Us */}
            <CyDView className='flex-row items-center'>
              <CyDView className='w-[36px] h-[36px] bg-black rounded-[6px] items-center justify-center mr-[16px]'>
                <CyDImage
                  source={AppImages.ANALYTICS_ICON_WHITE}
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium mb-[2px] text-white'>
                  {t('GROW_WITH_US')}
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  {t('INVITE_FRIENDS_SHOP_AND_LOCK')}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
};

export default CypherTokenBottomSheetContent;
