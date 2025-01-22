import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import clsx from 'clsx';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import { useGlobalModalContext } from './GlobalModal';
import axios from 'axios';

const SlideToConfirmV2 = ({
  approveUrl,
  closeModal,
}: {
  approveUrl: string;
  closeModal: () => void;
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [isError, setIsError] = useState<boolean | null>(null);
  const { showModal, hideModal } = useGlobalModalContext();

  const windowWidth = Dimensions.get('window').width;
  const SLIDER_WIDTH = windowWidth - 100;
  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  const [swipeStatus, setSwipeStatus] = useState('initial');

  const handleAccept = async () => {
    setAcceptLoading(true);
    setSwipeStatus('swiping');
    try {
      await axios.get(approveUrl);
      setIsError(false);
      setConfirmed(true);
      setSwipeStatus('approved');
      closeModal();
    } catch (error) {
      setIsError(true);
      setConfirmed(true);
      setSwipeStatus('failed');
      setTimeout(() => {
        closeModal();
      }, 500);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_APPROVAL_FAILED'),
          description:
            error?.message ?? t('TRANSACTION_APPROVAL_FAILED_REASON_NA'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    } finally {
      setAcceptLoading(false);
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate(event => {
      const newValue = Math.max(0, Math.min(event.translationX, SLIDER_WIDTH));
      translateX.value = newValue;
      isSwiping.value = true;
      runOnJS(setSwipeStatus)('swiping');
    })
    .onEnd(() => {
      if (translateX.value > SLIDER_WIDTH * 0.9) {
        translateX.value = withSpring(SLIDER_WIDTH);
        runOnJS(handleAccept)();
      } else {
        translateX.value = withSpring(0);
        runOnJS(setSwipeStatus)('initial');
      }
      isSwiping.value = false;
    });

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    width: translateX.value,
    backgroundColor: '#333',
  }));

  return (
    <CyDView className='w-full bg-[#333] h-[60px] rounded-full overflow-hidden'>
      <GestureHandlerRootView>
        <View pointerEvents={confirmed ? 'none' : 'auto'} className='w-full'>
          <CyDView className='w-full absolute h-[60px] justify-center z-0'>
            <Text className='text-white font-semibold text-center'>
              {!confirmed && 'Approving...'}
              {confirmed && !isError && 'Approved'}
              {confirmed && isError && 'Approval Failed'}
            </Text>
          </CyDView>

          <GestureDetector gesture={gesture}>
            <Animated.View style={[sliderStyle, { zIndex: 1 }]}>
              <CyDView className='w-full h-[60px] bg-[#333] justify-center flex-row items-center px-[5px]'>
                <CyDView
                  className={clsx(
                    'w-[50px] h-[50px] bg-[#f0a500] rounded-full justify-center items-center',
                    confirmed && !isError && 'bg-green-600',
                    confirmed && isError && 'bg-red-600',
                  )}>
                  {acceptLoading ? (
                    <ActivityIndicator color='white' />
                  ) : (
                    <CyDMaterialDesignIcons
                      name={
                        confirmed
                          ? isError
                            ? 'close'
                            : 'check'
                          : 'chevron-right'
                      }
                      size={20}
                      className={clsx('text-base400', {
                        'text-white': isError,
                      })}
                    />
                  )}
                </CyDView>
                <Animated.Text
                  className={clsx(
                    'text-white font-semibold flex-1 text-center ml-[-50px]',
                  )}>
                  {swipeStatus === 'initial' && 'Swipe to confirm'}
                </Animated.Text>
              </CyDView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </CyDView>
  );
};

export default SlideToConfirmV2;
