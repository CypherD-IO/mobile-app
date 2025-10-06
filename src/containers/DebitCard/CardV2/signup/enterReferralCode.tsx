import React, { useState, useEffect } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useIsFocused,
  RouteProp,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTextInput,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import AppImages from '../../../../../assets/images/appImages';
import { Platform, StyleSheet } from 'react-native';
import { isEmpty } from 'lodash';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import HowReferralWorksModal from '../../../../components/v2/howReferralWorksModal';
import useAxios from '../../../../core/HttpRequest';
import {
  getReferralCode,
  removeReferralCode,
  setReferralCodeAsync,
} from '../../../../core/asyncStorage';
import { ButtonType } from '../../../../constants/enum';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ReferralSuccessModal from '../../../../components/v2/ReferralSuccessModal';
import CardApplicationHeader from '../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../components/v2/CardApplicationFooter';
import OfferTagComponent from '../../../../components/v2/OfferTagComponent';
import BoostedRewardInfoModal from '../../../../components/v2/BoostedRewardInfoModal';

interface RouteParams {
  referralCodeFromLink?: string;
}

const EnterReferralCode = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = useState<string>(
    route.params?.referralCodeFromLink ?? '',
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBoostedRewardInfoModal, setShowBoostedRewardInfoModal] =
    useState(false);
  const [votedCandidates, setVotedCandidates] = useState<
    Array<{ name: string; logo: any }>
  >([]);

  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();

  // Removed keyboard visibility tracking as OfferTagComponent now animates itself

  useEffect(() => {
    const setReferralCodeFromAsync = async () => {
      const referralCodeFromAsync = await getReferralCode();
      if (referralCodeFromAsync) {
        setReferralCode(referralCodeFromAsync);
      }
    };
    void setReferralCodeFromAsync();
  }, [isFocused]);

  const handleSkip = async () => {
    await removeReferralCode();
    navigation.navigate('CardApplicationStack', {
      screen: screenTitle.BASIC_DETAILS,
    });
  };

  const handleBoostedRewardInfoModalClose = () => {
    setShowBoostedRewardInfoModal(false);
    navigation.navigate('CardApplicationStack', {
      screen: screenTitle.BASIC_DETAILS,
    });
  };

  const handleLearnMore = () => {
    setIsModalVisible(true);
  };

  const onSubmitReferralCode = async () => {
    setLoading(true);
    try {
      const response = await postWithAuth('/v1/cards/referral-v2/validate', {
        referralCode: referralCode.trim().toUpperCase(),
      });

      if (!response.isError) {
        if (response.data.isValid) {
          await setReferralCodeAsync(referralCode);

          // Fetch voted candidates for this referrer
          try {
            const votedResp = await getWithAuth(
              `/v1/cards/referral-v2/${referralCode.trim().toUpperCase()}/voted-candidates`,
            );

            if (!votedResp.isError && votedResp.data?.votedCandidates) {
              const merchants = votedResp.data.votedCandidates.map(
                (c: any) => ({
                  name: c.merchantName,
                  logo: c.logo ? { uri: c.logo } : '', // fallback
                }),
              );
              setVotedCandidates(merchants);
            }
          } catch (e) {}

          setShowBoostedRewardInfoModal(true);
        } else {
          showModal('state', {
            type: 'error',
            title: t('INVALID_REFERRAL_CODE'),
            description:
              response?.error?.message ||
              t('INVALID_REFERRAL_CODE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        showModal('state', {
          type: 'error',
          title: t('INVALID_REFERRAL_CODE'),
          description: response?.error?.message || t('PLEASE_CONTACT_SUPPORT'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('ERROR_IN_APPLYING_REFERRAL_CODE'),
        description: t('INVALID_REFERRAL_CODE_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setTimeout(() => {
      navigation.navigate('CardApplicationStack', {
        screen: screenTitle.BASIC_DETAILS,
      });
    }, 300);
  };

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Success Modal */}
      <ReferralSuccessModal
        isVisible={showSuccessModal}
        onClose={handleSuccessModalClose}
        referralCode={referralCode}
      />

      <BoostedRewardInfoModal
        isVisible={showBoostedRewardInfoModal}
        onContinue={handleBoostedRewardInfoModalClose}
        votedCandidates={votedCandidates}
      />

      {/* Modal for explaining how referrals work */}
      <HowReferralWorksModal
        isModalVisible={isModalVisible}
        setIsModalVisible={setIsModalVisible}
      />

      {/* Header */}
      <CardApplicationHeader />

      {/* Content */}
      <KeyboardAwareScrollView
        className='flex-1 px-4'
        enableOnAndroid={true}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}>
        {/* Gift Image */}
        <CyDView className='items-center justify-center py-[46px]'>
          <CyDImage
            source={AppImages.REFERRAL_CODE_HERO}
            className='w-[212px] h-[181px]'
            style={styles.giftImage}
          />
        </CyDView>

        {/* Title and Description */}
        <CyDView className='mb-6'>
          <CyDText className='text-[32px] mb-[6px]'>
            {t('Referral code')}
          </CyDText>
          <CyDText className='text-[14px] text-n200 mb-4'>
            {t(
              "Got an invite code from a friend who referred you to Cypher? Just enter it below! Remember, you won't be able to do this later.",
            )}
          </CyDText>

          {/* Learn More Link */}
          {/* <CyDTouchView
            onPress={handleLearnMore}
            className='flex-row items-center mb-8'>
            <CyDText className='text-blue300 font-medium'>
              {t('Learn how Cypher referral works')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='arrow-right-thin'
              size={20}
              className='text-blue300 ml-1'
            />
          </CyDTouchView> */}
        </CyDView>

        {/* Referral Code Input */}
        <CyDView className='mb-6'>
          <CyDText className='text-[12px] font-bold mb-1'>
            {t('Referral code (optional)')}
          </CyDText>
          <CyDView className='flex-row'>
            <CyDTextInput
              value={referralCode}
              onChangeText={text => setReferralCode(text.toUpperCase())}
              placeholder={t('Enter referral code')}
              className='flex-1 h-[52px] text-base400 bg-n20 rounded-lg px-4'
              placeholderTextColor='#A0A0A0'
              autoCapitalize='characters'
            />
            <Button
              title={t('Apply')}
              onPress={() => {
                if (!isEmpty(referralCode)) {
                  void onSubmitReferralCode();
                }
              }}
              disabled={isEmpty(referralCode) || loading}
              loading={loading}
              type={ButtonType.PRIMARY}
              style='ml-2 px-4 w-[94px] rounded-full'
              paddingY={15}
              titleStyle='text-[16px] font-medium'
            />
          </CyDView>
        </CyDView>

        {/* <CyDView className='mb-[64px] flex flex-col p-[12px] bg-n20 rounded-[16px]'>
          <CyDView className='flex flex-row items-center mb-2'>
            <CyDImage
              source={AppImages.REFERRAL_CODE_3D_ICON}
              className='w-[32px] h-[32px] mr-[6px]'
            />
            <CyDView className='flex flex-1 flex-row items-center justify-between'>
              <CyDText className='text-[20px]'>{t('Referral Rewards')}</CyDText>
              <CyDTouchView
                onPress={handleLearnMore}
                className='flex-row items-center'>
                <CyDText className='text-primaryText font-medium underline'>
                  {t('Know more')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
          <CyDText className='text-[14px] text-n80 mb-[12px]'>
            Unlock greater rewards with Cypher by using a referral code from
            someone online
          </CyDText>
          <CyDTouchView
            onPress={handleLearnMore}
            className='flex-row items-center'>
            <CyDText className='text-blue300 font-medium'>
              {t('Get referral code')}
            </CyDText>
          </CyDTouchView>
        </CyDView> */}
      </KeyboardAwareScrollView>

      <OfferTagComponent
        position={{
          bottom: Platform.OS === 'android' ? 118 : 146,
          left: 16,
          right: 16,
        }}
        collapsed={true}
      />

      {/* Footer */}
      <CardApplicationFooter
        currentStep={1}
        totalSteps={3}
        currentSectionProgress={40}
        buttonConfig={{
          title: isEmpty(referralCode) ? 'Skip' : 'Next',
          onPress: () => {
            if (isEmpty(referralCode)) {
              void handleSkip();
            } else if (!loading) {
              void onSubmitReferralCode();
            }
          },
        }}
      />
    </CyDView>
  );
};

const styles = StyleSheet.create({
  giftImage: {
    resizeMode: 'contain',
  },
});

export default EnterReferralCode;
