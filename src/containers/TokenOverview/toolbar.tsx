import { t } from 'i18next';
import React, { useContext } from 'react';
import { screenTitle } from '../../constants';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { get } from 'lodash';
import { Holding } from '../../core/portfolio';
import clsx from 'clsx';

interface TokenOverviewToolBarProps {
  tokenData: Holding;
  navigation: NavigationProp<ParamListBase>;
}

/**
 * Floating action toolbar for Token Overview with Fund Card, Swap, and Send buttons
 */
export default function TokenOverviewToolBar({
  tokenData,
  navigation,
}: TokenOverviewToolBarProps) {
  const { isBridgeable, isSwapable, isFundable } = tokenData;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext?.globalState?.cardProfile;
  const currentCardProvider = get(cardProfile, 'provider', '');

  /**
   * Navigate to Fund Card screen in Card tab
   */
  const handleFundCardPress = (): void => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      if (currentCardProvider) {
        parentNav.navigate(screenTitle.CARD, {
          screen: screenTitle.BRIDGE_FUND_CARD_SCREEN,
          params: {
            currentCardProvider,
            currentCardIndex: 0,
            selectedToken: tokenData,
          },
        });
      } else {
        parentNav.navigate(screenTitle.CARD, {
          screen: screenTitle.DEBIT_CARD_SCREEN,
        });
      }
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
          disabled={!isFundable}
          className={clsx(
            'w-full  rounded-full px-[20px] py-[14px] flex-row items-center justify-center gap-[8px]',
            {
              'bg-base80': !isFundable,
              'bg-p100': isFundable,
            },
          )}>
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
