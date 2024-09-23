import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  ACCOUNT_STATUS,
  ButtonType,
  CardApplicationStatus,
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  GlobalContextType,
} from '../../../constants/enum';
import CardScreen from '../bridgeCard/card';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { get, isEmpty, sumBy } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import CardTxnFilterModal from './CardTxnFilterModal';
import { ICardTransaction } from '../../../models/card.model';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import {
  DateRange,
  STATUSES,
  TYPES,
  initialCardTxnDateRange,
} from '../../../constants/cardPageV2';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import ShippingFeeConsentModal from '../../../components/v2/shippingFeeConsentModal';
import CardActivationConsentModal from '../../../components/v2/CardActivationConsentModal';
import Loading from '../../../components/v2/loading';
import AutoLoadOptionsModal from '../bridgeCard/autoLoadOptions';
import { HIDDEN_CARD_ID } from '../../../constants/data';
import LottieView from 'lottie-react-native';
import { StyleSheet } from 'react-native';
import CardProviderSwitch from '../../../components/cardProviderSwitch';
import useCardUtilities from '../../../hooks/useCardUtilities';
import clsx from 'clsx';
import { ActivityStatus } from '../../../reducers/activity_reducer';
import CardGlobalOptionsModal from '../bridgeCard/cardGlobalOptions';

interface CypherCardScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route: { params: { cardProvider: CardProviders } };
}

