import React, { useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { Platform, StyleSheet, Modal } from 'react-native';
import SlideToConfirm from './slideToConfirmModal';
import useAxios from '../../core/HttpRequest';
import LottieView from 'lottie-react-native';
import { useGlobalModalContext } from './GlobalModal';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
});

export default function ThreeDSecureApprovalModal({
  isModalVisible,
  closeModal,
  data,
}: {
  isModalVisible: boolean;
  closeModal: () => void;
  data: any;
}) {
  const seconds = 120;
  const [timer, setTimer] = useState<number | null>(seconds * 1000); // 120 seconds in milliseconds
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const { postWithAuth } = useAxios();
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    if (isModalVisible) {
      const end = Date.now() + seconds * 1000; // 120 seconds from now
      setTimerEnd(end);
      setTimer(seconds * 1000);
      setShowCloseButton(false);
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
          setShowCloseButton(true); // Show close button when timer ends
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

  const handleAccept = async () => {
    setAcceptLoading(true);
    const response = await postWithAuth(data?.approveUrl, {});
    setAcceptLoading(false);
    if (!response?.isError) {
      closeModal();
      setTimeout(() => {
        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_APPROVED_SUCCESS'),
          description: '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    } else {
      closeModal();
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_APPROVAL_FAILED'),
          description:
            response?.error?.message ??
            t('TRANSACTION_APPROVAL_FAILED_REASON_NA'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    }
  };

  const handleDecline = async () => {
    setDeclineLoading(true);
    const response = await postWithAuth(data?.declineUrl, {});
    setDeclineLoading(false);
    if (!response?.isError) {
      closeModal();
      setTimeout(() => {
        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_DECLINED'),
          description: '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    } else {
      closeModal();
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_DECLINE_FAILED'),
          description:
            response?.error?.message ??
            t('TRANSACTION_DECLINATION_FAILED_REASON'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    }
  };

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType='fade'
      style={styles.modalLayout}
      onRequestClose={closeModal}>
      <CyDView className='flex-1' style={styles.overlay}>
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
              {timer !== null && ( // Only show timer when it hasn't ended
                <CyDView className='bg-black rounded-full w-[35px] h-[35px] flex flex-col items-center justify-center border-2 border-p200 mr-[12px] shadow-lg'>
                  <CyDText className='font-extrabold text-white text-[10px]'>
                    {formatTime(timer)}
                  </CyDText>
                </CyDView>
              )}
              {showCloseButton && ( // Only show close button after timer ends
                <CyDTouchView
                  onPress={() => {
                    closeModal();
                  }}>
                  <CyDImage
                    source={AppImages.WHITE_CLOSE_ICON}
                    className='h-[24px] w-[24px]'
                  />
                </CyDTouchView>
              )}
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
                  {`**** **** **** ${data?.last4}`}
                </CyDText>
              </CyDView>
              <CyDText className='text-[28px] mt-[2px] text-white text-center font-semibold'>
                {data?.transactionAmount?.toLocaleString() + ' USD'}
              </CyDText>
              <CyDText className='text-[10px] mt-[14px] text-white text-center'>
                {'Paying to'}
              </CyDText>
              <CyDText className='text-[14px] mt-[2px] mb-[56px] text-white font-bold text-center'>
                {data?.merchantName?.length > 24
                  ? data?.merchantName?.substring(0, 24) + '...'
                  : data?.merchantName}
              </CyDText>
              {Platform.OS === 'ios' ? (
                <SlideToConfirm
                  approveUrl={data?.approveUrl}
                  closeModal={closeModal}
                />
              ) : (
                <CyDView className='flex flex-row gap-[16px] w-full px-[16px]'>
                  <CyDTouchView
                    className='flex-1 bg-appColor p-[12px] rounded-[8px] items-center justify-center'
                    onPress={handleAccept}>
                    {acceptLoading ? (
                      <LottieView
                        source={AppImages.LOADER_TRANSPARENT}
                        autoPlay
                        loop
                        style={{ width: 24, height: 24 }}
                      />
                    ) : (
                      <CyDText className='text-black font-semibold'>
                        {t('ACCEPT')}
                      </CyDText>
                    )}
                  </CyDTouchView>
                  <CyDTouchView
                    className='flex-1 bg-transparent p-[12px] rounded-[8px] border border-red-500 items-center justify-center'
                    onPress={handleDecline}>
                    {declineLoading ? (
                      <LottieView
                        source={AppImages.LOADER_TRANSPARENT}
                        autoPlay
                        loop
                        style={{ width: 24, height: 24 }}
                      />
                    ) : (
                      <CyDText className='text-red-500 font-semibold'>
                        {t('DECLINE')}
                      </CyDText>
                    )}
                  </CyDTouchView>
                </CyDView>
              )}
              <CyDImage
                className='h-[28px] w-[53px] mt-[20px]'
                source={AppImages.VERIFIED_BY_VISA_WHITE}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </Modal>
  );
}