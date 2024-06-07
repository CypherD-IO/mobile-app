import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import {
  ChainNames,
  COSMOS_CHAINS,
  ChainNameMapping,
  NativeTokenMapping,
  CHAIN_ETH,
  GASLESS_CHAINS,
  PURE_COSMOS_CHAINS,
  CHAIN_OSMOSIS,
} from '../../../constants/server';
import {
  ActivityContext,
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  getNativeToken,
  formatAmount,
  logAnalytics,
  validateAmount,
  parseErrorMessage,
  limitDecimalPlaces,
  hasSufficientBalanceAndGasFee,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../../core/globalContext';
import Web3 from 'web3';
import {
  ActivityStatus,
  DebitCardTransaction,
  ActivityReducerAction,
  ActivityType,
} from '../../../reducers/activity_reducer';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import BottomTokenCardConfirm from '../../../components/BottomTokenCardConfirm';
import { genId } from '../../utilities/activityUtilities';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../../constants/timeOuts';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import {
  CardFeePercentage,
  GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  SlippageFactor,
  gasFeeReservation,
} from '../../../constants/data';
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import useAxios from '../../../core/HttpRequest';
import { get, random } from 'lodash';
import {
  AnalyticsType,
  ButtonType,
  CardProviders,
} from '../../../constants/enum';
import { TokenMeta } from '../../../models/tokenMetaData.model';
import clsx from 'clsx';
import {
  CardQuoteResponse,
  PayTokenModalParams,
} from '../../../models/card.model';
import useTransactionManager from '../../../hooks/useTransactionManager';
import useGasService from '../../../hooks/useGasService';

