import React, { useCallback, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { screenTitle } from '../../constants';

export default function BlindPaySendMoneyScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const [recipient, setRecipient] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const handleSelectRecipient = useCallback(() => {
    navigation.navigate(screenTitle.BLINDPAY_ADD_RECIPIENT);
  }, [navigation]);

  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      {/* Header */}
      <CyDView className='flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
        <CyDTouchView
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className='w-[48px] h-[48px] items-center justify-center'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] flex-1'>
          {String(t('BLINDPAY_SEND_MONEY', 'Send Money'))}
        </CyDText>
      </CyDView>

      <CyDScrollView className='flex-1' contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>
        {/* Recipient card */}
        <CyDView className='bg-white border border-n30 rounded-[12px]'>
          <CyDView className='px-[16px] py-[14px]'>
            <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4]'>
              {String(t('RECIPIENT', 'Recipient'))}
            </CyDText>
          </CyDView>
          <CyDView className='h-px bg-n30' />
          <CyDTouchView
            onPress={handleSelectRecipient}
            className='px-[16px] py-[14px] flex-row items-center justify-between'>
            {recipient ? (
              <CyDView className='gap-[2px]'>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
                  {recipient.name}
                </CyDText>
                <CyDText className='text-[12px] font-medium text-[#8993A4]'>
                  {recipient.email}
                </CyDText>
              </CyDView>
            ) : (
              <CyDText className='text-[14px] font-medium text-[#8993A4] tracking-[-0.6px]'>
                {String(t('BLINDPAY_SELECT_RECIPIENT', 'Select Recipient'))}
              </CyDText>
            )}
            <CyDMaterialDesignIcons
              name='plus-circle-outline'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>

      {/* Bottom CTA */}
      <CyDView
        className='px-[16px] pt-[12px] items-center gap-[8px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDView className='bg-[#FDF3D8] rounded-[24px] px-[16px] py-[10px]'>
          <CyDText className='text-[14px] font-semibold text-[#846000] tracking-[-0.6px] text-center'>
            {String(
              t(
                'BLINDPAY_FREE_TX_SHORT',
                'Your First 3 transactions are free',
              ),
            )}
          </CyDText>
        </CyDView>
        <CyDTouchView
          onPress={handleSelectRecipient}
          className={`rounded-full h-[48px] w-full items-center justify-center ${
            recipient ? 'bg-[#FBC02D]' : 'bg-n40'
          }`}>
          <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
            {String(t('BLINDPAY_SELECT_RECIPIENT', 'Select Recipient'))}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
