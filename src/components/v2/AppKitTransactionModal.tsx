import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { Colors } from '../../constants/theme';
import CyDModalLayout from './modal';
import { WALLET_CONNECT_SIGNING_TIMEOUT } from '../../constants/timeOuts';

export enum AppKitTransactionState {
  WAITING = 'waiting',
  TIMED_OUT = 'timed_out',
}

interface AppKitTransactionModalProps {
  isVisible: boolean;
  walletName?: string;
  onResend: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  state: AppKitTransactionState;
}

export const AppKitTransactionModal: React.FC<AppKitTransactionModalProps> = ({
  isVisible,
  walletName = 'your wallet',
  onResend,
  onCancel,
  onRetry,
  state,
}) => {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<number>(
    WALLET_CONNECT_SIGNING_TIMEOUT / 1000,
  );
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkOpacity = useRef(new Animated.Value(1)).current;

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (seconds: number): string => {
    if (seconds <= 10) return 'text-redColor';
    if (seconds <= 30) return 'text-warningColor';
    return 'text-base400';
  };

  // Countdown timer
  useEffect(() => {
    if (state === AppKitTransactionState.WAITING && isVisible) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [state, isVisible]);

  // Blinking animation for the wallet message
  useEffect(() => {
    if (state === AppKitTransactionState.WAITING && isVisible) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(blinkOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );

      blinkAnimation.start();

      return () => {
        blinkAnimation.stop();
        blinkOpacity.setValue(1);
      };
    }
  }, [state, isVisible, blinkOpacity]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isVisible && state === AppKitTransactionState.WAITING) {
      setTimeRemaining(WALLET_CONNECT_SIGNING_TIMEOUT / 1000);
    }
  }, [isVisible, state]);

  return (
    <CyDModalLayout
      isModalVisible={isVisible}
      setModalVisible={() => {}}
      animationIn='slideInUp'
      animationOut='slideOutDown'
      style={{
        margin: 0,
        justifyContent: 'flex-end',
      }}>
      <CyDView className='bg-n0 rounded-t-[24px] p-[24px]'>
        {state === AppKitTransactionState.WAITING ? (
          // WAITING STATE
          <>
            {/* Header */}
            <CyDView className='flex-row items-center justify-center mb-[16px]'>
              <ActivityIndicator size='small' color={Colors.base400} />
              <CyDText className='ml-[8px] text-[18px] font-extrabold text-base400'>
                {t('APPKIT_TX_PENDING', 'Transaction Pending')}
              </CyDText>
            </CyDView>

            {/* Blinking message */}
            <Animated.Text
              className='text-center text-[14px] text-base400 mb-[16px]'
              style={{ opacity: blinkOpacity }}>
              {t(
                'APPKIT_TX_CHECK_WALLET',
                'Please check {{walletName}} and approve the transaction request',
                { walletName },
              )}
            </Animated.Text>

            {/* Timer */}
            <CyDView className='border border-n40 rounded-[16px] p-[16px] mb-[16px]'>
              <CyDView className='flex-row items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='timer-outline'
                  size={20}
                  className={getTimerColor(timeRemaining)}
                />
                <CyDText
                  className={`ml-[8px] text-[16px] font-bold ${getTimerColor(
                    timeRemaining,
                  )}`}>
                  {t('APPKIT_TX_TIME_REMAINING', 'Time remaining: {{time}}', {
                    time: formatTimeRemaining(timeRemaining),
                  })}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Wallet info */}
            <CyDView className='bg-n0 mb-[20px]'>
              <CyDView className='flex-row items-center'>
                <CyDMaterialDesignIcons
                  name='wallet-outline'
                  size={20}
                  className='text-base400'
                />
                <CyDText className='ml-[8px] text-[14px] text-base400'>
                  {t('APPKIT_TX_CONNECTED_TO', 'Connected to: {{walletName}}', {
                    walletName,
                  })}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Resend button */}
            <CyDTouchView
              className='bg-base400 rounded-[12px] py-[14px] px-[16px] items-center mb-[12px]'
              onPress={onResend}>
              <CyDText className='text-[15px] font-bold text-n0'>
                {t(
                  'APPKIT_TX_RESEND_REQUEST',
                  'Resend Request (if not showing)',
                )}
              </CyDText>
            </CyDTouchView>

            {/* Cancel button */}
            <CyDTouchView
              className='bg-n40 rounded-[12px] py-[14px] px-[16px] items-center'
              onPress={onCancel}>
              <CyDText className='text-[15px] font-bold text-base400'>
                {t('CANCEL', 'Cancel')}
              </CyDText>
            </CyDTouchView>
          </>
        ) : (
          // TIMED_OUT STATE
          <>
            {/* Error header */}
            <CyDView className='flex-row items-center justify-center mb-[16px]'>
              <CyDMaterialDesignIcons
                name='alert-circle'
                size={24}
                className='text-red400'
              />
              <CyDText className='ml-[8px] text-[18px] font-extrabold text-red400'>
                {t('APPKIT_TX_TIMEOUT', 'Request Expired')}
              </CyDText>
            </CyDView>

            {/* Error message */}
            <CyDView className='bg-red50 border border-red200 rounded-[16px] p-[16px] mb-[20px]'>
              <CyDText className='text-[14px] text-red400 mb-[12px]'>
                {t(
                  'APPKIT_TX_TIMEOUT_DESC',
                  'The transaction request timed out and was not signed.',
                )}
              </CyDText>
              <CyDView className='flex-row items-start'>
                <CyDMaterialDesignIcons
                  name='alert-circle-outline'
                  size={16}
                  className='text-red400 mt-[2px]'
                />
                <CyDText className='ml-[8px] flex-1 text-[13px] text-red300'>
                  {t(
                    'APPKIT_TX_TIMEOUT_ACTION',
                    'Important: Please open {{walletName}} and REJECT any pending requests to avoid confusion.',
                    { walletName },
                  )}
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Retry button */}
            {onRetry && (
              <CyDTouchView
                className='bg-base400 rounded-[12px] py-[14px] px-[16px] items-center mb-[12px]'
                onPress={onRetry}>
                <CyDText className='text-[15px] font-bold text-n0'>
                  {t('APPKIT_TX_RETRY', 'Retry Transaction')}
                </CyDText>
              </CyDTouchView>
            )}

            {/* Close button */}
            <CyDTouchView
              className='bg-n40 rounded-[12px] py-[14px] px-[16px] items-center'
              onPress={onCancel}>
              <CyDText className='text-[15px] font-bold text-base400'>
                {t('CLOSE', 'Close')}
              </CyDText>
            </CyDTouchView>
          </>
        )}
      </CyDView>
    </CyDModalLayout>
  );
};
