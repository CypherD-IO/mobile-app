import React, { useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CydLottieView,
  CydMaterialDesignIcons,
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
  CARD_IDS,
  CardApplicationStatus,
  CardDesignType,
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  CypherPlanId,
  GlobalContextType,
  PhysicalCardType,
} from '../../../constants/enum';
import CardScreen from '../bridgeCard/card';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { get, isEmpty } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import CardTxnFilterModal from './CardTxnFilterModal';
import { Card, ICardTransaction } from '../../../models/card.model';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import {
  DateRange,
  STATUSES,
  TYPES,
  initialCardTxnDateRange,
} from '../../../constants/cardPageV2';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import ShippingFeeConsentModal from '../../../components/v2/shippingFeeConsentModal';
import Loading from '../../../components/v2/loading';
import LottieView from 'lottie-react-native';
import { StyleSheet } from 'react-native';
import CardProviderSwitch from '../../../components/cardProviderSwitch';
import useCardUtilities from '../../../hooks/useCardUtilities';
import clsx from 'clsx';
import { GetMetalCardModal } from '../../../components/GetMetalCardModal';
import { cardDesign } from '../../../models/cardDesign.interface';

interface RouteParams {
  cardProvider: CardProviders;
}

export default function CypherCardScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { cardProvider } = route?.params ?? {};
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
  const [cardDesignData, setCardDesignData] = useState<cardDesign | undefined>(
    undefined,
  );
  const [cardFee, setCardFee] = useState(0);
  const [choosenPhysicalCardType, setChoosenPhysicalCardType] = useState<
    PhysicalCardType | undefined
  >(undefined);
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
  const isLockdownModeEnabled = get(
    cardProfile,
    ['accountStatus'],
    ACCOUNT_STATUS.ACTIVE,
  );
  const rcApplicationStatus = get(cardProfile, ['rc', 'applicationStatus'], '');
  const [isLayoutRendered, setIsLayoutRendered] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { getWalletProfile } = useCardUtilities();
  const { isLegacyCardClosed } = useCardUtilities();
  const onRefresh = async () => {
    void refreshProfile();
    setCardBalance('');
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
    navigation.navigate(
      cardId === CARD_IDS.HIDDEN_CARD
        ? screenTitle.FIRST_LOAD_CARD
        : screenTitle.BRIDGE_FUND_CARD_SCREEN,
      {
        navigation,
        currentCardProvider: cardProvider,
        currentCardIndex,
      },
    );
  };
  function onModalHide() {
    hideModal();
    setTimeout(() => {
      onPressFundCard();
    }, MODAL_HIDE_TIMEOUT);
  }
  const onShippingConfirmation = (physicalCardType?: PhysicalCardType) => {
    if (isShippingFeeConsentModalVisible) {
      setIsShippingFeeConsentModalVisible(false);
      setTimeout(() => {
        navigation.navigate(screenTitle.ORDER_STEPS_SCREEN, {
          currentCardProvider: cardProvider,
          ...(physicalCardType && {
            physicalCardType,
          }),
        });
      }, MODAL_HIDE_TIMEOUT);
    } else {
      navigation.navigate(screenTitle.ORDER_STEPS_SCREEN, {
        currentCardProvider: cardProvider,
        ...(physicalCardType && {
          physicalCardType,
        }),
      });
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
      const cardDesignValues: cardDesign = response.data;
      setCardDesignData(cardDesignValues);
    }
  };

  const getCardFee = async (physicalCardType?: PhysicalCardType) => {
    const planData = globalContext.globalState.planInfo;
    const cardType =
      physicalCardType === PhysicalCardType.METAL
        ? CardDesignType.METAL
        : CardDesignType.PHYSICAL;

    const defaultFeeKey =
      physicalCardType === PhysicalCardType.METAL
        ? 'metalCardFee'
        : 'physicalCardFee';

    return get(
      cardDesignData,
      ['feeDetails', cardType],
      get(planData, ['default', CypherPlanId.PRO_PLAN, defaultFeeKey], 0),
    );
  };

  const onPressUpgradeNow = async (physicalCardType?: PhysicalCardType) => {
    setChoosenPhysicalCardType(physicalCardType);
    const fee = await getCardFee(physicalCardType);
    setCardFee(fee);

    if (Number(cardBalance) < Number(fee)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You do not have $${String(fee)} balance to upgrade to ${physicalCardType ?? 'physical'} card. Please load now to upgrade`,
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
    } else {
      if (Number(fee) > 0) {
        setIsShippingFeeConsentModalVisible(true);
      } else {
        onShippingConfirmation(physicalCardType);
      }
    }
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

  return isLayoutRendered ? (
    <CyDSafeAreaView className='flex-1 bg-n20'>
      <CyDView className='flex flex-row justify-between items-center mx-[16px] mt-[4px]'>
        <CyDView>
          <CyDText className='font-extrabold text-[26px]'>Cards</CyDText>
        </CyDView>
        <CyDTouchView
          className='bg-n40 rounded-full p-[8px] flex flex-row items-center'
          onPress={() => {
            navigation.navigate(screenTitle.GLOBAL_CARD_OPTIONS, {
              cardProvider,
              card: get(cardProfile, [cardProvider, 'cards', 0]),
            });
          }}>
          <CydMaterialDesignIcons
            name={'hammer-screwdriver'}
            size={16}
            className='text-base400'
          />
          <CyDText className='font-bold text-[12px] text-base400 ml-[7px]'>
            {t('OPTIONS')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
      <CardProviderSwitch />
      {isShippingFeeConsentModalVisible && (
        <ShippingFeeConsentModal
          isModalVisible={isShippingFeeConsentModalVisible}
          feeAmount={String(cardFee)}
          onSuccess={() => {
            onShippingConfirmation(choosenPhysicalCardType);
          }}
          onFailure={() => {
            setIsShippingFeeConsentModalVisible(false);
          }}
        />
      )}

      {/* TXN FILTER MODAL */}
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />
      {/* TXN FILTER MODAL */}
      <CyDView className={'h-[60px] px-[10px] mx-[12px] mt-[24px]'}>
        {cardId !== CARD_IDS.HIDDEN_CARD ? (
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView>
              <CyDText className={'font-semibold text-[10px]'}>
                {t<string>('TOTAL_BALANCE') + ' (USD)'}
              </CyDText>
              <CyDView className='flex flex-row justify-between items-center'>
                {!balanceLoading ? (
                  <CyDTouchView onPress={() => fetchCardBalance().catch}>
                    <CyDView className='flex flex-row items-center justify-start gap-x-[8px]'>
                      <CyDText className={'font-bold text-[28px]'}>
                        {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
                      </CyDText>
                      <CydMaterialDesignIcons
                        name='refresh'
                        size={20}
                        className='text-base400'
                      />
                    </CyDView>
                  </CyDTouchView>
                ) : (
                  <LottieView
                    source={AppImages.LOADER_TRANSPARENT}
                    autoPlay
                    loop
                    style={style.loaderStyle}
                    // className='w-[24px] h-[24px] bg-base400'
                  />
                )}
              </CyDView>
            </CyDView>
            <CyDView className={'h-[36px] w-[42%]'}>
              <Button
                icon={
                  <CydMaterialDesignIcons
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
        ) : (
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView>
              <CyDText className={'font-bold  text-[18px]'}>
                {t<string>('ACTIVATE_CARD')}
              </CyDText>
              <CyDText
                className={'font-bold text-subTextColor text-[12px] mt-[2px]'}>
                {t<string>('LOAD_YOUR_CARD_TO_ACTIVATE_IT')}
              </CyDText>
            </CyDView>
            <CyDView className={'h-[36px] w-[42%]'}>
              <Button
                icon={
                  <CydMaterialDesignIcons
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
                title={t('ADD_FUNDS')}
                titleStyle='text-[14px] text-black font-extrabold'
              />
            </CyDView>
          </CyDView>
        )}
      </CyDView>

      <CyDScrollView showsVerticalScrollIndicator={false}>
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

        <CyDView className='mt-[2px]'>
          <CardScreen
            navigation={navigation}
            currentCardProvider={cardProvider}
            onPressUpgradeNow={onPressUpgradeNow}
            onPressActivateCard={onPressActivateCard}
            refreshProfile={() => {
              void refreshProfile();
            }}
            cardDesignData={cardDesignData}
          />
        </CyDView>

        <CyDView className='w-full bg-n0 mt-[26px] pb-[120px]'>
          {get(cardDesignData, ['allowedCount', 'metal'], 0) > 0 &&
            get(cardDesignData, ['feeDetails', 'metal'], 100) === 0 && (
              <GetMetalCardModal onPressUpgradeNow={onPressUpgradeNow} />
            )}
          <CyDView className='mx-[12px] my-[12px]'>
            <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
              {t<string>('RECENT_TRANSACTIONS')}
            </CyDText>
            {recentTransactions.length ? (
              <CyDView className='border-[1px] border-n40 rounded-[22px] pt-[12px]'>
                {recentTransactions.map((transaction, index) => {
                  return <CardTransactionItem item={transaction} key={index} />;
                })}
                <CyDTouchView
                  className='bg-n40 flex flex-row justify-center items-center py-[16px] rounded-b-[22px]'
                  onPress={() =>
                    navigation.navigate(screenTitle.CARD_TRANSACTIONS_SCREEN, {
                      navigation,
                      cardProvider,
                      currentCardIndex,
                    })
                  }>
                  <CyDText className='text-[14px] font-bold'>
                    {t<string>('VIEW_ALL_TRANSACTIONS')}
                  </CyDText>
                  <CydMaterialDesignIcons
                    name='arrow-right-thin'
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
            ) : (
              <CyDView className='h-full bg-n0 border-x border-n40 w-full justify-start items-center py-[10%]'>
                <CyDFastImage
                  source={AppImages.NO_TRANSACTIONS_YET}
                  className='h-[150px] w-[150px]'
                  resizeMode='contain'
                />
              </CyDView>
            )}
          </CyDView>
          {cardProfile && isLegacyCardClosed(cardProfile) && (
            <CyDView className='mx-[12px] my-[12px]'>
              <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                {t<string>('OTHERS')}
              </CyDText>
              <CyDTouchView
                className='border-[1.2px] border-cardBgTo flex flex-row justify-center items-center py-[16px] rounded-[16px]'
                onPress={() =>
                  navigation.navigate(screenTitle.CARD_TRANSACTIONS_SCREEN, {
                    navigation,
                    cardProvider: CardProviders.PAYCADDY,
                    currentCardIndex,
                  })
                }>
                <CyDText className='text-[14px] font-bold'>
                  {t<string>('LEGACY_CARD_TRANSACTIONS')}
                </CyDText>
                <CydMaterialDesignIcons
                  name='arrow-right-thin'
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
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
});
