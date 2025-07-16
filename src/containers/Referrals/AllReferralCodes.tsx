import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clipboard, useColorScheme, RefreshControl } from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {
  CyDSafeAreaView,
  CyDView,
  CyDTouchView,
  CyDText,
  CyDScrollView,
  CyDIcons,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { showToast } from '../../containers/utilities/toastUtility';
import { Theme, useTheme } from '../../reducers/themeReducer';
import useAxios from '../../core/HttpRequest';
import NewReferralCodeModal from '../../components/v2/newReferralCodeModal';

interface AllReferralCodesProps {
  referralCodes?: string[]; // initial snapshot if passed
}

/**
 * AllReferralCodes Screen Component
 * Displays all referral codes with copy functionality and New Invite Code button
 */
export default function AllReferralCodes() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const isDarkMode = useColorScheme() === 'dark' || theme === Theme.DARK;
  const { postWithAuth, getWithAuth } = useAxios();

  // Get referral codes and refresh callback from route params
  const { referralCodes: initialCodes = [] } =
    (route.params as AllReferralCodesProps) || {};

  // Local state for codes so we can refresh independently
  const [codes, setCodes] = useState<string[]>(initialCodes);

  // New referral code modal state
  const [isNewCodeModalVisible, setIsNewCodeModalVisible] = useState(false);
  const [code, setCode] = useState('');
  const [createReferralCodeLoading, setCreateReferralCodeLoading] =
    useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch referral codes from backend and update local state
   */
  const fetchCodes = async () => {
    try {
      setIsRefreshing(true);
      const response = await getWithAuth('/v1/cards/referral-v2');
      if (!response.isError && response.data?.referralCodes) {
        setCodes(response.data.referralCodes as string[]);
      }
    } catch (err) {
      console.error('Error fetching referral codes', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch on mount in case no codes were provided
  useEffect(() => {
    if (!initialCodes.length) {
      void fetchCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles copying referral code to clipboard
   * Provides user feedback through toast notification
   */
  const handleCopyCode = (codeToCopy: string) => {
    try {
      Clipboard.setString(codeToCopy);
      showToast(t('COPIED_TO_CLIPBOARD', 'Copied to clipboard'));
    } catch (error: any) {
      console.error('Error copying referral code:', error);
      showToast(t('Failed to copy referral code'));
    }
  };

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
      // Refresh our local list
      void fetchCodes();
    } else {
      showToast(
        response.error?.message ??
          t('REFERRAL_CODE_CREATION_FAILED', 'Failed to create referral code'),
        'error',
      );
    }
  };

  /**
   * Handles opening the New Referral Code modal
   */
  const handleNewInviteCode = () => {
    setIsNewCodeModalVisible(true);
  };

  /**
   * Handles manual refresh when user pulls down
   */
  const handleManualRefresh = () => {
    void fetchCodes();
  };

  /**
   * Refresh the referral codes list when screen comes into focus
   * This ensures the list is always up-to-date when user navigates back
   */
  useFocusEffect(
    React.useCallback(() => {
      void fetchCodes();
    }, []),
  );

  if (!codes.length) {
    return (
      <CyDSafeAreaView className={`flex-1 ${isDarkMode ? 'bg-n20' : 'bg-n0'}`}>
        {/* Header */}
        <CyDView className='flex-row items-center justify-between px-4 py-3'>
          <CyDTouchView onPress={() => navigation.goBack()} className='p-2'>
            <CyDIcons name='arrow-left' size={24} className='text-n100' />
          </CyDTouchView>
          <CyDText className='text-[18px] font-semibold'>
            {t('ALL_REFERRAL_CODES', 'All Referral Codes')}
          </CyDText>
          <CyDView className='w-10' />
        </CyDView>

        {/* Empty State */}
        <CyDView className='flex-1 items-center justify-center p-6'>
          <CyDText className='text-n200 text-center mb-4'>
            {t('NO_REFERRAL_CODES', 'No referral codes available')}
          </CyDText>
          <CyDTouchView
            onPress={handleNewInviteCode}
            className='bg-base400 rounded-[8px] px-6 py-3'>
            <CyDText className='text-white font-semibold'>
              {t('CREATE_FIRST_CODE', 'Create Your First Code')}
            </CyDText>
          </CyDTouchView>
        </CyDView>

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

  return (
    <CyDSafeAreaView className={`flex-1 ${isDarkMode ? 'bg-n20' : 'bg-n0'}`}>
      {/* Header */}
      <CyDView className='flex-row items-center justify-between px-4 py-3'>
        <CyDTouchView onPress={() => navigation.goBack()} className='p-2'>
          <CyDIcons name='arrow-left' size={24} className='text-n100' />
        </CyDTouchView>
        <CyDText className='text-[18px] font-semibold'>
          {t('ALL_REFERRAL_CODES', 'All Referral Codes')}
        </CyDText>
        <CyDView className='w-10' />
      </CyDView>

      {/* Content */}
      <CyDScrollView
        className='flex-1 px-4'
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            tintColor={isDarkMode ? '#FFFFFF' : '#000000'}
          />
        }>
        {/* New Invite Code Button */}
        <CyDTouchView
          onPress={handleNewInviteCode}
          className='flex-row items-center border-2 border-dashed border-base400 rounded-[12px] px-4 py-4 justify-center mt-3 mb-3'>
          <CyDMaterialDesignIcons
            name='plus-circle'
            size={24}
            className='text-base400 mr-1'
          />
          <CyDText className='text-base400 font-semibold text-[16px]'>
            {'New Invite Code'}
          </CyDText>
        </CyDTouchView>
        {/* Referral Codes List */}
        <CyDView className='mb-6'>
          {codes.map((codeItem, index) => (
            <CyDView
              key={`${codeItem}-${index}`}
              className={`flex-row items-center justify-between rounded-[12px] px-4 py-4 mb-3 ${
                isDarkMode ? 'bg-n40' : 'bg-n10'
              }`}>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-semibold mb-1'>
                  {codeItem}
                </CyDText>
              </CyDView>

              <CyDTouchView
                onPress={() => handleCopyCode(codeItem)}
                className='p-2'>
                <CyDIcons name='copy' size={20} className='text-base400' />
              </CyDTouchView>
            </CyDView>
          ))}
        </CyDView>
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
