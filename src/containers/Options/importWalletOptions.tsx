import React from 'react';
import {
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
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
      className='flex-1 bg-n20'>
      <CyDScrollView className='px-[12px] py-[20px]'>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(screenTitle.ENTER_KEY);
          }}
          className='flex flex-row justify-between items-center border-b-[0.2px] py-[22px]'>
          <CyDView>
            <CyDText className='text-[16px] font-semibold'>Seed Phrase</CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={20}
            className='text-base400'
          />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => {
            void openWalletConnectModal();
            // void open();
          }}
          className='flex flex-row justify-between items-center border-b-[0.2px] py-[22px]'>
          <CyDView>
            <CyDText className='text-[16px] font-semibold'>
              Wallet Connect
            </CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={20}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDScrollView>
    </CyDImageBackground>
  );
}
