import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';

/**
 * Bottom Sheet Content for Cypher Token Information
 * Displays information about how to earn and use CYPR tokens
 */
const CypherTokenBottomSheetContent: React.FC = () => {
  return (
    <CyDView className='flex-1 px-[20px] rounded-t-[24px] bg-rgba(15, 15, 15, 0.95)'>
      {/* Header */}
      <CyDView className='flex flex-col py-[20px] mb-[24px]'>
        <CyDImage
          source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
          className='w-[48px] h-[44px] mb-[8px]'
        />
        <CyDView className='flex-row items-center gap-x-[4px]'>
          <CyDText className='text-[20px] font-bold text-white'>Cypher</CyDText>
          <CyDText className='text-[20px] text-n200 font-bold'>Token</CyDText>
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
            How you can earn it
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
                  On Purchases
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  Spend using the cypher card to earn cypher token
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
                  Referrals
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  Refer others to the cypher platform
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
                  Additional rewards
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  Activate merchants for additional rewards multiplier, get up
                  to 12X more cypher tokens than normal rewards
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* How to use it section */}
        <CyDView className='mb-[32px]'>
          <CyDText className='font-medium mb-[8px] text-white'>
            How to use it
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
                  Compound your reward
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  Use your $CYPR to Activate your favourite brands for
                  additional rewards
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
                  Load you card & Spend
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  you can load your card with cypher token, and spend across
                  140m+ merchants
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
                  Grow with Us
                </CyDText>
                <CyDText className='text-[16px] text-n200'>
                  Invite friends, shop often, and lock smart — your influence
                  (and rewards) grow over time.
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
