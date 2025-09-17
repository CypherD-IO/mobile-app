import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { screenTitle } from '../../constants';
import AppImages from '../../../assets/images/appImages';
import { logAnalyticsToFirebase } from '../../core/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IEpochInfo {
  epochNumber: number; // Current epoch number (starts from 1)
  startTime: string; // ISO 8601 timestamp of epoch start
  endTime: string; // ISO 8601 timestamp of epoch end
}

/**
 * Check if the rewards epoch modal should be shown based on dismissal timestamp
 */
export const shouldShowRewardsEpochModal = async (): Promise<boolean> => {
  try {
    // Check if permanently dismissed
    const permanentlyDismissed = await AsyncStorage.getItem(
      'rewards_epoch_modal_permanently_dismissed',
    );

    if (permanentlyDismissed === 'true') {
      return false; // Permanently dismissed, never show again
    }

    // Check temporary dismissal timestamp
    const dismissedUntil = await AsyncStorage.getItem(
      'rewards_epoch_modal_dismissed_until',
    );

    if (!dismissedUntil) {
      return true; // No dismissal timestamp stored, show modal
    }

    const currentTime = new Date().getTime();
    const dismissedUntilTime = parseInt(dismissedUntil, 10);

    // If current time is greater than dismissal timestamp, show modal
    return currentTime > dismissedUntilTime;
  } catch (error) {
    console.warn('Failed to check modal dismissal timestamp:', error);
    return true; // Default to showing modal if there's an error
  }
};

interface RewardsEpochModalProps {
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  epochInfo: IEpochInfo | null;
}

const RewardsEpochModal: React.FC<RewardsEpochModalProps> = ({
  isModalVisible,
  setModalVisible,
  epochInfo,
}) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  /**
   * Calculate days remaining until epoch ends
   */
  const getDaysRemaining = (): number => {
    if (!epochInfo?.endTime) return 0;

    const now = new Date();
    const endDate = new Date(epochInfo.endTime);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  const handleLearnMore = (): void => {
    // Analytics: learn more clicked
    void logAnalyticsToFirebase('rewards_epoch_modal_learn_more_click', {
      epochNumber: epochInfo?.epochNumber ?? 0,
      daysRemaining: getDaysRemaining(),
    });

    const redirectURI = 'https://app.cypherhq.io/#/rewards/leaderboard';
    navigation.navigate(screenTitle.OPTIONS, {
      screen: screenTitle.SOCIAL_MEDIA_SCREEN,
      params: {
        title: 'Rewards Leaderboard',
        uri: redirectURI,
      },
    });

    setModalVisible(false);
  };

  const handleClose = (): void => {
    void (async () => {
      try {
        if (dontShowAgain) {
          // Store permanent dismissal flag
          await AsyncStorage.setItem(
            'rewards_epoch_modal_permanently_dismissed',
            'true',
          );
        } else {
          // Store timestamp + 2 days in async storage
          const currentTime = new Date().getTime();
          const twoDaysLater = currentTime + 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
          await AsyncStorage.setItem(
            'rewards_epoch_modal_dismissed_until',
            twoDaysLater.toString(),
          );
        }
      } catch (error) {
        console.warn('Failed to store modal dismissal preference:', error);
      }

      // Analytics: modal dismissed
      void logAnalyticsToFirebase('rewards_epoch_modal_dismissed', {
        epochNumber: epochInfo?.epochNumber ?? 0,
        daysRemaining: getDaysRemaining(),
        permanentlyDismissed: dontShowAgain,
      });

      setModalVisible(false);
    })();
  };

  const daysRemaining = getDaysRemaining();

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={handleClose}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalContainer}>
      <CyDView className='bg-n0 w-full px-6 py-6 pb-20 rounded-t-[24px] items-center'>
        {/* Reward icon */}
        <CyDView className='mt-[-112px]'>
          <CyDImage source={AppImages.TREASURE_CHEST} className='w-48 h-48' />
        </CyDView>

        {/* Main title */}
        <CyDText className='text-[20px] font-bold text-center mb-4'>
          Earn USDC cashback on every spend
        </CyDText>

        {/* Subtitle */}
        <CyDText className='text-n200 text-[14px] text-center mb-6 leading-5'>
          Your rewards are earned in testnet $CYPR which can be claimed in USDC.{' '}
          <CyDText className='font-bold'>$25,000 USDC</CyDText> up for claim
        </CyDText>

        {/* Days remaining section */}
        {daysRemaining > 0 && (
          <CyDView className='bg-n20 rounded-lg px-4 py-3 mb-6 w-full'>
            <CyDView className='flex-row items-center justify-center'>
              <CyDText className='text-n200 text-[14px] font-semibold'>
                Only {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                for Reward distribution
              </CyDText>
            </CyDView>
          </CyDView>
        )}

        {/* Learn more button */}
        <CyDView className='w-full'>
          <Button
            title='Learn more'
            onPress={handleLearnMore}
            style='h-[48px] rounded-[8px] mb-3'
            titleStyle='text-[16px] font-semibold'
            type={ButtonType.PRIMARY}
          />

          {/* Close button */}
          <Button
            title='Maybe later'
            onPress={handleClose}
            paddingY={14}
            style='rounded-[8px] mb-4'
            titleStyle='text-[16px] font-medium'
            type={ButtonType.SECONDARY}
          />

          {/* Don't show again checkbox */}
          <CyDTouchView
            className='flex-row items-center justify-center'
            onPress={() => setDontShowAgain(!dontShowAgain)}>
            <CyDView
              className={`w-5 h-5 border-2 rounded mr-3 items-center justify-center ${
                dontShowAgain ? 'bg-blue-500 border-blue-500' : 'border-n200'
              }`}>
              {dontShowAgain && (
                <CyDText className='text-white text-[12px] font-bold'>
                  ✓
                </CyDText>
              )}
            </CyDView>
            <CyDText className='text-n200 text-[14px]'>
              Please don&apos;t show this reminder again
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
});

export default RewardsEpochModal;
