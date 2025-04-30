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
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import AppImages from '../../../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
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

const EnterReferralCode = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const [currentStep] = useState<number>(1);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const totalSteps = 3;
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();

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

  const handleLearnMore = () => {
    setIsModalVisible(true);
  };

  const onSubmitReferralCode = async () => {
    setLoading(true);
    try {
      const response = await postWithAuth('/v1/cards/referral-v2/validate', {
        referralCode,
      });

      console.log('response ref code : ', response);

      if (!response.error) {
        if (response.data.isValid) {
          await setReferralCodeAsync(referralCode);
          setShowSuccessModal(true);
        } else {
          showModal('state', {
            type: 'error',
            title: t('INVALID_REFERRAL_CODE'),
            description:
              response.error.message || t('INVALID_REFERRAL_CODE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        showModal('state', {
          type: 'error',
          title: t('INVALID_REFERRAL_CODE'),
          description: response.error.message || t('PLEASE_CONTACT_SUPPORT'),
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
            source={AppImages.CARD_APP_GIFT_ICON}
            className='w-[151px] h-[169px]'
            style={styles.giftImage}
          />
        </CyDView>

        {/* Title and Description */}
        <CyDView className='mb-6'>
          <CyDText className='text-[32px] mb-[6px]'>
            {t('Redeem a code')}
          </CyDText>
          <CyDText className='text-[14px] text-n200 mb-4'>
            {t(
              "Got an invite code from a friend? Enter it below and redeem your 50 reward points instantly! Remember, you won't be able to do this later.",
            )}
          </CyDText>

          {/* Learn More Link */}
          <CyDTouchView
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
          </CyDTouchView>
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
              disabled={isEmpty(referralCode)}
              loading={loading}
              type={ButtonType.PRIMARY}
              style='ml-2 px-4 w-[94px]'
              paddingY={15}
              titleStyle='text-[16px] font-medium'
            />
          </CyDView>
        </CyDView>
      </KeyboardAwareScrollView>

      {/* Footer */}
      <CardApplicationFooter
        currentStep={1}
        totalSteps={3}
        currentSectionProgress={40}
        buttonConfig={{
          title: 'Skip',
          onPress: async () => {
            await handleSkip();
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
