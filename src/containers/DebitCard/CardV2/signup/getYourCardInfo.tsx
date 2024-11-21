import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../assets/images/appImages';
import Button from '../../../../components/v2/button';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { screenTitle } from '../../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { removeReferralCode } from '../../../../core/asyncStorage';
import { ButtonType } from '../../../../constants/enum';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loading from '../../../../components/v2/loading';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import SelectPlanModal from '../../../../components/selectPlanModal';

interface RouteParams {
  deductAmountNow: boolean;
  toPage: string;
}

export default function GetYourCardInfo() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);

  const { deductAmountNow = false, toPage = '' } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const handleLinkPress = async () => {
    await Linking.openURL(
      'https://help.cypherhq.io/en/articles/9847350-list-of-supported-counties',
    );
  };

  const getFirstRender = async () => {
    const data = await AsyncStorage.getItem('firstViewCardSignup');
    if (!data) {
      await AsyncStorage.setItem('firstViewCardSignup', 'old');
      setShowOnboarding(true);
      navigation.reset({
        index: 0,
        routes: [{ name: screenTitle.CARD_WELCOME_SCREEN }],
      });
    } else {
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void getFirstRender();
    setLoading(false);
  }, []);

  const handleNavigation = () => {
    if (toPage) {
      navigation.navigate(toPage);
    }
  };

  const onPressContinue = async () => {
    await removeReferralCode();
    setPlanChangeModalVisible(true);
  };

  if (loading) return <Loading />;

  return (
    <CyDView style={{ paddingTop: insets.top }}>
      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        deductAmountNow={deductAmountNow}
        onPlanChangeSuccess={handleNavigation}
        onClose={handleNavigation}
      />
      {!showOnboarding && (
        <CyDView className='bg-[#F1F0F5] flex flex-col justify-between h-full'>
          <CyDKeyboardAwareScrollView>
            <CyDView className='px-[16px]'>
              <CyDTouchView
                onPress={() => {
                  globalState?.cardProfile?.pc
                    ? navigation.navigate(screenTitle.DEBIT_CARD_SCREEN)
                    : navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
                }}
                className='w-[36px] h-[36px] my-[16px]'>
                <CyDImage
                  source={AppImages.BACK_ARROW_GRAY}
                  className='w-[36px] h-[36px]'
                />
              </CyDTouchView>

              <CyDText className='font-bold text-[28px]'>
                {t('GET_YOUR_CARD')}
              </CyDText>
              <CyDText className='font-semibold text-[14px] text-base100 mt-[8px]'>
                {t('GET_YOUR_CARD_SUB')}
              </CyDText>

              <CyDView className='mt-[24px]'>
                <CyDView className='flex flex-row '>
                  <CyDImage
                    source={AppImages.COUNTRIES_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDView>
                    <CyDText className='font-semibold text-[16px] text-black'>
                      {t('CHECK_COUNTRY_SUPPORTED')}
                    </CyDText>
                    <CyDText className='font-medium text-[14px] text-base100 w-[75%]'>
                      {t('Please check the list and proceed with onboarding. ')}
                    </CyDText>
                    <CyDTouchView
                      onPress={() => {
                        void handleLinkPress();
                      }}>
                      <CyDText className='font-bold mt-[8px] text-[12px] text-blue300 underline'>
                        {t('List of non-supported Countries')}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[24px]'>
                  <CyDImage
                    source={AppImages.USER_OUTLINE_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='font-semibold text-[16px] text-black'>
                    {t('ENTER_BASIC_DETAILS')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[24px]'>
                  <CyDImage
                    source={AppImages.HOUSE_OUTLINE_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='font-semibold text-[16px] text-black'>
                    {t('ENTER_BILLING_ADDRESS')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[24px]'>
                  <CyDImage
                    source={AppImages.EMAIL_OUTLINE_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='font-semibold text-[16px] text-black'>
                    {t('EMAIL_VERIFICATION')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[24px]'>
                  <CyDImage
                    source={AppImages.TELEGRAM_ICON_BLACK}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='font-semibold text-[16px] text-black'>
                    {t('TELEGRAM_SETUP')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-start mt-[24px]'>
                  <CyDImage
                    source={AppImages.ID_CARD_OUTLINE_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDView>
                    <CyDText className='font-semibold text-[16px] text-black'>
                      {t('UPDATE_INDENTITY')}
                    </CyDText>
                    <CyDText className='font-medium text-[12px] text-base150'>
                      {t('UPDATE_INDENTITY_SUB')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[24px]'>
                  <CyDImage
                    source={AppImages.CASH_OUTLINE_ICON}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='font-semibold text-[16px] text-black'>
                    {t('FIRST_CARD_LOAD')}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDKeyboardAwareScrollView>

          <CyDView className='bg-white px-[16px] w-full pt-[16px] pb-[40px] '>
            <Button
              type={ButtonType.GREY_FILL}
              title={'I have referral code'}
              onPress={() =>
                navigation.navigate(screenTitle.I_HAVE_REFERRAL_CODE_SCREEN, {
                  deductAmountNow,
                  toPage,
                  referralCodeFromLink: '',
                })
              }
              style='mb-[12px] p-[3%]'
            />
            <Button
              title={t('CONTINUE')}
              onPress={() => {
                void onPressContinue();
              }}
            />
          </CyDView>
        </CyDView>
      )}
    </CyDView>
  );
}
