import React, { useContext, useEffect, useState } from 'react';
import { Linking, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import AppImages from '../../../../../assets/images/appImages';
import Button from '../../../../components/v2/button';
import { ButtonType } from '../../../../constants/enum';
import { screenTitle } from '../../../../constants';
import { useIsFocused } from '@react-navigation/native';
import Loading from '../../../../components/v2/loading';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CardSignupLandingScreenV2 = ({ navigation, route }) => {
  const {
    deductAmountNow = false,
    toPage = '',
    cardBalance = 0,
  } = route.params ?? {};
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);

  const getFirstRender = async () => {
    const data = await AsyncStorage.getItem('firstViewCardSignup');
    if (!data) {
      await AsyncStorage.setItem('firstViewCardSignup', 'old');
      setShowOnboarding(true);
      navigation.reset({
        index: 0,
        routes: [{ name: screenTitle.CARD_V2_WELCOME_SCREEN }],
      });
    } else {
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void getFirstRender();
    setLoading(false);
  }, [isFocused]);

  const steps = [
    {
      icon: AppImages.GLOBE_OUTLINE_ICON,
      title: 'Check if your country is supported',
      description: 'Please check the list and proceed with onboarding.',
      linkText: 'List of non-supported Countries',
      link: 'https://help.cypherhq.io/en/collections/10386371-supported-and-unsupported-countries-list',
    },
    { icon: AppImages.USER_OUTLINE_ICON, title: 'Enter your Basic Details' },
    { icon: AppImages.HOUSE_OUTLINE_ICON, title: 'Enter your deliver Address' },
    { icon: AppImages.EMAIL_OUTLINE_ICON, title: 'Email verification' },
    { icon: AppImages.TELEGRAM_OUTLINE_ICON, title: 'Setup Telegram' },
    {
      icon: AppImages.ID_CARD_OUTLINE_ICON,
      title: 'Update your Identity',
      description: 'Keep your passport or driving licence handy',
    },
    { icon: AppImages.CASH_OUTLINE_ICON, title: 'Your first Card load' },
  ];

  if (loading) return <Loading />;

  return (
    <SafeAreaView className='flex bg-cardBg h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#FFFFFF'} />
      {!showOnboarding && (
        <>
          <ScrollView className='px-[16px] pt-[16px]'>
            <CyDView>
              <CyDTouchView
                onPress={() => navigation.goBack()}
                className='w-[36px] h-[36px]'>
                <CyDImage
                  source={AppImages.BACK_ARROW_GRAY}
                  className='w-[36px] h-[36px]'
                />
              </CyDTouchView>
            </CyDView>
            <CyDText className='text-[28px] font-bold mt-[12px]'>
              Get your Card
            </CyDText>
            <CyDText className='text-[16px] text-gray-500 mt-[4px] mb-[24px]'>
              Here is what you need to do next
            </CyDText>

            {steps.map((step, index) => (
              <CyDView key={index} className='flex-row mb-[24px]'>
                <CyDImage
                  source={step.icon}
                  className='w-[24px] h-[24px] mr-[12px] mt-[2px]'
                />
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold'>
                    {step.title}
                  </CyDText>
                  {step.description && (
                    <CyDText className='text-[14px] text-gray-500 mt-[2px]'>
                      {step.description}
                    </CyDText>
                  )}
                  {step.link && (
                    <CyDTouchView
                      onPress={() => void Linking.openURL(step.link)}>
                      <CyDText className='text-[14px] text-blue-500 mt-[8px] underline'>
                        {step.linkText}
                      </CyDText>
                    </CyDTouchView>
                  )}
                </CyDView>
              </CyDView>
            ))}
          </ScrollView>

          <CyDView className='px-[16px] bg-white py-[24px]'>
            <Button
              type={ButtonType.GREY_FILL}
              title={'I have referral code'}
              onPress={() =>
                navigation.navigate(screenTitle.I_HAVE_REFERRAL_CODE_SCREEN, {
                  deductAmountNow,
                  toPage,
                  cardBalance,
                  referralCodeFromLink: '',
                })
              }
              style='mb-[12px] p-[16px] w-full'
              titleStyle='text-[16px] font-semibold'
            />
            <Button
              type={ButtonType.PRIMARY}
              title={'Continue'}
              onPress={() => {
                navigation.navigate(screenTitle.SELECT_PLAN, {
                  deductAmountNow,
                  toPage,
                  cardBalance,
                });
              }}
              style='p-[16px] w-full'
              titleStyle='text-[16px] font-semibold'
            />
          </CyDView>
        </>
      )}
    </SafeAreaView>
  );
};

export default CardSignupLandingScreenV2;
