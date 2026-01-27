import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { StyleSheet, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import useCardUtilities from '../../hooks/useCardUtilities';
import { get } from 'lodash';
import {
  CardProviders,
  CypherPlanId,
  GlobalContextType,
} from '../../constants/enum';
import Button from '../../components/v2/button';
import { CYPHER_PLAN_ID_NAME_MAPPING } from '../../constants/data';
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { parseErrorMessage } from '../../core/util';
import { CardDesign } from '../../models/cardDesign.interface';
import { IPlanData } from '../../models/planData.interface';
import Loading from '../../components/v2/loading';
import CyDModalLayout from '../../components/v2/modal';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import {
  PremiumBenefitsCards,
  PremiumFeaturesSummary,
  PremiumUpgradeConsentModal,
} from '../../components/premium';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    width: 19,
    height: 19,
  },
});

export default function PremiumScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;

  const { getWalletProfile, getPlanData } = useCardUtilities();
  const { getWithAuth, patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState(false);
  const [fetchingPlanData, setFetchingPlanData] = useState(false);

  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [noCardModalVisible, setNoCardModalVisible] = useState(false);
  const [planData, setPlanData] = useState<IPlanData | undefined>(undefined);

  const cardProfile = globalState.cardProfile;
  const currentCardProvider = cardProfile?.provider ?? CardProviders.REAP_CARD;
  const card = cardProfile?.rc?.cards?.[0];
  const hasCards = get(cardProfile, ['rc', 'cards'], []).length > 0;
  const cardId = card?.cardId;
  const planInfo = cardProfile?.planInfo;
  const isPremiumUser = planInfo?.planId === CypherPlanId.PRO_PLAN;

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
    void logAnalyticsToFirebase(AnalyticEvent.PREMIUM_SCREEN_VIEWED);
  }, []);

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

  useEffect(() => {
    const handleBackButton = () => {
      navigation.goBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const fetchCardBalance = async () => {
    if (currentCardProvider && cardId) {
      const url = `/v1/cards/${currentCardProvider}/card/${String(
        cardId,
      )}/balance`;
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

    if (planCost !== '' && currentCardProvider && cardId) {
      const cardBalance = await fetchCardBalance();
      if (Number(cardBalance) < Number(planCost)) {
        setLoading(false);
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_FUNDS'),
            description: `You do not have $${Number(
              planCost,
            )} balance to change your plan. Please load now to upgrade`,
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
                navigation.goBack();
              },
              onFailure: hideModal,
            });
          }, 500);
        } else {
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

  const handleGetPremiumPress = () => {
    if (!hasCards) {
      // User doesn't have a card, show modal to redirect to card page
      setNoCardModalVisible(true);
    } else {
      // User has a card, show consent modal for upgrade
      setConsentModalVisible(true);
    }
  };

  const navigateToCardPage = () => {
    setNoCardModalVisible(false);
    navigation.navigate(screenTitle.CARD, {
      screen: screenTitle.DEBIT_CARD_SCREEN,
    });
  };

  // If user is already premium, show a message
  if (isPremiumUser && !fetchingPlanData) {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20'>
        <CyDView className='flex-row items-center p-[16px]'>
          <CyDTouchView onPress={() => navigation.goBack()}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[20px] font-bold ml-[12px]'>
            {t('PREMIUM')}
          </CyDText>
        </CyDView>
        <CyDView className='flex-1 items-center justify-center px-[24px]'>
          <CyDFastImage
            source={AppImages.PREMIUM_LABEL}
            className='h-[40px] w-[160px]'
            resizeMode='contain'
          />
          <CyDText className='text-[18px] font-semibold text-center mt-[24px]'>
            You are already a Premium member!
          </CyDText>
          <CyDText className='text-[14px] text-n200 text-center mt-[8px]'>
            Enjoy all the exclusive benefits of your premium subscription.
          </CyDText>
          <Button
            title={t('MANAGE_SUBSCRIPTION')}
            onPress={() => navigation.navigate(screenTitle.MANAGE_SUBSCRIPTION)}
            style='mt-[24px] px-[24px]'
          />
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n20'>
      {fetchingPlanData && <Loading />}
      {!fetchingPlanData && proPlanData && freePlanData && (
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* No Card Modal */}
          <CyDModalLayout
            setModalVisible={setNoCardModalVisible}
            isModalVisible={noCardModalVisible}
            style={styles.modalLayout}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}>
            <CyDView className={'bg-n30 rounded-t-[20px] p-[16px]'}>
              <CyDView className='flex-row justify-between items-center'>
                <CyDText className='text-[20px] font-bold'>
                  {t('GET_A_CARD_FIRST')}
                </CyDText>
                <CyDTouchView
                  onPress={() => {
                    setNoCardModalVisible(false);
                  }}>
                  <CyDMaterialDesignIcons
                    name={'close'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>

              <CyDView className='mt-[16px]'>
                <CyDText className='text-[14px] text-n200'>
                  To upgrade to Premium, you need to have a Cypher Card first.
                  Get your card now and unlock exclusive premium benefits!
                </CyDText>
              </CyDView>

              <CyDView className='mt-[16px] bg-n0 rounded-[12px] p-[12px]'>
                <CyDView className='flex-row items-center'>
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-green-500'
                  />
                  <CyDText className='text-[14px] font-medium ml-[8px]'>
                    Free virtual card
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-green-500'
                  />
                  <CyDText className='text-[14px] font-medium ml-[8px]'>
                    Apple Pay & Google Pay support
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-green-500'
                  />
                  <CyDText className='text-[14px] font-medium ml-[8px]'>
                    Spend crypto at 50M+ merchants worldwide
                  </CyDText>
                </CyDView>
              </CyDView>

              <Button
                title={t('GET_CARD_NOW')}
                onPress={navigateToCardPage}
                titleStyle='text-[14px] font-bold'
                style='p-[3%] my-[12px]'
              />
            </CyDView>
          </CyDModalLayout>

          {/* Consent Modal for Upgrade */}
          <PremiumUpgradeConsentModal
            isVisible={consentModalVisible}
            setIsVisible={setConsentModalVisible}
            planCost={proPlanData?.cost}
            loading={loading}
            isRainOutOfStock={isRainOutOfStock}
            isReapOutOfStock={isReapOutOfStock}
            onConfirmUpgrade={() => void onPlanUpgrade(CypherPlanId.PRO_PLAN)}
            navigation={navigation}
          />

          {/* Main Content */}
          <CyDView className='h-full bg-n20'>
            <CyDView className='bg-n0 flex-1'>
              <CyDView className='bg-n0 flex flex-row justify-between p-[16px] px-[16px]'>
                <CyDView className='flex-row items-center'>
                  <CyDTouchView onPress={() => navigation.goBack()}>
                    <CyDIcons
                      name='arrow-left'
                      size={24}
                      className='text-base400'
                    />
                  </CyDTouchView>
                  <CyDView className='ml-[12px] flex-row items-center'>
                    <CyDText className='font-extrabold text-[24px]'>
                      {'Upgrade to '}
                    </CyDText>
                    <CyDFastImage
                      source={AppImages.PREMIUM_LABEL}
                      className='h-[24px] w-[120px] ml-[4px]'
                      resizeMode='contain'
                    />
                  </CyDView>
                </CyDView>
              </CyDView>

              <CyDScrollView
                className='flex-1'
                showsVerticalScrollIndicator={false}>
                {/* Premium Features Summary */}
                <PremiumFeaturesSummary proPlanData={proPlanData} />

                {/* Get Premium Button */}
                <CyDView className='my-[16px] px-[16px]'>
                  <Button
                    title={`Get Premium for $${proPlanData?.cost}`}
                    onPress={handleGetPremiumPress}
                    loading={loading}
                    loaderStyle={styles.loaderStyle}
                    titleStyle='text-[14px] font-bold'
                    style='p-[15px]'
                  />
                </CyDView>

                {/* Premium Benefits Cards */}
                <PremiumBenefitsCards proPlanData={proPlanData} />
              </CyDScrollView>
            </CyDView>
          </CyDView>
        </GestureHandlerRootView>
      )}
    </CyDSafeAreaView>
  );
}
