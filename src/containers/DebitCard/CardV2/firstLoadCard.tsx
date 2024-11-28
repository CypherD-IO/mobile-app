import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { t } from 'i18next';
import { divide, get, random, round } from 'lodash';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Web3 from 'web3';
import AppImages from '../../../../assets/images/appImages';
import SelectPlanModal from '../../../components/selectPlanModal';
import Button from '../../../components/v2/button';
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import CyDModalLayout from '../../../components/v2/modal';
import { screenTitle } from '../../../constants';
import {
  CardFeePercentage,
  CYPHER_PLAN_ID_NAME_MAPPING,
  GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
  gasFeeReservation,
  HIDDEN_CARD_ID,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  SlippageFactor,
} from '../../../constants/data';
import {
  ButtonType,
  CardProviders,
  CypherPlanId,
  GlobalContextType,
} from '../../../constants/enum';
import {
  CHAIN_ETH,
  ChainBackendNames,
  ChainNames,
  COSMOS_CHAINS,
  GASLESS_CHAINS,
} from '../../../constants/server';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { Holding } from '../../../core/portfolio';
import {
  formatAmount,
  getWeb3Endpoint,
  hasSufficientBalanceAndGasFee,
  HdWalletContext,
  limitDecimalPlaces,
  parseErrorMessage,
  validateAmount,
} from '../../../core/util';
import useCardUtilities from '../../../hooks/useCardUtilities';
import useGasService from '../../../hooks/useGasService';
import usePortfolio from '../../../hooks/usePortfolio';
import { CardQuoteResponse } from '../../../models/card.model';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import Loading from '../../../components/v2/loading';

interface RouteParams {
  currentCardProvider: CardProviders;
  currentCardIndex: number;
}

const cardId = HIDDEN_CARD_ID;

