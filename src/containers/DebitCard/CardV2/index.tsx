import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  CardProviders,
  CardStatus,
  CardTransactionStatuses,
  CardTransactionTypes,
  GlobalContextType,
} from '../../../constants/enum';
import AnimatedCardSection from './AnimatedCardSection';
import { useSharedValue } from 'react-native-reanimated';
import { AnimatedTxnList } from './AnimatedTxnList';
import CardScreen from '../bridgeCard/card';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { get, has, isUndefined } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import SwitchView from '../../../components/v2/switchView';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import { AnimatedToolBar } from './AnimatedToolBar';
import CardTxnFilterModal from './CardTxnFilterModal';
import { ICardTransaction } from '../../../models/card.model';
import { RefreshControl, StyleSheet } from 'react-native';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../../misc/checkers';
import moment from 'moment';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import {
  CardSectionHeights,
  DateRange,
  STATUSES,
  TYPES,
  initialCardTxnDateRange,
} from '../../../constants/cardPageV2';
import { getWalletProfile } from '../../../core/card';
import InfiniteScrollFooterLoader from '../../../components/v2/InfiniteScrollFooterLoader';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import ShippingFeeConsentModal from '../../../components/v2/shippingFeeConsentModal';
import CardActivationConsentModal from '../../../components/v2/CardActivationConsentModal';
import Loading from '../../../components/v2/loading';
import { RenderMessage } from '../../../components/v2/walletConnectV2Views/SigningModals/SigningModalComponents';
import { copyToClipboard } from '../../../core/util';
import { showToast } from '../../utilities/toastUtility';

interface CypherCardScreenProps {
  navigation: any;
  route: { params: { hasBothProviders: boolean; cardProvider: CardProviders } };
}

