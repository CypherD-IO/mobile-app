import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clipboard, Share, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  CyDSafeAreaView,
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDScrollView,
  CyDIcons,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { showToast } from '../../containers/utilities/toastUtility';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
// @ts-expect-error - Type declaration not available for react-native-custom-qr-codes
import { QRCode } from 'react-native-custom-qr-codes';

const { width } = Dimensions.get('window');

interface ReferralData {
  referralCode: string;
  userEarnings: number;
  friendEarnings: number;
  additionalUserEarnings: number;
  additionalFriendEarnings: number;
}

/**
 * QR Code Bottom Sheet Content Component
 * Displays referral QR code with instructions
 */
const QRCodeBottomSheetContent = ({
  referralCode,
  userEarnings,
  friendEarnings,
}: {
  referralCode: string;
  userEarnings: number;
  friendEarnings: number;
}) => {
  return (
    <CyDView className='flex-1 bg-n0 px-4'>
      {/* QR Code Section */}
      <CyDView className='items-center mb-8'>
        <CyDText className='text-n200 text-sm mb-6 text-center'>
          Referral code
        </CyDText>

        {/* QR Code Container */}
        <CyDView className='bg-white rounded-2xl p-6 mb-6'>
          <QRCode
            content={referralCode}
            codeStyle='square'
            outerEyeStyle='square'
            innerEyeStyle='square'
            size={200}
            backgroundColor='white'
            color='black'
          />
        </CyDView>
      </CyDView>

      {/* Instructions Section */}
      <CyDView className='mb-6'>
        {/* Step 1 */}
        <CyDView className='flex-row items-start mb-6'>
          <CyDView className='w-8 h-8 bg-white rounded-full items-center justify-center mr-4 mt-1'>
            <CyDText className='text-black font-bold text-sm'>1</CyDText>
          </CyDView>
          <CyDView className='flex-1'>
            <CyDText className='text-white font-semibold text-lg mb-2'>
              They Join Cypher
            </CyDText>
            <CyDText className='text-n200 text-sm leading-relaxed'>
              When they sign up, complete KYC, and make their{'\n'}
              first card purchase —{' '}
              <CyDText className='text-yellow-400 font-semibold'>
                both of you earn CYPR tokens
              </CyDText>
              .
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Step 2 */}
        <CyDView className='flex-row items-start'>
          <CyDView className='w-8 h-8 bg-white rounded-full items-center justify-center mr-4 mt-1'>
            <CyDText className='text-black font-bold text-sm'>2</CyDText>
          </CyDView>
          <CyDView className='flex-1'>
            <CyDText className='text-white font-semibold text-lg mb-2'>
              Earn Even More When They Follow you
            </CyDText>
            <CyDText className='text-n200 text-sm leading-relaxed'>
              If your friend shops at the same place you &quot;Boosted{'\n'}a
              Merchant&quot; you both unlock bonus rewards.
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export default function Referrals() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { showBottomSheet } = useGlobalBottomSheet();

  // Dummy data - replace with API calls later
  const [referralData] = useState<ReferralData>({
    referralCode: 'UZUMYMW',
    userEarnings: 50.0,
    friendEarnings: 100.0,
    additionalUserEarnings: 30.0,
    additionalFriendEarnings: 70.0,
  });

  /**
   * Handles copying referral code to clipboard
   * Provides user feedback through toast notification
   */
  const handleCopyReferralCode = () => {
    try {
      Clipboard.setString(referralData.referralCode);
      showToast(t('Referral code copied to clipboard!'));
    } catch (error: any) {
      console.error('Error copying referral code:', error);
      showToast(t('Failed to copy referral code'));
    }
  };

  /**
   * Handles sharing referral invite link
   * Opens native share dialog with referral information
   */
  const handleInviteLink = () => {
    const shareMessage = `Join me on Cypher Wallet and use my referral code: ${referralData.referralCode}. We both earn Cypher tokens when you make your first purchase!`;

    Share.share({
      message: shareMessage,
      title: 'Join Cypher Wallet',
    }).catch((error: any) => {
      console.error('Error sharing invite link:', error);
      showToast(t('Failed to share invite link'));
    });
  };

  /**
   * Handles QR code generation and display
   * Shows QR code in bottom sheet modal
   */
  const handleQRCode = () => {
    console.log(
      'Showing QR Code for referral code:',
      referralData.referralCode,
    );

    showBottomSheet({
      id: 'referral-qr-code',
      title: 'QR Code',
      snapPoints: ['75%', '90%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <QRCodeBottomSheetContent
          referralCode={referralData.referralCode}
          userEarnings={referralData.userEarnings}
          friendEarnings={referralData.friendEarnings}
        />
      ),
      onClose: () => {
        console.log('QR Code bottom sheet closed');
      },
    });
  };

  /**
   * Handles navigation to add referral code screen
   * For users who want to enter someone else's referral code
   */
  const handleAddReferralCode = () => {
    // TODO: Navigate to enter referral code screen
    console.log('Navigate to enter referral code screen');
    showToast(t('Enter referral code feature coming soon!'));
  };

  /**
   * Handles back navigation
   */
  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Handles close action
   */
  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Header */}
      <CyDView className='flex-row justify-between items-center px-4 py-3 bg-n0'>
        <CyDTouchView onPress={handleBack} className='p-2'>
          <CyDIcons name='arrow-left' size={24} className='text-n200' />
        </CyDTouchView>

        <CyDText className='text-white text-lg font-semibold'>
          Invite friends
        </CyDText>

        <CyDTouchView onPress={handleClose} className='p-2'>
          <CyDIcons name='close' size={24} className='text-n200' />
        </CyDTouchView>
      </CyDView>

      <CyDScrollView className='flex-1'>
        {/* Hero Image Section */}
        <CyDView className='px-4 pt-4 pb-6'>
          <CyDView className='rounded-2xl overflow-hidden'>
            <CyDImage
              source={AppImages.REFERRAL_HERO_IMAGE}
              className='w-full h-[200px]'
              resizeMode='cover'
            />
          </CyDView>
        </CyDView>

        {/* Title and Description */}
        <CyDView className='px-4 pb-6'>
          <CyDText className='text-white text-2xl font-bold text-center mb-3'>
            Earn Cypher tokens on referrals
          </CyDText>
          <CyDText className='text-n200 text-base text-center leading-relaxed'>
            when your invitee signs up and makes a purchase{'\n'}
            at your favorite merchant.
          </CyDText>
        </CyDView>

        {/* Referral Code Section */}
        <CyDView className='mx-4 mb-6 bg-n20 rounded-2xl p-6'>
          <CyDText className='text-n200 text-[12px] text-center mb-2'>
            Referral code
          </CyDText>
          <CyDView className='flex-row items-center justify-center'>
            <CyDText className='text-white text-[30px] font-bold tracking-wider mr-3'>
              {referralData.referralCode}
            </CyDText>
            <CyDTouchView onPress={handleCopyReferralCode} className='p-2'>
              <CyDIcons name='copy' size={20} className='text-n200' />
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row gap-3 px-4 mb-[34px]'>
          <CyDTouchView
            onPress={handleInviteLink}
            className='flex-1 bg-white rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-black font-semibold'>Invite link</CyDText>
            <CyDMaterialDesignIcons
              name='link-variant'
              size={18}
              className='text-n0'
            />
          </CyDTouchView>

          <CyDTouchView
            onPress={handleQRCode}
            className='flex-1 bg-white rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-black font-semibold'>QR Code</CyDText>
            <CyDMaterialDesignIcons
              name='qrcode-scan'
              size={18}
              className='text-n0'
            />
          </CyDTouchView>
        </CyDView>

        {/* How it works Section */}
        <CyDView className='mx-4 mb-6 bg-base40 rounded-[12px] py-4'>
          <CyDView className='flex-row items-center mb-4 bg-n0 rounded-full p-1 px-2 self-start mx-4'>
            <CyDText className='text-white font-semibold mr-[2px]'>💡</CyDText>
            <CyDText className='text-white font-semibold'>
              How it works?
            </CyDText>
          </CyDView>

          {/* Step 1 */}
          <CyDView className='flex-row items-start mb-4 px-4'>
            <CyDView className='flex-row items-center justify-center mr-3 h-8 w-8 bg-n0 rounded-full'>
              <CyDText className='text-white font-semibold text-[12px]'>
                🙋🏻‍♂️
              </CyDText>
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='text-white font-semibold mb-1'>
                Share Your Invite Link
              </CyDText>
              <CyDText className='text-n200 text-sm'>
                Send your unique link to friends and family.
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className='h-[1px] bg-n40 mb-4' />

          {/* Step 2 */}
          <CyDView className='flex-row items-start px-4'>
            <CyDView className='flex-row items-center justify-center mr-3 h-8 w-8 bg-n0 rounded-full'>
              <CyDText className='text-white font-semibold text-[12px]'>
                💸
              </CyDText>
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='text-white font-semibold mb-1'>
                They Join Cypher
              </CyDText>
              <CyDText className='text-n200 text-sm mb-3'>
                When they sign up, complete KYC, and make their{'\n'}
                first card purchase — both of you earn CYPR tokens.
              </CyDText>

              {/* Earnings Display */}
              <CyDView className='flex-col gap-x-[12px]'>
                <CyDView className='flex-row items-center gap-x-2'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    You&apos;ll Earn:
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-2'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white font-semibold'>
                      {referralData.userEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView className='flex-row items-center gap-x-2'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    They Earn:
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-2'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white font-semibold'>
                      {referralData.friendEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Additional Earnings Section */}
        <CyDText className='text-white font-semibold mb-4'>
          Additional Earnings
        </CyDText>
        <CyDView className='mx-4 mb-6 bg-base40 rounded-[12px] py-4'>
          <CyDView className='flex-row items-start px-4'>
            <CyDView className='flex-row items-center justify-center mr-3 h-8 w-8 bg-n0 rounded-full'>
              <CyDText className='text-white font-semibold text-[12px]'>
                🛍️
              </CyDText>
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='text-white font-semibold mb-1'>
                Earn Even More When They Follow You
              </CyDText>
              <CyDText className='text-n200 text-[14px] mb-4'>
                If your friend shops at the same place you &quot;Boosted{'\n'}a
                Merchant&quot; you both unlock bonus rewards.
              </CyDText>

              <CyDText className='text-n200 text-[14px] mb-2'>
                i.e If your friend spend $100 at Walmart
              </CyDText>

              {/* Additional Earnings Display */}
              <CyDView className='flex-col gap-x-[12px]'>
                <CyDView className='flex-row items-center gap-x-2'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    You&apos;ll Earn:
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-2'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white font-semibold'>
                      {referralData.userEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView className='flex-row items-center gap-x-2'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    They Earn:
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-2'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white font-semibold'>
                      {referralData.friendEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Footer Link */}
        <CyDView className='mx-4 mb-8'>
          <CyDTouchView onPress={handleAddReferralCode}>
            <CyDText className='text-blue-400 text-center underline'>
              I want to add my referral code
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
