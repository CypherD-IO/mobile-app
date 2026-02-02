import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImageBackground,
  CyDImage,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import AppImages from '../../../assets/images/appImages';
import { FREE_SAFEPAL_CLAIM_URL } from '../../constants/data';

const STORAGE_KEY_DISMISSED = '@free_safepal_claim_modal_dismissed';

export default function FreeSafepalClaimModal({
  isModalVisible,
  setIsModalVisible,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!isModalVisible && dontShowAgain) {
      void AsyncStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    }
  }, [isModalVisible, dontShowAgain]);

  const handleClaim = async () => {
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_CLAIM_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'claim_button_clicked',
      label: 'claim',
    });

    if (dontShowAgain) {
      await AsyncStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    }

    try {
      await Linking.openURL(FREE_SAFEPAL_CLAIM_URL);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
    setIsModalVisible(false);
  };

  const handleCheckboxChange = () => {
    const newState = !dontShowAgain;
    setDontShowAgain(newState);
    void logAnalyticsToFirebase(AnalyticEvent.FREE_SAFEPAL_DONT_SHOW_CLICKED, {
      category: 'free_safepal_claim_modal',
      action: 'dont_show_again_toggled',
      label: newState ? 'checked' : 'unchecked',
    });
  };

  const handleClose = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    }
    setIsModalVisible(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setIsModalVisible}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          void handleClose();
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={true}
      style={styles.modalLayout}>
  
      <CyDImageBackground
        source={AppImages.FREE_SAFEPAL_CLAIM_IMAGE_BG}
        className='rounded-t-[20px] overflow-hidden h-[750px]'
        resizeMode='cover'
        imageStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        
        <CyDView 
          className='absolute top-0 left-0 right-0 w-full h-[639px]'
          pointerEvents='none'>
          <CyDImage
            source={AppImages.FREE_SAFEPAL_CLAIM_IMAGE}
            className='w-full h-full'
            resizeMode='cover'
          />

          <CyDImage
            source={AppImages.FREE_SAFEPAL_BADGE}
            className='absolute top-[410px] left-[222px] w-[83px] h-[83px]'
            resizeMode='contain'
          />
        </CyDView>

        <CyDView className='flex-1 p-[16px] pb-[28px] justify-between'>
        
          <CyDView className='items-center pt-[8px] pb-[16px]'>
            <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] rounded-full' />
          </CyDView>

          <CyDView>
            <CyDTouchView
              activeOpacity={0.8}
              onPress={handleCheckboxChange}
              className='flex-row items-center justify-center mb-[24px]'>
              <CyDMaterialDesignIcons
                name={dontShowAgain ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                className={dontShowAgain ? 'text-p100' : 'text-white'}
              />
              <CyDText className='ml-[8px] text-[14px] text-white opacity-80'>
                {t("Don't show again") as string}
              </CyDText>
            </CyDTouchView>

            <Button
              title={t('Claim Free Safepal')}
              type={ButtonType.YELLOW_FILL}
              onPress={handleClaim}
              style='rounded-full'
            />
          </CyDView>
        </CyDView>
      </CyDImageBackground>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});