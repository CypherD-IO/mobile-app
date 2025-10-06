import React, { useContext } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { capitalize } from 'lodash';
import { MerchantLogo } from '../../components/v2/MerchantLogo';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';

/**
 * Interface for merchant data displayed in the success screen
 */
interface BoostedMerchant {
  candidateId: string;
  canonicalName: string;
  logoUrl?: string;
  allocation: number;
}

/**
 * Route parameters passed from the claim screen
 */
interface RouteParams {
  merchants: BoostedMerchant[];
  totalCypr: number;
  totalVeCypr: number;
  transactionHash: string;
}

/**
 * AirdropClaimSuccess Component
 * Displays success screen after airdrop claim with:
 * - Claimed token amounts (CYPR and veCYPR)
 * - Option to lock tokens for additional rewards
 * - List of boosted merchants
 */
export default function AirdropClaimSuccess() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { merchants, totalCypr, totalVeCypr } = route.params;
  const { top } = useSafeAreaInsets();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;

  /**
   * Opens the lock airdrop page in a webview
   * Allows users to lock their claimed tokens for additional rewards
   * Passes the sessionToken as a query parameter for authentication
   */
  const handleContinueToEarnMore = (): void => {
    try {
      // Get the session token from global context
      const sessionToken = globalContext.globalState.token;

      if (!sessionToken) {
        console.error('Session token not available');
        return;
      }

      // Construct the URI with sessionToken as a query parameter
      const baseURI = 'https://app.cypherhq.io/#/airdrop/claimLock';
      const lockURI = `${baseURI}?sessionToken=${encodeURIComponent(sessionToken)}`;

      navigation.navigate(screenTitle.OPTIONS);
      setTimeout(() => {
        navigation.navigate(screenTitle.OPTIONS, {
          screen: screenTitle.SOCIAL_MEDIA_SCREEN,
          params: {
            title: '',
            uri: lockURI,
          },
        });
      }, 250);
    } catch (error) {
      console.error('Error navigating to lock page:', error);
    }
  };

  /**
   * Navigates back to portfolio screen
   */
  const handleGoToPortfolio = (): void => {
    navigation.navigate(screenTitle.PORTFOLIO, {
      screen: screenTitle.PORTFOLIO_SCREEN,
    });
  };

  return (
    <CyDView
      className='!bg-[#0D0E12] flex-1 p-[24px]'
      style={{ paddingTop: top }}>
      <CyDScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <CyDView className='flex flex-row w-full gap-x-[12px] justify-end'>
          <CyDTouchView
            onPress={() => handleGoToPortfolio()}
            className='w-[24px] h-[24px] !bg-[#6B788E] rounded-full flex items-center justify-center'>
            <CyDMaterialDesignIcons
              name='close'
              size={16}
              className='text-black'
            />
          </CyDTouchView>
        </CyDView>

        {/* Success Icon and Title */}
        <CyDView className='items-center justify-center mb-[32px]'>
          <CyDImage
            source={AppImages.SUCCESS_TICK_3D}
            className='w-[84px] h-[84px] mb-[16px]'
          />
          <CyDText className='text-white font-nord font-normal !text-[32px] leading-[120%] tracking-[-0.5px]'>
            {'$CYPR Claimed'}
          </CyDText>
        </CyDView>

        {/* Main Content Card */}
        <CyDView className='rounded-[16px] border-[0.5px] border-[#4B4B4B] bg-black p-[24px]'>
          {/* Header Text */}
          <CyDText className='font-medium !text-[16px] leading-[140%] tracking-[-0.8px] !text-[#858990] mb-[16px]'>
            {'$CYPR is in your wallet now'}
          </CyDText>

          <CyDView className='h-[0.5px] !bg-[#2F3139] mb-[16px]' />

          {/* Token Amounts Display */}
          <CyDView className='flex flex-row gap-x-[12px] mb-[24px]'>
            {/* Total CYPR */}
            <CyDView className='flex-1'>
              <CyDText className='!text-base150 !text-[12px] font-medium mb-[8px]'>
                {'Total $CYPR'}
              </CyDText>
              <CyDView className='bg-[#2F3139] rounded-[8px] p-[12px] flex flex-row items-center gap-x-[8px]'>
                <CyDFastImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-[32px] h-[30px]'
                />
                <CyDText className='text-white !text-[18px] font-semibold leading-[145%] tracking-[-0.6px]'>
                  {totalCypr.toLocaleString()}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Total veCYPR */}
            <CyDView className='flex-1'>
              <CyDText className='!text-base150 !text-[12px] font-medium mb-[8px]'>
                {'Total veCYPR'}
              </CyDText>
              <CyDView className='bg-[#2F3139] rounded-[8px] p-[12px] flex flex-row items-center gap-x-[8px]'>
                <CyDFastImage
                  source={AppImages.CYPR_TOKEN_LOCKED}
                  className='w-[32px] h-[30px]'
                />
                <CyDText className='text-white !text-[18px] font-semibold leading-[145%] tracking-[-0.6px]'>
                  {totalVeCypr.toLocaleString()}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* What's Next Section */}
          <CyDView className='bg-[#272727] rounded-[24px] p-[16px] mb-[24px]'>
            <CyDView className='flex flex-row items-center gap-x-[8px] mb-[12px]'>
              <CyDMaterialDesignIcons
                name='information'
                size={20}
                color='#FFFFFF'
              />
              <CyDText className='text-white !text-[12px] font-semibold leading-[140%] tracking-[1.2px]'>
                {"WHAT'S NEXT"}
              </CyDText>
            </CyDView>

            <CyDText className='!text-[#858990] !text-[14px] font-medium leading-[140%] tracking-[-0.8px] mb-[16px]'>
              {'You can earn even more $CYPR by locking '}
              <CyDText className='text-white font-bold'>
                {totalCypr.toLocaleString()} $CYPR
              </CyDText>
              {' claimed'}
            </CyDText>

            {/* Continue Button */}
            <CyDTouchView
              className='!bg-[#F9D26C] rounded-full py-[12px] px-[16px] flex flex-row items-center justify-between'
              onPress={handleContinueToEarnMore}>
              <CyDText className='text-black !text-[16px] font-semibold'>
                {'Continue to earn more'}
              </CyDText>
              <CyDMaterialDesignIcons
                name='arrow-right'
                size={20}
                color='#000000'
              />
            </CyDTouchView>
          </CyDView>

          {/* Boosted Merchants Section */}
          <CyDText className='!text-[#858990] !text-[14px] font-medium leading-[140%] tracking-[-0.8px] mb-[16px]'>
            {
              'You have boosted these merchants, spend at boosted merchants with cypher card to earn extra $CYPR Tokens'
            }
          </CyDText>

          {/* Merchant List */}
          <CyDView className='rounded-[12px]'>
            {merchants.map((merchant, index) => (
              <CyDView
                key={merchant.candidateId}
                className={`flex flex-row items-center justify-between py-[12px] ${
                  index !== merchants.length - 1
                    ? 'border-b border-[#2F3139]'
                    : ''
                }`}>
                <CyDView className='flex flex-row items-center gap-x-[12px] flex-1'>
                  <MerchantLogo merchant={merchant} size={42} />
                  <CyDText className='text-white !text-[16px] font-semibold leading-[130%] tracking-[-0.6px]'>
                    {capitalize(merchant.canonicalName)}
                  </CyDText>
                </CyDView>

                <CyDView className='bg-[#F38200] rounded-full px-[12px] py-[4px]'>
                  <CyDText className='text-black !text-[12px] font-bold leading-[150%]'>
                    {'Boosted: '}
                    {merchant.allocation}%
                  </CyDText>
                </CyDView>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>

        {/* Bottom Button - Go to Portfolio */}
        <CyDTouchView
          className='bg-[#2F3139] rounded-full py-[12px] px-[16px] flex items-center justify-center mt-[24px] mb-[24px]'
          onPress={handleGoToPortfolio}>
          <CyDText className='text-white !text-[16px] font-semibold'>
            {'Go to Portfolio'}
          </CyDText>
        </CyDTouchView>
      </CyDScrollView>
    </CyDView>
  );
}
