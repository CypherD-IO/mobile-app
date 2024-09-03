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
import {
  ButtonType,
  CypherPlanId,
  GlobalContextType,
} from '../../../../constants/enum';
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
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import useCardUtilities from '../../../../hooks/useCardUtilities';
import {
  CYPHER_PLAN_ID_NAME_MAPPING,
  PlanIdPriority,
} from '../../../../constants/data';
import clsx from 'clsx';

export default function SelectPlan(_navigation: any) {
  const { t } = useTranslation();
  const routeIndexindex = useNavigationState(state => state.index);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { globalState, globalDispatch } = useContext<any>(
    GlobalContext,
  ) as GlobalContextDef;
  const { patchWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const { showModal, hideModal } = useGlobalModalContext();
  const { getWalletProfile } = useCardUtilities();

  const toPage = _navigation?.route?.params?.toPage ?? '';
  const deductAmountNow = _navigation?.route?.params?.deductAmountNow ?? false;
  const cardBalance = _navigation?.route?.params?.cardBalance ?? 0;

  const [showComparision, setShowComparision] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState({
    pageLoading: false,
    basicPlanLoading: false,
    proPlanLoading: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CypherPlanId>(
    CypherPlanId.BASIC_PLAN,
  );

  const profile = globalState.cardProfile;
  const planId = profile?.planInfo?.planId;
  const planData = globalState.planInfo;
  const freePlanData = get(planData, ['default', CypherPlanId.BASIC_PLAN]);
  const proPlanData = get(planData, ['default', CypherPlanId.PRO_PLAN]);

  const onSelectPlan = async (optedPlan: CypherPlanId) => {
    if (optedPlan === CypherPlanId.PRO_PLAN) {
      setLoading({ ...loading, proPlanLoading: true });
    } else setLoading({ ...loading, basicPlanLoading: true });

    if (!deductAmountNow) {
      try {
        const { isError, error } = await patchWithAuth(`/v1/cards/rc/plan`, {
          optedPlanId: optedPlan,
        });
        const resp = await getWalletProfile(globalState.token);
        globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: resp,
        });

        if (optedPlan === CypherPlanId.PRO_PLAN) {
          setLoading({ ...loading, proPlanLoading: false });
        } else setLoading({ ...loading, basicPlanLoading: false });
        if (!isError) {
          showModal('state', {
            type: 'success',
            title: `You have opted for ${get(CYPHER_PLAN_ID_NAME_MAPPING, optedPlan)}`,
            description: 'You can change your plan anytime in future',
            onSuccess: () => {
              if (toPage) navigation.navigate(toPage);
              else {
                navigation.goBack();
              }
              hideModal();
            },
            onFailure: hideModal,
          });
        } else {
          showModal('state', {
            type: 'error',
            title: t('PLAN_UPDATE_FAILED'),
            description: t('CONTACT_CYPHERD_SUPPORT'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          Sentry.captureException(error);
        }
      } catch (err: any) {
        showModal('state', {
          type: 'error',
          title: t('PLAN_UPDATE_FAILED'),
          description: JSON.stringify(err?.message),
          onSuccess: hideModal,
          onFailure: hideModal,
        });

        Sentry.captureException(err);
      }
    } else {
      const planCost = get(planData, ['default', optedPlan ?? '', 'cost'], '');

      if (planCost !== '') {
        if (Number(cardBalance) < Number(Number(planCost))) {
          if (optedPlan === CypherPlanId.PRO_PLAN) {
            setLoading({ ...loading, proPlanLoading: false });
          } else setLoading({ ...loading, basicPlanLoading: false });
          setTimeout(() => {
            showModal('state', {
              type: 'error',
              title: t('INSUFFICIENT_FUNDS'),
              description: `You do not have $${Number(planCost)} balance to change your plan. Please load now to upgrade`,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }, 500);
        } else {
          const { isError, error } = await patchWithAuth(
            '/v1/cards/rc/plan/deduct',
            {
              planId: optedPlan,
            },
          );
          const resp = await getWalletProfile(globalState.token);
          globalDispatch({
            type: GlobalContextType.CARD_PROFILE,
            cardProfile: resp,
          });
          if (optedPlan === CypherPlanId.PRO_PLAN) {
            setLoading({ ...loading, proPlanLoading: false });
          } else setLoading({ ...loading, basicPlanLoading: false });

          if (!isError) {
            showModal('state', {
              type: 'success',
              title: `Your plan has been changed to ${get(CYPHER_PLAN_ID_NAME_MAPPING, optedPlan)} successfully`,
              description: 'You can change your plan anytime in future',
              onSuccess: () => {
                if (toPage) navigation.navigate(toPage);
                else {
                  navigation.goBack();
                }
                hideModal();
              },
              onFailure: hideModal,
            });
          } else {
            showModal('state', {
              type: 'error',
              title: t('PLAN_UPDATE_FAILED'),
              description: error?.message ?? error,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            Sentry.captureException(error);
          }
        }
      } else {
        if (optedPlan === CypherPlanId.PRO_PLAN) {
          setLoading({ ...loading, proPlanLoading: false });
        } else setLoading({ ...loading, basicPlanLoading: false });
        showModal('state', {
          type: 'error',
          title: t('CONTACT_CYPHER_SUPPORT'),
          description: t('UNEXCPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
  };

  const onPressBack = () => {
    navigation.goBack();
  };

  const getFirstRender = async () => {
    const rcProfile = profile?.rc;
    const data = await AsyncStorage.getItem('firstViewCardSignup');
    if (!data) {
      await AsyncStorage.setItem('firstViewCardSignup', 'old');
      if (!rcProfile) {
        setShowOnboarding(true);
        navigation.reset({
          index: 0,
          routes: [{ name: screenTitle.CARD_V2_WELCOME_SCREEN }],
        });
      } else {
        setShowOnboarding(false);
      }
    } else {
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    setLoading({ ...loading, pageLoading: true });
    void getFirstRender();
    setLoading({ ...loading, pageLoading: false });
  }, [isFocused, profile]);

  if (loading.pageLoading || !planData) return <Loading />;

  return (
    <CyDSafeAreaView>
      <CyDScrollView className='bg-[#F1F0F5] h-[88%]'>
        {!showOnboarding && (
          <CyDView>
            <CyDTouchView className='px-[16px] mb-[12px]' onPress={onPressBack}>
              {routeIndexindex === 0 ? (
                <CyDView className='w-[32px] h-[32px] ' />
              ) : (
                <CyDImage
                  source={AppImages.BACK_ARROW_GRAY}
                  className='w-[32px] h-[32px]'
                />
              )}
            </CyDTouchView>
            <CyDView className='px-[16px]'>
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
                        <CyDView className=' bg-n20 py-[16px] px-[12px] rounded-tl-[16px] h-[46px]'>
                          <CyDText className='text-[12px] font-medium text-black'>
                            {t('PLAN_COMAPRISION')}
                          </CyDText>
                        </CyDView>
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
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
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('VIRTUAL_CARD')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('PHYSICAL_CARD')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('METAL_CARD')}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
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
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
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
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('USDC_TOKEN')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('OTHER_TOKENS')}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
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
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('NON_USDC_TXN')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('USDC_TXN')}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
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
                        <CyDView className='flex flex-row items-center my-[16px] pl-[12px] h-[32px]'>
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
                        <CyDView className='bg-n20 py-[16px] px-[12px] h-[46px]'>
                          <CyDText className='text-[12px] text-right font-bold text-black'>
                            {t('STANDARD')}
                          </CyDText>
                        </CyDView>
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* virtual card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {'✅ Free'}
                        </CyDText>
                        {/* physical card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${freePlanData?.physicalCardFee === 0 ? 'FREE' : `$${freePlanData?.physicalCardFee}`} `}
                        </CyDText>
                        {/* metal card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {'🚫'}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* apple and gpay */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black'>
                            {'✅ Free'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='mt-[16px] h-[32px]' />
                        {/* crypto load fee usdc */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${freePlanData?.usdcFee === 0 ? 'FREE' : `${freePlanData?.usdcFee}%`} `}
                        </CyDText>
                        {/* crypto load fee none usdc */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${freePlanData?.nonUsdcFee === 0 ? 'FREE' : `${freePlanData?.nonUsdcFee}%`} `}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='mt-[16px] h-[32px]' />
                        {/* fx fee non usd txn */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${freePlanData?.fxFeePc === 0 ? 'FREE' : `${freePlanData?.fxFeePc}%`} `}
                        </CyDText>
                        {/* fx fee usd txn */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {'✅ Free'}
                        </CyDText>
                        {/* ATM fee */}
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center'>
                          <CyDText className='text-[12px] font-medium text-black pl-[12px]'>
                            {`${freePlanData?.atmFee}%`}
                            {/* {`${freePlanData?.fxFeePc === 0 ? 'FREE' : `${freePlanData?.fxFeePc}%`} `} */}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* chargeback */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center'>
                          <CyDText className='text-[12px] font-medium text-black pl-[12px]'>
                            {`${freePlanData?.chargeBackLimit === 0 ? '🚫' : `$${freePlanData?.chargeBackLimit}`} `}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      <CyDView className='flex flex-col w-[21%] bg-p10 rounded-tr-[16px] rounded-br-[16px]'>
                        <CyDView className=' bg-p10 py-[16px] px-[12px] rounded-tr-[16px] h-[46px]'>
                          <CyDText className='text-center text-[12px] font-bold text-black'>
                            {t('PREMIUM')}
                          </CyDText>
                        </CyDView>
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* virtual card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {'✅ Free'}
                        </CyDText>
                        {/* physical card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${proPlanData?.physicalCardFee === 0 ? '✅ Free' : `$${proPlanData?.physicalCardFee}`} `}
                        </CyDText>
                        {/* metal card */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {'✅ Free *'}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* gpay and apple pay */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black'>
                            {'✅ Free'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* usdc load */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${proPlanData?.usdcFee === 0 ? '✅ Free' : `${proPlanData?.usdcFee}%`} `}
                        </CyDText>
                        {/* non usdc load */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${proPlanData?.nonUsdcFee === 0 ? '✅ Free' : `${proPlanData?.nonUsdcFee}%`} `}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* non usd txn fx fee */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${proPlanData?.fxFeePc === 0 ? '✅ Free' : `${proPlanData?.fxFeePc}%`} `}
                        </CyDText>
                        {/*  usd txn fx fee */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {`${proPlanData?.usdcFee === 0 ? '✅ Free' : `${proPlanData?.usdcFee}%`} `}
                        </CyDText>

                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* ------------------------------ todo ----------------------- */}
                        {/* atm fee */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black pl-[12px]'>
                            {`${proPlanData?.atmFee}%`}
                            {/* {`${proPlanData?.fxFeePc === 0 ? '✅ Free' : `${proPlanData?.fxFeePc}%`} `} */}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* charge back  */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center items-center'>
                          <CyDText className='text-[12px] font-medium text-black text-wrap'>
                            {`${proPlanData?.chargeBackLimit === 0 ? '🚫' : `Upto $${proPlanData?.chargeBackLimit}`} `}
                          </CyDText>
                        </CyDView>

                        {/* <CyDView className='w-full h-[1px] bg-n30 mt-[20px]' /> */}
                      </CyDView>
                    </CyDView>

                    {/* usage details */}
                    <CyDText className='mt-[16px] text-[12px] font-semibold text-black mb-[6px]'>
                      {t('USAGE_DETAILS')}
                    </CyDText>
                    <CyDView className='flex flex-row w-full'>
                      <CyDView className='w-[58%] flex flex-col bg-white rounded-tl-[16px] rounded-bl-[16px]'>
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                          <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                            <CyDImage
                              source={AppImages.MANAGE_CARD}
                              className='w-[24px] h-[24px]'
                            />
                          </CyDView>
                          <CyDText className='font-bold text-[12px] h-[18px]'>
                            {t('CARD_SPENDING_LIMIT')}
                          </CyDText>
                        </CyDView>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('DAILY_LIMIT')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('MONTHYL_LIMIT')}
                        </CyDText>
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                          {t('HIGHER_LIMIT')}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                          <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                            <CyDImage
                              source={AppImages.ONLINE_TRANSACTIONS}
                              className='w-[24px] h-[24px]'
                            />
                          </CyDView>
                          <CyDText className='font-bold text-[12px] h-[18px]'>
                            {t('COUNTRIES_SUPPORTED')}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                          <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                            <CyDImage
                              source={AppImages.CARD_AND_PIN_TRANSACTIONS}
                              className='w-[24px] h-[24px]'
                            />
                          </CyDView>
                          <CyDText className='font-bold text-[12px] h-[18px]'>
                            {t('MERCHANTS_SUPPORTED')}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        <CyDView className='flex flex-row items-center my-[16px] pl-[12px] h-[32px]'>
                          <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                            <CyDImage
                              source={AppImages.MANAGE_CARD}
                              className='w-[24px] h-[24px]'
                            />
                          </CyDView>
                          <CyDText className='font-bold text-[12px] h-[18px]'>
                            {t('ADD_ON_CARDS')}
                          </CyDText>
                        </CyDView>
                      </CyDView>

                      <CyDView className='w-[21%] flex flex-col bg-white'>
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* daily limit */}
                        <CyDText className='text-[12px] font-medium text-black text-center mt-[10px] h-[18px]'>
                          {`$${freePlanData?.dailyLimit}`}
                        </CyDText>
                        {/* montly limit */}
                        <CyDText className='text-[12px] font-medium text-black pl-[12px] text-center  mt-[10px] h-[18px]'>
                          {`$${freePlanData?.monthlyLimit}`}
                        </CyDText>
                        {/* higher limit */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black text-center pl-[12px] h-[18px]'>
                          {'🚫'}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* countries supported */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px]'>
                            {'195+'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* merchants supported */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px]'>
                            {'50M+'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* add ons */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px]'>
                            {'🚫'}
                          </CyDText>
                        </CyDView>
                      </CyDView>

                      <CyDView className='w-[21%] flex flex-col bg-white  rounded-tr-[16px] rounded-br-[16px]'>
                        <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                        {/* daily limit */}
                        <CyDText className='text-[12px] font-medium text-black pl-[12px] text-center mt-[10px] h-[18px]'>
                          {`$${proPlanData?.dailyLimit}`}
                        </CyDText>
                        {/* montly limit */}
                        <CyDText className='text-[12px] font-medium text-black pl-[12px] text-center mt-[10px] h-[18px]'>
                          {`$${proPlanData?.monthlyLimit}`}
                        </CyDText>
                        {/* higher limit */}
                        <CyDText className='text-[12px] font-medium mt-[10px] text-black text-center pl-[12px] h-[18px]'>
                          {'✅ *'}
                        </CyDText>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* countries supported */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px]'>
                            {'195+'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* merchants supported */}
                        <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center items-start pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px]'>
                            {'50M+'}
                          </CyDText>
                        </CyDView>
                        <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                        {/* add ons */}
                        <CyDView className='my-[16px] h-[42px] flex flex-col justify-center items-start pl-[12px]'>
                          <CyDText className='text-[12px] font-medium text-black text-center pl-[12px] text-wrap '>
                            {'Upto 3 cards'}
                          </CyDText>
                        </CyDView>
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

              <CyDModalLayout
                isModalVisible={showConsent}
                style={styles.modalLayout}
                setModalVisible={setShowConsent}>
                <CyDView
                  className={'bg-n30 rounded-t-[20px] p-[16px] pb-[40px]'}>
                  <CyDView
                    className={'flex flex-row justify-between items-center'}>
                    <CyDView />
                    <CyDText className='text-[28px] font-bold'>
                      {t('CHANGE_PLAN')}
                    </CyDText>
                    <CyDTouchView
                      onPress={() => {
                        setShowConsent(false);
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
                  <CyDView>
                    <CyDView className='flex flex-row items-center mt-[24px]'>
                      <CyDTouchView
                        className={clsx(
                          'h-[20px] w-[20px] border-[1px] rounded-[4px]',
                          {
                            'bg-black': hasConsent,
                          },
                        )}
                        onPress={() => {
                          setHasConsent(!hasConsent);
                        }}>
                        {true && (
                          <CyDImage
                            source={AppImages.CORRECT}
                            className='h-[15px] w-[15px] ml-[2px]'
                            resizeMode='contain'
                          />
                        )}
                      </CyDTouchView>
                      <CyDText className='px-[12px] text-[12px]'>
                        {selectedPlan === CypherPlanId.BASIC_PLAN
                          ? t('DOWNGRADE_PLAN_CONSENT')
                          : t('UPGRADE_PLAN_CONSENT')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='mt-[18px]'>
                      <Button
                        disabled={!hasConsent}
                        title={t('CONTINUE_ALL_CAPS')}
                        onPress={() => {
                          void onSelectPlan(selectedPlan);
                          setShowConsent(false);
                        }}
                      />
                      <Button
                        style='mt-[12px]'
                        type={ButtonType.SECONDARY}
                        title={t('CANCEL')}
                        onPress={() => {
                          setShowConsent(false);
                        }}
                      />
                    </CyDView>
                  </CyDView>
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

              {/* current plan */}
              {planId && deductAmountNow && (
                <CyDView className='flex flex-row items-center mb-[16px]'>
                  <CyDText className='font-medium text-[14px]'>
                    {t('CURRENT_PLAN') + ': '}
                  </CyDText>
                  <CyDView className=''>
                    <CyDText className='font-extrabold text-[16px] text-center'>
                      {get(CYPHER_PLAN_ID_NAME_MAPPING, planId)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              )}

              {/* pro plan */}
              <CyDView
                className={clsx(
                  'bg-white p-[16px] border-[1px] border-n50 rounded-[16px]',
                  {
                    'border-[3px] border-appColor':
                      deductAmountNow && planId === CypherPlanId.PRO_PLAN,
                  },
                )}>
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
                    {`$${proPlanData?.cost}`}
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
                      {`${proPlanData?.fxFeePc}%`}
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
                      {`${proPlanData?.usdcFee === 0 ? 'FREE' : `${proPlanData?.usdcFee}%`} `}
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
                      {`${proPlanData?.nonUsdcFee}%`}
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
                      {`${proPlanData?.physicalCardFee === 0 ? 'FREE' : `$${proPlanData?.usdcFee}`} `}
                    </CyDText>
                    <CyDText className='font-medium text-[14px] ml-[8px]'>
                      {t('PHYSICAL_CARD')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='mt-[16px]'>
                  <CyDView className=' flex flex-row items-center'>
                    <CyDText className='font-bold text-[14px] ml-[8px]'>
                      {`${proPlanData?.physicalCardFee === 0 ? 'FREE' : `$${proPlanData?.usdcFee}`} `}
                    </CyDText>
                    <CyDText className='font-medium text-[14px] ml-[8px] text-wrap'>
                      {t('METAL_CARD') + '  (offer till 31st Oct)'}
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
                    title={
                      deductAmountNow
                        ? planId === CypherPlanId.PRO_PLAN
                          ? t('CURRENT')
                          : t('UPGRADE')
                        : t('GET_STARTED')
                    }
                    onPress={() => {
                      if (deductAmountNow) {
                        setSelectedPlan(CypherPlanId.PRO_PLAN);
                        setShowConsent(true);
                      } else {
                        void onSelectPlan(CypherPlanId.PRO_PLAN);
                      }
                    }}
                    loading={loading.proPlanLoading}
                    style='h-[52px]'
                    loaderStyle={styles.buttonStyle}
                    disabled={
                      deductAmountNow &&
                      get(PlanIdPriority, planId ?? '', 0) >=
                        get(PlanIdPriority, CypherPlanId.PRO_PLAN)
                    }
                  />
                </CyDView>
              </CyDView>
              {/* standard plan */}
              <CyDView
                className={clsx(
                  'bg-white mt-[16px] p-[16px] border-[1px] border-n50 rounded-[16px]',
                  {
                    'border-[3px] border-appColor':
                      deductAmountNow && planId === CypherPlanId.BASIC_PLAN,
                  },
                )}>
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
                      {`${freePlanData?.fxFeePc}%`}
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
                      {`${freePlanData?.usdcFee}%`}
                    </CyDText>
                    <CyDText className='font-medium text-[14px] ml-[8px]'>
                      {t('CARD_LOAD_FEE_USDC')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='mt-[16px]'>
                  <CyDView className=' flex flex-row items-center'>
                    <CyDText className='font-bold text-[14px] ml-[8px]'>
                      {`${freePlanData?.nonUsdcFee}%`}
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
                      {`$${freePlanData?.physicalCardFee}`}
                    </CyDText>
                    <CyDText className='font-medium text-[14px] ml-[8px]'>
                      {t('PHYSICAL_CARD')}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView className='mt-[16px]'>
                  <Button
                    title={
                      deductAmountNow
                        ? planId === CypherPlanId.BASIC_PLAN
                          ? t('CURRENT')
                          : t('DOWNGRADE')
                        : t('GET_STARTED')
                    }
                    onPress={() => {
                      if (deductAmountNow) {
                        setSelectedPlan(CypherPlanId.BASIC_PLAN);
                        setShowConsent(true);
                      } else {
                        void onSelectPlan(CypherPlanId.BASIC_PLAN);
                      }
                    }}
                    style='h-[52px]'
                    loaderStyle={styles.buttonStyle}
                    loading={loading.basicPlanLoading}
                    disabled={
                      deductAmountNow &&
                      get(PlanIdPriority, planId ?? '', 0) >=
                        get(PlanIdPriority, CypherPlanId.BASIC_PLAN)
                    }
                  />
                </CyDView>
                {deductAmountNow &&
                  get(PlanIdPriority, planId ?? '', 0) >=
                    get(PlanIdPriority, CypherPlanId.BASIC_PLAN) && (
                    <CyDText className='mt-[8px] text-[12px]'>{`* Please contact support to downgrade`}</CyDText>
                  )}
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
            </CyDView>
          </CyDView>
        )}
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  buttonStyle: {
    height: 25,
    width: 25,
  },
});
