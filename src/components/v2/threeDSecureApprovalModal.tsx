import React, { useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { StyleSheet, Modal } from 'react-native';
import SlideToConfirmV2 from './slideToConfirmModalV2';
import useAxios from '../../core/HttpRequest';
import { useGlobalModalContext } from './GlobalModal';
import { capitalize } from 'lodash';
import analytics from '@react-native-firebase/analytics';

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

interface ThreeDSecureData {
  last4: string;
  transactionAmount: number;
  currency: string;
  merchantName: string;
  approveUrl: string;
  declineUrl: string;
}

interface ThreeDSecureApprovalModalProps {
  isModalVisible: boolean;
  closeModal: () => void;
  data: ThreeDSecureData;
}

export default function ThreeDSecureApprovalModal({
  isModalVisible,
  closeModal,
  data,
}: ThreeDSecureApprovalModalProps) {
  const seconds = 120;
  const [timer, setTimer] = useState<number | null>(seconds * 1000); // 120 seconds in milliseconds
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [callDeclineOnClose, setCallDeclineOnClose] = useState(true);
  const { getWithAuth } = useAxios();
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();

  // Track modal view
  useEffect(() => {
    if (isModalVisible) {
      void analytics().logScreenView({
        screen_name: '3DSecureApprovalModal',
        screen_class: 'ThreeDSecureApprovalModal',
      });

      void analytics().logEvent('3d_secure_modal_viewed', {
        merchant: data?.merchantName,
        amount: data?.transactionAmount,
      });

      const end = Date.now() + seconds * 1000;
      setTimerEnd(end);
      setTimer(seconds * 1000);
      setCallDeclineOnClose(true);
    }
  }, [isModalVisible, data]);

  // Track timer expiration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        if (timerEnd && now >= timerEnd) {
          void analytics().logEvent('3d_secure_timer_expired', {
            merchant: data?.merchantName,
          });

          clearInterval(interval);
          setTimer(null);
          setTimerEnd(null);
          setCallDeclineOnClose(false); // call decline on close before timer ends
        } else {
          setTimer(timerEnd ? timerEnd - now : 0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, timerEnd, data]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    return totalSeconds.toString();
  };

  const handleAccept = async () => {
    void analytics().logEvent('3d_secure_approve', {
      merchant: data?.merchantName,
      amount: data?.transactionAmount,
    });

    setAcceptLoading(true);
    const response = await getWithAuth(data?.approveUrl);
    setAcceptLoading(false);
    if (!response?.isError) {
      void analytics().logEvent('3d_secure_approve_success', {
        merchant: data?.merchantName,
      });

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
      void analytics().logEvent('3d_secure_approve_failed', {
        merchant: data?.merchantName,
        error: response?.error?.message || 'Unknown error',
      });

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
    void analytics().logEvent('3d_secure_decline', {
      merchant: data?.merchantName,
      amount: data?.transactionAmount,
    });

    setDeclineLoading(true);
    const response = await getWithAuth(data?.declineUrl);
    setDeclineLoading(false);
    if (!response?.isError) {
      void analytics().logEvent('3d_secure_decline_success', {
        merchant: data?.merchantName,
      });

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
      void analytics().logEvent('3d_secure_decline_failed', {
        merchant: data?.merchantName,
        error: response?.error?.message || 'Unknown error',
      });

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

  // Handle close with cancel
  const handleCloseWithCancel = () => {
    if (callDeclineOnClose) {
      void analytics().logEvent('3d_secure_close_with_decline', {
        merchant: data?.merchantName,
      });

      void handleDecline();
    } else {
      void analytics().logEvent('3d_secure_dismissed', {
        merchant: data?.merchantName,
      });
    }
    closeModal();
  };

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType='fade'
      style={styles.modalLayout}
      onRequestClose={handleCloseWithCancel}>
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
              <CyDTouchView onPress={handleCloseWithCancel}>
                <CyDMaterialDesignIcons
                  name='close'
                  size={24}
                  className='text-white'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
          <CyDView className='mt-[50px]'>
            <CyDView className='flex flex-col text-white items-center'>
              <CyDView className='flex flex-row items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='credit-card'
                  size={20}
                  className='text-white mr-1'
                />
                <CyDText className='text-[10px] text-white font-semibold'>
                  {`**** **** **** ${data?.last4}`}
                </CyDText>
              </CyDView>
              <CyDText className='text-[28px] mt-[2px] text-white text-center font-semibold'>
                {`${data?.transactionAmount?.toLocaleString()} ${data?.currency}`}
              </CyDText>
              <CyDText className='text-[10px] mt-[14px] text-white text-center'>
                {'Paying to'}
              </CyDText>
              <CyDText className='text-[14px] mt-[2px] mb-[56px] text-white font-bold text-center'>
                {data?.merchantName?.length > 24
                  ? capitalize(data?.merchantName?.substring(0, 24)) + '...'
                  : capitalize(data?.merchantName)}
              </CyDText>
              <SlideToConfirmV2
                approveUrl={data?.approveUrl}
                closeModal={closeModal}
              />
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
