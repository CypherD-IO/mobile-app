import React from 'react';
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

interface ActionButton {
  id: string;
  label: string;
  icon: IconNames | string;
  isMaterialIcon?: boolean;
  isText?: boolean;
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
}: BannerProps) => {
  const { t } = useTranslation();

  const actionButtons: ActionButton[] = [
    {
      id: 'bank',
      label: t('BANK_TRANSFER', 'Bank Transfer'),
      icon: 'bank' as IconNames,
      onPress: onSendPress,
    },
    {
      id: 'card',
      label: t('CARD_LOAD', 'Card Load'),
      icon: 'card-load' as IconNames,
      onPress: onReceivePress,
    },
    {
      id: 'bridge',
      label: t('BRIDGE', 'Bridge'),
      icon: 'bridge' as IconNames,
      onPress: onSwapPress,
    },
    {
      id: 'more',
      label: t('MORE', 'More'),
      icon: '',
      isText: true,
      onPress: onMorePress,
    },
  ];

  return (
    <CyDView className='bg-n0'>
      {/* Balance section */}
      <CyDView className='items-center py-[20px] gap-[9px]'>
        <CyDText className='text-[13px] font-medium text-n200 tracking-[0.26px] text-center'>
          Total Portfolio Value
        </CyDText>

        <CyDTokenValue className='text-[40px]' parentClass='justify-center'>
          {portfolioBalance}
        </CyDTokenValue>

        {/* Chain selector pill */}
        <CyDTouchView
          onPress={onChainPress}
          className='bg-n20 border border-n40 rounded-[16px] h-[30px] flex-row items-center px-[11px] gap-[4px]'>
          <CyDText className='text-[13px] font-semibold text-base400 text-center'>
            {selectedChain.name === 'All Chains' ? 'All Chains' : capitalize(selectedChain.name)}
          </CyDText>
          <CyDIcons name='chevron-down' size={10} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      {/* Quick actions */}
      <CyDView className='flex-row items-start justify-center gap-[16px] px-[22px] pt-[20px] pb-[16px]'>
        {actionButtons.map(button => (
          <CyDTouchView
            key={button.id}
            onPress={button.onPress}
            activeOpacity={0.7}
            className='w-[80px] items-center gap-[8px]'>
            <CyDView className='w-[56px] h-[56px] rounded-[16px] bg-n20 border border-n40 items-center justify-center'>
              {button.isText ? (
                <CyDText className='text-[24px] font-normal text-base400'>⋯</CyDText>
              ) : button.isMaterialIcon ? (
                <CyDMaterialDesignIcons
                  name={button.icon as any}
                  size={24}
                  className='text-base400'
                />
              ) : (
                <CyDIcons
                  name={button.icon as IconNames}
                  size={24}
                  className='text-base400'
                />
              )}
            </CyDView>
            <CyDText className='text-[11px] font-semibold text-n200 text-center leading-[14px]'>
              {button.label}
            </CyDText>
          </CyDTouchView>
        ))}
      </CyDView>
    </CyDView>
  );
};