const CypherCardScreen = ({ navigation, route }: CypherCardScreenProps) => {
  const { hasBothProviders, cardProvider } = route.params;

  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { getWithAuth, postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [trackingDetails, setTrackingDetails] = useState({});
  const [cardSectionHeight, setCardSectionHeight] = useState(270);
  // Object.keys(trackingDetails)
  //   .length
  //   ? 420
  //   : 270;
  const scrollY = useSharedValue(-cardSectionHeight);

  const txnRetrievalOffset = useRef<string | undefined>();

  const [cardBalance, setCardBalance] = useState('');
  const [currentCardIndex] = useState(0); // Not setting anywhere.
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [
    isShippingFeeConsentModalVisible,
    setIsShippingFeeConsentModalVisible,
  ] = useState(false);
  const [cardActivationDetails, setCardActivationDetails] = useState({
    isConsentModalVisible: false,
    cardToBeActivated: null,
  });
  const [transactions, setTransactions] = useState<ICardTransaction[]>([]);
  const [currentCardProvider, setCurrentCardProvider] =
    useState<string>(cardProvider);
  const [filteredTransactions, setFilteredTransactions] = useState<
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
    currentCardProvider,
    'cards',
    currentCardIndex,
    'cardId',
  ]);
  const {
    pc: { physicalCardUpgradationFee } = { physicalCardUpgradationFee: 50 },
  } = cardProfile;
  const [isLayoutRendered, setIsLayoutRendered] = useState(false);

  const onRefresh = async () => {
    void refreshProfile();
    setCardBalance('');
    const availableCards = cardProfile?.pc?.cards ?? [];
    const notActivatedCards = availableCards.filter(
      card => card.status === CardStatus.PENDING_ACTIVATION,
    );
    if (notActivatedCards.length) {
      await getTrackingDetails();
    }
    await fetchCardBalance();
    await retrieveTxns(true);
    if (!isLayoutRendered) {
      setIsLayoutRendered(true);
    }
  };

  useEffect(() => {
    if (isFocused) {
      void refreshProfile();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && cardProfile && !currentCardProvider) {
      let tempCurrentCardProvider = '';
      if (has(cardProfile, CardProviders.BRIDGE_CARD)) {
        tempCurrentCardProvider = CardProviders.BRIDGE_CARD;
      } else if (has(cardProfile, CardProviders.PAYCADDY)) {
        tempCurrentCardProvider = CardProviders.PAYCADDY;
      }
      setCurrentCardProvider(tempCurrentCardProvider);
    }
  }, [cardProfile, currentCardProvider, isFocused]);

  useEffect(() => {
    void onRefresh();
  }, [currentCardProvider]);

  useEffect(() => {
    spliceTransactions(transactions);
  }, [filter.statuses, filter.types, filter.dateRange]);

  const getTrackingDetails = async () => {
    const response = await getWithAuth(
      `/v1/cards/${CardProviders.PAYCADDY}/card/tracking`,
    );
    if (!response.error) {
      const tempTrackingDetails = response.data;
      setTrackingDetails(tempTrackingDetails);
      if (Object.keys(tempTrackingDetails).length) setCardSectionHeight(420);
    }
    return response;
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const fetchCardBalance = async () => {
    const url = `/v1/cards/${currentCardProvider}/card/${String(
      cardId,
    )}/balance`;
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
  };

  const retrieveTxns = async (pullToRefresh = false) => {
    if (pullToRefresh) {
      txnRetrievalOffset.current = undefined;
    }

    let txnURL = `/v1/cards/${currentCardProvider}/card/${String(
      cardId,
    )}/transactions?newRoute=true&limit=20`;
    if (txnRetrievalOffset.current) {
      txnURL += `&offset=${txnRetrievalOffset.current}`;
    }

    try {
      setRefreshing(true);
      const res = await getWithAuth(txnURL);
      if (!res.isError) {
        const { transactions: txnsToSet, offset } = res.data;
        txnsToSet.sort((a: ICardTransaction, b: ICardTransaction) => {
          return a.date < b.date ? 1 : -1;
        });

        txnRetrievalOffset.current = offset;

        if (pullToRefresh) {
          setTransactions(txnsToSet);
          spliceTransactions(txnsToSet);
        } else {
          setTransactions([...transactions, ...txnsToSet]);
          spliceTransactions([...transactions, ...txnsToSet]);
        }

        setRefreshing(false);
      } else {
        setRefreshing(false);
        const errorObject = {
          res: JSON.stringify(res),
          location: 'isError=true when trying to fetch card txns.',
        };
        Sentry.captureException(errorObject);
        showModal('state', {
          type: 'error',
          title: t('FAILED_TO_UPDATE_TXNS'),
          description: res.error,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      setRefreshing(false);
      const errorObject = {
        e,
        location: 'Error when trying to fetch card txns.',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('FAILED_TO_UPDATE_TXNS'),
        description: e,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const exportCardTransactions = async () => {
    const exportEndpoint = `/v1/cards/${currentCardProvider}/card/${String(
      cardId,
    )}/transactions/export`;
    try {
      setIsExporting(true);
      const res = await postWithAuth(exportEndpoint, {});
      if (!res.isError) {
        showModal('state', {
          type: 'success',
          title: t('TXNS_EXPORTED'),
          description:
            t('CARD_TXNS_EXPORTED_TEXT') +
            (cardProfile.email ?? 'your registered email.'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        const errorObject = {
          res: JSON.stringify(res),
          location: 'isError=true when trying to export card txns.',
        };
        Sentry.captureException(errorObject);
        showModal('state', {
          type: 'error',
          title: t('FAILED_TO_EXPORT_TXNS'),
          description: res.error,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      setIsExporting(false);
    } catch (e) {
      const errorObject = {
        e,
        location: 'Error when trying to fetch card txns.',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('FAILED_TO_EXPORT_TXNS'),
        description: e,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      setIsExporting(false);
    }
  };

  const spliceTransactions = (txnsToSplice: ICardTransaction[]) => {
    if (txnsToSplice.length === 0) {
      setFilteredTransactions([]);
    }

    const filteredTxns = txnsToSplice.filter(txn => {
      const isIncludedType = filter.types.includes(txn.type); // FILTERING THE TYPE
      const statusString = txn.isSettled
        ? CardTransactionStatuses.SETTLED
        : CardTransactionStatuses.PENDING;
      const isIncludedStatus = filter.statuses.includes(statusString); // FILTERING THE STATUS
      // FILTERING THE DATERANGE
      const isIncludedInDateRange = moment
        .unix(txn.createdAt)
        .isBetween(
          moment.utc(filter.dateRange.fromDate).startOf('day'),
          moment.utc(filter.dateRange.toDate).endOf('day'),
        );
      return isIncludedType && isIncludedStatus && isIncludedInDateRange;
    });

    setFilteredTransactions(filteredTxns);
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      navigation,
      currentCardProvider,
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
        navigation.navigate(screenTitle.UPGRADE_TO_PHYSICAL_CARD_SCREEN, {
          currentCardProvider,
        });
      }, MODAL_HIDE_TIMEOUT);
    } else {
      navigation.navigate(screenTitle.UPGRADE_TO_PHYSICAL_CARD_SCREEN, {
        currentCardProvider,
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
          currentCardProvider,
          card: cardActivationDetails.cardToBeActivated,
        });
      }, MODAL_HIDE_TIMEOUT);
    }
  };

  const onPressUpgradeNow = () => {
    if (Number(cardBalance) < Number(physicalCardUpgradationFee)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You do not have $  ${physicalCardUpgradationFee} balance to upgrade to physical card. Please load now to upgrade`,
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
    } else {
      if (Number(physicalCardUpgradationFee) > 0) {
        setIsShippingFeeConsentModalVisible(true);
      } else {
        onShippingConfirmation();
      }
    }
  };

  const onPressActivateCard = (card: any) => {
    setCardActivationDetails({
      isConsentModalVisible: true,
      cardToBeActivated: card,
    });
  };

  const copyTrackingNumber = (trackingNumber: string) => {
    copyToClipboard(trackingNumber);
    showToast('Tracking number copied to clipboard');
  };

  const RenderTrackingItem = useCallback(
    ({ item, index }) => {
      const physicalCard = get(trackingDetails, item);
      const trackingNumber = get(trackingDetails, item)?.trackingId;
      return (
        <CyDView
          className='flex flex-row items-start w-[350px] mx-[20px] px-[10px] mb-[20px] bg-highlightBg rounded-[12px] self-center'
          key={index}>
          <CyDView className='py-[20px]'>
            <CyDImage source={AppImages.MAIL} className='h-[32px] w-[32px]' />
          </CyDView>
          <CyDView className='py-[20px] flex justify-center ml-[12px] w-[90%]'>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='font-bold text-[16px]'>
                {t('CARD_ON_WAY')}
              </CyDText>
              <CyDImage
                source={AppImages.CELEBRATE}
                className='h-[24px] w-[24px] ml-[8px]'
              />
            </CyDView>
            <CyDText className='mt-[6px]'>
              {trackingDetails &&
              isUndefined(get(trackingDetails, physicalCard.cardId)?.trackingId)
                ? t('CARD_PRINTING_DESCRIPTION_SUB1') +
                  String(physicalCard.last4) +
                  t('CARD_PRINTING_DESCRIPTION_SUB2')
                : t('CARD_SHIP_DESCRIPTION_SUB1') +
                  String(physicalCard.last4) +
                  t('CARD_SHIP_DESCRIPTION_SUB2')}
            </CyDText>
            {trackingNumber && (
              <CyDView className='flex flex-row items-center mt-[6px]'>
                <CyDText className=''>{t('FEDEX_TRACKING_NO')}</CyDText>
                <CyDText className='max-w-[50%] text-highlightText ml-[8px]'>
                  {trackingNumber}
                </CyDText>
                <CyDTouchView
                  onPress={() => copyTrackingNumber(trackingNumber)}>
                  <CyDImage
                    source={AppImages.COPY}
                    className='h-[14px] w-[14px] ml-[12px]'
                    resizeMode='contain'
                  />
                </CyDTouchView>
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      );
    },
    [trackingDetails],
  );

  const RenderMessage = useCallback(() => {
    return (
      <CyDFlatList
        data={Object.keys(trackingDetails)}
        horizontal
        renderItem={RenderTrackingItem}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior='never'
        snapToAlignment='center'
        decelerationRate='fast'
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainerStyle}
      />
    );
  }, [trackingDetails]);

  return isLayoutRendered ? (
    <CyDSafeAreaView className='flex-1 bg-white'>
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
      {/* TXN FILTER MODAL */}
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />
      {/* TXN FILTER MODAL */}
      <CyDImageBackground
        className='h-full w-full'
        source={AppImages.DEBIT_CARD_BACKGROUND}
        resizeMode='cover'
        imageStyle={styles.imageBackgroundImageStyles}>
        <AnimatedCardSection
          scrollY={scrollY}
          cardSectionHeight={cardSectionHeight}>
          {/* SWITCH PROVIDER */}
          {hasBothProviders && (
            <CyDView className='flex items-center mt-[-10px] mb-[10px]'>
              <SwitchView
                titles={['Card1', 'Card2']}
                index={
                  currentCardProvider === CardProviders.BRIDGE_CARD ? 0 : 1
                }
                setIndexChange={(index: number) => {
                  if (index) {
                    setCurrentCardProvider(CardProviders.PAYCADDY);
                  } else setCurrentCardProvider(CardProviders.BRIDGE_CARD);
                }}
              />
            </CyDView>
          )}
          <CardScreen
            navigation={navigation}
            hideCardDetails={isFocused}
            currentCardProvider={currentCardProvider}
            setCurrentCardProvider={setCurrentCardProvider}
            onPressUpgradeNow={onPressUpgradeNow}
            onPressActivateCard={onPressActivateCard}
          />
          {/* SWITCH PROVIDER */}
          {/* FUND CARD */}
          <RenderMessage />
          <CyDView
            className={
              'h-[50px] flex flex-row justify-between py-[5px] px-[10px] bg-white border-[1px] mx-[12px] rounded-[8px] border-sepratorColor'
            }>
            <CyDView>
              <CyDText className={'font-bold text-[10px]'}>
                {t<string>('TOTAL_BALANCE') + ' (USD)'}
              </CyDText>
              <CyDText className={'font-extrabold text-[18px]'}>
                {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
              </CyDText>
            </CyDView>
            <Button
              image={AppImages.LOAD_CARD_LOTTIE}
              isLottie={true}
              onPress={() => {
                onPressFundCard();
              }}
              style={
                'pr-[7%] pl-[5%] py-[0px] w-[40%] flex flex-row items-center justify-center rounded-[8px]'
              }
              title={t('LOAD_CARD_CAPS')}
              titleStyle={'text-[14px]'}
            />
          </CyDView>
          {/* FUND CARD */}
        </AnimatedCardSection>
        <CyDView
          className={clsx('h-full px-[10px] pb-[40px]', {
            'pb-[75px]': isAndroid(),
          })}>
          {/* TOOLBAR */}
          <AnimatedToolBar
            scrollY={scrollY}
            cardSectionHeight={cardSectionHeight}>
            <CyDView className='h-[50px] flex flex-row justify-between items-center py-[10px] px-[10px] bg-white border border-sepratorColor mt-[10px] rounded-t-[24px]'>
              <CyDView className='flex justify-center items-start px-[5px]'>
                <CyDText className='text-[18px] font-bold'>
                  {t('TRANS')}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-end items-center px-[5px]'>
                <CyDTouchView
                  onPress={() => {
                    setFilterModalVisible(true);
                  }}>
                  <CyDFastImage
                    className='w-[48px] h-[26px]'
                    source={AppImages.FILTER}
                    resizeMode='contain'
                  />
                </CyDTouchView>
                <CyDTouchView
                  disabled={isExporting}
                  className={clsx({ 'opacity-40': isExporting })}
                  onPress={() => {
                    void exportCardTransactions();
                  }}>
                  <CyDFastImage
                    className='w-[48px] h-[26px]'
                    source={AppImages.EXPORT}
                    resizeMode='contain'
                  />
                </CyDTouchView>
              </CyDView>
            </CyDView>
          </AnimatedToolBar>
          {/* TOOLBAR */}
          {/* TXN LIST */}
          <AnimatedTxnList
            scrollY={scrollY}
            cardSectionHeight={cardSectionHeight}
            refreshControl={
              <RefreshControl
                className={clsx({ 'bg-white': isIOS() })}
                refreshing={refreshing}
                onRefresh={onRefresh}
                progressViewOffset={cardSectionHeight}
              />
            }
            onEndReached={() => {
              if (txnRetrievalOffset.current) {
                void retrieveTxns();
              }
            }}
            data={filteredTransactions}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }: { item: ICardTransaction }) => {
              return <CardTransactionItem item={item} />;
            }}
            ListEmptyComponent={
              <CyDView className='h-full bg-white border-x border-sepratorColor w-full justify-start items-center py-[30%]'>
                <CyDFastImage
                  source={AppImages.NO_TRANSACTIONS_YET}
                  className='h-[150px] w-[150px]'
                  resizeMode='contain'
                />
              </CyDView>
            }
            ListFooterComponent={
              <InfiniteScrollFooterLoader
                refreshing={refreshing}
                style={styles.infiniteScrollFooterLoaderStyle}
              />
            }
          />
          {/* TXN LIST */}
        </CyDView>
      </CyDImageBackground>
    </CyDSafeAreaView>
  ) : (
    <Loading />
  );
};
export default memo(CypherCardScreen);

const styles = StyleSheet.create({
  imageBackgroundImageStyles: {
    top: -50,
  },
  infiniteScrollFooterLoaderStyle: {
    height: 40,
  },
  contentContainerStyle: {
    marginHorizontal: '12px',
  },
});
