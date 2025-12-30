import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

// Configuration for each option in the bottom sheet
interface OptionConfig {
  id: string;
  icon: string;
  iconType: 'cypher' | 'material';
  title: string;
  description: string;
  onPress: () => void;
}

// Preset modes for common use cases
export type BottomSheetMode = 'getToken' | 'moreOptions';

interface GetTokenBottomSheetContentProps {
  close: () => void;
  onBuyPress: () => void;
  // For "getToken" mode (empty wallet)
  onReceivePress?: () => void;
  // For "moreOptions" mode (wallet with balance)
  onSellPress?: () => void;
  // Mode determines which options to show
  mode?: BottomSheetMode;
}

/**
 * Bottom sheet content for funding/transaction options.
 * - 'getToken' mode: Buy Crypto + Receive Crypto (for empty wallets)
 * - 'moreOptions' mode: Buy + Sell (for wallets with balance)
 */
const GetTokenBottomSheetContent: React.FC<GetTokenBottomSheetContentProps> = ({
  close,
  onBuyPress,
  onReceivePress,
  onSellPress,
  mode = 'getToken',
}) => {
  const { t } = useTranslation();

  /**
   * Handle option press - closes the sheet and triggers the callback
   */
  const handleOptionPress = useCallback(
    (callback: () => void) => {
      close();
      callback();
    },
    [close],
  );

  // Define options based on mode
  const getOptions = (): OptionConfig[] => {
    if (mode === 'getToken') {
      return [
        {
          id: 'buy',
          icon: 'card-filled',
          iconType: 'cypher',
          title: t('BUY_CRYPTO', 'Buy Crypto'),
          description: t(
            'BUY_CRYPTO_DESCRIPTION',
            'Purchase with a debit card or bank account',
          ),
          onPress: () => handleOptionPress(onBuyPress),
        },
        {
          id: 'receive',
          icon: 'wallet',
          iconType: 'material',
          title: t('RECEIVE_CRYPTO', 'Receive Crypto'),
          description: t(
            'RECEIVE_CRYPTO_DESCRIPTION',
            'Receive crypto by scanning a QR code or sharing your address',
          ),
          onPress: () => handleOptionPress(onReceivePress ?? (() => {})),
        },
      ];
    }

    // moreOptions mode - Buy and Sell
    return [
      {
        id: 'buy',
        icon: 'card-filled',
        iconType: 'cypher',
        title: t('BUY_CRYPTO', 'Buy Crypto'),
        description: t(
          'BUY_CRYPTO_DESCRIPTION',
          'Purchase with a debit card or bank account',
        ),
        onPress: () => handleOptionPress(onBuyPress),
      },
      {
        id: 'sell',
        icon: 'bank-transfer-out',
        iconType: 'material',
        title: t('SELL_CRYPTO', 'Sell Crypto'),
        description: t(
          'SELL_CRYPTO_DESCRIPTION',
          'Convert crypto to fiat currency',
        ),
        onPress: () => handleOptionPress(onSellPress ?? (() => {})),
      },
    ];
  };

  const options = getOptions();

  /**
   * Render icon based on configuration
   */
  const renderIcon = (option: OptionConfig): JSX.Element => {
    if (option.iconType === 'material') {
      return (
        <CyDMaterialDesignIcons
          name={option.icon as 'wallet' | 'bank-transfer-out'}
          size={30}
          className='text-base400 my-[8px]'
        />
      );
    }
    return (
      <CyDIcons
        name={option.icon as 'card-filled'}
        className='text-base400 text-[40px]'
      />
    );
  };

  return (
    <CyDView className='flex-1 bg-n0 px-6'>
      {/* Options */}
      <CyDView className='gap-y-6 my-8'>
        {options.map(option => (
          <CyDTouchView
            key={option.id}
            onPress={option.onPress}
            activeOpacity={0.7}
            className='bg-base40 rounded-[16px] pb-4 pt-2 px-6'>
            <CyDView className='items-center'>
              {renderIcon(option)}
              <CyDText className='font-semibold text-center mb-1'>
                {option.title}
              </CyDText>
              <CyDText className='text-n200 text-[14px] text-center'>
                {option.description}
              </CyDText>
            </CyDView>
          </CyDTouchView>
        ))}
      </CyDView>
    </CyDView>
  );
};

export default GetTokenBottomSheetContent;
