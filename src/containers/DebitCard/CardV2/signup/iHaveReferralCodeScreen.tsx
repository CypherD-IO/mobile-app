import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar, TextInput } from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import AppImages from '../../../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import { ButtonType } from '../../../../constants/enum';
import HowReferralWorksModal from '../../../../components/v2/howReferralWorksModal';
import useAxios from '../../../../core/HttpRequest';
import { screenTitle } from '../../../../constants';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { setReferralCodeAsync } from '../../../../core/asyncStorage';
import { isEmpty } from 'lodash';

const IHaveReferralCodeScreen = ({ navigation, route }) => {
  const {
    deductAmountNow = false,
    toPage = '',
    cardBalance = 0,
    referralCodeFromLink = '',
  } = route.params ?? {};
  const [referralCode, setReferralCode] = useState(referralCodeFromLink || '');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    if (referralCodeFromLink) {
      void onSubmitInviteCode();
    }
  }, [referralCodeFromLink]);

  const onSubmitInviteCode = async () => {
    setLoading(true);
    const response = await postWithAuth('/v1/cards/referral-v2/validate', {
      referralCode,
    });
    if (!response.error) {
      if (response.data.isValid) {
        await setReferralCodeAsync(referralCode);
        showModal('state', {
          type: 'success',
          title: t('REFERRAL_CODE_APPLIED_SUCCESSFULLY'),
          description: t('REFERRAL_CODE_APPLIED_SUCCESSFULLY_DESCRIPTION'),
          onSuccess: () => {
            navigation.navigate(screenTitle.SELECT_PLAN, {
              deductAmountNow,
              toPage,
              cardBalance,
            });
            hideModal();
          },
          onFailure: hideModal,
        });
      } else {
        showModal('state', {
          type: 'error',
          title: t('INVALID_REFERRAL_CODE'),
          description: t('INVALID_REFERRAL_CODE_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('ERROR_IN_APPLYING_REFERRAL_CODE'),
        description: t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView className='flex bg-cardBg h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      {/* <ScrollView className='mt-[16px]'> */}
      <HowReferralWorksModal
        isModalVisible={isModalVisible}
        setIsModalVisible={setIsModalVisible}
      />
      <CyDView className='flex flex-col justify-between h-full mb-[24px] '>
        <CyDView className='px-[16px]'>
          <CyDView>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[36px] h-[36px]'
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className='text-[28px] font-bold mt-[12px]'>
            Do you have any referral code?
          </CyDText>
          <CyDText className='text-[14px] font-[500] text-n200 mt-[6px]'>
            Get special rewards! if you are being invited by someone to cypher
          </CyDText>

          <CyDView className='mt-[24px]'>
            <CyDText className='text-[12px] font-[500] text-black mb-[8px]'>
              {t('REFERRAL_CODE')}
            </CyDText>
            <CyDView className='flex-row items-center'>
              <CyDTextInput
                className='bg-white rounded-[8px] px-[12.5px] py-[14px] flex-1 mr-[12px]'
                placeholder={t('ENTER_REFERRAL_CODE')}
                value={referralCode}
                onChangeText={setReferralCode}
              />
              <Button
                title={t('APPLY')}
                onPress={() => {
                  void onSubmitInviteCode();
                }}
                disabled={isEmpty(referralCode)}
                loaderStyle={{ height: 22, width: 22 }}
                loading={loading}
                type={ButtonType.WHITE_FILL}
                style='px-[25px] py-[12px]'
                titleStyle='text-[16px] font-bold'
              />
            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView>
          <CyDView className='mt-[24px] relative bg-white rounded-[8px] mx-[16px] p-[16px]'>
            <CyDView className='flex-row items-center'>
              <CyDImage
                source={AppImages.GIFT_IN_HANDS}
                className='w-[74px] h-[83px] mr-[16px] absolute left-[0px] bottom-[16px]'
              />
              <CyDView className='flex-1 ml-[82px]'>
                <CyDText className='text-[14px] font-bold'>
                  Earn 50 Instant Reward Points
                </CyDText>
                <CyDText className='text-[12px] text-n200 mt-[4px]'>
                  Enter referral code above, and you'll earn instant 50 reward
                  points!
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView className='mt-[24px] bg-white px-[16px] w-full items-center'>
            <CyDTouchView
              className='mt-[24px]'
              onPress={() => {
                setIsModalVisible(true);
              }}>
              <CyDText className='text-[14px] text-blue-500 font-[500]'>
                Learn how cypher referral works →
              </CyDText>
            </CyDTouchView>

            <Button
              type={ButtonType.PRIMARY}
              title={t('SUBMIT')}
              onPress={() => {
                void onSubmitInviteCode();
              }}
              disabled={isEmpty(referralCode)}
              loading={loading}
              loaderStyle={{ height: 22, width: 22 }}
              style='mt-[24px] p-[16px] mb-[42px] w-full'
              titleStyle='text-[16px] font-bold'
            />
          </CyDView>
        </CyDView>
      </CyDView>
      {/* </ScrollView> */}
    </SafeAreaView>
  );
};

export default IHaveReferralCodeScreen;