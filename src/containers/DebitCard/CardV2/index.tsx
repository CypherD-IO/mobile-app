import Intercom from '@intercom/intercom-react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { get, isEmpty } from 'lodash';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppImages from '../../../../assets/images/appImages';
import { GetPhysicalCardComponent } from '../../../components/getPhysicalCardComponent';
import CardProviderSwitch from '../../../components/cardProviderSwitch';
import GradientText from '../../../components/gradientText';
import SelectPlanModal from '../../../components/selectPlanModal';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import OverchargeDccInfoModal from '../../../components/v2/OverchargeDccInfoModal';
import Button from '../../../components/v2/button';
import Loading from '../../../components/v2/loading';
import TermsAndConditionsModal from '../../../components/v2/termsAndConditionsModal';
import { screenTitle } from '../../../constants';
import {
  DateRange,
  STATUSES,
  TYPES,
  initialCardTxnDateRange,
} from '../../../constants/cardPageV2';
import {
  ACCOUNT_STATUS,
  ButtonType,
  CARD_IDS,
  CardApplicationStatus,
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  CypherPlanId,
  GlobalContextType,
} from '../../../constants/enum';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';
import {
  getOverchargeDccInfoModalShown,
  getRainTerms,
} from '../../../core/asyncStorage';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { isPotentiallyDccOvercharged } from '../../../core/util';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { Card, ICardTransaction } from '../../../models/card.model';
import { CardDesign } from '../../../models/cardDesign.interface';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  CyDFastImage,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import CardScreen from '../bridgeCard/card';
import CardTxnFilterModal from './CardTxnFilterModal';

interface RouteParams {
  cardProvider: CardProviders;
}

