import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import { StyleSheet, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppImages from '../../assets/images/appImages';
import { t } from 'i18next';
import { GlobalContext, GlobalContextDef } from '../core/globalContext';
import useCardUtilities from '../hooks/useCardUtilities';
import { get } from 'lodash';
import {
  ButtonType,
  CardProviders,
  CypherPlanId,
  GlobalContextType,
} from '../constants/enum';
import Button from './v2/button';
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
import { parseErrorMessage } from '../core/util';
import { CardDesign } from '../models/cardDesign.interface';
import { IPlanData } from '../models/planData.interface';
import Tooltip from 'react-native-walkthrough-tooltip';
import Loading from './v2/loading';
import {
  PremiumBenefitsCards,
  PremiumFeaturesSummary,
  PremiumUpgradeConsentModal,
} from './premium';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    width: 19,
    height: 19,
  },
  tooltipStyle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});

export default function SelectPlanModal({
  isModalVisible,
  setIsModalVisible,
  openComparePlans = false,
  cardProvider,
  cardId,
  onPlanChangeSuccess,
  onClose,
}: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  openComparePlans?: boolean;
  cardProvider?: string;
  cardId?: string;
  onPlanChangeSuccess?: () => void;
  onClose?: () => void;
}) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;

  const { getWalletProfile, getPlanData } = useCardUtilities();
  const { getWithAuth, patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState(false);
  const [fetchingPlanData, setFetchingPlanData] = useState(false);
  const [showUsdcTooltip, setShowUsdcTooltip] = useState(false);

  const [showComparision, setShowComparision] = useState(false);
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [planData, setPlanData] = useState<IPlanData | undefined>(undefined);

  const freePlanData = useMemo(
    () => get(planData, ['default', CypherPlanId.BASIC_PLAN]),
    [planData],
  );

  const proPlanData = useMemo(
    () => get(planData, ['default', CypherPlanId.PRO_PLAN]),
    [planData],
  );

  const [cardDesignData, setCardDesignData] = useState<CardDesign | undefined>(
    undefined,
  );

  const isRainOutOfStock = useMemo(() => {
    return (
      get(cardDesignData, ['metal', 0, 'provider'], CardProviders.REAP_CARD) ===
        CardProviders.RAIN_CARD &&
      !get(cardDesignData, ['metal', 0, 'isStockAvailable'], true)
    );
  }, [cardDesignData]);

  const isReapOutOfStock = useMemo(() => {
    return (
      get(cardDesignData, ['metal', 0, 'provider'], CardProviders.REAP_CARD) ===
        CardProviders.REAP_CARD &&
      !get(cardDesignData, ['metal', 0, 'isStockAvailable'], true)
    );
  }, [cardDesignData]);

  useEffect(() => {
    if (openComparePlans) {
      setShowComparision(true);
    }
  }, [openComparePlans]);

  useEffect(() => {
    const fetchPlanData = async () => {
      setFetchingPlanData(true);
      const planDataValue = await getPlanData(globalState.token);
      setPlanData(planDataValue);
      await getCardDesignValues();
      setFetchingPlanData(false);
    };
    void fetchPlanData();
  }, []);

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

  const getCardDesignValues = async () => {
    const response = await getWithAuth('/v1/cards/designs');
    if (!response.isError) {
      const cardDesignValues: CardDesign = response.data;
      setCardDesignData(cardDesignValues);
    }
  };

  const onPlanUpgrade = async (
    newlyOptedPlan: CypherPlanId = CypherPlanId.PRO_PLAN,
  ) => {
    setLoading(true);
    const planCost = get(
      planData,
      ['default', newlyOptedPlan ?? '', 'cost'],
      '',
    );

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
            planId: newlyOptedPlan,
            forgoMetalCard: true,
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
              title: `Your plan has been changed to ${get(
                CYPHER_PLAN_ID_NAME_MAPPING,
                newlyOptedPlan,
              )} successfully`,
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
              description: parseErrorMessage(error),
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

  return (
    <Modal
      visible={isModalVisible}
      transparent={false}
      animationType='slide'
      presentationStyle='formSheet'
      statusBarTranslucent={false}
      onRequestClose={() => setIsModalVisible(false)}>
      {fetchingPlanData && <Loading />}
      {!fetchingPlanData && proPlanData && freePlanData && (
        <GestureHandlerRootView>
          <Modal
            visible={showComparision}
            transparent={false}
            animationType='slide'
            presentationStyle='formSheet'
            statusBarTranslucent={false}
            onRequestClose={() => setShowComparision(false)}>
            <CyDView className={'bg-n30 h-full p-[16px]'}>
              <CyDView className={'flex flex-row justify-between items-center'}>
                <CyDText className='text-[18px] font-bold'>
                  {t('COMPARE_PLANS')}
                </CyDText>
                <CyDTouchView
                  onPress={() => {
                    setShowComparision(false);
                  }}
                  className={''}>
                  <CyDView className='w-[24px] h-[24px] z-[50]'>
                    <CyDMaterialDesignIcons
                      name={'close'}
                      size={24}
                      className='text-base400'
                    />
                  </CyDView>
                </CyDTouchView>
              </CyDView>
              <CyDScrollView
                className='h-[80%] my-[16px]'
                showsVerticalScrollIndicator={false}>
                <CyDTouchView activeOpacity={1}>
                  {/* title */}
                  <CyDView className='flex flex-row w-[100%]' />
                  <CyDView />

                  <CyDView className='flex flex-row w-[100%] '>
                    <CyDView className='flex flex-col w-[58%] bg-n0 rounded-tl-[16px] rounded-bl-[16px]'>
                      <CyDView className=' bg-n20 py-[16px] px-[12px] rounded-tl-[16px] h-[46px]'>
                        <CyDText className='text-[12px] font-medium '>
                          {t('PLAN_COMPARISON')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px] '>
                          <CyDIcons
                            name='card'
                            size={24}
                            className='text-base400'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CARD')}
                        </CyDText>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {t('VIRTUAL_CARD')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px] mb-[18px] pl-[12px] h-[18px]'>
                        {t('PHYSICAL_CARD')}
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
                            className='w-[24px] h-[24px] rounded-full'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CRYPTO_LOAD_FEE')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row items-center mt-[10px] pl-[12px] h-[18px]'>
                        <CyDText className='text-[12px] font-medium'>
                          {t('USDC_TOKEN')}
                        </CyDText>
                        <Tooltip
                          isVisible={showUsdcTooltip}
                          content={
                            <CyDView className='p-[5px] bg-n40 rounded-[4px]'>
                              <CyDText className='text-[14px] text-base400'>
                                {t('USDC_LOAD_FEE_INFO', {
                                  premiumUSDCFee: proPlanData?.usdcFee,
                                  premiumNonUSDCFee: proPlanData?.nonUsdcFee,
                                  standardNonUSDCFee: freePlanData?.nonUsdcFee,
                                })}
                              </CyDText>
                            </CyDView>
                          }
                          onClose={() => setShowUsdcTooltip(false)}
                          placement='top'
                          backgroundColor='transparent'
                          useInteractionManager={true}
                          contentStyle={styles.tooltipStyle}>
                          <CyDTouchView
                            onPress={() => setShowUsdcTooltip(true)}>
                            <CyDMaterialDesignIcons
                              name='information-outline'
                              size={16}
                              className='text-n200 ml-1'
                            />
                          </CyDTouchView>
                        </Tooltip>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {t('OTHER_TOKENS')}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.FOREX_FEE}
                            className='w-[24px] h-[24px] rounded-full'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('FOREX_MARKUP_NON_USD')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDImage
                            source={AppImages.ATM_FEE}
                            className='w-[24px] h-[24px] rounded-full'
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
                            className='w-[24px] h-[24px] rounded-full'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px]'>
                          {t('CHARGE_BACK_COVER')}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                    <CyDView className='flex flex-col w-[21%] bg-n0'>
                      <CyDView className='bg-n20 py-[16px] px-[12px] h-[46px]'>
                        <CyDText className='text-[12px] text-right font-bold '>
                          {t('STANDARD')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                      {/* virtual card */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {'✅ Free'}
                      </CyDText>
                      {/* physical card */}
                      <CyDView className='flex'>
                        <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                          {'✅ Plastic'}
                        </CyDText>
                        <CyDText className='text-[10px] font-medium  pl-[12px] h-[18px]'>
                          {`${freePlanData?.physicalCardFee === 0 ? 'FREE' : `($${freePlanData?.physicalCardFee} fee)`}`}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* apple and gpay */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium '>
                          {'✅ Free'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='mt-[16px] h-[32px]' />
                      {/* crypto load fee usdc */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {`${freePlanData?.usdcFee === 0 ? 'FREE' : `${freePlanData?.usdcFee}%`} `}
                      </CyDText>
                      {/* crypto load fee none usdc */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {`${freePlanData?.nonUsdcFee === 0 ? 'FREE' : `${freePlanData?.nonUsdcFee}%*`} `}
                      </CyDText>
                      {/* fx fee non usd txn */}
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium mt-[10px]  h-[18px]'>
                          {`${freePlanData?.fxMarkup}%`}
                        </CyDText>
                      </CyDView>
                      {/* ATM fee */}
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center'>
                        <CyDText className='text-[12px] font-medium  pl-[12px]'>
                          {`${freePlanData?.atmFee}%`}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* chargeback */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center'>
                        <CyDText className='text-[12px] font-medium  pl-[12px]'>
                          {`${freePlanData?.chargeBackLimit === 0 ? '🚫' : `$${freePlanData?.chargeBackLimit}`} `}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                    <CyDView className='flex flex-col w-[21%] bg-p10 rounded-tr-[16px] rounded-br-[16px]'>
                      <CyDView className=' bg-p10 py-[16px] px-[12px] rounded-tr-[16px] h-[46px]'>
                        <CyDText className='text-center text-[12px] font-bold '>
                          {t('PREMIUM')}
                        </CyDText>
                      </CyDView>
                      <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                      {/* virtual card */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {'✅ Free'}
                      </CyDText>
                      {/* physical card */}
                      <CyDView className='flex'>
                        <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                          {`✅ Metal`}
                        </CyDText>
                        <CyDText className='text-[10px] font-medium  pl-[12px] h-[18px]'>
                          {`(🎉 Free)`}
                        </CyDText>
                      </CyDView>
                      {/* metal card */}
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* gpay and apple pay */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium '>
                          {'✅ Free'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                      {/* usdc load */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {`${proPlanData?.usdcFee === 0 ? '✅ Free' : `${proPlanData?.usdcFee}%`} `}
                      </CyDText>
                      {/* non usdc load */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {`${proPlanData?.nonUsdcFee === 0 ? '✅ Free' : `${proPlanData?.nonUsdcFee}%`} `}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* non usd txn fx fee */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                          {`${proPlanData?.fxMarkup}%`}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* ------------------------------ todo ----------------------- */}
                      {/* atm fee */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium  pl-[12px]'>
                          {`${proPlanData?.atmFee}%`}
                          {/* {`${proPlanData?.fxFeePc === 0 ? '✅ Free' : `${proPlanData?.fxFeePc}%`} `} */}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* charge back  */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center items-center'>
                        <CyDText className='text-[12px] font-medium  text-wrap'>
                          {`${proPlanData?.chargeBackLimit === 0 ? '🚫' : `Upto $${proPlanData?.chargeBackLimit}`} `}
                        </CyDText>
                      </CyDView>

                      {/* <CyDView className='w-full h-[1px] bg-n30 mt-[20px]' /> */}
                    </CyDView>
                  </CyDView>

                  {/* usage details */}
                  <CyDText className='mt-[16px] text-[12px] font-semibold  mb-[6px]'>
                    {t('USAGE_DETAILS')}
                  </CyDText>
                  <CyDView className='flex flex-row w-full'>
                    <CyDView className='w-[58%] flex flex-col bg-n0 rounded-tl-[16px] rounded-bl-[16px]'>
                      <CyDView className='flex flex-row items-center mt-[16px] pl-[12px] h-[32px]'>
                        <CyDView className='p-[4px] bg-n30 rounded-full w-[32px] h-[32px] mr-[11px]'>
                          <CyDIcons
                            name='card'
                            size={24}
                            className='text-base400'
                          />
                        </CyDView>
                        <CyDText className='font-bold text-[12px] h-[18px]'>
                          {t('CARD_SPENDING_LIMIT')}
                        </CyDText>
                      </CyDView>
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {t('DAILY_LIMIT')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
                        {t('MONTHLY_LIMIT')}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium mt-[10px]  pl-[12px] h-[18px]'>
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

                    <CyDView className='w-[21%] flex flex-col bg-n0'>
                      <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                      {/* daily limit */}
                      <CyDText className='text-[12px] font-medium  text-center mt-[10px] h-[18px]'>
                        {`$${freePlanData?.dailyLimit?.toLocaleString('en-US')}`}
                      </CyDText>
                      {/* montly limit */}
                      <CyDText className='text-[12px] font-medium  pl-[12px] text-center  mt-[10px] h-[18px]'>
                        {`$${freePlanData?.monthlyLimit?.toLocaleString('en-US')}`}
                      </CyDText>
                      {/* higher limit */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  text-center pl-[12px] h-[18px]'>
                        {'✅'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* countries supported */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium  text-center pl-[12px]'>
                          {'195+'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* merchants supported */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium  text-center pl-[12px]'>
                          {'50M+'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                    </CyDView>

                    <CyDView className='w-[21%] flex flex-col bg-n0  rounded-tr-[16px] rounded-br-[16px]'>
                      <CyDView className='mt-[16px] pl-[12px] h-[32px]' />
                      {/* daily limit */}
                      <CyDText className='text-[12px] font-medium  pl-[12px] text-center mt-[10px] h-[18px]'>
                        {`$${proPlanData?.dailyLimit?.toLocaleString('en-US')}`}
                      </CyDText>
                      {/* montly limit */}
                      <CyDText className='text-[12px] font-medium  pl-[12px] text-center mt-[10px] h-[18px]'>
                        {`$${proPlanData?.monthlyLimit?.toLocaleString('en-US')}`}
                      </CyDText>
                      {/* higher limit */}
                      <CyDText className='text-[12px] font-medium mt-[10px]  text-center pl-[12px] h-[18px]'>
                        {'✅'}
                      </CyDText>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* countries supported */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center pl-[12px]'>
                        <CyDText className='text-[12px] font-medium  text-center pl-[12px]'>
                          {'195+'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                      {/* merchants supported */}
                      <CyDView className='mt-[16px] h-[32px] flex flex-col justify-center items-start pl-[12px]'>
                        <CyDText className='text-[12px] font-medium  text-center pl-[12px]'>
                          {'50M+'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='w-full h-[1px] bg-n30 mt-[16px]' />
                    </CyDView>
                  </CyDView>

                  {/* Note */}
                  <CyDText className='text-n200 text-[12px] font-normal mt-[7px]'>
                    {t('COMPARISON_NOTE_1')}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                    {t('COMPARISON_NOTE_2')}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                    {t('COMPARISON_NOTE_3')}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px] font-normal mt-[10px]'>
                    {t('COMPARISON_NOTE_4', {
                      forexMarkupStandard: freePlanData?.fxMarkup,
                      forexMarkupPremium: proPlanData?.fxMarkup,
                    })}
                  </CyDText>
                </CyDTouchView>
              </CyDScrollView>
            </CyDView>
          </Modal>

          <PremiumUpgradeConsentModal
            isVisible={consentModalVisible}
            setIsVisible={setConsentModalVisible}
            planCost={proPlanData?.cost}
            loading={loading}
            isRainOutOfStock={isRainOutOfStock}
            isReapOutOfStock={isReapOutOfStock}
            onConfirmUpgrade={() => void onPlanUpgrade(CypherPlanId.PRO_PLAN)}
            navigation={navigation}
            onClose={() => setIsModalVisible(false)}
          />

          <CyDView className='h-full bg-n20'>
            <CyDView className='bg-n0 flex-1'>
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
                  <CyDMaterialDesignIcons
                    name={'close'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>

              <CyDScrollView
                className='flex-1'
                showsVerticalScrollIndicator={false}>
                {/* Premium Features Summary */}
                <PremiumFeaturesSummary proPlanData={proPlanData} />

                {/* Action Buttons */}
                <CyDView className='my-[16px] px-[16px]'>
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
                      setConsentModalVisible(true);
                    }}
                    loading={loading}
                    loaderStyle={styles.loaderStyle}
                    titleStyle='text-[14px] font-bold'
                    style='p-[15px] mt-[12px]'
                  />
                </CyDView>

                {/* Premium Benefits Cards */}
                <PremiumBenefitsCards proPlanData={proPlanData} />
              </CyDScrollView>
            </CyDView>
          </CyDView>
        </GestureHandlerRootView>
      )}
    </Modal>
  );
}
