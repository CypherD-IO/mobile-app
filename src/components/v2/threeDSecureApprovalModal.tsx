import React, { useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import SlideToConfirm from './slideToConfirmModal';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function ThreeDSecureApprovalModal({
  isModalVisible,
  setIsModalVisible,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
}) {
  const [timer, setTimer] = useState<number | null>(120000); // 120 seconds in milliseconds
  const [timerEnd, setTimerEnd] = useState<number | null>(null);

  useEffect(() => {
    if (isModalVisible) {
      const end = Date.now() + 120000; // 120 seconds from now
      setTimerEnd(end);
      setTimer(120000);
    }
  }, [isModalVisible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        if (timerEnd && now >= timerEnd) {
          clearInterval(interval);
          setTimer(null);
          setTimerEnd(null);
        } else {
          setTimer(timerEnd ? timerEnd - now : 0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, timerEnd]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    return totalSeconds.toString();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      disableBackDropPress={true}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDView className='bg-black px-[20px] pt-[24px] pb-[36px] rounded-t-[16px]'>
        <CyDView className='flex flex-row items-center justify-between'>
          <CyDView>
            <CyDText className='font-bold text-white text-[18px]'>
              {t('CYPHER_CARD')}
            </CyDText>
            <CyDText className='font-semibold text-white text-[11px]'>
              {t('PAYMENT_VERIFICATION')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDView
              className='bg-black rounded-full w-[35px] h-[35px] flex flex-col items-center justify-center border-2 border-p200 mr-[12px]'
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4, // for Android
              }}>
              <CyDText className='font-extrabold text-white text-[10px]'>
                {formatTime(timer ?? 0)}
              </CyDText>
            </CyDView>
            {/* <CyDTouchView onPress={() => setIsModalVisible(false)}>
              <CyDImage
                source={AppImages.BLACK_CLOSE}
                className='h-[12px] w-[12px]'
              />
            </CyDTouchView> */}
          </CyDView>
        </CyDView>
        <CyDView className='mt-[50px]'>
          <CyDView className='flex flex-col text-white items-center'>
            <CyDView className='flex flex-row items-center justify-center'>
              <CyDImage
                className='h-[16px] w-[16px] mr-[4px]'
                source={AppImages.CARD_ICON_WHITE}
              />
              <CyDText className='text-[10px] text-white font-semibold'>
                {'4938 75** ****8600'}
              </CyDText>
            </CyDView>
            <CyDText className='text-[28px] mt-[2px] text-white text-center font-semibold'>
              {(180000).toLocaleString() + ' USD'}
            </CyDText>
            <CyDText className='text-[10px] mt-[14px] text-white text-center'>
              {'Paying to'}
            </CyDText>
            <CyDText className='text-[14px] mt-[2px] mb-[56px] text-white font-bold text-center'>
              {'Bundle Tech Bangalore Pv..'}
            </CyDText>
            <SlideToConfirm />
            <CyDImage
              className='h-[28px] w-[53px] mt-[20px]'
              source={AppImages.VERIFIED_BY_VISA_WHITE}
            />
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
