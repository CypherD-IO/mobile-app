import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../assets/images/appImages';
import Button from '../../../../components/v2/button';
import CyDModalLayout from '../../../../components/v2/modal';
import { StyleSheet } from 'react-native';
import useAxios from '../../../../core/HttpRequest';
import { CypherPlanId } from '../../../../constants/enum';
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import { screenTitle } from '../../../../constants';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import { get } from 'lodash';
import Loading from '../../../../components/v2/loading';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SelectPlan(props: {
  route: { params?: { fromPage: string } };
}) {
  const { t } = useTranslation();
  const routeIndexindex = useNavigationState(state => state.index);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { globalState } = useContext<any>(GlobalContext) as GlobalContextDef;
  const { patchWithAuth } = useAxios();
  const isFocused = useIsFocused();

  const fromPage = props.route?.params?.fromPage ?? '';

  const [showComparision, setShowComparision] = useState(false);
  const [loading, setLoading] = useState({
    pageLoading: false,
    basicPlanLoading: false,
    proPlanLoading: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const planData = globalState.planInfo;
  const freePlanData = get(planData, ['default', CypherPlanId.BASIC_PLAN]);
  const proPlanData = get(planData, ['default', CypherPlanId.PRO_PLAN]);

  const onSelectPlan = async (optedPlan: CypherPlanId) => {
    const { isError, error, data } = await patchWithAuth(`/v1/cards/rc/plan`, {
      optedPlanId: optedPlan,
    });
    if (!isError) {
      if (
        fromPage === screenTitle.CARD_V2_WELCOME_SCREEN ||
        fromPage === screenTitle.BRIDGE_CARD_SCREEN ||
        routeIndexindex === 0
      )
        navigation.navigate(screenTitle.CARD_SIGNUP_SCREEN);
      else if (fromPage === screenTitle.BRIDGE_FUND_CARD_SCREEN)
        navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN);
    } else {
      console.log('onSelectPlan ~ error: ', error);
    }
  };

  const onPressBack = () => {
    console.log('fromPage: ', fromPage);
    navigation.goBack();
  };

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
      // await AsyncStorage.removeItem('firstViewCardSignup');
    }
  };

  useEffect(() => {
    setLoading({ ...loading, pageLoading: true });
    void getFirstRender();
    setLoading({ ...loading, pageLoading: false });
  }, [isFocused]);

  if (loading.pageLoading) return <Loading />;

  return (
    <>
      {!showOnboarding && (
        <CyDSafeAreaView className='bg-[#F1F0F5]'>
          <CyDTouchView className='px-[16px] mb-[12px]' onPress={onPressBack}>
            {fromPage === screenTitle.CARD_V2_WELCOME_SCREEN ||
            routeIndexindex === 0 ? (
              <CyDView className='w-[32px] h-[32px] ' />
            ) : (
              <CyDImage
                source={AppImages.BACK_ARROW_CIRCLE}
                className='w-[32px] h-[32px] '
              />
            )}
          </CyDTouchView>
          <CyDScrollView className='px-[16px] mb-[110px]'>
            <CyDModalLayout
              setModalVisible={setShowComparision}
              isModalVisible={showComparision}
              style={styles.modalLayout}
              animationIn={'slideInUp'}
              animationOut={'slideOutDown'}>
              <CyDView className={'bg-n30 h-[90%] rounded-t-[20px] p-[16px]'}>
                <CyDView
                  className={'flex flex-row justify-between items-center'}>
                  <CyDText className='text-[18px] font-bold'>
                    {t('COMPARE_PLANS')}
                  </CyDText>
                  <CyDTouchView
                    onPress={() => {
                      setShowComparision(false);
                    }}
                    className={'text-black'}>
                    <CyDView className='w-[24px] h-[24px] z-[50]'>
                      <CyDImage
                        source={AppImages.CLOSE}
                        className={'w-[16px] h-[16px]'}
                      />
                    </CyDView>
                  </CyDTouchView>
                </CyDView>
                <CyDScrollView className='h-[80%] my-[16px]'>
                  {/* title */}
                  <CyDView className='flex flex-row w-[100%]' />
                  <CyDView />

                  <CyDView className='flex flex-row w-[100%] '>
                    <CyDView className='flex flex-col w-[58%] bg-white rounded-tl-[16px] rounded-bl-[16px]'>
                      <CyDView className=' bg-n20 py-[16px] px-[12px] rounded-tl-[16px]'>
                        <CyDText className='text-[12px] font-medium text-black'>
                          {t('PLAN_COMAPRISION')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.MANAGE_CARD}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CARD')}
                        </CyDText>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('VIRTUAL_CARD')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('PHYSICAL_CARD')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('METAL_CARD')}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.APPLE_AND_GOOGLE_PAY}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('APPLE_GOOGLE_PAY')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.CRYPTO_COINS}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CRYPTO_LOAD_FEE')}
                        </CyDText>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('USDC_TOKEN')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('OTHER_TOKENS')}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.FOREX_FEE}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('FOREX_FEE')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.ATM_FEE}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('ATM_FEE')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center my-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.CHARGE_BACK}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CHARGE_BACK_COVER')}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                    <CyDView className='flex flex-col w-[21%] bg-white'>
                      <CyDView className='bg-n20 py-[16px] px-[12px]'>
                        <CyDText className='text-[12px] text-right font-bold text-black'>
                          {t('STANDARD')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='mt-[6px] h-[32px]' />
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {'✅ Free'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {`${freePlanData.physicalCardFee === 0 ? 'FREE' : `$${freePlanData.physicalCardFee}`} `}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[13px] text-black pl-[12px]'>
                        {'🚫'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDText className='text-[12px] font-medium mt-[20px] text-black pl-[12px]'>
                        {'✅ Free'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[24px]' />
                      <CyDView className='mt-[16px] h-[32px]' />
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {`${freePlanData.usdcFee === 0 ? 'FREE' : `${freePlanData.usdcFee}%`} `}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {`${freePlanData.nonUsdcFee === 0 ? 'FREE' : `${freePlanData.nonUsdcFee}%`} `}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDText className='text-[12px] font-medium mt-[26px] text-black pl-[12px]'>
                        {`${freePlanData.fxFeePc === 0 ? 'FREE' : `${freePlanData.fxFeePc}%`} `}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[21px]' />
                      {/* --------------------- todo dynamically ---------------------  */}
                      <CyDText className='text-[12px] font-medium mt-[26px] text-black pl-[12px]'>
                        {'3%'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[22px]' />
                      <CyDText className='text-[12px] font-medium mt-[22px] text-black pl-[12px]'>
                        {`${freePlanData.chargeBackLimit === 0 ? '🚫' : `$${freePlanData.chargeBackLimit}`} `}
                      </CyDText>
                    </CyDView>
                    <CyDView className='flex flex-col w-[21%] bg-p10 rounded-tr-[16px] rounded-br-[16px]'>
                      <CyDView className=' bg-p10 py-[16px] px-[12px] rounded-tr-[16px] '>
                        <CyDText className='text-center text-[12px] font-bold text-black'>
                          {t('PREMIUM')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='mt-[6px] h-[32px]' />
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {'✅ Free'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {`${proPlanData.physicalCardFee === 0 ? '✅ Free' : `$${proPlanData.physicalCardFee}`} `}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {'✅ (1)'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDText className='text-[12px] font-medium mt-[20px] text-black pl-[12px]'>
                        {'✅ Free'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[24px]' />
                      <CyDText className='text-[12px] font-medium mt-[52px] text-black pl-[12px]'>
                        {`${proPlanData.usdcFee === 0 ? '✅ Free' : `${proPlanData.usdcFee}%`} `}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {`${proPlanData.nonUsdcFee === 0 ? '✅ Free' : `${proPlanData.nonUsdcFee}%`} `}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[20px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {`${proPlanData.fxFeePc === 0 ? '✅ Free' : `${proPlanData.fxFeePc}%`} `}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[22px]' />
                      {/* ------------------------------ todo ----------------------- */}
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {'3%'}
                        {/* {`${proPlanData.fxFeePc === 0 ? '✅ Free' : `${proPlanData.fxFeePc}%`} `} */}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[24px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px] text-wrap'>
                        {`${proPlanData.chargeBackLimit === 0 ? '🚫' : `Upto $${proPlanData.chargeBackLimit}`} `}
                      </CyDText>
                      {/* <CyDView className='w-full h-[1px] bg-n30 mt-[20px]' /> */}
                    </CyDView>
                  </CyDView>

                  {/* usage details */}
                  <CyDText className='mt-[16px] text-[12px] font-semibold text-black mb-[6px]'>
                    {t('USAGE_DETAILS')}
                  </CyDText>
                  <CyDView className='flex flex-row w-full'>
                    <CyDView className='w-[58%] flex flex-col bg-white rounded-tl-[16px] rounded-bl-[16px]'>
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.MANAGE_CARD}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CARD_SPENDING_LIMIT')}
                        </CyDText>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('DAILY_LIMIT')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('MONTHYL_LIMIT')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {t('HIGHER_LIMIT')}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.ONLINE_TRANSACTIONS}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('COUNTRIES_SUPPORTED')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center my-[16px] pl-[12px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.CARD_AND_PIN_TRANSACTIONS}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('MERCHANTS_SUPPORTED')}
                        </CyDText>
                      </CyDView>
                    </CyDView>

                    <CyDView className='w-[21%] flex flex-col bg-white'>
                      <CyDText className='text-[12px] font-medium text-black pl-[12px] mt-[58px]'>
                        {'$5000'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium text-black pl-[12px] mt-[10px]'>
                        {'$20K'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {'🚫'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[13px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {'195+'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[23px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {'50M+'}
                      </CyDText>
                    </CyDView>
                    <CyDView className='w-[21%] flex flex-col bg-p10 rounded-tr-[16px] rounded-br-[16px]'>
                      <CyDText className='text-[12px] font-medium text-black pl-[12px] mt-[58px]'>
                        {'$20K'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium text-black pl-[12px] mt-[10px]'>
                        {'$50K'}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px]'>
                        {'✅ (2)'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[13px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {'195+'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[23px]' />
                      <CyDText className='text-[12px] font-medium mt-[24px] text-black pl-[12px]'>
                        {'50M+'}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  {/* Note */}
                  <CyDText className='text-n200 text-[12px] font-normal mt-[7px]'>
                    {t('COMPARISION_NOTE_1')}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                    {t('COMPARISION_NOTE_2')}
                  </CyDText>
                </CyDScrollView>
              </CyDView>
            </CyDModalLayout>

            {/* title */}
            <CyDView className='flex flex-row justify-between items-center mb-[16px]'>
              <CyDText className='font-bold text-[28px]'>
                {t('PICK_PLAN')}
              </CyDText>
              <CyDTouchView
                className='p-[6px] rounded-[6px] bg-n0 '
                onPress={() => {
                  setShowComparision(true);
                }}>
                <CyDText className='font-bold text-[12px] text-center'>
                  {t('COMPARE_PLANS')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
            {/* standard plan */}
            <CyDView className='bg-white p-[16px] border-[1px] border-n50 rounded-[16px]'>
              <CyDText className='font-bold text-[28px] mb-[8px]'>
                {t('STANDARD')}
              </CyDText>
              <CyDText className='font-medium text-[12px]'>
                {t('STANDARD_PLAN_SUB')}
              </CyDText>

              <CyDView className='flex flex-row mt-[20px] items-end'>
                <CyDText className='font-bold text-[20px] '>
                  {t('FREE_FOREVER')}
                </CyDText>
                <CyDText className='font-semibold text-[10px] text-base100 ml-[4px]'>
                  {t('THATS_OUR_PROMISE')}
                </CyDText>
              </CyDView>

              <CyDView className='mt-[16px]'>
                {/* virtual card */}
                <CyDView className=' flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className='w-[36px] h-[20px]'
                  />
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('VIRTUAL_CARD')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* apple and google pay */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className=' w-[36px] h-[20px]'
                  />
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('APPLE_GOOGLE_PAY')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* forex fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${freePlanData.fxFeePc}%`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('FOREX_FEE')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* card load fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${freePlanData.usdcFee}%`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('CARD_LOAD_FEE_USDC')}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${freePlanData.nonUsdcFee}%`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('CARD_LOAD_FEE_NON_USDC')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* physical card fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`$${freePlanData.physicalCardFee}`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('PHYSICAL_CARD')}
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* atm card fee */}
              {/* ----------------- todo --------------------- */}
              {/* <CyDView className='mt-[16px]'>
            <CyDView className=' flex flex-row items-center'>
              <CyDText className='font-bold text-[14px] ml-[8px]'>
                {`$${freePlanData.atmFee}`}
              </CyDText>
              <CyDText className='font-medium text-[14px] ml-[8px]'>
                {t('ATM_FEE')}
              </CyDText>
            </CyDView>
          </CyDView> */}

              <CyDView className='mt-[16px]'>
                <Button
                  title={t('GET_STARTED')}
                  onPress={() => {
                    setLoading({ ...loading, basicPlanLoading: true });
                    void onSelectPlan(CypherPlanId.BASIC_PLAN);
                    setLoading({ ...loading, basicPlanLoading: false });
                  }}
                />
              </CyDView>
            </CyDView>

            {/* pro plan */}
            <CyDView className='bg-white mt-[16px] p-[16px] border-[1px] border-n50 rounded-[16px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDText className='font-bold text-[28px] mb-[8px]'>
                  {t('PREMIUM')}
                </CyDText>
                <CyDView className=' bg-[#D1EDDE] rounded-[6px] px-[6px] py-[4px]'>
                  <CyDText className='text-[12px] text-successGreen400 font-bold'>
                    {t('💸 Most Rewarding')}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDText className='font-medium text-[12px]'>
                {t('STANDARD_PLAN_SUB')}
              </CyDText>

              <CyDView className='flex flex-row mt-[20px] items-end'>
                <CyDText className='font-bold text-[20px] '>
                  {t('$200')}
                </CyDText>
                <CyDText className='font-semibold text-[10px] text-base100 ml-[4px]'>
                  {t('PAID_ANNNUALLY')}
                </CyDText>
              </CyDView>

              <CyDView className='mt-[16px]'>
                {/* virtual card */}
                <CyDView className=' flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className=' w-[36px] h-[20px]'
                  />
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('VIRTUAL_CARD')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* apple and google pay */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className=' w-[36px] h-[20px]'
                  />
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('APPLE_GOOGLE_PAY')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* forex fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${proPlanData.fxFeePc}%`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('FOREX_FEE')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* USDC card load fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${proPlanData.usdcFee === 0 ? 'FREE' : `${proPlanData.usdcFee}%`} `}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('CARD_LOAD_FEE_USDC')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* non USDC card load fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${proPlanData.nonUsdcFee}%`}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('CARD_LOAD_FEE_NON_USDC')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* physical card fee */}
              <CyDView className='mt-[16px]'>
                <CyDView className=' flex flex-row items-center'>
                  <CyDText className='font-bold text-[14px] ml-[8px]'>
                    {`${proPlanData.physicalCardFee === 0 ? 'FREE' : `$${proPlanData.usdcFee}`} `}
                  </CyDText>
                  <CyDText className='font-medium text-[14px] ml-[8px]'>
                    {t('PHYSICAL_CARD')}
                  </CyDText>
                </CyDView>
              </CyDView>
              {/* ATM card fee */}
              {/* ----------------------------- todo ----------------------------- */}
              {/* <CyDView className='mt-[16px]'>
            <CyDView className=' flex flex-row items-center'>
              <CyDText className='font-bold text-[14px] ml-[8px]'>
                {t('$0')}
              </CyDText>
              <CyDText className='font-medium text-[14px] ml-[8px]'>
                {t('PHYSICAL_CARD')}
              </CyDText>
            </CyDView>
          </CyDView> */}

              <CyDView className='mt-[16px]'>
                <Button
                  title={t('GET_STARTED')}
                  onPress={() => {
                    setLoading({ ...loading, proPlanLoading: true });
                    void onSelectPlan(CypherPlanId.PRO_PLAN);
                    setLoading({ ...loading, proPlanLoading: false });
                  }}
                />
              </CyDView>
            </CyDView>

            {/* offers */}
            {/* <CyDView className='mt-[16px] mb-[6px]'>
          <CyDText className='font-bold text-[14px]'>
            {t('OFFERS_AND_BENEFITS')}
          </CyDText>

          <CyDView className='p-[16px] rounded-t-[16px] bg-white border-[1px] border-n50 border-dashed flex flex-row items-center justify-between'>
            <CyDView className='flex flex-row items-center'>
              <CyDView className='mr-[4px]'>
                <CyDImage
                  className='w-[20px] h-[20px]'
                  source={AppImages.GIFT_BOX_PNG}
                />
              </CyDView>
              <CyDView>
                <CyDText className='font-bold text-[16px]'>
                  {t('WELCOME15')}
                </CyDText>
                <CyDText className='text-base150 font-medium text-[10px]'>
                  {t('15% off on your plan')}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView>
              <CyDText className='text-[12px] font-bold text-p200'>
                {t('APPLY')}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='bg-white px-[16px] py-[10px] rounded-b-[16px]'>
            <CyDText className='font-bold text-[12px] text-center'>
              {t('ENTER_OFFER_CODE')}
            </CyDText>
          </CyDView>
        </CyDView> */}
          </CyDScrollView>
        </CyDSafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
