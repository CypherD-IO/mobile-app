import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useColorScheme, StyleSheet } from 'react-native';
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
import ReferralRewardsBottomSheet from '../../components/v2/ReferralRewardsBottomSheet';
import QRCode from '../../components/v2/QRCode';
import { BlurView } from '@react-native-community/blur';
import { Theme, useTheme } from '../../reducers/themeReducer';
import useAxios from '../../core/HttpRequest';
import NewReferralCodeModal from '../../components/v2/newReferralCodeModal';
// Removed unused GlobalModal import
import Clipboard from '@react-native-clipboard/clipboard';

// removed unused Dimensions width

interface ReferralData {
  referralCode: string;
  userEarnings: number;
  friendEarnings: number;
  additionalUserEarnings: number;
  additionalFriendEarnings: number;
}

interface MinimalNav {
  navigate: (route: string, params?: unknown) => void;
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
  const { t } = useTranslation();

  return (
    <CyDView className='flex-1 bg-n20 px-4'>
      {/* QR Code Section */}
      <CyDView className='items-center mb-8'>
        <CyDText className='text-n200 text-sm mb-4 text-center'>
          {t('REFERRAL_CODE', 'Referral code')}
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
              {t('THEY_JOIN_CYPHER')}
            </CyDText>
            <CyDText className='text-n200 text-sm leading-relaxed'>
              {t('WHEN_THEY_SIGN_UP_COMPLETE_KYC_AND_MAKE_FIRST_PURCHASE')}
              {'\n'}{' '}
              <CyDText className='text-yellow-400 font-semibold'>
                {t('BOTH_OF_YOU_EARN_CYPR_TOKENS')}
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
              {t('EARN_EVEN_MORE_WHEN_THEY_FOLLOW_YOU')}
            </CyDText>
            <CyDText className='text-n200 text-sm leading-relaxed'>
              {t('IF_YOUR_FRIEND_SHOPS_AT_THE_SAME_PLACE_YOU_BOOSTED')}
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
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();
  const { postWithAuth, getWithAuth, getWithoutAuth } = useAxios();
  // removed unused showModal, hideModal

  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  /* ------------------------------------------------------------------------ */
  /*                       Referral Data (fetched from API)                    */
  /* ------------------------------------------------------------------------ */
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  // Loading states exist but are not currently displayed in UI; keep only epoch-independent loading if used elsewhere
  // Removed unused state: isReferralCodesLoading

  // Earnings values; will be populated from API parameters
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    userEarnings: 0,
    friendEarnings: 0,
    additionalUserEarnings: 50,
    additionalFriendEarnings: 100,
  });

  // New-code modal state
  const [isNewCodeModalVisible, setIsNewCodeModalVisible] = useState(false);
  const [code, setCode] = useState('');
  // Removed unused state: createReferralCodeLoading

  /**
   * Fetch referral codes list from backend.
   */
  const fetchReferralCodes = async (): Promise<void> => {
    try {
      const res = await getWithAuth('/v1/cards/referral-v2');
      if (!res.isError && Array.isArray(res.data?.referralCodes)) {
        setReferralCodes(res.data.referralCodes.filter(Boolean));
        // Safely read referral parameters if available
        const signupBonus: number | undefined =
          res.data?.parameters?.signupBonus;
        const baseReferralPerReferee: number | undefined =
          res.data?.parameters?.baseReferralPerReferee;

        if (
          typeof signupBonus === 'number' ||
          typeof baseReferralPerReferee === 'number'
        ) {
          setReferralData(prev => ({
            ...prev,
            friendEarnings:
              typeof signupBonus === 'number'
                ? signupBonus
                : prev.friendEarnings,
            userEarnings:
              typeof baseReferralPerReferee === 'number'
                ? baseReferralPerReferee
                : prev.userEarnings,
          }));
        }
      } else {
        setReferralCodes([]);
        if (res.isError) {
          showToast(t('Failed to load referral codes'), 'error');
        }
      }
    } finally {
      // no-op
    }
  };

  useEffect(() => {
    void fetchReferralCodes();
  }, []);

  /**
   * Fetch current epoch parameters to populate referral earnings.
   * This is the source of truth for the "They Join Cypher" amounts.
   */
  const fetchEpochParameters = async (): Promise<void> => {
    try {
      const epochResp = await getWithoutAuth('/v1/cypher-protocol/epoch');
      if (!epochResp.isError) {
        const signupBonus = epochResp.data?.parameters?.signupBonus;
        const baseReferralPerReferee =
          epochResp.data?.parameters?.baseReferralPerReferee;

        // Prefer epoch parameters when available
        if (
          typeof signupBonus === 'number' ||
          typeof signupBonus === 'string' ||
          typeof baseReferralPerReferee === 'number' ||
          typeof baseReferralPerReferee === 'string'
        ) {
          const parsedSignupBonus = Number(signupBonus);
          const parsedBaseReferral = Number(baseReferralPerReferee);

          setReferralData(prev => ({
            ...prev,
            friendEarnings: Number.isFinite(parsedSignupBonus)
              ? parsedSignupBonus
              : prev.friendEarnings,
            userEarnings: Number.isFinite(parsedBaseReferral)
              ? parsedBaseReferral
              : prev.userEarnings,
          }));
        }
      } else {
        console.warn('⚠️ Failed to fetch epoch parameters for referrals');
      }
    } catch (error) {
      console.error('❌ Error fetching epoch parameters:', error);
    }
  };

  useEffect(() => {
    void fetchEpochParameters();
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

    const response = await postWithAuth('/v1/cards/referral-v2', {
      referralCode: code,
      ...payload,
    });

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
  const handleCopyReferralCode = (): void => {
    try {
      const codeToCopy = referralCodes[0];
      if (!codeToCopy) {
        showToast(t('No referral code available'));
        return;
      }
      Clipboard.setString(codeToCopy);
      showToast(t('Referral code copied to clipboard!'));
    } catch (error: unknown) {
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
   * Opens the Referral Rewards bottom sheet to explain the
   * "Earn even more when..." section with live examples.
   */
  const handleOpenReferralRewardsInfo = (): void => {
    showBottomSheet({
      id: 'referral-rewards-info',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: (
        <ReferralRewardsBottomSheet
          onOpenInviteModal={() => {
            hideBottomSheet('referral-rewards-info');
          }}
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
  const handleViewAllReferralCodes = (): void => {
    // Cast to a minimal typed shape to avoid using any
    const nav = navigation as unknown as MinimalNav;
    nav.navigate(screenTitle.ALL_REFERRAL_CODES, { referralCodes });
  };

  /**
   * Handles back navigation
   */
  // removed unused handleBack

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
          <CyDText className='text-[28px]'>
            {t('INVITE_FRIENDS', 'Invite friends')}
          </CyDText>

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
            {t('REFERRAL_EARN_CYPHER_TOKENS')}
          </CyDText>
          <CyDText className='text-n200 text-center'>
            {t('REFERRAL_WHEN_INVITEE_SIGNS_UP')}
          </CyDText>
        </CyDView>

        {/* Referral Code Section */}
        <CyDView
          className={`mx-4 mb-6 rounded-2xl p-6 ${
            isDarkMode ? 'bg-n20' : 'bg-n0'
          }`}>
          <CyDText className='text-n200 text-[12px] text-center mb-2'>
            {t('REFERRAL_CODE')}
          </CyDText>
          <CyDView className='flex-row items-center justify-center'>
            <CyDText className='text-[30px] font-bold tracking-wider mr-1'>
              {referralCodes[0] ?? '———'}
            </CyDText>
            <CyDTouchView onPress={handleCopyReferralCode} className='p-2'>
              <CyDIcons name='copy' size={32} className='text-base400' />
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
                  ? t('REFERRAL_OTHER_INVITE_CODES')
                  : t('REFERRAL_ADD_ANOTHER_CODE')}
              </CyDText>
            </CyDTouchView>
          }
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row gap-3 px-4 mb-[34px]'>
          <CyDTouchView
            onPress={handleInviteLink}
            className='flex-1 bg-base400 rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-n0 font-semibold'>
              {t('REFERRAL_INVITE_LINK')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='link-variant'
              size={18}
              className='text-n0'
            />
          </CyDTouchView>

          <CyDTouchView
            onPress={handleQRCode}
            className='flex-1 bg-base400 rounded-full py-[12px] flex-row items-center justify-center gap-x-2'>
            <CyDText className='text-n0 font-semibold'>
              {t('REFERRAL_QR_CODE')}
            </CyDText>
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
              {t('REFERRAL_HOW_IT_WORKS')}
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
                {t('REFERRAL_SHARE_YOUR_INVITE_LINK')}
              </CyDText>
              <CyDText className='text-n200 text-sm'>
                {t('REFERRAL_SEND_UNIQUE_LINK')}
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
              <CyDText className='font-semibold mb-1'>
                {t('THEY_JOIN_CYPHER', 'They Join Cypher')}
              </CyDText>
              <CyDText className='text-n200 text-sm mb-3'>
                {t('REFERRAL_WHEN_THEY_SIGN_UP')}
              </CyDText>

              {/* Earnings Display */}
              <CyDView className='flex-row gap-x-[8px]'>
                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    {t('REFERRAL_YOULL_EARN')}
                  </CyDText>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    {t('REFERRAL_THEY_EARN')}
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
          {t('REFERRAL_ADDITIONAL_EARNINGS')}
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
                {t('REFERRAL_EARN_EVEN_MORE')}
              </CyDText>
              <CyDText className='text-n200 text-[14px] mb-4'>
                {t('REFERRAL_IF_FRIEND_SHOPS')}
              </CyDText>

              {/* Learn more link to detailed referral rewards bottom sheet */}
              <CyDTouchView
                onPress={handleOpenReferralRewardsInfo}
                className='mb-3'>
                <CyDText className='text-blue-400 underline text-[14px]'>
                  {t('LEARN_HOW_IT_WORKS', 'Learn how it works')}
                </CyDText>
              </CyDTouchView>

              {/* <CyDText className='text-n200 text-[14px] mb-2'>
                {t('REFERRAL_IF_FRIEND_SPEND')}
              </CyDText> */}

              {/* Additional Earnings Display */}
              {/* <CyDView className='flex-row gap-x-[8px]'>
                <CyDView className='flex-col gap-y-[4px]'>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    {t('REFERRAL_YOULL_EARN')}
                  </CyDText>
                  <CyDText className='text-n200 text-[14px] font-medium mb-1'>
                    {t('REFERRAL_THEY_EARN')}
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
              </CyDView> */}
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
