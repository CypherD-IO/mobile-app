import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, ScrollView } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDTouchableWithoutFeedback,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import AppImages from '../../../assets/images/appImages';
import { ButtonType } from '../../constants/enum';
import { t } from 'i18next';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

/**
 * Interface for referral bonus data (for future API integration)
 */
interface ReferralBonusData {
  rewardMultiplier: string;
  expiryDate: string;
  merchants: Array<{
    name: string;
    logo: any;
  }>;
}

/**
 * Props interface for BoostedRewardInfoModal
 */
interface BoostedRewardInfoModalProps {
  isVisible: boolean;
  onContinue: () => void;
  votedCandidates?: Array<{ name: string; logo: any }>;
}

/**
 * BoostedRewardInfoModal - A modal displaying referral bonus information
 *
 * Features:
 * - Shows "You've Been Referred" success message
 * - Displays boosted reward information with merchant details
 * - Includes expiry date badge
 * - API integration placeholder for future dynamic content
 * - Matches exact design from provided screenshot
 *
 * @param isVisible - Controls modal visibility
 * @param onContinue - Callback function when Continue button is pressed
 */
const BoostedRewardInfoModal: React.FC<BoostedRewardInfoModalProps> = ({
  isVisible,
  onContinue,
  votedCandidates = [],
}) => {
  // State for bonus data (will be populated by API call in future)
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  /**
   * Handle continue button press
   */
  const handleContinue = () => {
    onContinue();
  };

  const stylesList = StyleSheet.create({
    merchantList: {
      height: 180, // Adjusted height for typical merchant list
      backgroundColor: 'transparent',
    },
    merchantListContent: {
      paddingBottom: 12, // Reduced padding since we have fewer items typically
      minHeight: 160, // Ensure content is taller than container for scrolling
    },
  });

  // Calculate if content should be scrollable
  const shouldShowScrollIndicator = votedCandidates.length > 2;

  return (
    <CyDModalLayout
      isModalVisible={isVisible}
      style={styles.modalLayout}
      backdropOpacity={0.8}
      animationIn='slideInUp'
      animationOut='slideOutDown'
      propagateSwipe={true}
      swipeDirection={[]}
      disableBackDropPress={false}
      setModalVisible={() => {
        // Only dismissible via Continue button - no action
      }}>
      <CyDView
        style={styles.modalContainer}
        className='bg-n0 rounded-t-[24px] pb-[32px]'>
        {/* Success Icon - Positioned to be half outside the modal */}

        <CyDView className='absolute -top-[47px] self-center z-10'>
          <CyDImage
            source={
              isDarkMode
                ? AppImages.GREEN_CHECK_MARK_BLACK_BORDER
                : AppImages.GREEN_CHECK_MARK_WHITE_BORDER
            }
            className='w-[95px] h-[95px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Modal Content */}
        <CyDView className='px-6 pt-12 pb-[12px]'>
          {/* Title */}
          <CyDText className='text-[20px] font-bold text-center mb-[10px]'>
            You&apos;ve been referred
          </CyDText>

          {votedCandidates.length > 0 ? (
            <>
              {/* Subtitle */}
              <CyDText className='text-[14px] text-center mb-8 leading-6'>
                Here are your amazing referred bonus
              </CyDText>
              {/* Referral Bonus Card */}
              <CyDText className='text-[14px] mb-[6px] font-medium'>
                Referral Bonus
              </CyDText>
              <CyDView className='bg-base40 rounded-[12px] p-[12px] w-full mb-[30px]'>
                {/* Card Header */}
                <CyDView className='flex-row justify-between items-start gap-x-[8px] mb-[16px]'>
                  <CyDView className='flex-1'>
                    <CyDText className='text-n70 text-[18px] font-medium'>
                      Earn additional rewards by spending at
                    </CyDText>
                    {/* <CyDText className='font-nord font-bold'>
                      {bonusData?.rewardMultiplier ?? '4.5x'} Extra rewards
                    </CyDText> */}
                  </CyDView>

                  {/* Expiry Badge */}
                  {/* <CyDView className='bg-red400 rounded-full px-3 py-1'>
                    <CyDText className='text-white text-[12px] font-semibold'>
                      Expires in {bonusData?.expiryDate ?? 'June 29'}
                    </CyDText>
                  </CyDView> */}
                </CyDView>

                <CyDView className='h-[1px] bg-n40 w-full ml-[-12px] mr-[-12px]' />

                {/* Merchants Section */}
                <CyDView className='mt-[16px]'>
                  {/* <CyDText className='text-n70 text-[14px] mb-[12px] font-medium'>
                    On spends at
                  </CyDText> */}

                  {/* Enhanced Merchant List with Better Touch Handling */}
                  {/* Community-Proven Modal Scroll Solution */}
                  <CyDTouchableWithoutFeedback>
                    <CyDView style={stylesList.merchantList}>
                      <ScrollView
                        showsVerticalScrollIndicator={shouldShowScrollIndicator}
                        scrollEnabled={true}
                        bounces={true}
                        contentContainerStyle={stylesList.merchantListContent}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps='always'
                        scrollEventThrottle={16}
                        onScrollBeginDrag={() => {
                          console.log(
                            `Merchant list scrolling: ${votedCandidates.length} items`,
                          );
                        }}
                        onScrollEndDrag={() => {
                          console.log('Merchant list scroll ended');
                        }}>
                        {votedCandidates.map((item, index) => (
                          <CyDTouchableWithoutFeedback key={index}>
                            <CyDView className='flex-row items-center mb-[12px]'>
                              <CyDView className='w-10 h-10 rounded-full overflow-hidden bg-n0 mr-4'>
                                <CyDImage
                                  source={
                                    typeof item.logo === 'string'
                                      ? { uri: item.logo }
                                      : item.logo
                                  }
                                  className='w-full h-full'
                                  resizeMode='cover'
                                />
                              </CyDView>
                              <CyDText className='text-[18px]'>
                                {item.name}
                              </CyDText>
                            </CyDView>
                          </CyDTouchableWithoutFeedback>
                        ))}
                      </ScrollView>
                    </CyDView>
                  </CyDTouchableWithoutFeedback>
                </CyDView>
              </CyDView>
            </>
          ) : (
            <CyDText className='text-[14px] text-center mb-8 leading-6'>
              Referral code is applied successfully.
            </CyDText>
          )}

          {/* Continue Button */}
          <Button
            title='Continue'
            onPress={handleContinue}
            type={ButtonType.PRIMARY}
            style='w-full  rounded-full'
            titleStyle='text-[18px] font-bold'
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: '60%',
  },
});

export default BoostedRewardInfoModal;
