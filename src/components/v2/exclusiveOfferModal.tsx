import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { useTranslation } from 'react-i18next';
import { logAnalyticsToFirebase, AnalyticEvent } from '../../core/analytics';

interface ExclusiveOfferModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSeeDetails?: () => void;
  initialCountdownMinutes?: number; // Default to 59 minutes
}

const ExclusiveOfferModal: React.FC<ExclusiveOfferModalProps> = ({
  isVisible,
  onClose,
  onSeeDetails,
  initialCountdownMinutes = 59,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({
    minutes: initialCountdownMinutes,
    seconds: 29,
  });

  // Countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isVisible) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => {
          const { minutes, seconds } = prevTime;

          if (minutes === 0 && seconds === 0) {
            // Timer has ended
            clearInterval(interval);
            onClose();
            return { minutes: 0, seconds: 0 };
          }

          if (seconds === 0) {
            return { minutes: minutes - 1, seconds: 59 };
          } else {
            return { minutes, seconds: seconds - 1 };
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isVisible, onClose]);

  // Format time for display
  const formatTime = (minutes: number, seconds: number) => {
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    return `${formattedMinutes}M:${formattedSeconds}S`;
  };

  // Handle modal show analytics
  useEffect(() => {
    if (isVisible) {
      void logAnalyticsToFirebase(AnalyticEvent.EXCLUSIVE_OFFER_MODAL_VIEWED, {
        offer_type: 'signup_reward',
        reward_amount: 100,
        currency: 'CYPR',
      });
    }
  }, [isVisible]);

  const handleSeeDetails = () => {
    void logAnalyticsToFirebase(
      AnalyticEvent.EXCLUSIVE_OFFER_SEE_DETAILS_CLICKED,
      {
        offer_type: 'signup_reward',
        reward_amount: 100,
        currency: 'CYPR',
      },
    );

    if (onSeeDetails) {
      onSeeDetails();
    }
  };

  const handleGotIt = () => {
    void logAnalyticsToFirebase(AnalyticEvent.EXCLUSIVE_OFFER_GOT_IT_CLICKED, {
      offer_type: 'signup_reward',
      reward_amount: 100,
      currency: 'CYPR',
    });

    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.9}
      useNativeDriver
      animationIn='slideInUp'
      animationOut='slideOutDown'
      style={styles.modalStyle}>
      {/* Background with blurred token imagery */}
      <CyDView className='flex-1 relative mt-[-400px]'>
        {/* Blurred background tokens */}

        {/* Modal Content with extreme curve */}
        <CyDView
          className='absolute bottom-0 left-0 right-0 bg-[#202020] px-[24px] pt-[80px] pb-[40px] items-center min-h-[60vh]'
          style={styles.modalContent}>
          {/* Percentage Badge - positioned at the top of semicircle */}
          <CyDView className='absolute -top-[35px] self-center z-10'>
            <CyDImage
              source={AppImages.PERCENTAGE_ICON_RED_BG}
              className='w-[72px] h-[72px]'
              resizeMode='contain'
            />
          </CyDView>

          {/* Title */}
          <CyDText className='text-white text-[24px] font-bold text-center mb-[16px]'>
            Exclusive offer Just for you
          </CyDText>

          {/* Reward Amount with Token */}
          <CyDView className='flex-row items-center justify-center mb-[4px]'>
            <CyDImage
              source={AppImages.CYPR_TOKEN}
              className='w-[32px] h-[32px] mr-[8px]'
              resizeMode='contain'
            />
            <CyDText className='text-white text-[48px] font-bold'>100</CyDText>
          </CyDView>

          {/* As Signup Reward */}
          <CyDText className='text-[#6B788E] text-[16px] font-medium mb-[16px]'>
            As Signup Reward
          </CyDText>

          {/* Description */}
          <CyDText className='text-white text-[16px] text-center mb-[20px] leading-[22px] px-[16px]'>
            Join the Cypher Card today and enjoy a bonus of{'\n'}
            100 $CYPR within if you sign up
          </CyDText>

          {/* Countdown Timer */}
          <CyDView className='bg-[#333333] rounded-full px-[16px] py-[8px] mb-[20px] flex-row items-center'>
            <CyDText className='text-white text-[16px] font-medium'>
              🕘 {formatTime(timeLeft.minutes, timeLeft.seconds)}
            </CyDText>
          </CyDView>

          {/* See Details Button */}
          <CyDTouchView onPress={handleSeeDetails} className='mb-[24px]'>
            <CyDText className='text-white text-[18px] font-medium'>
              See details
            </CyDText>
          </CyDTouchView>

          {/* Got It Button with checkmark */}
          <CyDTouchView
            onPress={handleGotIt}
            className='bg-white rounded-full py-[16px] px-[24px] w-[364px] flex-row items-center justify-center'>
            <CyDMaterialDesignIcons
              name='check'
              size={24}
              className='text-black mr-[8px]'
            />
            <CyDText className='text-black text-[18px] font-bold'>
              Got it
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalStyle: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 1500,
    borderTopRightRadius: 1500,
    marginHorizontal: -350,
  },
});

export default ExclusiveOfferModal;
