import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../assets/images/appImages';
import { t } from 'i18next';
import { GlobalContext, GlobalContextDef } from '../core/globalContext';
import useCardUtilities from '../hooks/useCardUtilities';
import { get, round } from 'lodash';
import { ButtonType, CypherPlanId, GlobalContextType } from '../constants/enum';
import Button from './v2/button';
import { useSharedValue } from 'react-native-reanimated';
import { Slider } from 'react-native-awesome-slider';
import clsx from 'clsx';
import { CYPHER_PLAN_ID_NAME_MAPPING } from '../constants/data';
import useAxios from '../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from './v2/GlobalModal';
import { screenTitle } from '../constants';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  sliderContainer: {
    borderRadius: 4,
  },
  loaderStyle: {
    width: 19,
    height: 19,
  },
});

export default function SelectPlanModal({
  isModalVisible,
  setIsModalVisible,
  deductAmountNow = false,
  openComparePlans = false,
  cardProvider,
  cardId,
  onPlanChangeSuccess,
  onClose,
}: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  deductAmountNow?: boolean;
  openComparePlans?: boolean;
  cardProvider?: string;
  cardId?: string;
  onPlanChangeSuccess?: () => void;
  onClose?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { globalState, globalDispatch } = useContext<any>(
    GlobalContext,
  ) as GlobalContextDef;

  const { getWalletProfile } = useCardUtilities();
  const { getWithAuth, patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState(false);

  const [sliderValues, setSliderValues] = useState<{
    forex: number;
    nonUsdc: number;
    usdc: number;
  }>({
    forex: 3000,
    nonUsdc: 1000,
    usdc: 5000,
  });

  const [isChecked, setIsChecked] = useState({
    physicalCard: false,
    addonCard: false,
    metalCard: false,
  });
  const [recommendedPlan, setRecommendedPlan] = useState(
    CypherPlanId.BASIC_PLAN,
  );
  const [totalSavings, setTotalSavings] = useState(0);
  const [showComparision, setShowComparision] = useState(false);
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [consent, setConsent] = useState(false);

  const planData = globalState.planInfo;
  const freePlanData = get(planData, ['default', CypherPlanId.BASIC_PLAN]);
  const proPlanData = get(planData, ['default', CypherPlanId.PRO_PLAN]);

  const forexSpend = useSharedValue(3000);
  const forexMin = useSharedValue(0);
  const forexMax = useSharedValue(10000);
  const nonUsdcLoad = useSharedValue(1000);
  const nonUsdcMin = useSharedValue(0);
  const nonUsdcMax = useSharedValue(10000);
  const usdcLoad = useSharedValue(5000);
  const usdcMin = useSharedValue(0);
  const usdcMax = useSharedValue(10000);

  useEffect(() => {
    if (openComparePlans) {
      setShowComparision(true);
    }
  }, [openComparePlans]);

  useEffect(() => {
    calculateValue();
  }, [
    sliderValues.forex,
    sliderValues.usdc,
    sliderValues.nonUsdc,
    isChecked.addonCard,
    isChecked.metalCard,
    isChecked.physicalCard,
  ]);

  const calculateValue = () => {
    try {
      const monthlySpendNonUSD = sliderValues.forex;
      const annualSpendNonUSD = monthlySpendNonUSD * 12;
      const annualLoadUSDC = sliderValues.usdc * 12;
      const annualLoadNonUSDC = sliderValues.nonUsdc * 12;

      let freePlanCost = get(freePlanData, 'cost', 0);
      let proPlanCost = get(proPlanData, 'cost', 199);

      // Calculate costs for free plan
      freePlanCost += annualLoadUSDC * (freePlanData.usdcFee / 100);
      freePlanCost += annualLoadNonUSDC * (freePlanData.nonUsdcFee / 100);
      freePlanCost += annualSpendNonUSD * (freePlanData.fxFeePc / 100);
      if (isChecked.physicalCard) freePlanCost += freePlanData.physicalCardFee;

      // Calculate costs for pro plan
      proPlanCost += annualLoadNonUSDC * (proPlanData.nonUsdcFee / 100);
      proPlanCost += annualSpendNonUSD * (proPlanData.fxFeePc / 100);

      // Calculate savings
      const savings = freePlanCost - proPlanCost;
      setTotalSavings(savings);
      if (monthlySpendNonUSD > 7000) {
        setRecommendedPlan(CypherPlanId.PRO_PLAN);
      } else if (isChecked.metalCard || isChecked.addonCard) {
        setRecommendedPlan(CypherPlanId.PRO_PLAN);
      } else if (savings > 0) {
        setRecommendedPlan(CypherPlanId.PRO_PLAN);
      } else {
        setRecommendedPlan(CypherPlanId.BASIC_PLAN);
      }
    } catch (error) {
      setRecommendedPlan(CypherPlanId.BASIC_PLAN);
    }
  };

  const fetchCardBalance = async () => {
    if (cardProvider && cardId) {
      const url = `/v1/cards/${cardProvider}/card/${String(cardId)}/balance`;
      try {
        const response = await getWithAuth(url);
        if (
          !response.isError &&
          response?.data &&
          response.data.balance !== undefined
        ) {
          return response.data.balance;
        } else {
          return 0;
        }
      } catch (error) {
        Sentry.captureException(error);
        return 0;
      }
    }
  };

  const onPlanUpgrade = async (
    optedPlan: CypherPlanId = CypherPlanId.BASIC_PLAN,
  ) => {
    setLoading(true);
    const planCost = get(planData, ['default', optedPlan ?? '', 'cost'], '');

    if (planCost !== '' && cardProvider && cardId) {
      const cardBalance = await fetchCardBalance();
      if (Number(cardBalance) < Number(planCost)) {
        setLoading(false);
        setIsModalVisible(false);
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

        setLoading(false);
        if (!isError) {
          setIsModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'success',
              title: `Your plan has been changed to ${get(CYPHER_PLAN_ID_NAME_MAPPING, optedPlan)} successfully`,
              description: 'You can change your plan anytime in the future',
              onSuccess: () => {
                hideModal();
                onPlanChangeSuccess?.();
              },
              onFailure: hideModal,
            });
          }, 500);
        } else {
          setIsModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'error',
              title: t('PLAN_UPDATE_FAILED'),
              description: error?.message ?? error,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }, 500);
          Sentry.captureException(error);
        }
      }
    } else {
      setLoading(false);
      setIsModalVisible(false);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('CONTACT_CYPHER_SUPPORT'),
          description: t('UNEXPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    }
  };

  const onSelectPlan = async (
    optedPlan: CypherPlanId = CypherPlanId.BASIC_PLAN,
  ) => {
    setLoading(true);
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

        if (!isError) {
          setIsModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'success',
              title: `You have opted for ${get(CYPHER_PLAN_ID_NAME_MAPPING, optedPlan)}`,
              description: 'You can change your plan anytime in the future',
              onSuccess: () => {
                hideModal();
                if (onPlanChangeSuccess) {
                  setTimeout(() => {
                    onPlanChangeSuccess();
                  }, 500);
                }
              },
              onFailure: hideModal,
            });
          }, 500);
        } else {
          setIsModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'error',
              title: t('PLAN_UPDATE_FAILED'),
              description: t('CONTACT_CYPHERD_SUPPORT'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }, 500);
          Sentry.captureException(error);
        }
      } catch (err: any) {
        setIsModalVisible(false);
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('PLAN_UPDATE_FAILED'),
            description: JSON.stringify(err?.message),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, 500);

        Sentry.captureException(err);
      }
    } else {
      setConsentModalVisible(true);
    }
    setLoading(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      useNativeDriver={true}
      setModalVisible={setIsModalVisible}>
      <GestureHandlerRootView>
        <CyDModalLayout
          setModalVisible={setShowComparision}
          isModalVisible={showComparision}
          style={styles.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}>
          <CyDView className={'bg-n30 h-[90%] rounded-t-[20px] p-[16px]'}>
            <CyDView className={'flex flex-row justify-between items-center'}>
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
                  <CyDText className='text-[12px] font-medium mt-[28px] text-black pl-[12px] h-[18px]'>
                    {t('ADD_ON_CARDS')}
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
                  <CyDView className='flex'>
                    <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                      {'✅ Plastic'}
                    </CyDText>
                    <CyDText className='text-[10px] font-medium text-black pl-[12px] h-[18px]'>
                      {`${freePlanData?.physicalCardFee === 0 ? 'FREE' : `($${freePlanData?.physicalCardFee}`} fee)`}
                    </CyDText>
                  </CyDView>
                  {/* add on cards */}
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
                    {`${freePlanData?.nonUsdcFee === 0 ? 'FREE' : `${freePlanData?.nonUsdcFee}%*`} `}
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
                  <CyDView className='flex'>
                    <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                      {`✅ Metal`}
                    </CyDText>
                    <CyDText className='text-[10px] font-medium text-black pl-[12px] h-[18px]'>
                      {`(🎉 Free)`}
                    </CyDText>
                  </CyDView>
                  {/* metal card */}
                  <CyDText className='text-[12px] font-medium mt-[10px] text-black pl-[12px] h-[18px]'>
                    {'✅ 3 Cards'}
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
                </CyDView>
              </CyDView>

              {/* Note */}
              <CyDText className='text-n200 text-[12px] font-normal mt-[7px]'>
                {t('COMPARISION_NOTE_1')}
              </CyDText>
              <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                {t('COMPARISION_NOTE_2')}
              </CyDText>
              <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                {t('COMPARISION_NOTE_3')}
              </CyDText>
              <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                {t('COMPARISION_NOTE_4')}
              </CyDText>
            </CyDScrollView>
          </CyDView>
        </CyDModalLayout>

        <CyDModalLayout
          setModalVisible={setConsentModalVisible}
          isModalVisible={consentModalVisible}
          style={styles.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}>
          <CyDView className={'bg-n30 rounded-t-[20px] p-[16px]'}>
            <CyDView className='flex-row justify-between items-center'>
              <CyDView className='flex-row gap-x-[4px] items-center'>
                <CyDText className='text-[20px] font-bold'>
                  {'Upgrading to'}
                </CyDText>
                <CyDFastImage
                  source={AppImages.PREMIUM_LABEL}
                  className='h-[30px] w-[100px]'
                  resizeMode='contain'
                />
              </CyDView>
              <CyDTouchView
                onPress={() => {
                  setConsentModalVisible(false);
                }}>
                <CyDImage
                  source={AppImages.CLOSE_CIRCLE}
                  className='w-[24px] h-[24px]'
                />
              </CyDTouchView>
            </CyDView>

            <CyDText className='text-[14px] font-normal mt-[12px]'>
              {`Upgrading to premium will cost you $${proPlanData?.cost}, which is will be deducted from your Cypher card balance immediately after the upgrade. Make sure you have enough balance in your card to cover the cost.`}
            </CyDText>

            <CyDTouchView
              className='flex flex-row items-center mt-[16px]'
              onPress={() => {
                setConsent(!consent);
              }}>
              <CyDView
                className={clsx(
                  'h-[20px] w-[20px] border-[1px] rounded-[4px]',
                  {
                    'bg-black': consent,
                  },
                )}>
                {consent && (
                  <CyDImage
                    source={AppImages.CORRECT}
                    className='h-[15px] w-[15px] ml-[2px]'
                    resizeMode='contain'
                  />
                )}
              </CyDView>
              <CyDText className='px-[12px] text-[10px]'>
                {t('UPGRADE_PLAN_CONSENT')}
                <CyDText
                  className='font-bold text-[10px] underline'
                  onPress={() => {
                    setConsentModalVisible(false);
                    setIsModalVisible(false);
                    navigation.navigate(screenTitle.LEGAL_SCREEN);
                  }}>
                  {'terms and conditions'}
                </CyDText>
              </CyDText>
            </CyDTouchView>

            <Button
              title={t('GET_PREMIUM')}
              onPress={() => {
                setConsentModalVisible(false);
                void onPlanUpgrade(CypherPlanId.PRO_PLAN);
              }}
              disabled={!consent}
              loading={loading}
              loaderStyle={styles.loaderStyle}
              titleStyle='text-[14px] font-bold'
              style='p-[3%] my-[12px]'
            />
          </CyDView>
        </CyDModalLayout>

        <CyDView className='h-[100%] mx-[2px] bg-n20'>
          <CyDView className='bg-n0 flex-1' style={{ paddingTop: insets.top }}>
            <CyDView className='bg-n0 flex flex-row justify-between p-[16px] px-[16px]'>
              <CyDView>
                <CyDText className='font-extrabold text-[36px]'>
                  {'Upgrading to '}
                </CyDText>
                <CyDFastImage
                  source={AppImages.PREMIUM_LABEL}
                  className='h-[30px] w-[153px]'
                  resizeMode='contain'
                />
              </CyDView>
              <CyDTouchView
                onPress={() => {
                  setIsModalVisible(false);
                  onClose?.();
                }}>
                <CyDImage
                  source={AppImages.CLOSE}
                  className='w-[24px] h-[24px]'
                />
              </CyDTouchView>
            </CyDView>

            <CyDScrollView className='flex-1'>
              <CyDView className='mt-[16px] px-[16px]'>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className='h-[20px] w-[36px]'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('VIRTUAL_CARD')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDImage
                    source={AppImages.CORRECT_BLACK}
                    className='h-[20px] w-[36px]'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('APPLE_GOOGLE_PAY')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDText className='text-[14px] font-bold w-[36px]'>
                    {t('Free')}
                  </CyDText>
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('PHYSICAL_CARD')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDText className='text-[14px] font-bold w-[36px]'>
                    {`${proPlanData?.fxFeePc}%`}
                  </CyDText>
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('FOREX_FEE')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDText className='text-[14px] font-bold w-[36px]'>
                    {`${proPlanData?.usdcFee === 0 ? 'FREE' : `${proPlanData?.usdcFee}%`} `}
                  </CyDText>
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('CARD_LOAD_FEE_USDC')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDText className='text-[14px] font-bold w-[36px]'>
                    {`${proPlanData?.nonUsdcFee}%`}
                  </CyDText>
                  <CyDText className='text-[14px] ml-[8px] font-medium'>
                    {t('CARD_LOAD_FEE_NON_USDC')}
                  </CyDText>
                </CyDView>

                <CyDView className='my-[16px]'>
                  <Button
                    title={t('COMPARE_PLANS')}
                    onPress={() => {
                      setShowComparision(true);
                    }}
                    titleStyle='text-[14px] font-bold'
                    type={ButtonType.GREY_FILL}
                    style='p-[15px]'
                  />
                  <Button
                    title={`Get Premium for $${proPlanData?.cost}`}
                    onPress={() => {
                      void onSelectPlan(CypherPlanId.PRO_PLAN);
                    }}
                    loading={loading}
                    loaderStyle={styles.loaderStyle}
                    titleStyle='text-[14px] font-bold'
                    style='p-[15px] mt-[12px]'
                  />
                </CyDView>
              </CyDView>

              <CyDView className='bg-n30 p-[16px]'>
                <CyDView className='border border-n50 rounded-[16px] bg-n0 '>
                  <CyDView className='px-[16px] pt-[16px]'>
                    <CyDText className='text-[20px] font-semibold'>
                      Savings Calculator
                    </CyDText>
                    <CyDText className='text-[12px] font-medium mt-[6px]'>
                      Find a plan that best fits your needs
                    </CyDText>
                  </CyDView>

                  <CyDView className='h-[0.5px] w-full border border-n50 border-dashed my-[13px]' />

                  <CyDView className='px-[16px] pb-[13px]'>
                    <CyDView className='flex-row justify-between items-center'>
                      <CyDText className='text-[14px] font-bold'>
                        Monthly non USD Spends
                      </CyDText>
                      <CyDText className='text-[14px] font-bold underline'>
                        {`$${round(sliderValues.forex)}`}
                      </CyDText>
                    </CyDView>
                    <CyDView className='mt-[20px] mr-[16px]'>
                      <Slider
                        progress={forexSpend}
                        containerStyle={styles.sliderContainer}
                        renderBubble={() => {
                          return null;
                        }}
                        steps={10}
                        // thumbWidth={40}
                        markWidth={0}
                        minimumValue={forexMin}
                        maximumValue={forexMax}
                        sliderHeight={4}
                        hapticMode='step'
                        theme={{
                          minimumTrackTintColor: '#FFB900',
                          maximumTrackTintColor: '#EBEDF0',
                        }}
                        renderThumb={() => {
                          return (
                            <CyDView className='w-[20px] h-[20px] rounded-full border-[#FFB900] border-[4px]'>
                              <CyDView className='w-full h-full bg-n0 rounded-full' />
                            </CyDView>
                          );
                        }}
                        onValueChange={value => {
                          setSliderValues({
                            ...sliderValues,
                            forex: round(value),
                          });
                        }}
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='h-[0.5px] w-full border border-n50 border-dashed my-[13px]' />

                  <CyDView className='px-[16px] pb-[13px]'>
                    <CyDView className='flex-row justify-between items-center'>
                      <CyDText className='text-[14px] font-bold'>
                        Monthly USDC Card load
                      </CyDText>
                      <CyDText className='text-[14px] font-bold underline'>
                        {`$${round(sliderValues.usdc)}`}
                      </CyDText>
                    </CyDView>
                    <CyDView className='mt-[20px] mr-[16px]'>
                      <Slider
                        progress={usdcLoad}
                        containerStyle={styles.sliderContainer}
                        renderBubble={() => {
                          return null;
                        }}
                        // thumbWidth={40}
                        steps={10}
                        markWidth={0}
                        minimumValue={usdcMin}
                        maximumValue={usdcMax}
                        sliderHeight={4}
                        hapticMode='step'
                        theme={{
                          minimumTrackTintColor: '#FFB900',
                          maximumTrackTintColor: '#EBEDF0',
                        }}
                        onValueChange={value => {
                          setSliderValues({
                            ...sliderValues,
                            usdc: round(value),
                          });
                        }}
                        renderThumb={() => {
                          return (
                            <CyDView className='w-[20px] h-[20px] rounded-full border-[#FFB900] border-[4px]'>
                              <CyDView className='w-full h-full bg-n0 rounded-full' />
                            </CyDView>
                          );
                        }}
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='h-[0.5px] w-full border border-n50 border-dashed my-[13px]' />

                  <CyDView className='px-[16px] pb-[13px]'>
                    <CyDView className='flex-row justify-between items-center'>
                      <CyDText className='text-[14px] font-bold'>
                        Monthly non USDC Card load
                      </CyDText>
                      <CyDText className='text-[14px] font-bold underline'>
                        {`$${round(sliderValues.nonUsdc)}`}
                      </CyDText>
                    </CyDView>
                    <CyDView className='mt-[20px] mr-[16px]'>
                      <Slider
                        progress={nonUsdcLoad}
                        containerStyle={styles.sliderContainer}
                        renderBubble={() => {
                          return null;
                        }}
                        // thumbWidth={40}
                        steps={10}
                        markWidth={0}
                        minimumValue={nonUsdcMin}
                        maximumValue={nonUsdcMax}
                        sliderHeight={4}
                        hapticMode='step'
                        theme={{
                          minimumTrackTintColor: '#FFB900',
                          maximumTrackTintColor: '#EBEDF0',
                        }}
                        onValueChange={value => {
                          setSliderValues({
                            ...sliderValues,
                            nonUsdc: round(value),
                          });
                        }}
                        renderThumb={() => {
                          return (
                            <CyDView className='w-[20px] h-[20px] rounded-full border-[#FFB900] border-[4px]'>
                              <CyDView className='w-full h-full bg-n0 rounded-full' />
                            </CyDView>
                          );
                        }}
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='h-[0.5px] w-full border border-n50 border-dashed my-[13px]' />

                  <CyDView className='px-[16px]'>
                    <CyDText className='text-[14px] font-bold'>
                      Card Requirement
                    </CyDText>
                    <CyDView className='mt-[12px] flex-row justify-between items-center'>
                      <CyDText className='text-[14px] font-medium'>
                        Physical card
                      </CyDText>
                      <CyDTouchView
                        onPress={() => {
                          setIsChecked({
                            ...isChecked,
                            physicalCard: !isChecked.physicalCard,
                          });
                        }}
                        className='mr-[6px] w-[24px] h-[24px] p-[3px]'>
                        <CyDView
                          className={clsx(
                            ' h-[18px] w-[18px] rounded-[4px] border border-borderColor flex flex-row justify-center items-center p-[3px]',
                            {
                              'bg-p150 border-p150': isChecked.physicalCard,
                            },
                          )}>
                          <CyDImage
                            source={AppImages.WHITE_CHECK_MARK}
                            className='h-[20px] w-[20px]'
                          />
                        </CyDView>
                      </CyDTouchView>
                    </CyDView>
                    <CyDView className='flex-row justify-between items-center mt-[10px]'>
                      <CyDText className='text-[14px] font-medium'>
                        Metal card
                      </CyDText>
                      <CyDTouchView
                        onPress={() => {
                          setIsChecked({
                            ...isChecked,
                            metalCard: !isChecked.metalCard,
                          });
                        }}
                        className='mr-[6px] w-[24px] h-[24px] p-[3px]'>
                        <CyDView
                          className={clsx(
                            ' h-[18px] w-[18px] rounded-[4px] border border-borderColor flex flex-row justify-center items-center p-[3px]',
                            {
                              'bg-p150 border-p150': isChecked.metalCard,
                            },
                          )}>
                          <CyDImage
                            source={AppImages.WHITE_CHECK_MARK}
                            className='h-[20px] w-[20px]'
                          />
                        </CyDView>
                      </CyDTouchView>
                    </CyDView>
                    <CyDView className='flex-row justify-between items-center mt-[10px]'>
                      <CyDText className='text-[14px] font-medium'>
                        Add on cards
                      </CyDText>
                      <CyDTouchView
                        onPress={() => {
                          setIsChecked({
                            ...isChecked,
                            addonCard: !isChecked.addonCard,
                          });
                        }}
                        className='mr-[6px] w-[24px] h-[24px] p-[3px]'>
                        <CyDView
                          className={clsx(
                            ' h-[18px] w-[18px] rounded-[4px] border border-borderColor flex flex-row justify-center items-center p-[3px]',
                            {
                              'bg-p150 border-p150': isChecked.addonCard,
                            },
                          )}>
                          <CyDImage
                            source={AppImages.WHITE_CHECK_MARK}
                            className='h-[20px] w-[20px]'
                          />
                        </CyDView>
                      </CyDTouchView>
                    </CyDView>
                  </CyDView>

                  <CyDView className='h-[0.5px] w-full border border-n50 border-dashed my-[13px]' />

                  <CyDView className='mt-[3px] px-[16px] my-[16px] '>
                    <CyDText className='text-[10px] font-medium'>
                      Consider taking...
                    </CyDText>
                    <CyDText className='text-[20px] font-bold'>
                      {`${get(CYPHER_PLAN_ID_NAME_MAPPING, recommendedPlan, recommendedPlan)}`}
                    </CyDText>

                    {totalSavings > 0 && (
                      <CyDView className='mt-[16px] flex-row justify-between items-center'>
                        <CyDText className='text-[12px] font-medium'>
                          Your Savings
                        </CyDText>
                        <CyDText className='text-[20px] font-bold'>
                          {`🎉 $${Math.abs(totalSavings)}`}
                        </CyDText>
                      </CyDView>
                    )}
                  </CyDView>
                </CyDView>

                <CyDText className='mb-[12px] mt-[24px] font-semibold text-[14px] text-center'>
                  Premium Benefits
                </CyDText>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      Free Physical Card &
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      Card Shipping
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      {t('Ships anywhere in the world*')}
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.POST_CARD}
                      className='h-[60px] w-[57px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      Free Metal card for all
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      the premium users
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      who enrols premium until Dec 31st
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.CARDS_FRONT_AND_BACK_3D}
                      className='h-[63px] w-[62px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      0.5% Discounted forex fee
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      without any spending limit
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      lowest among the other crypto cards
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.CASH_FLOW}
                      className='h-[68px] w-[57px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      Free stable token card load
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      & its unlimited
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      Discounted flat 0.5% for other tokens
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.MOBILE_AND_COINS_3D}
                      className='h-[68px] w-[57px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      Protection against Fraud
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      covered up to $300
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      Only fraud protection card in the industry
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.SHIELD_3D}
                      className='h-[54px] w-[54px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>

                <CyDView className='p-[12px] mt-[12px] bg-n0 rounded-[16px] flex-row justify-between'>
                  <CyDView>
                    <CyDText className='text-[16px] font-semibold'>
                      Higher spending limit per
                    </CyDText>
                    <CyDText className='text-[16px] font-semibold'>
                      month on premium
                    </CyDText>
                    <CyDText className='text-[12px] font-bold text-n300'>
                      Unlock full potential of a crypto card
                    </CyDText>
                  </CyDView>
                  <CyDView className='pr-[12px]'>
                    <CyDFastImage
                      source={AppImages.SHOPPING_WOMEN}
                      className='h-[66px] w-[66px] mx-auto'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDScrollView>
          </CyDView>
        </CyDView>
      </GestureHandlerRootView>
    </CyDModalLayout>
  );
}
