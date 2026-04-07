import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { IconNames } from '../../customFonts';

interface OptionConfig {
  id: string;
  icon: IconNames;
  title: string;
  description: string;
  onPress: () => void;
}

export type BottomSheetMode = 'getToken' | 'moreOptions';

interface GetTokenBottomSheetContentProps {
  close: () => void;
  onBuyPress: () => void;
  onReceivePress?: () => void;
  onSellPress?: () => void;
  mode?: BottomSheetMode;
}

const GetTokenBottomSheetContent: React.FC<GetTokenBottomSheetContentProps> = ({
  close,
  onBuyPress,
  onReceivePress,
  onSellPress,
  mode = 'getToken',
}) => {
  const { t } = useTranslation();

  const handleOptionPress = useCallback(
    (callback: () => void) => {
      close();
      callback();
    },
    [close],
  );

  const getOptions = (): OptionConfig[] => {
    if (mode === 'getToken') {
      return [
        {
          id: 'buy',
          icon: 'card-load' as IconNames,
          title: t('BUY_CRYPTO', 'Buy Crypto'),
          description: t('BUY_CRYPTO_DESCRIPTION', 'Purchase with a debit card or bank account'),
          onPress: () => handleOptionPress(onBuyPress),
        },
        {
          id: 'receive',
          icon: 'arrow-down-left' as IconNames,
          title: t('RECEIVE_CRYPTO', 'Receive Crypto'),
          description: t('RECEIVE_CRYPTO_DESCRIPTION', 'Receive crypto via QR code or wallet address'),
          onPress: () => handleOptionPress(onReceivePress ?? (() => {})),
        },
      ];
    }

    // moreOptions mode
    const options: OptionConfig[] = [
      {
        id: 'buy',
        icon: 'card-load' as IconNames,
        title: t('BUY_CRYPTO', 'Buy Crypto'),
        description: t('BUY_CRYPTO_DESCRIPTION', 'Purchase with a debit card or bank account'),
        onPress: () => handleOptionPress(onBuyPress),
      },
      {
        id: 'sell',
        icon: 'arrow-up-right' as IconNames,
        title: t('SELL_CRYPTO', 'Sell Crypto'),
        description: t('SELL_CRYPTO_DESCRIPTION', 'Convert crypto to fiat currency'),
        onPress: () => handleOptionPress(onSellPress ?? (() => {})),
      },
    ];

    if (onReceivePress) {
      options.push({
        id: 'receive',
        icon: 'arrow-down-left' as IconNames,
        title: t('RECEIVE_CRYPTO', 'Receive Crypto'),
        description: t('RECEIVE_CRYPTO_DESCRIPTION', 'Receive crypto via QR code or wallet address'),
        onPress: () => handleOptionPress(onReceivePress),
      });
    }

    return options;
  };

  const options = getOptions();

  return (
    <CyDView className='px-[16px] pb-[16px]'>
      <CyDText className='text-[18px] font-semibold text-base400 tracking-[-0.4px] mb-[16px]'>
        More Options
      </CyDText>
      <CyDView className='bg-n10 rounded-[12px] overflow-hidden'>
        {options.map((option, idx) => {
          const isLast = idx === options.length - 1;
          return (
            <CyDTouchView
              key={option.id}
              onPress={option.onPress}
              activeOpacity={0.7}
              className={`px-[16px] py-[14px] flex-row items-center gap-[12px] ${!isLast ? 'border-b border-n40' : ''}`}>
              <CyDView className='w-[40px] h-[40px] rounded-full bg-n30 items-center justify-center'>
                <CyDIcons name={option.icon} size={20} className='text-base400' />
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[15px] font-semibold text-base400 tracking-[-0.4px]'>
                  {option.title}
                </CyDText>
                <CyDText className='text-[12px] font-normal text-n200 mt-[2px]'>
                  {option.description}
                </CyDText>
              </CyDView>
              <CyDIcons name='chevron-right' size={18} className='text-n200' />
            </CyDTouchView>
          );
        })}
      </CyDView>
    </CyDView>
  );
};

export default GetTokenBottomSheetContent;
