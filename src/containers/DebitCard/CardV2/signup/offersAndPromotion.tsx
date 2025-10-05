import React, { useState, useEffect } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useIsFocused,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTextInput,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDLottieView,
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import AppImages from '../../../../../assets/images/appImages';
import { Platform, StyleSheet } from 'react-native';
import { isEmpty } from 'lodash';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import useAxios from '../../../../core/HttpRequest';
import {
  getReferralCode,
  removeReferralCode,
  setReferralCodeAsync,
} from '../../../../core/asyncStorage';
import { ButtonType } from '../../../../constants/enum';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CardApplicationHeader from '../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../components/v2/CardApplicationFooter';
import OfferTagComponent from '../../../../components/v2/OfferTagComponent';
import BoostedRewardInfoModal from '../../../../components/v2/BoostedRewardInfoModal';
import { useOnboardingReward } from '../../../../contexts/OnboardingRewardContext';

const OffersAndPromotion = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [showBoostedRewardInfoModal, setShowBoostedRewardInfoModal] =
    useState(false);
  const [votedCandidates, setVotedCandidates] = useState<
    Array<{ name: string; logo: any }>
  >([]);

  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const { totalRewardsPossible } = useOnboardingReward();

  useEffect(() => {
    const getReferralCodeFromAsync = async () => {
      const referralCodeFromAsync = await getReferralCode();
      if (referralCodeFromAsync) {
        setReferralCode(referralCodeFromAsync);
        setIsApplied(true);
      }
    };
    void getReferralCodeFromAsync();
  }, [isFocused]);

  const handleNext = () => {
    navigation.navigate('CardApplicationStack', {
      screen: screenTitle.BASIC_DETAILS,
    });
  };

  const handleQuestions = () => {
    // Handle questions button press - placeholder for now
    showModal('state', {
      type: 'info',
      title: t('Questions'),
      description: t('How can we help you?'),
      onSuccess: hideModal,
      onFailure: hideModal,
    });
  };

  const onSubmitReferralCode = async () => {
    if (isEmpty(referralCode.trim())) {
      return;
    }

    setLoading(true);
    try {
      const response = await postWithAuth('/v1/cards/referral-v2/validate', {
        referralCode: referralCode.trim().toUpperCase(),
      });

      if (!response.isError) {
        if (response.data.isValid) {
          await setReferralCodeAsync(referralCode.trim().toUpperCase());
          setIsApplied(true);
          setReferralCode(referralCode.trim().toUpperCase());

          // fetch voted candidates
          try {
            const votedResp = await getWithAuth(
              `/v1/cards/referral-v2/${referralCode.trim().toUpperCase()}/voted-candidates`,
            );
            if (!votedResp.isError && votedResp.data?.votedCandidates) {
              const merchants = votedResp.data.votedCandidates.map(
                (c: any) => ({
                  name: c.merchantName,
                  logo: c.logo ? { uri: c.logo } : '',
                }),
              );
              setVotedCandidates(merchants);
            }
          } catch (err) {}

          setShowBoostedRewardInfoModal(true);
        } else {
          showModal('state', {
            type: 'error',
            title: t('INVALID_REFERRAL_CODE'),
            description:
              response.error?.message ?? t('INVALID_REFERRAL_CODE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        showModal('state', {
          type: 'error',
          title: t('INVALID_REFERRAL_CODE'),
          description: response.error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('ERROR_IN_APPLYING_REFERRAL_CODE'),
        description: t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeReferralCode();
      setReferralCode('');
      setIsApplied(false);

      showModal('state', {
        type: 'success',
        title: t('Coupon Removed'),
        description: t('Your referral code has been removed successfully'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } catch (error) {
      console.error('Error removing referral code:', error);
    }
  };

  const handleBoostedRewardContinue = () => {
    setShowBoostedRewardInfoModal(false);
    handleNext();
  };

  return (
    <CyDView className='flex-1 bg-n0'>
      {/* Status Bar Background */}
      <CyDView className='bg-base40' style={{ height: insets.top }} />

      <CyDView className='flex-1' style={{ paddingBottom: insets.bottom }}>
        {/* Header */}
        <CardApplicationHeader
          onBackPress={() => navigation.goBack()}
          showQuestions={true}
          bgColor='base40'
          buttonBgColor='n20'
        />

        {/* Boosted Reward Modal */}
        <BoostedRewardInfoModal
          isVisible={showBoostedRewardInfoModal}
          onContinue={handleBoostedRewardContinue}
          votedCandidates={votedCandidates}
        />

        {/* Content */}
        <KeyboardAwareScrollView
          className='flex-1 bg-n0'
          enableOnAndroid={true}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}>
          <CyDView className='flex flex-col bg-base40 rounded-b-[16px] px-4 pt-4 mb-4 pt-[200px] mt-[-200px]'>
            {/* Description Text */}
            <CyDText className='text-[14px] mb-6 leading-5'>
              Got a referral or promo code for Cypher? Enter it below! You
              can&apos;t do this later.
            </CyDText>

            {/* Referral / Offer code section */}
            <CyDView className='mb-6'>
              <CyDText className='text-[12px] font-medium mb-1'>
                Referral / Offer code
              </CyDText>

              <CyDView className='flex-row mb-4'>
                <CyDTextInput
                  value={referralCode}
                  onChangeText={text => setReferralCode(text.toUpperCase())}
                  placeholder='Enter referral code'
                  className='flex-1 !bg-n0 rounded-tl-[8px] rounded-bl-[8px] p-[12px]'
                  placeholderTextColor='#666666'
                  autoCapitalize='characters'
                  editable={!isApplied}
                />

                {isApplied ? (
                  <CyDView className='bg-n0 p-[12px] rounded-tr-[8px] rounded-br-[8px] flex-row items-center'>
                    <CyDText className='text-base400 font-medium'>
                      ✅ Applied
                    </CyDText>
                  </CyDView>
                ) : (
                  <CyDTouchView
                    onPress={async () => {
                      if (!isEmpty(referralCode)) {
                        await onSubmitReferralCode();
                      }
                    }}
                    disabled={isEmpty(referralCode) || loading}
                    className={`px-6 w-[80px] rounded-br-[8px] rounded-tr-[8px] py-3 bg-n0`}>
                    {loading ? (
                      <CyDView className='items-center'>
                        <CyDLottieView
                          source={AppImages.LOADING_SPINNER}
                          autoPlay
                          loop
                          style={{ width: 20, height: 20 }}
                        />
                      </CyDView>
                    ) : (
                      <CyDText className='text-[14px] font-medium text-white text-center'>
                        Apply
                      </CyDText>
                    )}
                  </CyDTouchView>
                )}
              </CyDView>

              {/* Coupon applied section */}
              {/* {isApplied && (
                <CyDView className='flex-row items-center justify-between mb-6'>
                  <CyDView className='flex-row items-center'>
                    <CyDMaterialDesignIcons
                      name='check-circle'
                      size={20}
                      className='text-green-600 mr-2'
                    />
                    <CyDText>Coupon applied</CyDText>
                  </CyDView>

                  <CyDTouchView onPress={handleRemoveCoupon}>
                    <CyDText className='text-red-500 font-medium'>
                      Remove
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )} */}
            </CyDView>
          </CyDView>

          {/* Available coupons section */}
          <CyDView className='mb-8 px-4'>
            <CyDText className='text-white text-[16px] font-medium mb-4'>
              Available coupons
            </CyDText>

            {/* Coupon Card */}
            <CyDView className='relative mb-4 h-[179px]'>
              {/* Coupon Border Background */}
              <CyDImage
                source={AppImages.COUPON_BORDER}
                className='w-[57px] h-[179px]'
                resizeMode='stretch'
              />

              {/* Coupon Content Overlay */}
              <CyDView className='absolute top-0 left-0 right-0 bottom-0 flex-row h-[179px]'>
                {/* Left Side - Vertical Text */}
                <CyDView className='w-[57px] items-center justify-center relative'>
                  {/* Vertical "Get" text */}

                  <CyDText
                    className='text-white text-[18px] font-bold'
                    style={{
                      transform: [{ rotate: '-90deg' }],
                      textAlign: 'center',
                    }}>
                    {totalRewardsPossible}
                  </CyDText>

                  {/* Token Icon */}
                  <CyDImage
                    source={AppImages.CYPR_TOKEN}
                    className='w-[16px] h-[16px] my-[12px] translate-rotate-90'
                  />

                  <CyDText
                    className='text-white text-[24px] font-bold'
                    style={{
                      transform: [{ rotate: '-90deg' }],
                      width: 60,
                      textAlign: 'center',
                    }}>
                    Get
                  </CyDText>
                </CyDView>

                {/* Right Side - Content */}
                <CyDView className='flex-1 p-4 bg-base40 rounded-r-[16px]'>
                  <CyDView className='flex-row items-center justify-between mb-[12px]'>
                    <CyDText className='font-semibold text-[16px]'>
                      NEWUSER{totalRewardsPossible}
                    </CyDText>
                    <CyDText className='text-green300 text-[14px] font-bold'>
                      Applied
                    </CyDText>
                  </CyDView>

                  <CyDText className='text-p100 text-[12px] font-semibold mb-[12px]'>
                    Get {totalRewardsPossible} $CYPR when you spend $
                    {totalRewardsPossible}
                  </CyDText>

                  {/* Custom Dotted Line */}
                  <CyDView className='flex-row mb-[12px] overflow-hidden'>
                    {Array.from({ length: 100 }).map((_, index) => (
                      <CyDView
                        key={index}
                        className='w-[3px] h-[1px] bg-base150 mr-[2px]'
                      />
                    ))}
                  </CyDView>

                  <CyDText className='text-n200 text-[14px] mb-[10px]'>
                    Get your guaranteed token upon signing up and enjoy a $
                    {totalRewardsPossible} value!
                  </CyDText>
                  <CyDText className='font-bold text-n200'>know more</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </KeyboardAwareScrollView>

        <OfferTagComponent
          position={{
            bottom: Platform.OS === 'android' ? 118 : 146,
            left: 16,
            right: 16,
          }}
        />

        {/* Footer */}
        <CardApplicationFooter
          currentStep={1}
          totalSteps={3}
          currentSectionProgress={50}
          buttonConfig={{
            title: 'NEXT',
            onPress: handleNext,
          }}
        />
      </CyDView>
    </CyDView>
  );
};

export default OffersAndPromotion;
