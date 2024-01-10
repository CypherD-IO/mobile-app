import React, { useEffect } from 'react';
import {
  CyDImage,
  CyDImageBackground,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import * as Sentry from '@sentry/react-native';
import { W3mButton } from '@web3modal/wagmi-react-native';
import useConnectionManager from '../../hooks/useConnectionManager';

export default function ImportWalletOptions({
  navigation,
}: {
  navigation: { navigate: (screen: string) => void };
}) {
  const { openWalletConnectModal } = useConnectionManager();
  return (
    <CyDImageBackground
      source={AppImages.BG_SETTINGS}
      resizeMode='cover'
      className='flex-1 bg-white'>
      <CyDScrollView className='px-[12px] py-[20px]'>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(screenTitle.ENTER_KEY);
          }}
          className='flex flex-row justify-between items-center border-b-[0.2px] py-[22px]'>
          <CyDView>
            <CyDText className='text-[16px] font-semibold'>Seed Phrase</CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className='h-[22px] w-[12px]'
          />
        </CyDTouchView>
        {/* <CyDTouchView className='flex flex-row justify-between items-center border-b-[0.2px] py-[22px]'>
          <CyDView>
            <CyDText className='text-[16px] font-semibold'>Private Key</CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className='h-[22px] w-[12px]'
          />
        </CyDTouchView> */}
        <CyDTouchView
          onPress={() => {
            void openWalletConnectModal();
          }}
          className='flex flex-row justify-between items-center border-b-[0.2px] py-[22px]'>
          <CyDView>
            <CyDText className='text-[16px] font-semibold'>
              Wallet Connect
            </CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className='h-[22px] w-[12px]'
          />
        </CyDTouchView>
      </CyDScrollView>
    </CyDImageBackground>
  );
}
