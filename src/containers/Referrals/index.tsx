import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clipboard,
  Share,
  Dimensions,
  Platform,
  useColorScheme,
  StyleSheet,
} from 'react-native';
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
import { BlurView } from '@react-native-community/blur';
import { Theme, useTheme } from '../../reducers/themeReducer';
import useAxios from '../../core/HttpRequest';
import NewReferralCodeModal from '../../components/v2/newReferralCodeModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';

const { width } = Dimensions.get('window');

interface ReferralData {
  referralCode: string;
  userEarnings: number;
  friendEarnings: number;
  additionalUserEarnings: number;
  additionalFriendEarnings: number;
}

// Extracted styles to avoid inline-style linter warnings
const styles = StyleSheet.create({
  blurAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

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
    <CyDView className='flex-1 bg-n20 px-4'>
      {/* QR Code Section */}
      <CyDView className='items-center mb-8'>
        <CyDText className='text-n200 text-sm mb-4 text-center'>
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
            <CyDText className='font-semibold text-lg mb-2'>
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
            <CyDText className='font-semibold text-lg mb-2'>
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

/**
 * Bottom-sheet content component that shows **all** referral codes with a copy-to-clipboard action.
 */

export default function Referrals() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { showBottomSheet } = useGlobalBottomSheet();
  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  /* ------------------------------------------------------------------------ */
  /*                       Referral Data (fetched from API)                    */
  /* ------------------------------------------------------------------------ */
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [isReferralCodesLoading, setIsReferralCodesLoading] = useState(false);

  // Keep existing earnings placeholders – can be replaced with API later.
  const [referralData] = useState<ReferralData>({
    referralCode: '',
    userEarnings: 50.0,
    friendEarnings: 100.0,
    additionalUserEarnings: 30.0,
    additionalFriendEarnings: 70.0,
  });

  // New-code modal state
  const [isNewCodeModalVisible, setIsNewCodeModalVisible] = useState(false);
  const [code, setCode] = useState('');
  const [createReferralCodeLoading, setCreateReferralCodeLoading] =
    useState(false);

  /**
   * Fetch referral codes list from backend.
   */
  const fetchReferralCodes = async () => {
    setIsReferralCodesLoading(true);
    const response = await getWithAuth('/v1/cards/referral-v2');

    setIsReferralCodesLoading(false);

    setReferralCodes(response.data.referralCodes); // Filter out any undefined/null values
  };

  useEffect(() => {
    void fetchReferralCodes();
  }, []);

  /**
   * Create new referral code through backend then refresh list.
   */
  const createReferralCode = async (payload: {
    utm_source?: string;
    utm_campaign?: string;
    influencer?: string;
    utm_medium: string;
  }) => {
    setIsNewCodeModalVisible(false);
    setCreateReferralCodeLoading(true);

    const response = await postWithAuth('/v1/cards/referral-v2', {
      referralCode: code,
      ...payload,
    });

    setCreateReferralCodeLoading(false);

    if (!response.isError) {
      showToast(t('REFERRAL_CODE_CREATED', 'Referral code created'));
      void fetchReferralCodes();
    } else {
      showToast(
        response.error?.message ??
          t('REFERRAL_CODE_CREATION_FAILED', 'Failed to create referral code'),
        'error',
      );
    }
  };

  /**
   * Handles copying referral code to clipboard
   * Provides user feedback through toast notification
   */
  const handleCopyReferralCode = () => {
    try {
      const codeToCopy = referralCodes[0];
      if (!codeToCopy) {
        showToast(t('No referral code available'));
        return;
      }
      Clipboard.setString(codeToCopy);
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
    const codeToShare = referralCodes[0];
    if (!codeToShare) {
      showToast(t('No referral code available'));
      return;
    }

    const sharelink = `https://app.cypherhq.io/card/referral/${codeToShare}`;
    Clipboard.setString(sharelink);
    showToast(t('Referral code copied to clipboard!'));
  };

  /**
   * Handles QR code generation and display
   * Shows QR code in bottom sheet modal
   */
  const handleQRCode = () => {
    const codeForQR = referralCodes[0];
    if (!codeForQR) {
      showToast(t('No referral code available'));
      return;
    }

    showBottomSheet({
      id: 'referral-qr-code',
      snapPoints: ['70%', Platform.OS === 'android' ? '100%' : '90%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#161616' : '#F5F6F7',
      content: (
        <QRCodeBottomSheetContent
          referralCode={codeForQR}
          userEarnings={referralData.userEarnings}
          friendEarnings={referralData.friendEarnings}
        />
      ),
    });
  };

  /**
   * Handles navigation to add referral code screen
   * For users who want to enter someone else's referral code
   */
  const handleAddReferralCode = () => {
    // Open the "New Code" modal so user can create their own referral code.
    setIsNewCodeModalVisible(true);
  };

  /**
   * Navigates to the All Referral Codes screen
   */
  const handleViewAllReferralCodes = () => {
    (navigation as any).navigate(screenTitle.ALL_REFERRAL_CODES, {
      referralCodes,
    });
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
      {/* Background image */}
      <CyDImage
        source={isDarkMode ? AppImages.REWARD_BG : AppImages.REWARD_BG_LIGHT}
        resizeMode='cover'
        className='absolute top-0 left-0 w-full h-full'
      />
      {/* Grey translucent tint with blur */}
      <BlurView
        style={styles.blurAbsolute}
        blurType={isDarkMode ? 'dark' : 'light'}
        blurAmount={37}
        reducedTransparencyFallbackColor={
          isDarkMode ? 'rgba(15, 15, 15, 0.25)' : 'rgba(223,226,230,0.25)'
        }
      />

      <CyDScrollView className='flex-1'>
        {/* Header (now scrollable) */}
        <CyDView className='flex-row justify-between items-center px-4 pt-3'>
          <CyDText className='text-[28px]'>Invite friends</CyDText>

          <CyDTouchView onPress={handleClose} className='p-2'>
            <CyDIcons name='close' size={32} className='text-base400' />
          </CyDTouchView>
        </CyDView>

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
          <CyDText className='text-[20px] font-semibold text-center mb-2'>
            Earn Cypher tokens on referrals
          </CyDText>
          <CyDText className='text-n200 text-center'>
            when your invitee signs up and makes a purchase{'\n'}
            at your favorite merchant.
          </CyDText>
        </CyDView>

        {/* Referral Code Section */}
        <CyDView
          className={`mx-4 mb-6 rounded-2xl p-6 ${
            isDarkMode ? 'bg-n20' : 'bg-n0'
          }`}>
          <CyDText className='text-n200 text-[12px] text-center mb-2'>
            Referral code
          </CyDText>
          <CyDView className='flex-row items-center justify-center'>
            <CyDText className='text-[30px] font-bold tracking-wider mr-1'>
              {referralCodes[0] ?? '———'}
            </CyDText>
            <CyDTouchView onPress={handleCopyReferralCode} className='p-2'>
              <CyDIcons name='copy' size={20} className='text-base400' />
            </CyDTouchView>
          </CyDView>
          {/* View All Referral Codes CTA */}
          {
            <CyDTouchView
              onPress={
                referralCodes.length > 1
                  ? handleViewAllReferralCodes
                  : handleAddReferralCode
              }
              className='items-center mt-2'>
              <CyDText className='text-blue-400 text-[14px] underline font-medium'>
                {referralCodes.length > 1
                  ? 'Other Invite Codes'
                  : 'Add Another Code'}
              </CyDText>
            </CyDTouchView>
          }
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row gap-3 px-4 mb-[34px]'>
          <CyDTouchView
            onPress={handleInviteLink}
            className='flex-1 bg-base400 rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-n0 font-semibold'>Invite link</CyDText>
            <CyDMaterialDesignIcons
              name='link-variant'
              size={18}
              className='text-n0'
            />
          </CyDTouchView>

          <CyDTouchView
            onPress={handleQRCode}
            className='flex-1 bg-base400 rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-n0 font-semibold'>QR Code</CyDText>
            <CyDMaterialDesignIcons
              name='qrcode-scan'
              size={18}
              className='text-n0'
            />
          </CyDTouchView>
        </CyDView>

        {/* How it works Section */}
        <CyDView
          className={`mx-4 mb-6 rounded-[12px] py-4 ${
            isDarkMode ? 'bg-base40' : 'bg-n0'
          }`}>
          <CyDView
            className={`flex-row items-center mb-4 rounded-full p-1 px-2 self-start mx-4 ${
              isDarkMode ? 'bg-n0' : 'bg-n30'
            }`}>
            <CyDText className='text-base400 font-semibold mr-[2px]'>
              💡
            </CyDText>
            <CyDText className='text-base400 font-semibold'>
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
              <CyDText className='font-semibold mb-1'>
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
              <CyDText className='font-semibold text-[12px]'>💸</CyDText>
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='font-semibold mb-1'>They Join Cypher</CyDText>
              <CyDText className='text-n200 text-sm mb-3'>
                When they sign up, complete KYC, and make their{'\n'}
                first card purchase — both of you earn CYPR tokens.
              </CyDText>

              {/* Earnings Display */}
              <CyDView className='flex-row gap-x-[8px]'>
                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    You&apos;ll Earn:
                  </CyDText>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    They Earn:
                  </CyDText>
                </CyDView>

                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-1'
                      resizeMode='contain'
                    />
                    <CyDText className='font-semibold'>
                      {referralData.userEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-1'
                      resizeMode='contain'
                    />
                    <CyDText className='font-semibold'>
                      {referralData.friendEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Additional Earnings Section */}
        <CyDText className='font-semibold mx-4 mb-4'>
          Additional Earnings
        </CyDText>
        <CyDView
          className={`mx-4 mb-6 rounded-[12px] py-4 ${
            isDarkMode ? 'bg-base40' : 'bg-n0'
          }`}>
          <CyDView className='flex-row items-start px-4'>
            <CyDView className='flex-row items-center justify-center mr-3 h-8 w-8 bg-n0 rounded-full'>
              <CyDText className='font-semibold text-[12px]'>🛍️</CyDText>
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='font-semibold mb-1'>
                Earn Even More When They Follow You
              </CyDText>
              <CyDText className='text-n200 text-[14px] mb-4'>
                If your friend shops at the same place you &quot;Boosted a
                Merchant&quot; you both unlock bonus rewards.
              </CyDText>

              <CyDText className='text-n200 text-[14px] mb-2'>
                i.e If your friend spend $100 at Walmart
              </CyDText>

              {/* Additional Earnings Display */}
              <CyDView className='flex-row gap-x-[8px]'>
                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    You&apos;ll Earn:
                  </CyDText>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    They Earn:
                  </CyDText>
                </CyDView>

                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-1'
                      resizeMode='contain'
                    />
                    <CyDText className='font-semibold'>
                      {referralData.userEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-1'
                      resizeMode='contain'
                    />
                    <CyDText className='font-semibold'>
                      {referralData.friendEarnings.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Footer Link */}
        {/* <CyDView className='mx-4 mb-8'>
          <CyDTouchView onPress={handleAddReferralCode}>
            <CyDText className='text-blue-400 text-center underline'>
              I want to add my referral code
            </CyDText>
          </CyDTouchView>
        </CyDView> */}
      </CyDScrollView>

      {/* New Referral Code Modal */}
      <NewReferralCodeModal
        isModalVisible={isNewCodeModalVisible}
        setIsModalVisible={setIsNewCodeModalVisible}
        createReferralCode={createReferralCode}
        code={code}
        setCode={setCode}
      />
    </CyDSafeAreaView>
  );
}