export default function CypherCardScreen({
  navigation,
  route,
}: CypherCardScreenProps) {
  const { cardProvider } = route.params;
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const [cardBalance, setCardBalance] = useState('');
  const [currentCardIndex] = useState(0); // Not setting anywhere.
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [
    isShippingFeeConsentModalVisible,
    setIsShippingFeeConsentModalVisible,
  ] = useState(false);
  const [cardActivationDetails, setCardActivationDetails] = useState({
    isConsentModalVisible: false,
    cardToBeActivated: null,
  });
  const [recentTransactions, setRecentTransactions] = useState<
    ICardTransaction[]
  >([]);
  const [filter, setFilter] = useState<{
    types: CardTransactionTypes[];
    dateRange: DateRange;
    statuses: CardTransactionStatuses[];
  }>({
    types: TYPES,
    dateRange: initialCardTxnDateRange,
    statuses: STATUSES,
  });
  const cardId = get(cardProfile, [
    cardProvider,
    'cards',
    currentCardIndex,
    'cardId',
  ]);
  const {
    rc: { physicalCardUpgradationFee } = { physicalCardUpgradationFee: 50 },
  } = cardProfile;
  const isLockdownModeEnabled = get(
    cardProfile,
    ['accountStatus'],
    ACCOUNT_STATUS.ACTIVE,
  );
  const rcApplicationStatus = get(cardProfile, ['rc', 'applicationStatus'], '');
  const [isLayoutRendered, setIsLayoutRendered] = useState(false);
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState<boolean>(false);
  const [showGlobalOptionsModal, setShowGlobalOptionsModal] =
    useState<boolean>(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { getWalletProfile } = useCardUtilities();
  const [lockdownModeLoading, setLockdownModeLoading] = useState(false);
  const { hasBothProviders } = useCardUtilities();
  const [migrationData, setMigrationData] = useState<
    Array<{
      requestId: string;
      amount: number;
      isCompleteMigration: boolean;
      batchId: string;
      status: ActivityStatus;
      createdAt: number;
    }>
  >([]);
  const onRefresh = async () => {
    void refreshProfile();
    setCardBalance('');
    if (cardId !== HIDDEN_CARD_ID) {
      await fetchCardBalance();
      void fetchRecentTransactions();
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

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
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
    const txnURL = `/v1/cards/${cardProvider}/card/${String(
      cardId,
    )}/transactions?newRoute=true&limit=5`;
    const response = await getWithAuth(txnURL);
    if (!response.isError) {
      const { transactions: txnsToSet } = response.data;
      txnsToSet.sort((a: ICardTransaction, b: ICardTransaction) => {
        return a.date < b.date ? 1 : -1;
      });
      setRecentTransactions(txnsToSet);
    }
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      navigation,
      currentCardProvider: cardProvider,
      currentCardIndex,
    });
  };

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      onPressFundCard();
    }, MODAL_HIDE_TIMEOUT);
  }

  const onShippingConfirmation = () => {
    if (isShippingFeeConsentModalVisible) {
      setIsShippingFeeConsentModalVisible(false);
      setTimeout(() => {
        navigation.navigate(screenTitle.ORDER_STEPS_SCREEN, {
          currentCardProvider: cardProvider,
        });
      }, MODAL_HIDE_TIMEOUT);
    } else {
      navigation.navigate(screenTitle.ORDER_STEPS_SCREEN, {
        currentCardProvider: cardProvider,
      });
    }
  };

  const onCardActivationConfirmation = () => {
    if (cardActivationDetails.isConsentModalVisible) {
      setCardActivationDetails({
        ...cardActivationDetails,
        isConsentModalVisible: false,
      });
      setTimeout(() => {
        navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
          currentCardProvider: cardProvider,
          card: cardActivationDetails.cardToBeActivated,
        });
      }, MODAL_HIDE_TIMEOUT);
    }
  };

  const onPressUpgradeNow = () => {
    onShippingConfirmation();
    // if (Number(cardBalance) < Number(physicalCardUpgradationFee)) {
    //   showModal('state', {
    //     type: 'error',
    //     title: t('INSUFFICIENT_FUNDS'),
    //     description: `You do not have $${physicalCardUpgradationFee} balance to upgrade to physical card. Please load now to upgrade`,
    //     onSuccess: onModalHide,
    //     onFailure: hideModal,
    //   });
    // } else {
    //   if (Number(physicalCardUpgradationFee) > 0) {
    //     setIsShippingFeeConsentModalVisible(true);
    //   } else {
    //     onShippingConfirmation();
    //   }
    // }
  };

  const onPressActivateCard = (card: any) => {
    setCardActivationDetails({
      isConsentModalVisible: true,
      cardToBeActivated: card,
    });
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

  const onPressPlanChange = () => {
    navigation.navigate(screenTitle.SELECT_PLAN, {
      toPage: screenTitle.BRIDGE_CARD_SCREEN,
      deductAmountNow: true,
      cardBalance,
    });
  };
  const getMigrationData = async () => {
    const { data, isError } = await getWithAuth('/v1/cards/migration');
    if (!isError) {
      setMigrationData(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void getMigrationData();
    }, []),
  );

  return isLayoutRendered ? (
    <CyDSafeAreaView className='flex-1 bg-gradient-to-b from-cardBgFrom to-cardBgTo mb-[75px]'>
      <CardProviderSwitch />
      <ShippingFeeConsentModal
        isModalVisible={isShippingFeeConsentModalVisible}
        feeAmount={String(physicalCardUpgradationFee)}
        onSuccess={() => {
          onShippingConfirmation();
        }}
        onFailure={() => {
          setIsShippingFeeConsentModalVisible(false);
        }}
      />

      <CardActivationConsentModal
        isModalVisible={cardActivationDetails.isConsentModalVisible}
        onSuccess={() => {
          onCardActivationConfirmation();
        }}
        onFailure={() => {
          setCardActivationDetails({
            ...cardActivationDetails,
            isConsentModalVisible: false,
          });
        }}
      />

      <AutoLoadOptionsModal
        isModalVisible={isAutoLoadOptionsvisible}
        setShowModal={setIsAutoLoadOptionsVisible}
        navigation={navigation}
      />

      <CardGlobalOptionsModal
        isModalVisible={showGlobalOptionsModal}
        setShowModal={setShowGlobalOptionsModal}
        cardProvider={cardProvider}
        navigation={navigation}
        onPressPlanChange={onPressPlanChange}
      />

      {/* TXN FILTER MODAL */}
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />
      {/* TXN FILTER MODAL */}
      {!hasBothProviders(cardProfile) && (
        <CyDView className='ml-[18px]'>
          <CyDText className='font-extrabold text-[26px]'>Cards</CyDText>
        </CyDView>
      )}
      <CyDView className={'h-[60px] py-[5px] px-[10px] mx-[12px] mt-[12px]'}>
        {cardId !== HIDDEN_CARD_ID ? (
          <CyDView>
            <CyDText className={'font-semibold text-[10px]'}>
              {t<string>('TOTAL_BALANCE') + ' (USD)'}
            </CyDText>
            <CyDView className='flex flex-row justify-between'>
              {!balanceLoading ? (
                <CyDTouchView onPress={() => fetchCardBalance().catch}>
                  <CyDView className='flex flex-row items-center justify-start gap-x-[8px]'>
                    <CyDText className={'font-bold text-[28px]'}>
                      {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
                    </CyDText>
                    <CyDImage
                      source={AppImages.REFRESH_BROWSER}
                      className='w-[24px] h-[24px]'
                    />
                  </CyDView>
                </CyDTouchView>
              ) : (
                <LottieView
                  source={AppImages.LOADER_TRANSPARENT}
                  autoPlay
                  loop
                  style={style.loaderStyle}
                />
              )}
              <CyDTouchView
                className='bg-white rounded-full p-[8px] flex flex-row items-center'
                onPress={() => {
                  setShowGlobalOptionsModal(true);
                }}>
                <CyDImage
                  source={AppImages.SETTINGS_TOOLS_ICON}
                  className='w-[14px] h-[14px]'
                />
                <CyDText className='font-bold text-[12px] text-base400 ml-[7px]'>
                  {t('OPTIONS')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
        ) : (
          <CyDView>
            <CyDText className={'font-bold  text-[18px]'}>
              {t<string>('ACTIVATE_CARD')}
            </CyDText>
            <CyDText className={'font-bold text-subTextColor text-[12px]'}>
              {t<string>('LOAD_YOUR_CARD_TO_ACTIVATE_IT')}
            </CyDText>
          </CyDView>
        )}
      </CyDView>

      <CyDScrollView>
        {/* migration amount  */}
        {migrationData.length > 0 &&
          cardId !== HIDDEN_CARD_ID &&
          cardProvider === CardProviders.REAP_CARD && (
            <CyDView className='flex flex-row items-center mx-[16px] mb-[12px]'>
              <CyDImage
                source={AppImages.CLOCK_OUTLINE}
                className='w-[22px] h-[22px] mr-[8px]'
              />
              <CyDText className='text-[12px] font-medium w-[90%]'>
                {'Your old balance '}
                <CyDText className='text-[12px] font-bold'>
                  {`“$${sumBy(migrationData, 'amount')}“`}
                </CyDText>
                {' will be transferred within 3 to 5 business days.'}
              </CyDText>
            </CyDView>
          )}

        {cardId !== HIDDEN_CARD_ID &&
          cardProvider === CardProviders.PAYCADDY && (
            <CyDView className='mx-[16px] mb-[12px] bg-white rounded-[16px] p-[8px]'>
              {rcApplicationStatus !== CardApplicationStatus.COMPLETED ? (
                <CyDText>
                  {
                    'Important: Complete KYC, get your new VISA card, and transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                  }
                </CyDText>
              ) : (
                <CyDText>
                  {
                    'Important: Transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                  }
                </CyDText>
              )}
            </CyDView>
          )}

        {
          <CyDView
            className={clsx('flex flex-row  items-center mx-[16px]', {
              'justify-between': cardId !== HIDDEN_CARD_ID,
              'justify-end': cardId === HIDDEN_CARD_ID,
            })}>
            {cardId !== HIDDEN_CARD_ID &&
              cardProvider === CardProviders.PAYCADDY && (
                <CyDView className='w-[70%] mr-[12px]'>
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

            {cardId !== HIDDEN_CARD_ID &&
              cardProvider === CardProviders.REAP_CARD && (
                <CyDView className='w-[48%]'>
                  <Button
                    disabled={shouldBlockAction()}
                    onPress={() => {
                      cardProfile?.isAutoloadConfigured
                        ? setIsAutoLoadOptionsVisible(true)
                        : navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
                    }}
                    image={AppImages.AUTOLOAD}
                    style={'p-[9px] rounded-[6px] border-[0px] h-[36px]'}
                    imageStyle={'mr-[3px] h-[24px] w-[24px]'}
                    // title={t('MANAGE_TOP_UP')}
                    title={
                      (cardProfile?.isAutoloadConfigured ? 'Manage' : 'Setup') +
                      ' Auto Deposit'
                    }
                    titleStyle={'text-[12px] font-semibold'}
                    type={ButtonType.SECONDARY}
                  />
                </CyDView>
              )}

            <CyDView
              className={clsx('h-[36px]', {
                'w-[48%]': cardProvider === CardProviders.REAP_CARD,
                'w-[25%] mr-[16px]': cardProvider === CardProviders.PAYCADDY,
              })}>
              <Button
                image={AppImages.PLUS_ICON}
                disabled={shouldBlockAction()}
                onPress={() => {
                  onPressFundCard();
                }}
                style={'p-[9px] rounded-[6px]'}
                imageStyle={'mr-[3px] h-[12px] w-[12px]'}
                title={t('ADD_FUNDS')}
                titleStyle={'text-[12px] font-bold'}
              />
            </CyDView>
          </CyDView>
        }

        {shouldBlockAction() && (
          <CyDView className='rounded-[16px] bg-r20 border-[1px] border-r300 p-[14px] m-[16px]'>
            <CyDText className='text-[18px] font-[700] text-r300'>
              {'Your account has been locked'}
            </CyDText>
            <CyDText className='text-[14px] font-[500] mt-[6px]'>
              {
                'Since, you have enabled lockdown mode, your card load and transaction will be completely disabled '
              }
            </CyDText>
            <CyDTouchView
              onPress={() => {
                void verifyWithOTP();
              }}>
              {!lockdownModeLoading ? (
                <CyDText className='underline font-[700] text-[14px] mt-[6px]'>
                  Disable lockdown mode
                </CyDText>
              ) : (
                <LottieView
                  source={AppImages.LOADER_TRANSPARENT}
                  autoPlay
                  loop
                  style={style.lottieStyle}
                />
              )}
            </CyDTouchView>
          </CyDView>
        )}

        <CyDView className='mt-[2px]'>
          <CardScreen
            navigation={navigation}
            currentCardProvider={cardProvider}
            onPressUpgradeNow={onPressUpgradeNow}
            onPressActivateCard={onPressActivateCard}
            refreshProfile={() => {
              void refreshProfile();
            }}
            onPressPlanChange={onPressPlanChange}
          />
        </CyDView>
        <CyDView className='w-full bg-white mt-[26px] pb-[120px]'>
          <CyDView className='mx-[12px] my-[12px]'>
            <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
              {t<string>('RECENT_TRANSACTIONS')}
            </CyDText>
            {recentTransactions.length ? (
              <CyDView className='border-[1px] border-sepratorColor rounded-[22px] pt-[12px]'>
                {recentTransactions.map((transaction, index) => {
                  return <CardTransactionItem item={transaction} key={index} />;
                })}
                <CyDTouchView
                  className='bg-cardBgTo flex flex-row justify-center items-center py-[22px] rounded-b-[22px]'
                  onPress={() =>
                    navigation.navigate(screenTitle.CARD_TRANSACTIONS_SCREEN, {
                      navigation,
                      cardProvider,
                      currentCardIndex,
                    })
                  }>
                  <CyDText className='text-[16px] font-bold'>
                    {t<string>('VIEW_ALL_TRANSACTIONS')}
                  </CyDText>
                  <CyDImage
                    source={AppImages.RIGHT_ARROW_LONG}
                    className='h-[14px] w-[14px] ml-[4px] mt-[4px] accent-black'
                    resizeMode='contain'
                  />
                </CyDTouchView>
              </CyDView>
            ) : (
              <CyDView className='h-full bg-white border-x border-sepratorColor w-full justify-start items-center py-[10%]'>
                <CyDFastImage
                  source={AppImages.NO_TRANSACTIONS_YET}
                  className='h-[150px] w-[150px]'
                  resizeMode='contain'
                />
              </CyDView>
            )}
          </CyDView>
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
  lottieStyle: {
    height: 25,
  },
});
