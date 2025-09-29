import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

interface GetTokenBottomSheetContentProps {
  close: () => void;
  onBuyPress: () => void;
  onReceivePress: () => void;
}

/**
 * Bottom sheet content offering two funding options: Buy Crypto and Receive Crypto.
 * Matches the styling of existing reward claim bottom sheet.
 */
const GetTokenBottomSheetContent: React.FC<GetTokenBottomSheetContentProps> = ({
  close,
  onBuyPress,
  onReceivePress,
}) => {
  const { t } = useTranslation();

  /**
   * Navigate user to Buy flow (OnMeta screen for now)
   */
  const handleBuyCrypto = useCallback(() => {
    close();
    onBuyPress();
  }, [close, onBuyPress]);

  /**
   * Navigate user to Receive Crypto (QR code screen)
   */
  const handleReceiveCrypto = useCallback(() => {
    close();
    onReceivePress();
  }, [close, onReceivePress]);

  return (
    <CyDView className='flex-1 bg-n0 px-6'>
      {/* Options */}
      <CyDView className='gap-y-6 my-8'>
        {/* Buy Crypto */}
        <CyDTouchView
          onPress={handleBuyCrypto}
          className='bg-base40 rounded-[16px] pb-4 pt-2 px-6'>
          <CyDView className='items-center'>
            <CyDIcons name='card-filled' className='text-[40px]' />
            <CyDText className='font-semibold text-center mb-1'>
              {t('BUY_CRYPTO') ?? 'Buy Crypto'}
            </CyDText>
            <CyDText className='text-n200 text-[14px] text-center'>
              {t('BUY_CRYPTO_DESCRIPTION') ??
                'Purchase with a debit card or bank account'}
            </CyDText>
          </CyDView>
        </CyDTouchView>

        {/* Receive Crypto */}
        <CyDTouchView
          onPress={handleReceiveCrypto}
          className='bg-base40 rounded-[16px] px-6 pb-4 pt-2'>
          <CyDView className='items-center'>
            <CyDMaterialDesignIcons
              name='wallet'
              size={30}
              className='my-[8px]'
            />
            <CyDText className='font-semibold text-center mb-1'>
              {t('RECEIVE_CRYPTO') ?? 'Receive Crypto'}
            </CyDText>
            <CyDText className='text-n200 text-[14px] text-center'>
              {t('RECEIVE_CRYPTO_DESCRIPTION') ??
                'Get funds from another wallet or exchange'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

export default GetTokenBottomSheetContent;