export default function CypherCardScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { cardProvider } = route?.params ?? {
    cardProvider: CardProviders.REAP_CARD,
  };
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const [cardBalance, setCardBalance] = useState('0');
  const [currentCardIndex] = useState(0); // Not setting anywhere.
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [
    isTermsAndConditionsModalVisible,
    setIsTermsAndConditionsModalVisible,
  ] = useState(false);
  const [cardDesignData, setCardDesignData] = useState<CardDesign | undefined>(
    undefined,
  );
  const [recentTransactions, setRecentTransactions] = useState<
    ICardTransaction[]
  >([]);
  const [overchargeDccInfoTransactionId, setOverchargeDccInfoTransactionId] =
    useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<{
    types: CardTransactionTypes[];
    dateRange: DateRange;
    statuses: CardTransactionStatuses[];
  }>({
    types: TYPES,
    dateRange: initialCardTxnDateRange,
    statuses: STATUSES,
  });
  const selectedCard = get(cardProfile, [
    cardProvider,
    'cards',
    currentCardIndex,
  ]);
  const cardId = selectedCard?.cardId;
  const isLockdownModeEnabled = get(
    cardProfile,
    ['accountStatus'],
    ACCOUNT_STATUS.ACTIVE,
  );
  const accountStatus = get(cardProfile, ['accountStatus'], '');
  const rcApplicationStatus = get(cardProfile, ['rc', 'applicationStatus'], '');
  const [isLayoutRendered, setIsLayoutRendered] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    expiresOn: number;
    metalCardEligible: boolean;
    planId: CypherPlanId;
    updatedOn: number;
  } | null>(get(cardProfile, ['planInfo'], null));
  const { getWalletProfile, isLegacyCardClosed, getCardSpendStats } =
    useCardUtilities();
  const [spendStats, setSpendStats] = useState<{
    isPremiumPlan: boolean;
    amount: number;
    year: string;
    timePeriod: string;
  }>({
    isPremiumPlan: false,
    amount: 0,
    year: '2025-01-01',
    timePeriod: '3 months',
  });
  const [isOverchargeDccInfoModalOpen, setIsOverchargeDccInfoModalOpen] =
    useState(false);

  const onRefresh = async () => {
    void refreshProfile();
    const spendStatsFromAPI = await getCardSpendStats();
    if (spendStatsFromAPI) {
      const premiumDataStats = spendStatsFromAPI?.projectedSavings;
      let amount = 0;
      if (premiumDataStats?.isPremiumPlan) {
        amount =
          Number(premiumDataStats?.projectedFxFeeSaved ?? 0) +
          Number(premiumDataStats?.projectedLoadFeeSaved ?? 0);
      } else {
        amount =
          Number(premiumDataStats?.projectedFxFeeLost ?? 0) +
          Number(premiumDataStats?.projectedLoadFeeLost ?? 0);
      }

      // Calculate months between current date and target year using moment
      const targetDate = moment(premiumDataStats?.year);
      const currentDate = moment();
      const monthsDiff = Math.abs(currentDate.diff(targetDate, 'months'));
      const timePeriod = `${monthsDiff} months`;

      setSpendStats({
        ...spendStats,
        amount,
        isPremiumPlan: premiumDataStats?.isPremiumPlan,
        year: premiumDataStats?.year,
        timePeriod,
      });
    }
    //
    setCardBalance('0');
    if (cardId !== CARD_IDS.HIDDEN_CARD) {
      await fetchCardBalance();
      void fetchRecentTransactions();
      void getCardDesignValues();
    }
    if (!isLayoutRendered) {
      setIsLayoutRendered(true);
    }
  };

  useEffect(() => {
    if (isFocused) {
      void onRefresh();
    }
  }, [isFocused]);

  useEffect(() => {
    void onRefresh();
  }, [cardProvider]);

  useEffect(() => {
    void getCardDesignValues();
  }, [isFocused, cardId]);

  const checkForOverchargeDccInfo = async (
    transactions: ICardTransaction[],
  ) => {
    const overchargeTransactions = transactions.filter(transaction =>
      isPotentiallyDccOvercharged(transaction),
    );
    const lastOverchargeTransactionIdStored =
      await getOverchargeDccInfoModalShown();
    if (
      lastOverchargeTransactionIdStored !== 'true' &&
      lastOverchargeTransactionIdStored !== overchargeTransactions[0]?.id &&
      overchargeTransactions.length > 0
    ) {
      setOverchargeDccInfoTransactionId(overchargeTransactions[0]?.id);
      setIsOverchargeDccInfoModalOpen(true);
    }
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    setPlanInfo(get(data, ['planInfo'], null));
    if (cardProvider !== CardProviders.PAYCADDY) {
      if (selectedCard?.cardProvider === CardProviders.REAP_CARD) {
        setIsTermsAndConditionsModalVisible(
          !get(data, [cardProvider, 'termsAgreedOn'], 0),
        );
      }
    }
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const fetchCardBalance = async () => {
    setBalanceLoading(true);
    const url = `/v1/cards/${cardProvider}/card/${String(cardId)}/balance`;
    try {
      const response = await getWithAuth(url);
      if (!response.isError && response?.data && response.data.balance) {
        setCardBalance(String(response.data.balance));
      } else {
        setCardBalance('NA');
      }
    } catch (error) {
      Sentry.captureException(error);
      setCardBalance('NA');
    }
    setBalanceLoading(false);
  };
  const fetchRecentTransactions = async () => {
    const txnURL = `/v1/cards/${cardProvider}/card/transactions?newRoute=true&limit=10`;
    const response = await getWithAuth(txnURL);
    if (!response.isError) {
      const { transactions: txnsToSet } = response.data;
      txnsToSet.sort((a: ICardTransaction, b: ICardTransaction) => {
        return a.date < b.date ? 1 : -1;
      });
      await checkForOverchargeDccInfo(txnsToSet);
      setRecentTransactions(txnsToSet.slice(0, 5));
    }
  };

  const onCardActivationConfirmation = (card: Card) => {
    navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
      currentCardProvider: cardProvider,
      card,
    });
  };

  const getCardDesignValues = async () => {
    const response = await getWithAuth('/v1/cards/designs');
    if (!response.isError) {
      const cardDesignValues: CardDesign = response.data;
      setCardDesignData(cardDesignValues);
    }
  };

  const onGetAdditionalCard = () => {
    navigation.navigate(screenTitle.SELECT_ADDITIONAL_CARD, {
      currentCardProvider: cardProvider,
      cardDesignData,
      cardBalance,
    });
  };

  const onPressActivateCard = (card: any) => {
    onCardActivationConfirmation(card);
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.LOCKDOWN_MODE_AUTH, {
      onSuccess: () => {
        showModal('state', {
          type: 'success',
          title: t('Lockdown mode disabled'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      },
      currentCardProvider: cardProvider,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });
  };

  const shouldBlockAction = () => {
    if (
      isLockdownModeEnabled === ACCOUNT_STATUS.LOCKED &&
      cardProvider === CardProviders.REAP_CARD
    ) {
      return true;
    }
    return false;
  };

  const shouldShowLocked = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.INACTIVE &&
      Number(cardBalance) < 0
    ) {
      return true;
    }
    return false;
  };

  const shouldShowActionNeeded = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.ACTIVE &&
      Number(cardBalance) < 0
    ) {
      return true;
    }
    return false;
  };

  const shouldShowContactSupport = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.INACTIVE &&
      Number(cardBalance) > 0
    ) {
      return true;
    }
    return false;
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      navigation,
      currentCardProvider: cardProvider,
      currentCardIndex: 0,
    });
  };

  return isLayoutRendered ? (
    <CyDSafeAreaView
      className={clsx('flex-1 bg-n20', {
        'bg-red400': shouldShowLocked(),
        'bg-p40': shouldShowActionNeeded() || shouldShowContactSupport(),
      })}>
      <TermsAndConditionsModal
        isModalVisible={isTermsAndConditionsModalVisible}
        setIsModalVisible={setIsTermsAndConditionsModalVisible}
        cardProvider={selectedCard?.cardProvider}
        onAgree={() => {
          setIsTermsAndConditionsModalVisible(false);
          void refreshProfile();
        }}
        onCancel={() => {
          setIsTermsAndConditionsModalVisible(false);
          setTimeout(() => {
            navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
          }, MODAL_HIDE_TIMEOUT_250);
        }}
      />
      <OverchargeDccInfoModal
        isModalVisible={isOverchargeDccInfoModalOpen}
        setModalVisible={setIsOverchargeDccInfoModalOpen}
        transactionId={overchargeDccInfoTransactionId}
      />

      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        cardProvider={cardProvider}
        cardId={cardId}
      />

      {(shouldShowLocked() ||
        shouldShowActionNeeded() ||
        shouldShowContactSupport()) && (
        <CyDView
          className={clsx('p-4', {
            'bg-p40': shouldShowActionNeeded() || shouldShowContactSupport(),
            'bg-red400': shouldShowLocked(),
          })}>
          <CyDView className='flex flex-row gap-x-2'>
            <CyDMaterialDesignIcons
              name={shouldShowLocked() ? 'lock' : 'alert'}
              size={24}
              className={clsx('text-black', {
                'text-white': shouldShowLocked(),
              })}
            />
            <CyDText
              className={clsx('font-semibold text-[16px]', {
                'text-black':
                  shouldShowActionNeeded() || shouldShowContactSupport(),
                'text-white': shouldShowLocked(),
              })}>
              {shouldShowLocked()
                ? t('ACCOUNT_LOCKED')
                : shouldShowActionNeeded()
                  ? t('ACCOUNT_ACTION_NEEDED')
                  : t('CONTACT_SUPPORT')}
            </CyDText>
          </CyDView>
          <CyDText
            className={clsx('mt-2', {
              'text-black':
                shouldShowActionNeeded() || shouldShowContactSupport(),
              'text-white': shouldShowLocked(),
            })}>
            {shouldShowLocked()
              ? t('ACCOUNT_LOCKED_DESCRIPTION')
              : shouldShowActionNeeded()
                ? t('ACCOUNT_ACTION_NEEDED_DESCRIPTION')
                : t('ACCOUNT_INACTIVE_DESCRIPTION')}
          </CyDText>
          {shouldShowContactSupport() && (
            <CyDTouchView
              className='mt-2 px-3 py-2 rounded-lg bg-white w-[135px]'
              onPress={() => {
                void Intercom.present();
              }}>
              <CyDText className='text-black font-medium text-[14px]'>
                {t('CONTACT_SUPPORT')}
              </CyDText>
            </CyDTouchView>
          )}
        </CyDView>
      )}

      {/* TXN FILTER MODAL */}
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />

      <CyDView className='bg-n20  px-[16px] mt-[4px]'>
        {!(
          shouldShowLocked() ||
          shouldShowActionNeeded() ||
          shouldShowContactSupport()
        ) && (
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView>
              <CyDText className='font-extrabold text-[26px] text-base100'>
                Cards
              </CyDText>
            </CyDView>
            <CyDTouchView
              className='bg-n40 rounded-full p-[8px] flex flex-row items-center'
              onPress={() => {
                navigation.navigate(screenTitle.GLOBAL_CARD_OPTIONS, {
                  cardProvider,
                  card: get(cardProfile, [
                    cardProvider,
                    'cards',
                    currentCardIndex,
                  ]),
                });
              }}>
              <CyDMaterialDesignIcons
                name={'hammer-screwdriver'}
                size={16}
                className='text-base400'
              />
              <CyDText className='font-bold text-[12px] text-base400 ml-[7px]'>
                {t('OPTIONS')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}

        <CardProviderSwitch />

        {/* {isShippingFeeConsentModalVisible && (
          <ShippingFeeConsentModal
            isModalVisible={isShippingFeeConsentModalVisible}
            feeAmount={String(cardFee)}
            onFailure={() => {
              setIsShippingFeeConsentModalVisible(false);
            }}
          />
        )} */}

        {/* balance and add funds/activate card */}
        <CyDView className={'h-[60px] mt-[24px]'}>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView>
              <CyDText className={'font-semibold text-[10px]'}>
                {t<string>('TOTAL_BALANCE') + ' (USD)'}
              </CyDText>
              <CyDView className='flex flex-row justify-between items-center'>
                {!balanceLoading ? (
                  <CyDTouchView onPress={() => fetchCardBalance().catch}>
                    <CyDView className='flex flex-row items-center justify-start gap-x-[8px]'>
                      <CyDText
                        className={clsx('font-bold text-[28px]', {
                          'text-red400':
                            shouldShowLocked() || shouldShowActionNeeded(),
                        })}>
                        {(cardBalance !== 'NA' ? '$ ' : '') +
                          (cardBalance ?? 0)}
                      </CyDText>
                      <CyDMaterialDesignIcons
                        name='refresh'
                        size={20}
                        className='text-base400'
                      />
                    </CyDView>
                  </CyDTouchView>
                ) : (
                  <CyDLottieView
                    source={AppImages.LOADER_TRANSPARENT}
                    autoPlay
                    loop
                    style={style.loaderStyle}
                  />
                )}
              </CyDView>
            </CyDView>
            <CyDView className={'h-[36px] w-[42%]'}>
              <Button
                icon={
                  <CyDMaterialDesignIcons
                    name='plus'
                    size={20}
                    className='text-black mr-[4px]'
                  />
                }
                disabled={shouldBlockAction()}
                onPress={() => {
                  onPressFundCard();
                }}
                style='h-[42px] py-[8px] px-[12px] rounded-[6px]'
                // imageStyle={'mr-[4px] h-[12px] w-[12px]'}
                title={t('ADD_FUNDS')}
                titleStyle='text-[14px] text-black font-extrabold'
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>

      <CyDScrollView showsVerticalScrollIndicator={false} className='bg-n20 '>
        {cardId !== CARD_IDS.HIDDEN_CARD &&
          cardProvider === CardProviders.PAYCADDY && (
            <CyDView className='mx-[16px] my-[12px] bg-n0 rounded-[16px] p-[8px]'>
              {rcApplicationStatus !== CardApplicationStatus.COMPLETED ? (
                <CyDText className='text-[12px] font-medium'>
                  {
                    'Important: Complete KYC, get your new VISA card, and transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                  }
                </CyDText>
              ) : (
                <CyDText className='text-[12px] font-medium'>
                  {
                    'Important: Transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                  }
                </CyDText>
              )}
            </CyDView>
          )}

        <CyDView
          className={clsx('flex flex-row items-center mx-[16px] mt-[12px]', {
            'justify-between': cardId !== CARD_IDS.HIDDEN_CARD,
            'justify-end': cardId === CARD_IDS.HIDDEN_CARD,
          })}>
          {cardId !== CARD_IDS.HIDDEN_CARD &&
            cardProvider === CardProviders.PAYCADDY && (
              <CyDView className='flex flex-row justify-center items-center w-full'>
                <Button
                  disabled={
                    shouldBlockAction() ||
                    (!isEmpty(cardBalance) && cardBalance === 'NA') ||
                    rcApplicationStatus !== CardApplicationStatus.COMPLETED
                  }
                  onPress={() => {
                    navigation.navigate(screenTitle.MIGRATE_FUNDS, {
                      cardId,
                      currentCardProvider: cardProvider,
                    });
                  }}
                  image={AppImages.MIGRATE_FUNDS_ICON}
                  style={'p-[9px] rounded-[6px] border-[0px]'}
                  imageStyle={'mr-[3px] h-[14px] w-[24px]'}
                  title={t('MOVE_FUNDS_TO_NEW_CARD')}
                  titleStyle={'text-[12px] font-semibold'}
                  type={ButtonType.SECONDARY}
                />
              </CyDView>
            )}
        </CyDView>

        {shouldBlockAction() && (
          <CyDView className='rounded-[16px] bg-red20 border-[1px] border-red300 p-[14px] m-[16px]'>
            <CyDText className='text-[18px] font-[700] text-red300'>
              {'Your account has been locked'}
            </CyDText>
            <CyDText className='text-[14px] font-[500] mt-[6px]'>
              {
                'Since, you have enabled lockdown mode, your card load and transactions will be completely disabled '
              }
            </CyDText>
            <CyDTouchView
              onPress={() => {
                void verifyWithOTP();
              }}>
              <CyDText className='underline font-[700] text-[14px] mt-[6px]'>
                Disable lockdown mode
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}

        {cardDesignData && (
          <CyDView className='mt-[2px]'>
            <CardScreen
              navigation={navigation}
              currentCardProvider={cardProvider}
              onGetAdditionalCard={onGetAdditionalCard}
              onPressActivateCard={onPressActivateCard}
              refreshProfile={() => {
                void refreshProfile();
              }}
              cardDesignData={cardDesignData}
              isAccountLocked={
                shouldBlockAction() ||
                shouldShowLocked() ||
                shouldShowContactSupport()
              }
            />
          </CyDView>
        )}

        <CyDView className='w-full bg-n0 mt-[26px] pb-[120px]'>
          <GetPhysicalCardComponent
            cardProfile={cardProfile}
            cardProvider={cardProvider}
            cardDesignData={cardDesignData}
            cardBalance={cardBalance}
          />

          {cardId === CARD_IDS.HIDDEN_CARD ? (
            <CyDView className='mx-[16px] mt-[16px]'>
              <CyDView className='border-[1px] border-n40 rounded-[16px] p-[16px]'>
                <CyDText className='text-[20px] font-[500] mb-[8px]'>
                  {t<string>('LOAD_YOUR_CARD')}
                </CyDText>
                <CyDText className='text-[14px] font-[400] mb-[16px] text-n200'>
                  {t<string>('LOAD_YOUR_CARD_DESCRIPTION')}
                </CyDText>
                <CyDTouchView
                  className='bg-n30 rounded-[8px] px-[10px] py-[15px]'
                  onPress={onPressFundCard}>
                  <CyDView className='flex flex-row justify-between items-center'>
                    <CyDText className='text-[14px] font-[500]'>
                      {t<string>('LOAD_YOUR_CARD')}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='arrow-right-thin'
                      size={24}
                      className='text-base400'
                    />
                  </CyDView>
                </CyDTouchView>
              </CyDView>
            </CyDView>
          ) : (
            <CyDView className='mx-[16px] mt-[16px]'>
              <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                {t<string>('RECENT_TRANSACTIONS')}
              </CyDText>
              {recentTransactions.length ? (
                <CyDView className='border-[1px] border-n40 rounded-[8px] pt-[12px]'>
                  {recentTransactions.map((transaction, index) => {
                    return (
                      <CardTransactionItem item={transaction} key={index} />
                    );
                  })}
                  <CyDTouchView
                    className='bg-n0 flex flex-row justify-center items-center py-[16px] rounded-b-[22px]'
                    onPress={() =>
                      navigation.navigate(
                        screenTitle.CARD_TRANSACTIONS_SCREEN,
                        {
                          navigation,
                          cardProvider,
                        },
                      )
                    }>
                    <CyDText className='text-[14px] font-bold'>
                      {t<string>('VIEW_ALL_TRANSACTIONS')}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='chevron-right'
                      size={24}
                      className='text-base400'
                    />
                  </CyDTouchView>
                </CyDView>
              ) : (
                <CyDView className='border-[1px] border-n40 rounded-[22px] py-[24px] justify-start items-center'>
                  <CyDFastImage
                    source={AppImages.NO_TRANSACTIONS_YET}
                    className='h-[150px] w-[150px]'
                    resizeMode='contain'
                  />
                </CyDView>
              )}
            </CyDView>
          )}
          {cardProfile && isLegacyCardClosed(cardProfile) && (
            <CyDView className='mx-[16px] mt-[16px]'>
              <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                {t<string>('OTHERS')}
              </CyDText>
              <CyDTouchView
                className='border-[1.2px] border-n20 flex flex-row justify-center items-center py-[16px] rounded-[16px]'
                onPress={() =>
                  navigation.navigate(screenTitle.CARD_TRANSACTIONS_SCREEN, {
                    navigation,
                    cardProvider: CardProviders.PAYCADDY,
                  })
                }>
                <CyDText className='text-[14px] font-bold'>
                  {t<string>('LEGACY_CARD_TRANSACTIONS')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name='arrow-right-thin'
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
            </CyDView>
          )}

          {planInfo?.planId !== CypherPlanId.PRO_PLAN && (
            <CyDView className='mx-[16px] mt-[16px] bg-p10 p-6 rounded-xl'>
              <CyDView className='flex flex-row items-center gap-x-[4px] justify-center'>
                <CyDText className='font-extrabold text-[20px]'>
                  {'Cypher'}
                </CyDText>
                <GradientText
                  textElement={
                    <CyDText className='font-extrabold text-[20px]'>
                      {'Premium'}
                    </CyDText>
                  }
                  gradientColors={['#FA9703', '#F89408', '#F6510A']}
                />
              </CyDView>
              <CyDView className='mt-[16px]'>
                {spendStats.amount > 20 ? (
                  <CyDView>
                    <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                      <CyDText className='font-medium text-[14px] text-base200'>
                        {'You could have saved'}
                      </CyDText>

                      <LinearGradient
                        colors={['#FA9703', '#F7510A', '#FA9703']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        locations={[0, 0.5, 1]}
                        style={style.gradientStyle}>
                        <CyDText className='font-semibold text-[14px] text-white'>
                          {`$${spendStats.amount}`}
                        </CyDText>
                      </LinearGradient>
                      <CyDText className='font-medium text-[14px] text-base200 text-center'>
                        {'in'}
                      </CyDText>
                    </CyDView>
                    <CyDText className='font-medium text-[14px] text-base200 text-center'>
                      {`last ${spendStats.timePeriod} and also get a free \nMetal card`}
                    </CyDText>
                  </CyDView>
                ) : (
                  <CyDView className='self-center'>
                    <CyDText className='font-medium text-[14px] text-center text-base200'>
                      {'Save more on each transaction and'}
                    </CyDText>
                    <CyDText className='text-[14px] font-medium text-center text-base200'>
                      {'get a free premium metal card'}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
              <CyDView className='mt-[16px] flex flex-row justify-between items-center mx-[16px]'>
                <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={18}
                    className='text-base400'
                  />
                  <CyDText className='font-semibold text-[12px]'>
                    {'Zero Forex Markup'}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={18}
                    className='text-base400'
                  />
                  <CyDText className='font-semibold text-[12px]'>
                    {'Zero USDC Load Fee'}
                  </CyDText>
                </CyDView>
              </CyDView>

              <Button
                title={'Explore Premium'}
                type={ButtonType.DARK}
                onPress={() => {
                  setPlanChangeModalVisible(true);
                  void logAnalyticsToFirebase(
                    AnalyticEvent.EXPLORE_PREMIUM_CARD_PAGE_CTA,
                  );
                }}
                style='h-[42px] py-[8px] px-[12px] rounded-[4px] mt-[16px] bg-black'
                titleStyle='text-[14px] text-white font-semibold'
              />
            </CyDView>
          )}
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  ) : (
    <Loading />
  );
}
const style = StyleSheet.create({
  loaderStyle: {
    height: 38,
  },
  gradientStyle: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
});
