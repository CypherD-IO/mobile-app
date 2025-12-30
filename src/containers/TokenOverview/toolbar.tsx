import { t } from 'i18next';
import React, { useContext } from 'react';
import { screenTitle } from '../../constants';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { CardProviders } from '../../constants/enum';
import { get } from 'lodash';

interface TokenOverviewToolBarProps {
  tokenData: TokenMeta;
  navigation: NavigationProp<ParamListBase>;
}

/**
 * Floating action toolbar for Token Overview with Fund Card, Swap, and Send buttons
 */
export default function TokenOverviewToolBar({
  tokenData,
  navigation,
}: TokenOverviewToolBarProps) {
  const { isBridgeable, isSwapable } = tokenData;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext?.globalState?.cardProfile;
  const currentCardProvider = get(
    cardProfile,
    'provider',
    CardProviders.REAP_CARD,
  );

  /**
   * Navigate to Fund Card screen in Card tab
   */
  const handleFundCardPress = (): void => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate(screenTitle.CARD, {
        screen: screenTitle.BRIDGE_FUND_CARD_SCREEN,
        params: {
          currentCardProvider,
          currentCardIndex: 0,
          selectedToken: tokenData,
        },
      });
    }
  };

  /**
   * Navigate to Swap screen
   */
  const handleSwapPress = (): void => {
    navigation.navigate(screenTitle.SWAP_SCREEN, {
      tokenData,
    });
  };

  /**
   * Navigate to Send screen
   */
  const handleSendPress = (): void => {
    navigation.navigate(screenTitle.ENTER_AMOUNT, {
      navigation,
      tokenData,
    });
  };

  return (
    <CyDView className='flex-row items-center gap-[8px] px-[16px] w-full bg-transparent'>
      {/* Fund Card Button - Takes remaining space */}
      <CyDView className='flex-1'>
        <CyDTouchView
          onPress={handleFundCardPress}
          activeOpacity={0.8}
          className='w-full bg-p100 rounded-full px-[20px] py-[14px] flex-row items-center justify-center gap-[8px]'>
          <CyDIcons name='card-load-filled' size={20} className='text-black' />
          <CyDText className='text-black text-[16px] font-bold'>
            {t('FUND_CARD', 'Fund Card')}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      {/* Swap Button - Round */}
      {(isSwapable || isBridgeable) && (
        <CyDTouchView
          onPress={handleSwapPress}
          activeOpacity={0.8}
          className='w-[52px] h-[52px] bg-p100 rounded-full items-center justify-center'>
          <CyDIcons name='swap-horizontal' size={24} className='text-black' />
        </CyDTouchView>
      )}

      {/* Send Button - Round */}
      <CyDTouchView
        onPress={handleSendPress}
        activeOpacity={0.8}
        className='w-[52px] h-[52px] bg-p100 rounded-full items-center justify-center'>
        <CyDIcons name='arrow-up-right' size={24} className='text-black' />
      </CyDTouchView>
    </CyDView>
  );
}
