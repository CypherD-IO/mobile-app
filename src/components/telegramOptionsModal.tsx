import React, { useContext, useState } from 'react';
import { GlobalContextType } from '../constants/enum';
import { GlobalContext } from '../core/globalContext';
import AppImages from '../../assets/images/appImages';
import CyDModalLayout from './v2/modal';
import {
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import useAxios from '../core/HttpRequest';
import Toast from 'react-native-toast-message';
import useCardUtilities from '../hooks/useCardUtilities';
import clsx from 'clsx';
import { screenTitle } from '../constants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

interface TelegramOptionsModalProps {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  navigation: NavigationProp<ParamListBase>;
  onTelegramDisconnected?: () => void;
}

export default function TelegramOptionsModal({
  isModalVisible,
  setShowModal,
  navigation,
  onTelegramDisconnected,
}: TelegramOptionsModalProps) {
  const globalContext = useContext(GlobalContext);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isResettingPin, setIsResettingPin] = useState<boolean>(false);
  const { deleteWithAuth } = useAxios();
  const { getWalletProfile } = useCardUtilities();

  /**
   * Refreshes the card profile after telegram operations
   */
  const refreshProfile = async (): Promise<void> => {
    try {
      if (globalContext) {
        const data = await getWalletProfile(globalContext.globalState.token);
        if (data && !(data instanceof Error)) {
          globalContext.globalDispatch({
            type: GlobalContextType.CARD_PROFILE,
            cardProfile: data,
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  /**
   * Disconnects telegram from the card
   */
  const disconnectTelegram = async (): Promise<void> => {
    setIsDisconnecting(true);
    try {
      const response = await deleteWithAuth('/v1/cards/tg');
      if (!response.isError) {
        await refreshProfile();
        setIsDisconnecting(false);
        setShowModal(false);
        // Notify parent component to refresh its state
        if (onTelegramDisconnected) {
          onTelegramDisconnected();
        }
        Toast.show({
          type: 'success',
          text2: 'Telegram disconnected successfully',
          position: 'bottom',
        });
      } else {
        setIsDisconnecting(false);
        Toast.show({
          type: 'error',
          text2: 'Error while disconnecting telegram',
          position: 'top',
        });
      }
    } catch (error) {
      setIsDisconnecting(false);
      Toast.show({
        type: 'error',
        text2: 'Error while disconnecting telegram',
        position: 'top',
      });
    }
  };

  /**
   * Navigates to telegram pin setup screen for resetting pin
   */
  const resetTelegramPin = (): void => {
    setIsResettingPin(true);
    setShowModal(false);
    navigation.navigate(screenTitle.TELEGRAM_PIN_SETUP);
    setIsResettingPin(false);
  };

  /**
   * Telegram options configuration
   */
  const telegramOptions = [
    {
      title: 'Reset Telegram Pin',
      description: 'Change your telegram pin for card operations',
      image: 'lock-reset' as const,
      action: resetTelegramPin,
    },
    {
      title: 'Disconnect Telegram',
      description: 'Permanently disconnect telegram from your card',
      image: 'link-off' as const,
      action: () => {
        if (isDisconnecting) return;
        void disconnectTelegram();
      },
    },
  ];

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-n20 mb-[6px] rounded-[16px] max-h-[80%] pb-[32px]'>
        <CyDView className='flex flex-row justify-between items-center rounded-t-[16px] bg-n0 px-[16px] pb-[16px] pt-[32px]'>
          <CyDText className='text-[16px] font-semibold font-manrope'>
            Telegram Bot
          </CyDText>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        {telegramOptions.map((option, index) => {
          const { image, title, description, action } = option;
          return (
            <CyDTouchView
              key={index}
              onPress={action}
              disabled={
                (index === 0 && isResettingPin) ||
                (index === 1 && isDisconnecting)
              }
              className='flex flex-row justify-start items-center mt-[12px] py-[15px] bg-n0 rounded-[6px] mx-[12px]'>
              {(index === 0 && isResettingPin) ||
              (index === 1 && isDisconnecting) ? (
                <CyDView className='relative w-[48px]'>
                  <CyDLottieView
                    source={AppImages.LOADER_TRANSPARENT}
                    autoPlay
                    loop
                    style={styles.loaderStyle}
                  />
                </CyDView>
              ) : (
                <CyDMaterialDesignIcons
                  name={image}
                  size={24}
                  className={clsx('text-base400 mx-[12px]', {
                    'text-red400': index === 1,
                  })}
                />
              )}

              <CyDView className='flex flex-col justify-between'>
                <CyDText className='text-[16px] font-medium text-base400'>
                  {title}
                </CyDText>
                <CyDText className='text-[12px] font-medium text-n50 flex-wrap'>
                  {description}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          );
        })}
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    height: 32,
    width: 32,
    left: -2,
  },
});