export default function FirstLoadCard() {
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const globalDispatch = globalContext.globalDispatch;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { getNativeToken } = usePortfolio();
  const { patchWithAuth, postWithAuth } = useAxios();
  const { getWalletProfile } = useCardUtilities();
  const { showModal, hideModal } = useGlobalModalContext();
  const { estimateGasForEvm, estimateGasForSolana } = useGasService();

  const ethereum = hdWallet.state.wallet.ethereum;
  const solana = hdWallet.state.wallet.solana;
  const wallet = hdWallet.state.wallet;
  const { currentCardProvider } = route.params;
  const cardProfile = globalContext.globalState.cardProfile;
  const planData = globalContext.globalState.planInfo;
  const planCost = get(
    planData,
    [
      'default',
      cardProfile?.planInfo?.optedPlanId ?? CypherPlanId.BASIC_PLAN,
      'cost',
    ],
    0,
  );
  const optedPlanId =
    cardProfile?.planInfo?.optedPlanId ?? CypherPlanId.BASIC_PLAN;
  const minTokenValueLimit = Math.max(1, Number(planCost));

  const insect = useSafeAreaInsets();

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(true);
  const [selectedToken, setSelectedToken] = useState<Holding>();
  const [nativeToken, setNativeToken] = useState<Holding>();
  const [amount, setAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');

  const [isCryptoInput, setIsCryptoInput] = useState<boolean>(true);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [planPageVisible, setPlanPageVisible] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaxLoading, setIsMaxLoading] = useState<boolean>(false);

  useEffect(() => {
    if (amount) {
      onEnterAmount(amount);
    }
  }, [selectedToken]);

  const onEnterAmount = (amt: string) => {
    setAmount(amt);
    if (isCryptoInput) {
      const usdText =
        parseFloat(amt) *
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(amt);
      setUsdAmount(
        (Number.isNaN(usdText)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? usdText
            : usdText / 1.02
        ).toString(),
      );
    } else {
      const cryptoText =
        parseFloat(amt) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(
        (Number.isNaN(cryptoText)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? cryptoText
            : cryptoText * 1.02
        ).toString(),
      );
      setUsdAmount(amt);
    }
  };

  const getFontClass = (value: string) => {
    const length = value.replace('.', '').length;
    if (length > 7) return 'text-[24px]';
    if (length > 5) return 'text-[32px]';
    return 'text-[44px]';
  };

  const onSelectingToken = async (item: Holding) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    const _nativeToken = await getNativeToken(
      item.chainDetails.backendName as ChainBackendNames,
    );
    setNativeToken(_nativeToken);
    setIsCryptoInput(false);
  };

  const onOptedPlanChange = async (optedPlan: CypherPlanId) => {
    const { isError, error } = await patchWithAuth(`/v1/cards/rc/plan`, {
      optedPlanId: optedPlan,
    });
    if (!isError) {
      const resp = await getWalletProfile(globalContext.globalState.token);
      globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: resp,
      });
      setPlanChangeModalVisible(false);
      setTimeout(() => {
        showModal('state', {
          type: 'success',
          title: 'Plan changed successfully',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    } else {
      setPlanChangeModalVisible(false);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: 'Error changing plan',
          description: parseErrorMessage(error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    }
  };

  const getRoundedValue = (value: number) => {
    if (value <= 10) return 10;
    if (value >= 1000) {
      return Math.floor(value / 1000) * 1000;
    } else if (value >= 100) {
      return Math.floor(value / 100) * 100;
    } else {
      return Math.floor(value / 10) * 10;
    }
  };

  const getPercentageAmounts = () => {
    if (!selectedToken?.totalValue) return { p25: '0', p50: '0', p75: '0' };

    const total = selectedToken.totalValue;

    return {
      p25: getRoundedValue(total * 0.25).toString(),
      p50: getRoundedValue(total * 0.5).toString(),
      p75: getRoundedValue(total * 0.75).toString(),
    };
  };

  const onPressToggle = () => {
    const tempIsCryproInput = !isCryptoInput;
    setIsCryptoInput(!isCryptoInput);
    const multiplier =
      1 +
      divide(
        get(
          CardFeePercentage,
          selectedToken?.chainDetails.backendName as string,
          0.5,
        ),
        100,
      ) +
      get(
        SlippageFactor,
        selectedToken?.chainDetails.backendName as string,
        0.003,
      );

    if (tempIsCryproInput) {
      const usdAmt =
        parseFloat(amount) *
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(amount);
      setUsdAmount(
        (Number.isNaN(usdAmt)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? usdAmt
            : usdAmt * multiplier
        ).toString(),
      );
    } else {
      const cryptoAmt =
        parseFloat(
          String(
            Number(amount) *
              (selectedToken?.isZeroFeeCardFunding ? 1 : multiplier),
          ),
        ) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(
        (Number.isNaN(cryptoAmt) ? '0.00' : cryptoAmt).toString(),
      );
      setUsdAmount(amount);
    }
  };

  const isLoadCardDisabled = () => {
    if (selectedToken) {
      const { backendName } = selectedToken.chainDetails;
      const hasInSufficientGas =
        (!GASLESS_CHAINS.includes(backendName as ChainBackendNames) &&
          Number(nativeToken?.actualBalance) <=
            get(gasFeeReservation, backendName as ChainBackendNames)) ||
        (selectedToken?.symbol === nativeToken?.symbol &&
          Number(cryptoAmount) >
            Number(
              (
                Number(nativeToken?.actualBalance) -
                get(gasFeeReservation, backendName as ChainBackendNames)
              ).toFixed(6),
            ));
      return (
        Number(usdAmount) < minTokenValueLimit ||
        !selectedToken ||
        Number(cryptoAmount) > Number(selectedToken.actualBalance) ||
        hasInSufficientGas ||
        (backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH)
      );
    }
    return true;
  };

  const onMax = async () => {
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
    } = selectedToken as Holding;

    if (chainDetails.chainName === ChainNames.ETH) {
      const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
      setIsMaxLoading(true);
      let amountInCrypto = actualBalance;
      try {
        // Reserving gas for the txn if the selected token is a native token.
        if (
          selectedTokenSymbol === nativeToken?.symbol &&
          !GASLESS_CHAINS.includes(
            chainDetails.backendName as ChainBackendNames,
          )
        ) {
          // Estimate the gasFee for the transaction
          const gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName as ChainBackendNames,
            fromAddress: ethereum.address ?? '',
            toAddress: ethereum.address ?? '',
            amountToSend: String(actualBalance),
            contractAddress,
            contractDecimals,
          });
          if (gasDetails) {
            // Adjust the amountInCrypto with the estimated gas fee
            amountInCrypto =
              actualBalance -
              parseFloat(String(gasDetails.gasFeeInCrypto)) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
            amountInCrypto = Number(limitDecimalPlaces(amountInCrypto));
          } else {
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            return;
          }
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when estimating gas for the evm transaction.',
          selectedToken,
        };
        Sentry.captureException(errorObject);
        setIsMaxLoading(false);
        showModal('state', {
          type: 'error',
          title: t('GAS_ESTIMATION_FAILED'),
          description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      // Quote with isAmountInCrypto = true and amount as the adjusted crypto amount
      try {
        const payload = {
          ecosystem: 'evm',
          address: ethereum.address,
          chain: chainDetails.backendName,
          amount: amountInCrypto,
          tokenAddress: contractAddress,
          amountInCrypto: true,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in evm chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setIsMaxLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
      let amountInCrypto = actualBalance;
      // Reserving gas for the txn if the selected token is a native token.
      setIsMaxLoading(true);
      if (
        selectedTokenSymbol === nativeToken?.symbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName as ChainBackendNames)
      ) {
        try {
          const gasDetails = {
            gasFeeInCrypto: get(
              gasFeeReservation,
              [chainDetails.chainName, 'backendName'],
              0.1,
            ),
          };

          if (gasDetails) {
            const gasFeeEstimationForTxn = String(gasDetails.gasFeeInCrypto);
            amountInCrypto =
              actualBalance -
              parseFloat(gasFeeEstimationForTxn) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
          } else {
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            return;
          }
        } catch (err) {
          const errorObject = {
            err,
            message: 'Error when estimating gas for the cosmos transaction.',
            selectedToken,
          };
          Sentry.captureException(errorObject);
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: t('GAS_ESTIMATION_FAILED'),
            description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }
      }
      try {
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: amountInCrypto,
          coinId: coinGeckoId,
          amountInCrypto: true,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in cosmos chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            chainAddress: wallet[chainDetails.chainName].address,
            coinGeckoId,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setIsMaxLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNABLE_TO_TRANSFER'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const RenderWarningMessage = useCallback(() => {
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      if (symbol && backendName) {
        let errorMessage = '';
        if (Number(cryptoAmount) > Number(selectedToken?.actualBalance)) {
          errorMessage = '*You do not have enough balance to load the card';
        } else if (
          !GASLESS_CHAINS.includes(backendName as ChainBackendNames) &&
          Number(nativeToken?.actualBalance) <=
            get(gasFeeReservation, backendName as ChainBackendNames)
        ) {
          errorMessage = String(
            `*Insufficient ${String(nativeToken?.name)} to pay gas fee`,
          );
        } else if (
          selectedToken?.symbol === nativeToken?.symbol &&
          Number(cryptoAmount) >
            Number(
              (
                Number(nativeToken?.actualBalance) -
                get(gasFeeReservation, backendName as ChainBackendNames)
              ).toFixed(6),
            )
        ) {
          errorMessage = '*Insufficient funds to pay gas fee';
        } else if (
          usdAmount &&
          backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH
        ) {
          errorMessage = `${t<string>('MINIMUM_AMOUNT_ETH')} $${MINIMUM_TRANSFER_AMOUNT_ETH} ${planCost > 0 ? '(including plan cost)' : ''}`;
        } else if (!usdAmount || Number(usdAmount) < minTokenValueLimit) {
          if (backendName === CHAIN_ETH.backendName) {
            errorMessage = 'Minimum card load amount for Ethereum is $50';
          } else {
            errorMessage = `Minimum card load amount is $${String(minTokenValueLimit)} ${planCost > 0 ? '(including plan cost)' : ''}`;
          }
        }

        return (
          <CyDView className='mb-[10px]'>
            <CyDText className=' text-redColor font-normal text-[12px] text-wrap'>
              {`${errorMessage}`}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  }, [selectedToken, cryptoAmount, nativeToken]);

  const fundCard = async () => {
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
      denom,
    } = selectedToken as Holding;
    setLoading(true);
    Keyboard.dismiss();
    if (chainDetails.chainName === ChainNames.ETH) {
      try {
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'evm',
          address: ethereum.address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCryptoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (response?.data && !response.isError) {
          if (chainDetails.chainName != null) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, false);
          }
        } else {
          Sentry.captureException(response.error);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          setLoading(false);
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in evm chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
      try {
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          coinId: coinGeckoId,
          tokenAddress: denom,
          amountInCrypto: isCryptoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError && response?.data) {
          if (chainDetails.chainName != null) {
            const quote = response.data;
            void showQuoteModal(quote, false);
          }
        } else {
          showModal('state', {
            type: 'error',
            title: '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          setLoading(false);
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in cosmos chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            chainAddress: wallet[chainDetails.chainName].address,
            coinGeckoId,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else if (chainDetails.chainName === ChainNames.SOLANA) {
      try {
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'solana',
          address: solana.address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCryptoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );

        if (response?.data && !response.isError) {
          if (chainDetails.chainName != null) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, false);
          }
        } else {
          Sentry.captureException(response.error);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          setLoading(false);
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in evm chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
  };

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    const {
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
      contractAddress,
      contractDecimals,
    } = selectedToken as Holding;

    const actualTokensRequired = parseFloat(
      limitDecimalPlaces(quote.tokensRequired, contractDecimals),
    );
    let gasDetails;
    const targetWalletAddress = quote.targetAddress ? quote.targetAddress : '';
    try {
      if (chainDetails.chainName === ChainNames.ETH) {
        const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
        if (actualTokensRequired <= actualBalance) {
          gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName as ChainBackendNames,
            fromAddress: ethereum.address ?? '',
            toAddress: targetWalletAddress,
            amountToSend: String(actualTokensRequired),
            contractAddress,
            contractDecimals,
          });
        } else {
          setLoading(false);
          setIsMaxLoading(false);
          navigation.navigate(screenTitle.CARD_QUOTE_SCREEN, {
            hasSufficientBalanceAndGasFee: false,
            cardProvider: currentCardProvider,
            cardId,
            planCost,
            tokenSendParams: {
              chain: chainDetails.backendName,
              amountInCrypto: String(actualTokensRequired),
              amountInFiat: String(quote.amount - Number(planCost)),
              symbol: selectedTokenSymbol,
              toAddress: targetWalletAddress,
              gasFeeInCrypto: '0',
              gasFeeInFiat: '0',
              nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
              selectedToken,
              tokenQuote: quote,
            },
          });
        }
      } else if (
        COSMOS_CHAINS.includes(chainDetails.chainName) &&
        chainDetails.chainName !== ChainNames.OSMOSIS
      ) {
        gasDetails = {
          gasFeeInCrypto: parseFloat(String(random(0.01, 0.1, true))).toFixed(
            4,
          ),
        };
      } else if (chainDetails.chainName === ChainNames.OSMOSIS) {
        gasDetails = {
          gasFeeInCrypto: parseFloat(String(random(0.01, 0.1, true))).toFixed(
            4,
          ),
        };
      } else if (chainDetails.chainName === ChainNames.SOLANA) {
        gasDetails = await estimateGasForSolana({
          fromAddress: solana.address ?? '',
          toAddress: targetWalletAddress,
          amountToSend: String(actualTokensRequired),
          contractAddress,
          contractDecimals,
        });
      }
      setLoading(false);
      setIsMaxLoading(false);
      if (gasDetails) {
        const hasSufficient = hasSufficientBalanceAndGasFee(
          selectedTokenSymbol === chainDetails.symbol,
          parseFloat(String(gasDetails.gasFeeInCrypto)),
          Number(nativeToken?.actualBalance),
          actualTokensRequired,
          actualBalance,
        );
        navigation.navigate(screenTitle.CARD_QUOTE_SCREEN, {
          hasSufficientBalanceAndGasFee: hasSufficient,
          cardProvider: currentCardProvider,
          cardId,
          tokenSendParams: {
            chain: chainDetails.backendName,
            amountInCrypto: String(actualTokensRequired),
            amountInFiat: String(quote.amount),
            symbol: selectedTokenSymbol,
            toAddress: targetWalletAddress,
            gasFeeInCrypto: String(
              formatAmount(Number(gasDetails?.gasFeeInCrypto)),
            ),
            gasFeeInFiat: String(
              formatAmount(
                Number(gasDetails?.gasFeeInCrypto) *
                  Number(nativeToken?.price ?? 0),
              ),
            ),
            nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
            selectedToken,
            tokenQuote: quote,
          },
        });
      } else {
        showModal('state', {
          type: 'error',
          title: t('GAS_ESTIMATION_FAILED'),
          description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      const errorObject = {
        e,
        message: 'Error when estimating gasFee for the transaction for EVM',
        isMaxQuote,
        actualBalance,
        actualTokensRequired,
      };
      Sentry.captureException(errorObject);
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('GAS_ESTIMATION_FAILED'),
        description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const getTextAdjustment = (value: string) => {
    const length = value.replace('.', '').length;
    if (length > 7) return '';
    if (length > 5) return 'pb-[2px]';
    return 'h-[60px]';
  };

  return (
    <CyDView className='' style={{ paddingTop: insect.top }}>
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          void onSelectingToken(token as Holding);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
        }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />

      <CyDModalLayout
        isModalVisible={planChangeModalVisible}
        setModalVisible={setPlanChangeModalVisible}
        style={styles.modalLayout}>
        <CyDView className='bg-n20 rounded-t-[16px] px-[16px] pt-[16px] pb-[20px]'>
          <CyDView className='flex-row justify-between items-center'>
            <CyDFastImage
              source={AppImages.CYPHER_WARNING_RED}
              className='h-[32px] w-[32px]'
              resizeMode='contain'
            />
            <CyDTouchView onPress={() => setPlanChangeModalVisible(false)}>
              <CyDFastImage
                source={AppImages.CLOSE_CIRCLE}
                className='h-[24px] w-[24px]'
                resizeMode='contain'
              />
            </CyDTouchView>
          </CyDView>

          <CyDText className='mt-[4px] text-[20px] font-bold'>
            Change Plan
          </CyDText>
          <CyDText className='mt-[16px] text-[14px] font-medium'>
            {t('DOWNGRADE_PLAN_CONSENT')}
            <CyDText
              onPress={() => {
                navigation.navigate(screenTitle.LEGAL_SCREEN);
              }}
              className='text-[12px] font-bold underline text-center'>
              {'terms and conditions.'}
            </CyDText>
          </CyDText>

          <Button
            onPress={() => {
              setPlanChangeModalVisible(false);
              setTimeout(() => {
                setPlanPageVisible(true);
              }, 500);
            }}
            title='Compare plans'
            type={ButtonType.GREY}
            style='p-[3%] mt-[22px]'
          />
          <Button
            onPress={() => {
              void onOptedPlanChange(CypherPlanId.BASIC_PLAN);
            }}
            title={'Switch to Basic'}
            type={ButtonType.PRIMARY}
            style='p-[3%] mt-[12px] mb-[20px]'
          />
        </CyDView>
      </CyDModalLayout>

      <SelectPlanModal
        isModalVisible={planPageVisible}
        setIsModalVisible={setPlanPageVisible}
        openComparePlans={false}
        deductAmountNow={false}
      />

      <CyDView className='flex-col justify-between h-full'>
        {isMaxLoading && <Loading blurBg={true} />}
        <CyDView className='px-[16px]'>
          <CyDTouchView
            className='flex-row items-center gap-[16px] '
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDImage
              source={AppImages.BACK_ARROW_GRAY}
              className='w-[32px] h-[32px]'
            />
            <CyDText className='font-bold text-[28px]'>
              {'Lets Fund your Card'}
            </CyDText>
          </CyDTouchView>

          <CyDScrollView className=''>
            <CyDView className='mt-[24px] bg-n0 rounded-[16px] p-[12px] flex-row justify-between items-center'>
              <CyDView>
                <CyDText className='font-medium text-[14px] text-base100'>
                  {'Plan selected'}
                </CyDText>
                <CyDText className='font-bold text-[18px] mt-[4px]'>
                  {get(CYPHER_PLAN_ID_NAME_MAPPING, optedPlanId, optedPlanId)}
                </CyDText>
              </CyDView>
              <CyDTouchView
                className='bg-n30 rounded-[6px] p-[6px]'
                onPress={() => {
                  if (optedPlanId === CypherPlanId.BASIC_PLAN) {
                    setPlanPageVisible(true);
                  } else {
                    setPlanChangeModalVisible(true);
                  }
                }}>
                <CyDText className='font-bold text-[12px]'>
                  {'Change Plan'}
                </CyDText>
              </CyDTouchView>
            </CyDView>

            <CyDView className='mt-[16px]'>
              <CyDText className='font-medium text-[12px]'>
                Select the Token & Chain
              </CyDText>

              <CyDTouchView
                className='mt-[8px] bg-n0 rounded-[26px] py-[8px] px-[12px] flex-row items-center justify-between'
                onPress={() => {
                  setIsChooseTokenVisible(true);
                }}>
                <CyDView className='flex-row items-center gap-[8px]'>
                  <CyDFastImage
                    source={selectedToken?.chainDetails?.logo_url}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='font-bold text-[16px]'>
                    {selectedToken?.name}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center'>
                  {!isCryptoInput && (
                    <CyDText className='font-medium text-n100 text-[12px]'>
                      {`$${round(selectedToken?.totalValue ?? 0, 2)}`}
                    </CyDText>
                  )}
                  {isCryptoInput && (
                    <CyDText className='font-medium text-n100 text-[12px]'>
                      {`${round(selectedToken?.actualBalance ?? 0, 8)} ${String(selectedToken?.symbol ?? '')}`}
                    </CyDText>
                  )}
                  <CyDFastImage
                    source={AppImages.RIGHT_ARROW}
                    className='w-[24px] h-[24px] rotate-90'
                  />
                </CyDView>
              </CyDTouchView>
            </CyDView>

            <CyDView
              className={clsx('mt-[16px]', {
                'opacity-40 pointer-events-none': !selectedToken,
              })}>
              <CyDText className='font-bold text-[12px]'>
                Amount to be loaded in the card
              </CyDText>
              <CyDView className='mt-[8px] rounded-[16px] p-[24px] bg-n0'>
                <CyDView className='flex-row justify-between items-center'>
                  <CyDView className='w-[65%] '>
                    <CyDView className='py-[6px] px-[12px] bg-n20 rounded-[8px] flex-row justify-start items-center h-[65px]'>
                      {!isCryptoInput && (
                        <CyDText
                          className={clsx(
                            'font-bold',
                            getFontClass(amount),
                            getTextAdjustment(amount),
                          )}>
                          $
                        </CyDText>
                      )}
                      {isCryptoInput && (
                        <CyDView className='h-[38px] w-[38px] rounded-full border border-n50 flex-row justify-center items-center mr-[8px]'>
                          <CyDFastImage
                            source={{ uri: selectedToken?.logoUrl }}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                      )}
                      <CyDTextInput
                        keyboardType='decimal-pad'
                        returnKeyType='done'
                        onChangeText={text => {
                          onEnterAmount(text);
                        }}
                        value={amount}
                        placeholder='0.00'
                        placeholderTextColor={'#000000'}
                        className={clsx(
                          'font-bold w-[90%] p-[0px]',
                          getFontClass(amount),
                        )}
                        editable={!!selectedToken}
                      />
                    </CyDView>
                    {!isCryptoInput && (
                      <CyDText className='mt-[8px] text-[12px] font-bold'>
                        {`${round(Number(cryptoAmount) ?? 0, 3)} ${String(selectedToken?.symbol ?? '')}`}
                      </CyDText>
                    )}
                    {isCryptoInput && (
                      <CyDText className='mt-[8px] text-[12px] font-bold'>
                        {`$${round(Number(usdAmount) ?? 0, 3)}`}
                      </CyDText>
                    )}
                  </CyDView>
                  <CyDTouchView
                    className='w-[44px] h-[44px] bg-n40 rounded-full flex-row justify-center items-center'
                    onPress={() => {
                      onPressToggle();
                    }}
                    disabled={!selectedToken}>
                    <CyDFastImage
                      source={AppImages.TOGGLE_ICON}
                      className='w-[20px] h-[20px] self-center items-center'
                    />
                  </CyDTouchView>
                </CyDView>

                <CyDView className='mt-[16px] flex-row gap-x-[8px] items-center'>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() => onEnterAmount('10')}
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>$10</CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p25 === '10'
                          ? '100'
                          : getPercentageAmounts().p25,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p25 === '10'
                        ? '100'
                        : getPercentageAmounts().p25}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p50 === '10'
                          ? '200'
                          : getPercentageAmounts().p50,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p50 === '10'
                        ? '200'
                        : getPercentageAmounts().p50}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p75 === '10'
                          ? '500'
                          : getPercentageAmounts().p75,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p75 === '10'
                        ? '500'
                        : getPercentageAmounts().p75}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    disabled={
                      isMaxLoading ||
                      !usdAmount ||
                      !selectedToken ||
                      minTokenValueLimit > Number(selectedToken?.totalValue) ||
                      MINIMUM_TRANSFER_AMOUNT_ETH >
                        Number(selectedToken?.totalValue)
                    }
                    onPress={() => {
                      void onMax();
                    }}>
                    <CyDText className='font-bold text-[14px]'>{'MAX'}</CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView
              className={clsx('mt-[16px]', {
                'opacity-40 pointer-events-none': !selectedToken,
              })}>
              <CyDText className='font-bold text-[12px]'>Summary</CyDText>
              <CyDView className='mt-[8px] rounded-[16px] bg-n0'>
                <CyDView className='p-[24px]'>
                  <CyDView className='flex-row justify-between items-center'>
                    <CyDText className='font-normal text-[14px]'>
                      {get(
                        CYPHER_PLAN_ID_NAME_MAPPING,
                        optedPlanId,
                        optedPlanId,
                      )}
                    </CyDText>
                    {optedPlanId === CypherPlanId.BASIC_PLAN && (
                      <CyDText className='font-bold text-[14px] text-green400'>
                        {' 🎉 Free'}
                      </CyDText>
                    )}
                    {optedPlanId === CypherPlanId.PRO_PLAN && (
                      <CyDText className='font-bold text-[14px]'>
                        {`$${planCost}`}
                      </CyDText>
                    )}
                  </CyDView>
                  <CyDView className='flex-row justify-between items-center mt-[12px]'>
                    <CyDText className='font-normal text-[14px]'>
                      {'Card Load'}
                    </CyDText>
                    {usdAmount && Number(usdAmount) < planCost && (
                      <CyDText className='font-bold text-[14px]'>
                        {`$${round(Number(usdAmount), 2)}`}
                      </CyDText>
                    )}
                    {usdAmount && Number(usdAmount) > planCost && (
                      <CyDText className='font-bold text-[14px]'>
                        {`$${round(Number(usdAmount) - planCost, 2)}`}
                      </CyDText>
                    )}
                    {(!usdAmount || !cryptoAmount) && (
                      <CyDText className='font-bold text-[14px]'>
                        {'$0.00'}
                      </CyDText>
                    )}
                  </CyDView>
                </CyDView>
                <CyDView className='flex-row'>
                  {Array.from({ length: 30 }).map((_, index) => (
                    <CyDView
                      key={index}
                      className='flex-1 h-[1px] bg-n40 mx-[2px]'
                    />
                  ))}
                </CyDView>
                <CyDView className='p-[24px]'>
                  <CyDView className='flex-row justify-between items-center'>
                    <CyDText className='font-normal text-[14px]'>
                      {'Total'}
                    </CyDText>
                    {usdAmount && (
                      <CyDText className='font-bold text-[14px]'>
                        {`$${round(Number(usdAmount), 2)}`}
                      </CyDText>
                    )}
                    {!usdAmount && (
                      <CyDText className='font-bold text-[14px]'>
                        {'$0.00'}
                      </CyDText>
                    )}
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDScrollView>
        </CyDView>

        <CyDView className='bg-n0 px-[16px] pt-[16px] rounded-t-[12px] pb-[32px]'>
          <RenderWarningMessage />
          <Button
            disabled={isLoadCardDisabled()}
            title={'Get Quote'}
            loading={loading}
            onPress={() => {
              if (validateAmount(amount)) {
                void fundCard();
              }
            }}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