export default function BridgeFundCardScreen({ route }: { route: any }) {
  const {
    navigation,
    currentCardProvider,
    currentCardIndex,
  }: {
    navigation: any;
    currentCardProvider: CardProviders;
    currentCardIndex: number;
  } = route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const wallet = hdWallet.state.wallet;
  const globalStateContext = useContext<any>(GlobalContext);
  const activityContext = useContext<any>(ActivityContext);
  const cardProfile = globalContext.globalState.cardProfile;
  const cards = get(cardProfile, currentCardProvider)?.cards;
  const cardId: string = get(cards, currentCardIndex)?.cardId;
  const activityRef = useRef<DebitCardTransaction | null>(null);
  const { postWithAuth } = useAxios();

  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const kujira = hdWallet.state.wallet.kujira;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
    coreum: coreum.address,
    kujira: kujira.address,
  };

  const rpc = {
    cosmos: globalStateContext.globalState.rpcEndpoints.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints.JUNO.primary,
    stargaze: globalContext.globalState.rpcEndpoints.STARGAZE.primary,
    noble: globalContext.globalState.rpcEndpoints.NOBLE.primary,
    coreum: globalContext.globalState.rpcEndpoints.COREUM.primary,
    kujira: globalContext.globalState.rpcEndpoints.KUJIRA.primary,
  };

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] =
    useState<PayTokenModalParams>({
      isModalVisible: false,
      quoteExpiry: 60,
      hasSufficientBalanceAndGasFee: true,
      tokenSendParams: {
        chain: CHAIN_ETH.backendName,
        amountInCrypto: '',
        amountInFiat: '10',
        symbol: 'eth',
        toAddress: '',
        gasFeeInCrypto: '',
        gasFeeInFiat: '',
        nativeTokenSymbol: '',
      },
    });
  const [tokenQuote, setTokenQuote] = useState<CardQuoteResponse>({
    quoteId: '',
    chain: '',
    tokensRequired: 0,
    tokenAddress: '',
    tokenCoinId: '',
    tokensRequiredFiat: 0,
    amount: 0,
    fromAddress: '',
    targetAddress: '',
    masterAddress: '',
    cardProvider: '',
    tokenSymbol: '',
    expiry: 0,
    estimatedTime: 0,
    version: 2,
  });
  const [amount, setAmount] = useState('');
  const [isCrpytoInput, setIsCryptoInput] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [placeholderText, setPlaceholderText] = useState('0.00');
  const [loading, setLoading] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const [selectedToken, setSelectedToken] = useState<TokenMeta>();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const { estimateGasForEvm, estimateGasForEvmosIBC } = useGasService();
  const { sendEvmToken, sendCosmosToken, interCosmosIBC, evmosIBC } =
    useTransactionManager();

  useEffect(() => {
    if (isFocused) {
      if (route.params?.tokenData) {
        setSelectedToken(route.params.tokenData);
      } else {
        setTimeout(() => {
          setIsChooseTokenVisible(true);
        }, CHOOSE_TOKEN_MODAL_TIMEOUT);
      }
    }
  }, [isFocused]);

  const transferSentQuote = async (
    address: string,
    quoteId: string,
    txnHash: string,
  ) => {
    const transferSentUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/deposit`;
    const body = {
      address,
      quoteUUID: quoteId,
      txnHash,
    };

    try {
      if (!body.txnHash) {
        showModal('state', {
          type: 'error',
          title: 'Unable to process your transaction',
          description: `Incase your transaction went through, please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }
      const response = await postWithAuth(transferSentUrl, body);
      if (!response.isError) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.INPROCESS,
              transactionHash: txnHash,
              quoteId,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'success',
          title: t('FUNDING_IN_PROGRESS'),
          description:
            'Your card funding is in progress and will be done within 5 mins!',
          onSuccess: () => {
            hideModal();
            setTimeout(() => {
              navigation.navigate(screenTitle.OPTIONS, {
                screen: screenTitle.ACTIVITIES,
                initial: false,
              });
              navigation.popToTop();
            }, MODAL_HIDE_TIMEOUT_250);
          },
          onFailure: hideModal,
        });
      } else {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId,
              transactionHash: txnHash,
              reason: `Please contact customer support with the quote_id: ${quoteId}`,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `Please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId,
            transactionHash: txnHash,
            reason: `Please contact customer support with the quote_id: ${quoteId}`,
          },
        });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Error processing your txn',
        description: `Please contact customer support with the quote_id: ${quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const sendTransaction = useCallback(
    async (payTokenModalParamsLocal: any) => {
      try {
        const {
          contractAddress,
          chainDetails,
          contractDecimals,
          denom,
          symbol,
          name,
        } = selectedToken as TokenMeta;
        const actualTokensRequired = limitDecimalPlaces(
          tokenQuote.tokensRequired,
          contractDecimals,
        );
        const { chainName } = chainDetails;
        const activityData: DebitCardTransaction = {
          id: genId(),
          status: ActivityStatus.PENDING,
          type: ActivityType.CARD,
          quoteId: '',
          tokenSymbol: symbol ?? '',
          chainName: chainDetails?.backendName ?? '',
          tokenName: name.toString() ?? '',
          amount: tokenQuote.tokensRequired.toString() ?? '',
          amountInUsd: tokenQuote.amount ?? '',
          datetime: new Date(),
          transactionHash: '',
        };
        activityRef.current = activityData;
        activityContext.dispatch({
          type: ActivityReducerAction.POST,
          value: activityRef.current,
        });
        setLoading(true);
        if (tokenQuote && selectedToken) {
          activityRef.current &&
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityRef.current.id,
                gasAmount: payTokenModalParams.tokenSendParams.gasFeeInCrypto,
              },
            });
          if (chainName != null) {
            let response: {
              isError: boolean;
              hash: string;
              contractData?: string | undefined;
              error?: any;
              gasFeeInCrypto?: string | undefined;
            };
            if (chainName === ChainNames.ETH) {
              response = await sendEvmToken({
                chain: selectedToken.chainDetails.backendName,
                amountToSend: actualTokensRequired,
                toAddress: tokenQuote.targetAddress,
                contractAddress,
                contractDecimals,
                symbol: selectedToken.symbol,
              });
            } else if (
              PURE_COSMOS_CHAINS.includes(chainName) &&
              chainName !== ChainNames.OSMOSIS
            ) {
              response = await interCosmosIBC({
                fromChain: chainDetails,
                toChain: CHAIN_OSMOSIS,
                denom,
                amount: actualTokensRequired,
                fromAddress: get(cosmosAddresses, chainDetails.chainName),
                toAddress: tokenQuote.targetAddress,
              });
            } else if (chainName === ChainNames.OSMOSIS) {
              response = await sendCosmosToken({
                fromChain: chainDetails,
                denom,
                amount: actualTokensRequired,
                fromAddress: get(cosmosAddresses, chainDetails.chainName),
                toAddress: tokenQuote.targetAddress,
              });
            } else {
              response = await evmosIBC({
                toAddress: tokenQuote.targetAddress,
                toChain: CHAIN_OSMOSIS,
                amount: actualTokensRequired,
                denom,
                contractDecimals,
              });
            }
            const { hash, isError, error } = response;
            if (!isError) {
              void logAnalytics({
                type: AnalyticsType.SUCCESS,
                txnHash: hash,
                chain: selectedToken?.chainDetails?.chainName ?? '',
                ...(response?.contractData
                  ? { contractData: response?.contractData }
                  : ''),
                address: PURE_COSMOS_CHAINS.includes(
                  selectedToken?.chainDetails?.chainName,
                )
                  ? get(
                      cosmosAddresses,
                      selectedToken?.chainDetails?.chainName,
                      '',
                    )
                  : get(ethereum, 'address', ''),
              });
              void transferSentQuote(
                tokenQuote.fromAddress,
                tokenQuote.quoteId,
                hash,
              );
            } else {
              void logAnalytics({
                type: AnalyticsType.ERROR,
                chain: selectedToken?.chainDetails?.chainName ?? '',
                message: parseErrorMessage(error),
                screen: route.name,
                address: PURE_COSMOS_CHAINS.includes(
                  selectedToken?.chainDetails?.chainName,
                )
                  ? get(
                      cosmosAddresses,
                      selectedToken?.chainDetails?.chainName,
                      '',
                    )
                  : get(ethereum, 'address', ''),
              });
              activityRef.current &&
                activityContext.dispatch({
                  type: ActivityReducerAction.PATCH,
                  value: {
                    id: activityRef.current.id,
                    status: ActivityStatus.FAILED,
                    quoteId: tokenQuote.quoteId,
                    reason: error,
                  },
                });
              setLoading(false);
              showModal('state', {
                type: 'error',
                title: 'Transaction Failed',
                description: `${String(error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            }
          }
        } else {
          showModal('state', {
            type: 'error',
            title: t('MISSING_QUOTE'),
            description: t('MISSING_QUOTE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (error) {
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedToken?.chainDetails?.backendName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
          address: PURE_COSMOS_CHAINS.includes(
            selectedToken?.chainDetails?.chainName as string,
          )
            ? get(
                cosmosAddresses,
                selectedToken?.chainDetails?.chainName as string,
                '',
              )
            : get(ethereum, 'address', ''),
        });
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId: tokenQuote.quoteId,
              reason: error,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Transaction Failed',
          description: `${String(error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    },
    [payTokenModalParams, tokenQuote, selectedToken],
  );

  const onCancelConfirmationModal = () => {
    setPayTokenModalParams({
      ...payTokenModalParams,
      isModalVisible: false,
    });
    void intercomAnalyticsLog('cancel_transfer_token', {
      from: ethereum.address,
    });
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.DELETE,
        value: { id: activityRef.current.id },
      });
  };

  const onConfirmConfirmationModal = () => {
    void sendTransaction(payTokenModalParams);
    setPayTokenModalParams({ ...payTokenModalParams, isModalVisible: false });
  };

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    setTokenQuote(quote);
    const {
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
      contractAddress,
      contractDecimals,
      denom,
    } = selectedToken as TokenMeta;
    const nativeToken = getNativeToken(
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol,
      portfolioState.statePortfolio.tokenPortfolio[
        get(ChainNameMapping, chainDetails.backendName)
      ].holdings,
    );
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
            chain: chainDetails.backendName,
            fromAddress: ethereum.address,
            toAddress: targetWalletAddress,
            amountToSend: String(actualTokensRequired),
            contractAddress,
            contractDecimals,
          });
        } else {
          setPayTokenModalParams({
            isModalVisible: true,
            quoteExpiry: 60,
            hasSufficientBalanceAndGasFee: false,
            tokenSendParams: {
              chain: chainDetails.backendName,
              amountInCrypto: String(actualTokensRequired),
              amountInFiat: String(quote.amount),
              symbol: selectedTokenSymbol,
              toAddress: targetWalletAddress,
              gasFeeInCrypto: '0',
              gasFeeInFiat: '0',
              nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
            },
          });
        }
      } else if (
        PURE_COSMOS_CHAINS.includes(chainDetails.chainName) &&
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
      } else if (chainDetails.chainName === ChainNames.EVMOS) {
        gasDetails = await estimateGasForEvmosIBC({
          toAddress: quote.targetAddress,
          toChain: CHAIN_OSMOSIS,
          amount,
          denom,
          contractDecimals,
        });
      }
      setLoading(false);
      if (gasDetails) {
        const hasSufficient = hasSufficientBalanceAndGasFee(
          selectedTokenSymbol === chainDetails.symbol,
          parseFloat(String(gasDetails.gasFeeInCrypto)),
          nativeTokenBalance,
          actualTokensRequired,
          actualBalance,
        );
        setPayTokenModalParams({
          isModalVisible: true,
          quoteExpiry: 60,
          hasSufficientBalanceAndGasFee: hasSufficient,
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
          },
        });
      } else {
        setLoading(false);
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
        rpc,
      };
      Sentry.captureException(errorObject);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: t('GAS_ESTIMATION_FAILED'),
        description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const fundCard = async () => {
    const { contractAddress, coinGeckoId, contractDecimals, chainDetails } =
      selectedToken as TokenMeta;
    setLoading(true);
    Keyboard.dismiss();
    if (chainDetails.chainName === ChainNames.ETH) {
      try {
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'evm',
          address: ethereum.address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCrpytoInput,
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
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          coinId: coinGeckoId,
          amountInCrypto: isCrpytoInput,
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
    }
  };

  const isLoadCardDisabled = () => {
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      const hasInSufficientGas =
        (!GASLESS_CHAINS.includes(backendName) &&
          nativeTokenBalance <= get(gasFeeReservation, backendName)) ||
        (selectedToken?.symbol === nativeTokenSymbol &&
          Number(cryptoAmount) >
            Number(
              (
                nativeTokenBalance - get(gasFeeReservation, backendName)
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

  const onSelectingToken = (item: TokenMeta) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    setNativeTokenBalance(
      getNativeToken(
        get(NativeTokenMapping, item.chainDetails.symbol) ||
          item.chainDetails.symbol,
        portfolioState.statePortfolio.tokenPortfolio[
          get(ChainNameMapping, item.chainDetails.backendName)
        ].holdings,
      )?.actualBalance ?? 0,
    );
    setAmount('');
    setIsCryptoInput(false);
    setUsdAmount('');
    setCryptoAmount('');
  };

  const onMax = async () => {
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
      denom,
    } = selectedToken as TokenMeta;

    const nativeTokenSymbol =
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol;

    if (chainDetails.chainName === ChainNames.ETH) {
      const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
      setLoading(true);
      let amountInCrypto = actualBalance;
      try {
        // Reserving gas for the txn if the selected token is a native token.
        if (
          selectedTokenSymbol === nativeTokenSymbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          // Estimate the gasFee for the transaction
          const gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName,
            fromAddress: ethereum.address,
            toAddress: ethereum.address,
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
        setLoading(false);
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
          setLoading(false);
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
      let amountInCrypto = actualBalance;
      // Reserving gas for the txn if the selected token is a native token.
      setLoading(true);
      if (
        selectedTokenSymbol === nativeTokenSymbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName)
      ) {
        try {
          let gasDetails;
          if (chainDetails.chainName === ChainNames.EVMOS) {
            gasDetails = await estimateGasForEvmosIBC({
              toAddress: get(cosmosAddresses, ChainNames.OSMOSIS),
              toChain: CHAIN_OSMOSIS,
              amount,
              denom,
              contractDecimals,
            });
          } else {
            gasDetails = {
              gasFeeInCrypto: get(
                gasFeeReservation,
                [chainDetails.chainName, 'backendName'],
                0.1,
              ),
            };
          }

          if (gasDetails) {
            const gasFeeEstimationForTxn = String(gasDetails.gasFeeInCrypto);
            amountInCrypto =
              actualBalance -
              parseFloat(gasFeeEstimationForTxn) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
          } else {
            setLoading(false);
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
          setLoading(false);
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
          setLoading(false);
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
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNABLE_TO_TRANSFER'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const RenderSelectedToken = useCallback(() => {
    return (
      <CyDTouchView
        className={
          'bg-[#F7F8FE] mx-[20px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[8px]'
        }
        onPress={() => setIsChooseTokenVisible(true)}>
        <CyDView
          className={
            'p-[18px] flex flex-row flex-wrap justify-between items-center'
          }>
          {selectedToken && (
            <CyDView className={'flex flex-row w-[50%] items-center'}>
              <CyDImage
                source={{ uri: selectedToken.logoUrl }}
                className={'w-[25px] h-[25px] rounded-[20px]'}
              />
              <CyDView className='flex flex-col justify-center items-start'>
                <CyDText
                  className={clsx(
                    'text-center text-black font-nunito font-bold text-[16px] ml-[8px]',
                    {
                      'text-[14px]': selectedToken.isZeroFeeCardFunding,
                    },
                  )}>
                  {selectedToken.name}
                </CyDText>
                {selectedToken.isZeroFeeCardFunding ? (
                  <CyDView className='h-[20px] bg-white rounded-[8px] mx-[4px] px-[8px] flex justify-center items-center'>
                    <CyDText className={'font-black text-[10px]'}>
                      {'ZERO FEE ✨'}
                    </CyDText>
                  </CyDView>
                ) : null}
              </CyDView>
            </CyDView>
          )}
          {!selectedToken && (
            <CyDView>
              <CyDText>{t<string>('CHOOSE_TOKEN')}</CyDText>
            </CyDView>
          )}

          <CyDView className='flex flex-row items-center'>
            {selectedToken && (
              <>
                <CyDText className={'font-extrabold'}>~</CyDText>
                <CyDTokenAmount className={'font-extrabold mr-[3px]'}>
                  {selectedToken.actualBalance}
                </CyDTokenAmount>
                <CyDText className={'font-extrabold mr-[5px]'}>
                  {selectedToken.symbol}
                </CyDText>
              </>
            )}
            <CyDFastImage
              source={AppImages.DOWN_ARROW}
              className='h-[15px] w-[15px]'
              resizeMode='contain'
            />
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  }, [selectedToken]);

  const RenderWarningMessage = useCallback(() => {
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      if (symbol && backendName) {
        const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
        let errorMessage = '';
        if (Number(cryptoAmount) > Number(selectedToken?.actualBalance)) {
          errorMessage = t('INSUFFICIENT_FUNDS');
        } else if (
          !GASLESS_CHAINS.includes(backendName) &&
          nativeTokenBalance <= get(gasFeeReservation, backendName)
        ) {
          errorMessage = String(
            `Insufficient ${String(nativeTokenSymbol)} to pay gas fee`,
          );
        } else if (
          selectedToken?.symbol === nativeTokenSymbol &&
          Number(cryptoAmount) >
            Number(
              (
                nativeTokenBalance - get(gasFeeReservation, backendName)
              ).toFixed(6),
            )
        ) {
          errorMessage = t('INSUFFICIENT_GAS_FEE');
        } else if (
          usdAmount &&
          backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH
        ) {
          errorMessage = t('MINIMUM_AMOUNT_ETH');
        }
        return (
          <CyDView className='mb-[10px]'>
            <CyDText className='text-center text-redColor font-medium'>
              {errorMessage}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  }, [selectedToken, cryptoAmount]);

  const onPressToggle = () => {
    setIsCryptoInput(!isCrpytoInput);
    const multiplier =
      1 +
      get(
        CardFeePercentage,
        selectedToken?.chainDetails.backendName as string,
        0.5,
      ) +
      get(
        SlippageFactor,
        selectedToken?.chainDetails.backendName as string,
        0.003,
      );

    if (!isCrpytoInput) {
      const usdAmt =
        parseFloat(amount) *
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(amount);
      setUsdAmount(
        (isNaN(usdAmt)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? usdAmt
            : usdAmt / multiplier
        ).toString(),
      );
    } else {
      const cryptoAmt =
        parseFloat(amount) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(
        (isNaN(cryptoAmt)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? cryptoAmt
            : cryptoAmt * multiplier
        ).toString(),
      );
      setUsdAmount(amount);
    }
  };

  return (
    <CyDSafeAreaView className='h-full bg-white'>
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        tokenList={portfolioState.statePortfolio.tokenPortfolio.totalHoldings}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          onSelectingToken(token);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
          navigation.goBack();
        }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />

      <BottomTokenCardConfirm
        modalParams={{
          isModalVisible: payTokenModalParams.isModalVisible,
          quoteExpiry: payTokenModalParams.quoteExpiry,
          hasSufficientBalanceAndGasFee:
            payTokenModalParams.hasSufficientBalanceAndGasFee,
          tokenSendParams: payTokenModalParams.tokenSendParams,
        }}
        onConfirm={onConfirmConfirmationModal}
        onCancel={onCancelConfirmationModal}
      />
      <CyDKeyboardAwareScrollView>
        <RenderSelectedToken />
        <CyDView className={'mx-[20px]'}>
          <CyDView className='flex flex-row bg-[#F7F8FE] rounded-[8px] h-[300px] px-[20px] justify-between items-center'>
            <CyDView className={'p-[4px]'}>
              <CyDTouchView
                onPress={() => {
                  void onMax();
                }}
                disabled={loading}
                className={clsx(
                  'bg-white border border-inputBorderColor rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                )}>
                <CyDText>{t('MAX')}</CyDText>
              </CyDTouchView>
            </CyDView>
            <CyDView
              className={'pb-[10px] max-w-[60%] items-center bg-[#F7F8FE]'}>
              <CyDText
                className={
                  'font-extrabold text-[22px] text-center font-nunito text-black'
                }>
                {t<string>('ENTER_AMOUNT')}
              </CyDText>
              <CyDView className={'flex justify-center items-center'}>
                <CyDText className='text-[20px] font-semibold mt-[5px]'>
                  {isCrpytoInput ? selectedToken?.name : 'USD'}
                </CyDText>
                <CyDTextInput
                  className={clsx(
                    'font-extrabold text-center text-primaryTextColor h-[85px] font-nunito',
                    {
                      'text-[20px]': amount.length <= 15,
                      'text-[40px]': amount.length <= 10,
                      'text-[60px]': amount.length <= 5,
                    },
                  )}
                  value={amount}
                  keyboardType='numeric'
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={text => {
                    setAmount(text);
                    if (isCrpytoInput) {
                      const usdText =
                        parseFloat(text) *
                        (selectedToken?.isZeroFeeCardFunding
                          ? 1
                          : Number(selectedToken?.price));
                      setCryptoAmount(text);
                      setUsdAmount(
                        (isNaN(usdText)
                          ? '0.00'
                          : selectedToken?.isZeroFeeCardFunding
                            ? usdText
                            : usdText / 1.02
                        ).toString(),
                      );
                    } else {
                      const cryptoText =
                        parseFloat(text) /
                        (selectedToken?.isZeroFeeCardFunding
                          ? 1
                          : Number(selectedToken?.price));
                      setCryptoAmount(
                        (isNaN(cryptoText)
                          ? '0.00'
                          : selectedToken?.isZeroFeeCardFunding
                            ? cryptoText
                            : cryptoText * 1.02
                        ).toString(),
                      );
                      setUsdAmount(text);
                    }
                  }}
                  onFocus={() => {
                    setPlaceholderText('');
                  }}
                  placeholder={placeholderText}
                  placeholderTextColor={'#999'}
                />
                <CyDText
                  className={clsx(
                    'text-center text-primaryTextColor h-[50px] text-[16px]',
                  )}>
                  {'~' +
                    (isCrpytoInput
                      ? (!isNaN(parseFloat(usdAmount))
                          ? formatAmount(usdAmount).toString()
                          : '0.00') + ' USD'
                      : (!isNaN(parseFloat(cryptoAmount))
                          ? formatAmount(cryptoAmount).toString()
                          : '0.00') +
                        ' ' +
                        (selectedToken?.symbol ?? ' '))}
                </CyDText>
              </CyDView>
              {(!usdAmount || Number(usdAmount) < minTokenValueLimit) && (
                <CyDView className='mb-[10px]'>
                  <CyDText className='text-center font-semibold'>
                    {t<string>('CARD_LOAD_MIN_AMOUNT')}
                  </CyDText>
                </CyDView>
              )}
              <RenderWarningMessage />
            </CyDView>
            <CyDView className={'p-[4px]'}>
              <CyDTouchView
                onPress={() => {
                  onPressToggle();
                }}
                className={clsx(
                  'bg-white border border-inputBorderColor rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                )}>
                <CyDFastImage
                  className='h-[16px] w-[16px]'
                  source={AppImages.TOGGLE_ICON}
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
          <Button
            onPress={() => {
              if (validateAmount(amount)) {
                void fundCard();
              }
            }}
            type={ButtonType.PRIMARY}
            disabled={isLoadCardDisabled()}
            title={t('QUOTE')}
            style={clsx('h-[60px] mx-[32px] py-[10px] -top-[25px]', {
              'py-[8px]': loading,
            })}
            loading={loading}
          />
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDSafeAreaView>
  );
}
