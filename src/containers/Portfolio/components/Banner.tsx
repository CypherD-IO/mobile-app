import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { Chain } from '../../../constants/server';
import { capitalize } from 'lodash';
import { IconNames } from '../../../customFonts';
import { HdWalletContext } from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';

/**
 * Action button configuration
 */
interface ActionButton {
  id: string;
  label: string;
  icon: IconNames | 'dots-horizontal';
  isMaterialIcon?: boolean;
  onPress: () => void;
}

interface BannerProps {
  portfolioBalance: number | string;
  selectedChain: Chain;
  onChainPress: () => void;
  onSendPress: () => void;
  onReceivePress: () => void;
  onSwapPress: () => void;
  onMorePress: () => void;
}

export const Banner = ({
  portfolioBalance,
  selectedChain,
  onChainPress,
  onSendPress,
  onReceivePress,
  onSwapPress,
  onMorePress,
}: BannerProps): JSX.Element => {
  const { t } = useTranslation();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { hideBalance } = hdWalletContext.state;

  /**
   * Toggle hide balance visibility
   */
  const handleToggleHideBalance = (): void => {
    hdWalletContext.dispatch({
      type: 'TOGGLE_BALANCE_VISIBILITY',
      value: { hideBalance: !hideBalance },
    });
  };

  const actionButtons: ActionButton[] = [
    {
      id: 'send',
      label: t('SEND', 'Send'),
      icon: 'arrow-up-right',
      onPress: onSendPress,
    },
    {
      id: 'receive',
      label: t('RECEIVE', 'Receive'),
      icon: 'arrow-down-left',
      onPress: onReceivePress,
    },
    {
      id: 'swap',
      label: t('SWAP', 'Swap'),
      icon: 'swap-horizontal',
      onPress: onSwapPress,
    },
    {
      id: 'more',
      label: t('MORE', 'More'),
      icon: 'dots-horizontal',
      isMaterialIcon: true,
      onPress: onMorePress,
    },
  ];

  return (
    <CyDView className='bg-n20'>
      {/* Dark section with curved bottom */}
      <CyDView className='bg-n0 rounded-b-[24px] px-[20px] pt-[12px] pb-[16px]'>
        {/* Chain Selector */}
        <CyDTouchView
          onPress={onChainPress}
          className='flex-row items-center mb-[2px]'>
          <CyDIcons name='connect' size={24} className='text-base400' />
          <CyDText className='text-[14px] text-base400 font-medium ml-[4px]'>
            {capitalize(selectedChain.name)}
          </CyDText>
          <CyDIcons name='chevron-down' size={20} className='text-base400' />
        </CyDTouchView>

        {/* Balance Display with Eye Icon */}
        <CyDView className='mb-[24px] flex-row items-center gap-[12px]'>
          <CyDTokenValue className='text-[40px]'>
            {portfolioBalance}
          </CyDTokenValue>
          <CyDTouchView
            onPress={handleToggleHideBalance}
            activeOpacity={0.7}
            className='p-[4px]'>
            <CyDIcons
              name={hideBalance ? 'eye-closed' : 'eye'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row justify-between gap-[8px]'>
          {actionButtons.map(button => (
            <CyDTouchView
              key={button.id}
              onPress={button.onPress}
              activeOpacity={0.7}
              className='flex-1 bg-p0 rounded-[12px] px-[8px] py-[6px] flex-row items-center justify-center gap-[2px]'>
              {button.isMaterialIcon ? (
                <CyDMaterialDesignIcons
                  name={button.icon as 'dots-horizontal'}
                  size={20}
                  className='text-p300'
                />
              ) : (
                <CyDIcons
                  name={button.icon as IconNames}
                  size={20}
                  className='text-p300'
                />
              )}
              <CyDText className='text-p300 text-[14px] font-semibold'>
                {capitalize(button.label)}
              </CyDText>
            </CyDTouchView>
          ))}
        </CyDView>
      </CyDView>
    </CyDView>
  );
};
