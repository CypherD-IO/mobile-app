import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, ActivityIndicator } from 'react-native';
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
import useAxios from '../../core/HttpRequest';
import { get } from 'lodash';

interface ExclusiveOfferModalProps {
  isVisible: boolean;
  onSeeDetails?: () => void;
  rewardAmount?: number; // dynamic reward amount
  onClickGotIt: () => Promise<void>;
}

const ExclusiveOfferModal: React.FC<ExclusiveOfferModalProps> = ({
  isVisible,
  onClickGotIt,
  onSeeDetails,
  rewardAmount = 0,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ---------------- API HOOKS ------------------
  const { getWithoutAuth } = useAxios();

  // ---------------- TIMER STATE ----------------
  // totalSeconds holds the fetched time limit (defaults to 59 mins)
  const DEFAULT_LIMIT_SECONDS = 60 * 60;
  const [totalSeconds, setTotalSeconds] = useState<number>(
    DEFAULT_LIMIT_SECONDS,
  );

  // Handle modal show analytics
  useEffect(() => {
    if (isVisible) {
      void logAnalyticsToFirebase(AnalyticEvent.EXCLUSIVE_OFFER_MODAL_VIEWED, {
        offer_type: 'signup_reward',
        reward_amount: rewardAmount,
        currency: 'CYPR',
      });
    }
  }, [isVisible]);

  /**
   * Fetches onboarding rewards info to get the time limit.
   * Logs errors with verbose comments as per repo standards.
   */
  const fetchRewardsInfo = async () => {
    try {
      const res = await getWithoutAuth('/v1/cards/onboarding-rewards/info');
      const { data, isError } = res;

      console.log('data : ', data.rewardStages.kycPending.timeLimit);

      if (!isError) {
        // Extract time limit safely: rewardStages.kycPending.timeLimit (in seconds)
        const timeLimitSeconds = get(
          data,
          ['rewardStages', 'kycPending', 'timeLimit'],
          DEFAULT_LIMIT_SECONDS,
        );

        if (typeof timeLimitSeconds === 'number') {
          setTotalSeconds(timeLimitSeconds);
        }
      }
    } catch (error) {
      console.error('Failed to fetch onboarding rewards info:', error);
    }
  };

  useEffect(() => {
    if (isVisible) {
      void fetchRewardsInfo();
    }
  }, [isVisible, getWithoutAuth]);

  const handleGotIt = async () => {
    try {
      setIsLoading(true);

      void logAnalyticsToFirebase(
        AnalyticEvent.EXCLUSIVE_OFFER_GOT_IT_CLICKED,
        {
          offer_type: 'signup_reward',
          reward_amount: rewardAmount,
          currency: 'CYPR',
        },
      );

      await onClickGotIt();
    } catch (error) {
      console.error('Error in handleGotIt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Utility to convert seconds to formatted string "MM:MSS".
   */
  const formatTime = (secondsRemaining: number) => {
    const minutes = Math.floor(secondsRemaining / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
    return `${minutes}M:${seconds}S`;
  };

  return (
    <Modal
      isVisible={isVisible}
      // Intentionally disable outside touches & back button to force explicit action
      onBackdropPress={() => {
        // Disabled backdrop press – no action.
      }}
      onBackButtonPress={() => {
        // Disabled back button – no action.
      }}
      backdropOpacity={0.9}
      useNativeDriver
      animationIn='slideInUp'
      animationOut='slideOutDown'
      style={styles.modalStyle}
      hideModalContentWhileAnimating
      useNativeDriverForBackdrop
      statusBarTranslucent>
      {/* Background with blurred token imagery */}
      <CyDView className='flex-1 relative mt-[-400px]'>
        {/* Blurred background tokens */}

        {/* Modal Content with extreme curve */}
        <CyDView
          className='absolute bottom-0 left-0 right-0 bg-[#202020] px-[24px] pt-[80px] pb-[20px] items-center min-h-[60vh]'
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
            <CyDText className='text-white text-[48px] font-bold'>
              {rewardAmount}
            </CyDText>
          </CyDView>

          {/* As Signup Reward */}
          <CyDText className='text-n200 text-[16px] font-medium mb-[16px]'>
            As Signup Reward
          </CyDText>

          {/* Description */}
          <CyDText className='text-white text-[16px] text-center mb-[20px] leading-[22px] px-[16px]'>
            Join the Cypher Card today and enjoy a bonus of{'\n'}
            {rewardAmount} $CYPR if you sign up within
          </CyDText>

          {/* Countdown Timer */}
          <CyDView className='bg-[#333333] rounded-full px-[16px] py-[8px] mb-[24px] flex-row items-center'>
            <CyDText className='text-white text-[16px] font-medium'>
              {`🕛 ${formatTime(totalSeconds)}`}
            </CyDText>
          </CyDView>

          {/* Got It Button with checkmark */}
          <CyDTouchView
            onPress={() => {
              if (!isLoading) {
                void handleGotIt();
              }
            }}
            className={`bg-white rounded-full py-[16px] px-[24px] w-[364px] flex-row items-center justify-center `}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size='small' color='#000000' />
            ) : (
              <>
                <CyDMaterialDesignIcons
                  name='check'
                  size={24}
                  className='text-black mr-[8px]'
                />
                <CyDText className='text-black text-[18px] font-bold'>
                  {'Got it'}
                </CyDText>
              </>
            )}
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
