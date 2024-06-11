import React, { useContext, useEffect, useState } from 'react';
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
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  GlobalContextType,
} from '../../../constants/enum';
import CardScreen from '../bridgeCard/card';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { get, has } from 'lodash';
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
import { getWalletProfile } from '../../../core/card';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import ShippingFeeConsentModal from '../../../components/v2/shippingFeeConsentModal';
import CardActivationConsentModal from '../../../components/v2/CardActivationConsentModal';
import Loading from '../../../components/v2/loading';

interface CypherCardScreenProps {
  navigation: any;
  route: { params: { hasBothProviders: boolean; cardProvider: CardProviders } };
}

export default function CypherCardScreen({
  navigation,
  route,
}: CypherCardScreenProps) {
  const { hasBothProviders, cardProvider } = route.params;
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
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
  const [currentCardProvider, setCurrentCardProvider] =
    useState<CardProviders>(cardProvider);
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
    await fetchCardBalance();
    void fetchRecentTransactions();
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
      setCurrentCardProvider(tempCurrentCardProvider as CardProviders);
    }
  }, [cardProfile, currentCardProvider, isFocused]);

  useEffect(() => {
    void onRefresh();
  }, [currentCardProvider]);

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
  const fetchRecentTransactions = async () => {
    const txnURL = `/v1/cards/${currentCardProvider}/card/${String(
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

  return isLayoutRendered ? (
    <CyDSafeAreaView className='flex-1 bg-gradient-to-b from-cardBgFrom to-cardBgTo mt-[20px] mb-[75px]'>
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
      <CyDView
        className={
          'h-[50px] flex flex-row justify-between items-center py-[5px] px-[10px] mx-[12px] mb-[8px]'
        }>
        <CyDView>
          <CyDText className={'font-bold text-[16px]'}>
            {t<string>('TOTAL_BALANCE') + ' (USD)'}
          </CyDText>
          <CyDText className={'font-bold text-[28px]'}>
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
            'pr-[7%] pl-[5%] py-[0px] w-[40%] flex flex-row items-center justify-center rounded-[8px] h-[44px]'
          }
          title={t('LOAD_CARD_CAPS')}
          titleStyle={'text-[14px]'}
        />
      </CyDView>
      <CyDScrollView>
        {/* <RenderMessage /> */}
        <CyDView className='mt-[2px]'>
          <CardScreen
            navigation={navigation}
            currentCardProvider={currentCardProvider}
            onPressUpgradeNow={onPressUpgradeNow}
            onPressActivateCard={onPressActivateCard}
            refreshProfile={() => {
              void refreshProfile();
            }}
          />
        </CyDView>
        <CyDView className='w-full bg-white mt-[12px] pb-[120px]'>
          <CyDView className='mx-[12px] my-[12px]'>
            <CyDText className='text-[18px] font-bold ml-[4px] mb-[4px]'>
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
                      hasBothProviders,
                      cardProvider: currentCardProvider,
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
