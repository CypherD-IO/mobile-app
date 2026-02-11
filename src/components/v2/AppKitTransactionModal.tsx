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
import { useGlobalBottomSheet } from './GlobalBottomSheetProvider';
import { WALLET_CONNECT_SIGNING_TIMEOUT } from '../../constants/timeOuts';

const BOTTOM_SHEET_ID = 'appkit-transaction-modal';

export enum AppKitTransactionState {
  WAITING = 'waiting',
  TIMED_OUT = 'timed_out',
}

// ─── Inner content component (stateful — owns timer & blink animation) ───

interface AppKitTransactionContentProps {
  walletName: string;
  onResend: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  state: AppKitTransactionState;
  resendCount: number;
}

const AppKitTransactionContent: React.FC<AppKitTransactionContentProps> = ({
  walletName,
  onResend,
  onCancel,
  onRetry,
  state,
  resendCount,
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
    if (state === AppKitTransactionState.WAITING) {
      setTimeRemaining(WALLET_CONNECT_SIGNING_TIMEOUT / 1000);

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
  }, [state]);

  // Blinking animation for the wallet message
  useEffect(() => {
    if (state === AppKitTransactionState.WAITING) {
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
  }, [state, blinkOpacity]);

  return (
    <CyDView className='p-[24px]'>
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
          <CyDView className='mb-[20px]'>
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

          {/* Pro tip after 2+ resend attempts */}
          {resendCount >= 2 && (
            <CyDView className='bg-orange-50/10 border border-orange-200 rounded-[12px] p-[12px] mb-[12px]'>
              <CyDView className='flex-row items-start'>
                <CyDMaterialDesignIcons
                  name='lightbulb-on-outline'
                  size={18}
                  className='text-orange-400 mt-[2px]'
                />
                <CyDView className='ml-[8px] flex-1'>
                  <CyDText className='text-[13px] font-bold text-orange-400 mb-[4px]'>
                    {t('APPKIT_TX_PRO_TIP', 'Pro Tip')}
                  </CyDText>
                  <CyDText className='text-[13px] text-orange-400'>
                    {t(
                      'APPKIT_TX_PRO_TIP_DESC',
                      'Close {{walletName}} from your recent apps and try again. This can help refresh the connection.',
                      { walletName },
                    )}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          )}
          {/* Resend button */}
          <CyDTouchView
            className='bg-base400 rounded-[12px] py-[14px] px-[16px] items-center mb-[12px]'
            onPress={onResend}>
            <CyDText className='text-[15px] font-bold text-n0'>
              {t('APPKIT_TX_RESEND_REQUEST', 'Resend Request (if not showing)')}
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
  );
};

// ─── Outer wrapper (manages bottom sheet lifecycle via GlobalBottomSheetProvider) ───

interface AppKitTransactionModalProps {
  isVisible: boolean;
  walletName?: string;
  onResend: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  state: AppKitTransactionState;
  resendCount?: number;
}

export const AppKitTransactionModal: React.FC<AppKitTransactionModalProps> = ({
  isVisible,
  walletName = 'your wallet',
  onResend,
  onCancel,
  onRetry,
  state,
  resendCount = 0,
}) => {
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  // Keep callback refs up-to-date so the effect doesn't re-run on every render
  // when the parent passes new inline arrow functions.
  const onResendRef = useRef(onResend);
  const onCancelRef = useRef(onCancel);
  const onRetryRef = useRef(onRetry);

  useEffect(() => {
    onResendRef.current = onResend;
  }, [onResend]);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    onRetryRef.current = onRetry;
  }, [onRetry]);

  // Stable ref for hideBottomSheet so the unmount-cleanup effect doesn't
  // need it in its dependency array.
  const hideBottomSheetRef = useRef(hideBottomSheet);
  useEffect(() => {
    hideBottomSheetRef.current = hideBottomSheet;
  }, [hideBottomSheet]);

  // Show / update / hide the bottom sheet when meaningful props change.
  useEffect(() => {
    if (isVisible) {
      showBottomSheet({
        id: BOTTOM_SHEET_ID,
        snapPoints: ['50%', '70%', '90%'],
        showHandle: true,
        showCloseButton: false,
        scrollable: false,
        content: (
          <AppKitTransactionContent
            walletName={walletName}
            state={state}
            resendCount={resendCount}
            onResend={() => onResendRef.current()}
            onCancel={() => onCancelRef.current()}
            onRetry={
              onRetryRef.current ? () => onRetryRef.current?.() : undefined
            }
          />
        ),
        onClose: () => {
          onCancelRef.current();
        },
      });
    } else {
      hideBottomSheet(BOTTOM_SHEET_ID);
    }
  }, [
    isVisible,
    state,
    resendCount,
    walletName,
    showBottomSheet,
    hideBottomSheet,
  ]);

  // Clean up on unmount: dismiss the sheet if still open.
  useEffect(() => {
    return () => {
      hideBottomSheetRef.current(BOTTOM_SHEET_ID);
    };
  }, []);

  // This component doesn't render anything — the GlobalBottomSheetProvider
  // renders the bottom sheet at the root of the component tree.
  return null;
};
