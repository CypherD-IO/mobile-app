import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import {
  ALL_CHAINS,
  Chain,
  CHAIN_STARGAZE,
  ChainBackendNames,
  CosmosStakingTokens,
  ChainNameMapping,
  NativeTokenMapping,
  CHAIN_ETH,
  GASLESS_CHAINS,
} from '../../constants/server';
import {
  ActivityContext,
  convertAmountOfContractDecimal,
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  validateAmount,
  getNativeToken,
  limitDecimalPlaces,
  formatAmount,
  logAnalytics,
  parseErrorMessage,
  getAvailableChains,
} from '../../core/util';
import AppImages from './../../../assets/images/appImages';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import axios, {
  MODAL_HIDE_TIMEOUT,
  MODAL_HIDE_TIMEOUT_250,
} from '../../core/Http';
import clsx from 'clsx';
import { BackHandler, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import SignatureModal from '../../components/v2/signatureModal';
import {
  evmosIbc,
  interCosmosIbc,
  sendCosmosTokens,
  sendInCosmosChain,
} from '../../core/bridge';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from '../../core/types';
import Web3 from 'web3';
import { getGasPriceFor } from '../Browser/gasHelper';
import {
  estimateGasForNativeTransaction,
  sendNativeCoinOrToken,
} from '../../core/NativeTransactionHandler';
import * as C from '../../constants';
import { screenTitle } from '../../constants';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { getSignerClient } from '../../core/Keychain';
import { useTranslation } from 'react-i18next';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  ExchangeTransaction,
} from '../../reducers/activity_reducer';
import {
  getQuoteCancelReasons,
  setQuoteCancelReasons,
} from '../../core/asyncStorage';
import { genId } from '../utilities/activityUtilities';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import {
  MINIMUM_TRANSFER_AMOUNT_ETH,
  gasFeeReservation,
  nativeTokenMapping,
} from '../../constants/data';
import { bridgeQuoteCosmosInterface } from '../../models/bridgeQuoteCosmos.interface';
import { BridgeDataCosmosInterface } from '../../models/bridgeDataCosmos.interface';
import { BridgeTokenDataInterface } from '../../models/bridgeTokenData.interface';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { hostWorker } from '../../global';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import { floor, get } from 'lodash';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import { FadeIn } from 'react-native-reanimated';
import {
  BRIDGE_COIN_LIST_TIMEOUT,
  MODAL_CLOSING_TIMEOUT,
} from '../../constants/timeOuts';
import useAxios from '../../core/HttpRequest';
import Button from '../../components/v2/button';
import {
  AnalyticsType,
  ButtonType,
  TokenModalType,
} from '../../constants/enum';
import { PORTFOLIO_EMPTY } from '../../reducers/portfolio_reducer';
import useIsSignable from '../../hooks/useIsSignable';
import ChooseTokenModal from '../../components/v2/chooseTokenModal';
import { checkAllowance } from '../../core/swap';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { Colors } from '../../constants/theme';
import { AllowanceParams } from '../../models/swapMetaData';
import { Holding } from '../../core/Portfolio';
import useTransactionManager from '../../hooks/useTransactionManager';
import { ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR } from '../Portfolio/constants';

const QUOTE_RETRY = 3;
const QUOTE_EXPIRY_SEC = 60;
const QUOTE_EXPIRY = QUOTE_EXPIRY_SEC * 1000;

export default function Bridge(props: { navigation?: any; route?: any }) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const routeData = props.route.params ?? {
    title: t('SWAP_TITLE'),
    renderPage: 'swapPage',
  };
  const { renderPage } = routeData;
  const { postWithAuth } = useAxios();
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const evmos = hdWallet.state.wallet.evmos;
  const { isReadOnlyWallet } = hdWallet.state;
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [bridgeLoading, setBridgeLoading] = useState(false);

  const [fromChain, setFromChain] = useState<Chain>(
    routeData?.fromChainData?.chainDetails ?? ALL_CHAINS[0],
  );
  const [fromTokenData, setFromTokenData] = useState([]);
  const [fromToken, setFromToken] = useState<TokenMeta>();
  const [toChainData, setToChainData] = useState<Chain>(CHAIN_STARGAZE);
  const [toChain, setToChain] = useState<Chain>();
  const [toToken, setToToken] = useState<BridgeTokenDataInterface>();
  const [chainListData, setChainListData] = useState(null);
  let minAmountUSD = 10;
  const [minimumAmount, setMinimumAmount] = useState<number>(0);
  const [fromChainModalVisible, setFromChainModalVisible] =
    useState<boolean>(false);
  const [toChainModalVisible, setToChainModalVisible] =
    useState<boolean>(false);
  const [fromTokenModalVisible, setFromTokenModalVisible] =
    useState<boolean>(false);
  const [toTokenModalVisible, setToTokenModalVisible] =
    useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [quoteCancelVisible, setQuoteCancelVisible] = useState<boolean>(false);
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(false);
  const activityId = useRef<string>('id');
  const [showDropDown, setShowDropDown] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('0.00');
  const commentsRef = useRef<string>('');
  const retryQuote = useRef<number>(-1);
  const [quoteExpiryTime, setQuoteExpiryTime] =
    useState<number>(QUOTE_EXPIRY_SEC);
  const expiryTimer = useRef<NodeJS.Timer>();
  const retryTimer = useRef<NodeJS.Timeout>();
  const [isSignableTransaction] = useIsSignable();
  const totalHoldings =
    portfolioState.statePortfolio.tokenPortfolio.totalHoldings;
  const [toTokenData, setToTokenData] = useState({
    originalTokenData: [],
    filteredTokenData: [],
  });
  const globalContext = useContext<any>(GlobalContext);
  const [allowanceParams, setAllowanceParams] = useState<AllowanceParams>({
    isApprovalModalVisible: false,
  });
  const [swapParams, setSwapParams] = useState({});
  const [swapSupportedChains, setSwapSupportedChains] = useState([
    1, 137, 10, 43114, 42161, 56, 250, 324, 8453, 1101, 1313161554, 1284, 1285,
  ]);
  let fromChainData = getAvailableChains(hdWallet).filter(chain =>
    swapSupportedChains.includes(chain.chainIdNumber),
  );
  const slippage = 0.4;
  const { getApproval, swapTokens } = useTransactionManager();

  const [quoteData, setQuoteData] = useState<bridgeQuoteCosmosInterface>({
    fromAmount: 0,
    fromAmountUsd: 0,
    receiverAddress: '',
    step1TargetWallet: '',
    toAmount: 0,
    quoteId: '',
    toAmountUsd: 0,
    minimumAmountReceived: '0',
    cypherdBridgeFee: '0',
    gasFee: '0',
    reasons: [],
  });
  const [cosmosBridgeData, setCosmosBridgeData] =
    useState<BridgeDataCosmosInterface>({
      fromAddress: '',
      toAddress: '',
      fromChainName: '',
      fromTokenName: '',
      fromTokenContractDecimal: 6,
      toChainName: '',
      toTokenName: '',
      toTokenContractDecimal: 6,
      transferAmount: '0',
      transactionHash: '',
      quoteId: '',
      ethereumAddress: '',
    });
  const [enterCryptoAmount, setEnterCryptoAmount] = useState<boolean>(true);
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const [animation, setAnimation] = useState<boolean>(true);
  const { getWithAuth } = useAxios();
  const { sendEvmToken } = useTransactionManager();
  let enterAmountRef;

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    props.navigation.setOptions({
      title: routeData.title,
    });
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  function getChainLogo(itemBackEndName: string) {
    switch (itemBackEndName) {
      case ChainBackendNames.ETH:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
      case ChainBackendNames.POLYGON:
        return 'https://logos.covalenthq.com/tokens/1/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png';
      case ChainBackendNames.AVALANCHE:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/avalanche-avax-logo.png';
      case ChainBackendNames.BSC:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/binance-coin-bnb-logo.png';
      case ChainBackendNames.FANTOM:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/fantom-ftm-logo.png';
      case ChainBackendNames.OPTIMISM:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
      case ChainBackendNames.EVMOS:
        return 'https://assets.coingecko.com/coins/images/24023/large/evmos.png?1653958927';
      case ChainBackendNames.ARBITRUM:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
      case ChainBackendNames.COSMOS:
        return 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png';
      case ChainBackendNames.OSMOSIS:
        return 'https://assets.coingecko.com/coins/images/16724/large/osmo.png?1632763885';
      case ChainBackendNames.JUNO:
        return 'https://assets.coingecko.com/coins/images/19249/large/juno.png?1642838082';
      case ChainBackendNames.STARGAZE:
        return 'https://public.cypherd.io/icons/stars.png';
      case ChainBackendNames.NOBLE:
        return 'https://public.cypherd.io/icons/logos/noble.png';
      case ChainBackendNames.SHARDEUM:
        return 'https://public.cypherd.io/icons/logos/shm.png';
      case ChainBackendNames.SHARDEUM_SPHINX:
        return 'https://public.cypherd.io/icons/logos/shm.png';
      default:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
    }
  }

  const parseCoinListData = (data: any) => {
    delete data.CYPHERD_TARGET_WALLET_ADDRESS;
    const response: BridgeTokenDataInterface[] = [];
    Object.entries(data).forEach(item => {
      const itemBackEndName = item[0];
      const itemDetails = item[1];
      const singleData = {
        isVerified: true,
        logoUrl: getChainLogo(itemBackEndName),
        name: itemDetails.tokens[0].name,
        backendName: itemBackEndName,
        contractAddress: itemDetails.tokens[0].contract_address,
        contractDecimals: itemDetails.tokens[0].contract_decimals,
        symbol: itemDetails.tokens[0].symbol,
        coinGeckoId: itemDetails.tokens[0].coinGeckoId,
      };
      response.push(singleData);
    });
    return response;
  };

  const setFromChainFunction = ({ item }) => {
    setFromChain(item);
    setToChain(item);
    if (
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.EVMOS,
        ChainBackendNames.JUNO,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(item.backendName)
    ) {
      minAmountUSD = 10;
      const tempData: Holding[] = [];
      portfolioState.statePortfolio.tokenPortfolio[
        ChainNameMapping[item.backendName as ChainBackendNames]
      ]?.holdings.forEach((data: Holding) => {
        if (
          data.name ===
          CosmosStakingTokens[item.backendName as CosmosStakingTokens]
        ) {
          tempData.push(data);
        }
      });
      if (tempData.length) {
        setMinimumAmount(minAmountUSD / Number(tempData[0].price));
        setFromTokenData(tempData);
        setFromToken(tempData[0]);
      } else {
        setFromToken(undefined);
        setFromTokenData([]);
      }
    } else {
      if (item.backendName === CHAIN_ETH.backendName) {
        minAmountUSD = MINIMUM_TRANSFER_AMOUNT_ETH;
      } else {
        minAmountUSD = 10;
      }
      setMinimumAmount(
        minAmountUSD /
          portfolioState.statePortfolio.tokenPortfolio[
            ChainNameMapping[item.backendName as ChainBackendNames]
          ]?.holdings[0].price,
      );
      const holdings =
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName as ChainBackendNames]
        ]?.holdings;
      const holdingsToShow: any = [];
      for (const holding of holdings) {
        if (holding?.isMainnet) {
          holdingsToShow.push(holding);
        }
      }
      if (holdingsToShow.length) {
        setFromToken(holdingsToShow[0]);
      } else if (!holdingsToShow.length) {
        setFromToken(undefined);
      }
      setFromTokenData(holdingsToShow);
    }
    setNativeTokenBalance(
      getNativeToken(
        (
          get(NativeTokenMapping, item.symbol as ChainBackendNames) ||
          item.symbol
        ).toUpperCase(),
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName as ChainBackendNames]
        ]?.holdings,
      )?.actualBalance ?? 0,
    );
  };

  function onModalHide(type = '') {
    hideModal();
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  function transferSentQuote(
    address: string,
    quoteUUID: string,
    txnHash: string,
  ) {
    postWithAuth('/v1/bridge/deposit', {
      address,
      quoteUUID,
      txnHash,
    })
      .then(response => {
        const bridgeEventDetails = {
          from_token: fromToken,
          from_chain: fromChain,
          to_chain: toChain,
          to_token: toToken,
          amount_crypto: quoteData.fromAmount,
          amount_usd: quoteData.fromAmountUsd,
        };

        if (!response?.isError && response?.status === 201) {
          // not to wait on event logging to speed up the app.
          void intercomAnalyticsLog('evm_bridge_success', bridgeEventDetails);
          void intercomAnalyticsLog(
            `evm_bridge_${String(
              get(fromToken, 'symbol', '').toLowerCase(),
            )}_${String(get(toToken, 'symbol', '').toLowerCase())}_success`,
            bridgeEventDetails,
          );

          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.INPROCESS,
              quoteId: quoteUUID,
              transactionHash: txnHash,
            },
          });
          setBridgeLoading(false);
          setSignModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'success',
              title: 'Success, Bridging in progress!',
              description:
                'Your asset will be deposited at the destination shortly.',
              onSuccess: () => onModalHide('success'),
              onFailure: hideModal,
            });
          }, 500);
        } else {
          void intercomAnalyticsLog(
            'bridge_email_send_failed',
            bridgeEventDetails,
          );
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.FAILED,
              quoteId: quoteUUID,
              reason: `Please contact customer support with the quote_id: ${quoteUUID}`,
            },
          });
          setSignModalVisible(false);
          setTimeout(() => {
            showModal('state', {
              type: 'error',
              title: 'Error processing your txn',
              description: `Please contact customer support with the quote_id: ${quoteUUID}`,
              onSuccess: onModalHide,
              onFailure: hideModal,
            });
          }, 500);
          setBridgeLoading(false);
        }
      })
      .catch(error => {
        void intercomAnalyticsLog('bridge_email_send_failed', {
          from_token: fromToken,
          from_chain: fromChain,
          to_chain: toChain,
          to_token: toToken,
          amount_crypto: quoteData.fromAmount,
          amount_usd: quoteData.fromAmountUsd,
        });
        setBridgeLoading(false);
        setSignModalVisible(false);

        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: 'Error processing your txn',
            description: `Please contact customer support with the quote_id: ${quoteUUID}`,
            onSuccess: onModalHide,
            onFailure: hideModal,
          });
        }, 500);
        Sentry.captureException(error);
      });
  }

  const handleBridgeTransactionResult = (
    message: string,
    quoteUUID: string,
    fromAddress: string,
    isError: boolean,
    isHashGenerated = false,
  ) => {
    if (isError) {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: fromChain.chainName,
        message: parseErrorMessage(message),
        screen: route.name,
      });
      if (message === t('INSUFFICIENT_GAS_ERROR')) {
        message = !isHashGenerated
          ? `You need ${String(
              get(
                nativeTokenMapping,
                String(get(fromToken, 'chainDetails.backendName')),
              ),
            )} ( ${String(get(fromToken, 'chainDetails.symbol'))} ) ${t(
              'INSUFFICIENT_GAS',
            )}`
          : `${message}. Please contact customer support with the quote_id: ${quoteUUID}`;
      }
      if (isHashGenerated) {
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.FAILED,
            quoteId: quoteUUID,
            reason: message,
          },
        });
      } else {
        activityContext.dispatch({
          type: ActivityReducerAction.DELETE,
          value: { id: activityId.current },
        });
      }
      setSignModalVisible(false);
      setBridgeLoading(false);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: 'Transaction Failed',
          description: message,
          onSuccess: onModalHide,
          onFailure: hideModal,
        });
      }, 500);
    } else {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: message,
        chain: fromChain.chainName,
      });
      transferSentQuote(fromAddress, quoteUUID, message);
    }
  };

  const sendTransaction = async (payTokenModalParamsLocal: any) => {
    const { symbol, contractAddress, contractDecimals, chainDetails } =
      fromToken;
    const response = await sendEvmToken({
      chain: chainDetails.backendName,
      amountToSend: convertAmountOfContractDecimal(
        cryptoAmount,
        fromToken?.contractDecimals,
      ),
      toAddress: quoteData.step1TargetWallet,
      contractAddress,
      contractDecimals,
      symbol,
    });
    const { isError, hash, error } = response;
    if (isError) {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: fromChain.chainName,
        message: parseErrorMessage(error),
        screen: route.name,
      });
      if (hash) {
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.FAILED,
            quoteId: quoteData.quoteId,
            reason: error,
          },
        });
      } else {
        activityContext.dispatch({
          type: ActivityReducerAction.DELETE,
          value: { id: activityId.current },
        });
      }
      setSignModalVisible(false);
      setBridgeLoading(false);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: 'Transaction Failed',
          description: error,
          onSuccess: onModalHide,
          onFailure: hideModal,
        });
      }, 500);
    } else {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: hash,
        chain: fromChain.chainName,
      });
      transferSentQuote(ethereum.address, quoteData.quoteId, hash);
    }
  };

  const parseBridgeQuoteData = data => {
    const quoteData = {
      fromAmount: parseFloat(cryptoAmount),
      fromAmountUsd: parseFloat(cryptoAmount) * fromToken?.price,
      receiverAddress: '',
      step1TargetWallet: data.step1TargetWallet,
      toAmount: parseFloat(data.transferAmount),
      quoteId: data.quoteUuid,
      toAmountUsd: parseFloat(data.usdValue),
      minimumAmountReceived: data.transferAmount,
      cypherdBridgeFee: '0',
      gasFee: data.estimatedGasFeeUsd,
      reasons: data.reasons,
    };
    return quoteData;
  };

  const isInterCosomosBridge = () => {
    return (
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.EVMOS,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(fromChain.backendName) &&
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.EVMOS,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(toChain.backendName)
    );
  };

  const onGetQuote = async () => {
    setBridgeLoading(true);
    setQuoteCancelVisible(false);
    if (isInterCosomosBridge()) {
      const receiverChainAddressCollection =
        hdWallet.state.wallet[toChain.chainName];
      const receiverChainAddress =
        receiverChainAddressCollection?.wallets[
          receiverChainAddressCollection.currentIndex
        ]?.address;
      const fromChainAddressCollection =
        hdWallet.state.wallet[fromChain.chainName];
      const fromChainAddress =
        fromChainAddressCollection?.wallets[
          fromChainAddressCollection.currentIndex
        ]?.address;

      const data = {
        fromAddress: fromChainAddress,
        toAddress: receiverChainAddress,
        fromChainName: fromChain.backendName,
        fromTokenName: fromToken?.name,
        fromTokenContractDecimal: fromToken?.contractDecimals,
        toChainName: toChain.backendName,
        toTokenName: toToken.name,
        toTokenContractDecimal: toToken.contractDecimals,
        transferAmount: cryptoAmount,
        ethereumAddress: ethereum.address,
      };
      setCosmosBridgeData({ ...cosmosBridgeData, ...data });
      const response = await postWithAuth('/v1/bridge/quote/cosmos', data);
      if (response.isError) {
        Sentry.captureException(response.error);
        setBridgeLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Transaction failed',
          description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        setQuoteData(response.data);
        setSignModalVisible(true);
        setBridgeLoading(false);
        await intercomAnalyticsLog('bridge_quote_requested', {
          address: fromChainAddress,
          fromChain: fromChain.name,
          toChain: toChain.name,
          fromToken: fromToken?.name,
          toToken: toToken.name,
        });
      }
    } else {
      const ethereumAddress = ethereum.address;
      const { address: cosmosFromAddress } =
        hdWallet.state.wallet[fromChain.chainName];
      const { address: cosmosToAddress } =
        hdWallet.state.wallet[toChain.chainName];
      const data = {
        fromAddress: [
          ChainBackendNames.COSMOS,
          ChainBackendNames.OSMOSIS,
          ChainBackendNames.JUNO,
          ChainBackendNames.STARGAZE,
          ChainBackendNames.NOBLE,
        ].includes(fromChain.backendName)
          ? cosmosFromAddress
          : ethereumAddress,
        toAddress:
          [
            ChainBackendNames.COSMOS,
            ChainBackendNames.OSMOSIS,
            ChainBackendNames.JUNO,
            ChainBackendNames.STARGAZE,
            ChainBackendNames.NOBLE,
          ].includes(toChain.backendName) && cosmosToAddress
            ? cosmosToAddress
            : ethereumAddress,
        fromChain: fromChain.backendName,
        toChain: toChain.backendName,
        fromTokenAddress:
          fromChain.backendName === ChainBackendNames.EVMOS &&
          fromToken?.chainDetails.backendName === ChainBackendNames.EVMOS
            ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            : fromToken?.contractAddress,
        toTokenAddress: toToken.contractAddress.toLowerCase(),
        fromTokenDecimal: fromToken?.contractDecimals,
        toTokenDecimal: toToken.contractDecimals,
        fromAmount: parseFloat(cryptoAmount),
        fromTokenLabel: fromToken?.name,
        toTokenLabel: toToken.name,
        fromTokenSymbol: fromToken?.symbol,
        toTokenSymbol: toToken.symbol,
        fromTokenCoingeckoId: fromToken?.coinGeckoId,
        toTokenCoingeckoId: toToken.coinGeckoId,
      };

      const quoteUrl = '/v1/bridge/quote';

      const response = await postWithAuth(quoteUrl, data);

      if (response.isError || response.data?.status === 'FAILED') {
        setBridgeLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description:
            response.error.message ?? `${fromToken?.name ?? ''} quote failed`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        Sentry.captureException(response.error ?? response.data?.message);
      } else {
        const quoteData = parseBridgeQuoteData(response.data);
        setQuoteData(quoteData);
        setSignModalVisible(true);
        setBridgeLoading(false);
        await intercomAnalyticsLog('bridge_quote_requested', {
          address: ethereum.address,
          fromChain: fromChain.name,
          toChain: toChain.name,
          fromToken: fromToken?.name,
          toToken: toToken.name,
        });
        startQuoteExpiryTimer();
        retryQuoteAfterExpiry();
      }
    }
  };

  const startQuoteExpiryTimer = () => {
    let tempQuoteExpiryTime = QUOTE_EXPIRY_SEC;
    setQuoteExpiryTime(QUOTE_EXPIRY_SEC);
    expiryTimer.current = setInterval(() => {
      setQuoteExpiryTime(--tempQuoteExpiryTime);
    }, 1000);
  };

  const retryQuoteAfterExpiry = () => {
    retryTimer.current = setTimeout(() => {
      if (retryQuote.current === QUOTE_RETRY) {
        setSignModalVisible(false);
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t<string>('BRIDGE_QUOTE_EXPIRED'),
            description: t<string>('BRIDGE_QUOTE_EXPIRED_DESC'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, MODAL_CLOSING_TIMEOUT);
      } else {
        clearInterval(expiryTimer.current);
        void onGetQuote();
        retryQuote.current++;
      }
    }, QUOTE_EXPIRY);
  };

  useEffect(() => {
    if (!signModalVisible || quoteCancelVisible) {
      clearTimeout(retryTimer.current);
      clearInterval(expiryTimer.current);
    }

    return () => {
      clearTimeout(retryTimer.current);
      clearInterval(expiryTimer.current);
    };
  }, [quoteCancelVisible, signModalVisible]);

  const computeGasFeeInUsd = (gasUsed: number): string => {
    const gasFee =
      gasUsed * cosmosConfig[ChainNameMapping[fromChain.backendName]].gasPrice;
    const gasFeeInUsd = gasFee * fromToken?.price;
    return gasFeeInUsd.toString();
  };

  const onPressBridge = async () => {
    const id = genId();
    const activityData: ExchangeTransaction = {
      id,
      status: ActivityStatus.PENDING,
      type: ActivityType.BRIDGE,
      quoteId: quoteData.quoteId,
      fromChain: fromChain.name,
      toChain: toChain.name,
      fromToken: fromToken?.name,
      toToken: toToken?.name,
      fromSymbol: fromToken?.symbol,
      toSymbol: toToken?.symbol,
      fromTokenLogoUrl: fromToken?.logoUrl,
      toTokenLogoUrl: toToken?.logoUrl,
      fromTokenAmount: parseFloat(cryptoAmount).toFixed(3),
      toTokenAmount: quoteData.toAmount.toString(),
      datetime: new Date(),
      transactionHash: '',
      quoteData,
    };
    activityId.current = id;
    activityContext.dispatch({
      type: ActivityReducerAction.POST,
      value: activityData,
    });

    await intercomAnalyticsLog('bridge_initiated', {
      from_token: fromToken,
      from_chain: fromChain,
      to_chain: toChain,
      to_token: toToken,
      amount_crypto: quoteData.fromAmount,
      amount_usd: quoteData.fromAmountUsd,
    });

    const fromChainRpc =
      globalStateContext.globalState.rpcEndpoints[fromChain.backendName]
        .primary;
    if (
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.STARGAZE,
      ].includes(fromChain.backendName) &&
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.EVMOS,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(toChain.backendName)
    ) {
      setBridgeLoading(true);
      setSignModalVisible(false);
      const wallets = await getSignerClient(hdWallet);
      try {
        let response;
        let transactionHash = '';
        let sequenceNumber = '0';
        if (fromChain.backendName === ChainBackendNames.OSMOSIS) {
          response = await sendCosmosTokens(
            fromChainRpc,
            cryptoAmount,
            wallets,
            ChainNameMapping[fromChain.backendName],
            quoteData.receiverAddress,
          );
          if (response) {
            transactionHash = response.transactionHash;
          }
        } else {
          response = await interCosmosIbc(
            wallets,
            fromChain,
            fromChainRpc,
            cryptoAmount,
            quoteData.receiverAddress,
          );
          if (response) {
            transactionHash = response.transactionHash;
            if (response.rawLog) {
              sequenceNumber = JSON.parse(response?.rawLog);
              sequenceNumber =
                sequenceNumber[0]?.events[4]?.attributes[4]?.value;
            }
          }
        }
        const data = {
          ...cosmosBridgeData,
          transactionHash,
          quoteId: quoteData.quoteId,
          minimumAmountReceived: quoteData.minimumAmountReceived,
          sequenceNumber,
          cypherdBridgeFee: quoteData.cypherdBridgeFee,
        };

        await postWithAuth('/v1/bridge/txn/cosmos', data);

        const gasFeeUsd = computeGasFeeInUsd(response.gasUsed);
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.INPROCESS,
            quoteData: { ...quoteData, gasFee: gasFeeUsd },
          },
        });
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.SUCCESS,
          txnHash: transactionHash,
          chain: fromChain.chainName,
        });
        setBridgeLoading(false);

        props.navigation.navigate(C.screenTitle.BRIDGE_STATUS, {
          fromChain,
          fromToken,
          toChain,
          toToken,
          sentAmount: cryptoAmount,
          sentAmountUsd: quoteData.fromAmountUsd,
          receivedAmount: quoteData.minimumAmountReceived,
          quoteId: quoteData.quoteId,
        });
      } catch (error) {
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.FAILED,
            reason: error.message,
          },
        });
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: fromChain.chainName,
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Sentry.captureException(error);
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.FAILED,
          },
        });
        setBridgeLoading(false);
      }
      setBridgeLoading(false);
    } else if (
      fromChain.backendName === ChainBackendNames.EVMOS &&
      [
        ChainBackendNames.COSMOS,
        ChainBackendNames.OSMOSIS,
        ChainBackendNames.JUNO,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
      ].includes(toChain.backendName)
    ) {
      setBridgeLoading(true);
      setSignModalVisible(false);

      try {
        const evmosAddress = evmos.wallets[evmos.currentIndex].address;
        const { transactionHash, gasFee }: any = await evmosIbc(
          evmosAddress,
          hdWallet,
          quoteData.receiverAddress,
          cryptoAmount,
        );
        if (transactionHash && gasFee) {
          const data = {
            ...cosmosBridgeData,
            transactionHash,
            quoteId: quoteData.quoteId,
            minimumAmountReceived: quoteData.minimumAmountReceived,
            sequenceNumber: '0',
            cypherdBridgeFee: quoteData.cypherdBridgeFee,
          };

          await postWithAuth('/v1/bridge/txn/cosmos', data);
          const gasFeeUsd = computeGasFeeInUsd(gasFee);
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.INPROCESS,
              quoteData: {
                ...quoteData,
                gasFee: gasFeeUsd,
              },
            },
          });
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.SUCCESS,
            txnHash: transactionHash,
            chain: fromChain.chainName,
          });
          props.navigation.navigate(C.screenTitle.BRIDGE_STATUS, {
            fromChain,
            fromToken,
            toChain,
            toToken,
            sentAmount: cryptoAmount,
            receivedAmount: quoteData.minimumAmountReceived,
            quoteId: quoteData.quoteId,
          });
        } else {
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.ERROR,
            chain: fromChain.chainName,
            message: 'IBC failed',
            screen: route.name,
          });
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.FAILED,
              reason: 'IBC failed',
            },
          });
        }
      } catch (e) {
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: fromChain.chainName,
          message: parseErrorMessage(e),
          screen: route.name,
        });
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityId.current,
            status: ActivityStatus.FAILED,
            reason: e.message,
          },
        });
        Sentry.captureException(e);
      }
      setBridgeLoading(false);
    } else {
      setBridgeLoading(true);
      if (
        [
          ChainBackendNames.COSMOS,
          ChainBackendNames.OSMOSIS,
          ChainBackendNames.JUNO,
          ChainBackendNames.STARGAZE,
          ChainBackendNames.NOBLE,
        ].includes(fromChain.backendName)
      ) {
        const wallets = await getSignerClient(hdWallet);
        await sendInCosmosChain(
          globalStateContext.globalState.rpcEndpoints[fromChain.backendName]
            .primary,
          cryptoAmount,
          wallets,
          ChainNameMapping[fromChain.backendName],
          handleBridgeTransactionResult,
          quoteData,
          fromToken.denom,
        );
        setBridgeLoading(false);
      } else {
        let gasPrice: GasPriceDetail = {
          chainId: fromChain.backendName,
          gasPrice: 0,
          tokenPrice: 0,
        };
        const web3RPCEndpoint = new Web3(
          getWeb3Endpoint(hdWallet.state.selectedChain, globalStateContext),
        );
        try {
          const gasFeeResponse = await getGasPriceFor(
            fromChain,
            web3RPCEndpoint,
          );
          gasPrice = gasFeeResponse;
          estimateGasForNativeTransaction(
            hdWallet,
            fromChain,
            fromToken,
            convertAmountOfContractDecimal(
              cryptoAmount,
              fromToken?.contractDecimals,
            ),
            true,
            gasPrice,
            sendTransaction,
            globalStateContext,
            quoteData.step1TargetWallet,
          );
        } catch (gasFeeError) {
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.ERROR,
            chain: fromChain.chainName,
            message: parseErrorMessage(gasFeeError),
            screen: route.name,
          });
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.FAILED,
            },
          });
          showModal('state', {
            type: 'error',
            title: '',
            description: gasFeeError,
            onSuccess: onModalHide,
            onFailure: hideModal,
          });
          Sentry.captureException(gasFeeError);
          setBridgeLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      if (routeData?.fromChainData) {
        const { fromChainData } = routeData;
        const tempData = { item: fromChainData.chainDetails };
        if (fromChainData.chainDetails.backendName === CHAIN_ETH.backendName) {
          minAmountUSD = MINIMUM_TRANSFER_AMOUNT_ETH;
        }
        setFromChain(fromChainData.chainDetails);
        if (fromChainData.isMainnet) {
          setFromChainFunction(tempData);
          setFromToken(fromChainData);
        }
        if (
          swapSupportedChains.includes(
            fromChainData.chainDetails.chainIdNumber,
          ) &&
          routeData.title === 'Swap'
        ) {
          setToChain(fromChainData.chainDetails);
        } else if (routeData.title !== 'Swap') {
          setToChain(
            ALL_CHAINS.find(
              chain => chain.backendName !== fromChain.backendName,
            ),
          );
        }
        setMinimumAmount(minAmountUSD / fromChainData.price);
        setNativeTokenBalance(
          getNativeToken(
            (
              NativeTokenMapping[fromChainData.chainDetails.symbol] ||
              fromChainData.chainDetails.symbol
            ).toUpperCase(),
            portfolioState.statePortfolio.tokenPortfolio[
              ChainNameMapping[fromChainData.chainDetails.backendName]
            ].holdings,
          )?.actualBalance ?? 0,
        );
      } else {
        setLoading(true);
        minAmountUSD = MINIMUM_TRANSFER_AMOUNT_ETH; // Change this to 10 if default chain is changed to any chain other than ETH
        setFromTokenData(
          portfolioState.statePortfolio.tokenPortfolio?.eth.holdings,
        );
        setFromToken(
          portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0],
        );
        setMinimumAmount(
          minAmountUSD /
            portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0].price,
        );
        setNativeTokenBalance(
          getNativeToken(
            (
              NativeTokenMapping[
                portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0]
                  .chainDetails.symbol
              ] ||
              portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0]
                .chainDetails.symbol
            ).toUpperCase(),
            portfolioState.statePortfolio.tokenPortfolio[
              ChainNameMapping[
                portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0]
                  .chainDetails.backendName
              ]
            ].holdings,
          )?.actualBalance ?? 0,
        );
        setToChain(ALL_CHAINS[routeData.title === 'Swap' ? 0 : 1]);
      }
      setAmount('0.00');
      setUsdAmount('0.00');
      setShowDropDown(true);

      const getInfo = async () => {
        try {
          const coinListUrl = `${ARCH_HOST}/v1/bridge/coinList`;
          const response = await axios.get(coinListUrl, {
            timeout: BRIDGE_COIN_LIST_TIMEOUT,
          });
          const chainData = parseCoinListData(response.data);
          setChainListData(chainData);
          setToToken(chainData[0]);
          setLoading(false);
        } catch (error) {
          setLoading(false);
          Sentry.captureException(error);
          showModal('state', {
            type: 'error',
            title: 'Failed fetching your data, Please try again',
            description: error.message,
            onSuccess: () => {
              hideModal();
              setTimeout(() => {
                props.navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
              }, MODAL_HIDE_TIMEOUT);
            },
            onFailure: hideModal,
          });
        }
      };

      getInfo().catch(error => {
        Sentry.captureException(error);
      });

      const getSwapSupportedChains = async () => {
        const response = await getWithAuth('/v1/swap/evm/chains');
        if (!response.isError && response?.data?.chains) {
          const { fromChainData: fromChainDataFromRoute } = routeData;
          const { chains } = response.data ?? [];
          fromChainData = getAvailableChains(hdWallet).filter(chain =>
            chains.includes(chain.chainIdNumber),
          );
          setSwapSupportedChains(chains);
          if (
            routeData?.fromChainData &&
            chains.includes(
              fromChainDataFromRoute.chainDetails.chainIdNumber,
            ) &&
            routeData.title === 'Swap'
          ) {
            setToChain(fromChainDataFromRoute.chainDetails);
          }
        }
      };

      getSwapSupportedChains().catch(error => {
        Sentry.captureException(error);
      });
    }
  }, [isFocused]);

  useEffect(() => {
    const chainData: Chain[] = [];
    let tempData: Chain;
    ALL_CHAINS.forEach(item => {
      if (
        swapSupportedChains.includes(fromChain.chainIdNumber) ||
        item.name !== fromChain.name
      ) {
        tempData = item;
        chainData.push(item);
      }
    });
    if (
      toChain?.name === fromChain.name &&
      !swapSupportedChains.includes(fromChain.chainIdNumber)
    ) {
      // diaabled bridge - Feb 10th 2024
      // setToChain(tempData);
    }
    setToChainData(chainData);
  }, [fromChain, toChain]);

  useEffect(() => {
    if (chainListData && fromChain.backendName !== toChain?.backendName) {
      let toTokenFound = false;
      chainListData.forEach(item => {
        if (item.backendName === toChain?.backendName) {
          setToToken(item);
          toTokenFound = true;
        }
      });
      if (!toTokenFound) {
        setToToken(undefined);
        setToTokenData({
          originalTokenData: [],
          filteredTokenData: [],
        });
      }
    } else if (fromChain.backendName === toChain?.backendName) {
      void fetchChainSupportedTokens();
    }
  }, [toChain, fromChain, chainListData]);

  useEffect(() => {
    if (
      fromChain.chainIdNumber === toChain?.chainIdNumber &&
      fromChain.backendName === toChain.backendName
    ) {
      const filteredTokens = toTokenData.originalTokenData.filter(
        token => token.symbol !== fromToken?.symbol,
      );
      setToTokenData({
        ...toTokenData,
        filteredTokenData: filteredTokens,
      });
      setToToken(filteredTokens[0]);
    }
  }, [fromToken]);

  const fetchChainSupportedTokens = async () => {
    const response = await getWithAuth(
      `/v1/swap/evm/chains/${toChain.chainIdNumber}/tokens`,
    );
    if (!response.isError) {
      if (response?.data?.tokens) {
        const filteredTokens = response.data.tokens.filter(
          token => token.symbol !== fromToken?.symbol,
        );
        setToTokenData({
          originalTokenData: response.data.tokens,
          filteredTokenData: filteredTokens,
        });
        setToToken(filteredTokens[0]);
      }
    }
  };

  if (loading) {
    return (
      <CyDView
        className={'flex justify-center items-center bg-white h-full w-full'}>
        <LottieView
          source={AppImages.LOADING_IMAGE}
          autoPlay
          loop
          style={{ height: 150, width: 150 }}
        />
      </CyDView>
    );
  }

  if (portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY) {
    return (
      <CyDView
        className={'flex justify-center items-center bg-white h-full w-full'}>
        <CyDImage
          source={AppImages.MOVE_FUND_BG}
          className={'w-[80%] h-[70%]'}
        />
        <CyDText
          className={
            'mt-[20px] font-normal font-nunito text-black text-[20px]'
          }>
          {t<string>('FUND_WALLET_ACCESS_BRIDGE').toString()}
        </CyDText>
      </CyDView>
    );
  }

  const isExchangeDisabled = () => {
    if (fromToken) {
      const { actualBalance, chainDetails } = fromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      const gas = isSwap()
        ? swapParams?.gasFeeETH
        : gasFeeReservation[backendName];
      const isGaslessChain = GASLESS_CHAINS.includes(backendName);
      const hasInSufficientGas =
        (!isGaslessChain && nativeTokenBalance <= gas) ||
        (fromToken?.symbol === nativeTokenSymbol &&
          parseFloat(cryptoAmount) >
            parseFloat((parseFloat(String(actualBalance)) - gas).toFixed(6)));
      return (
        (!isGaslessChain && nativeTokenBalance === 0) ||
        parseFloat(cryptoAmount) > parseFloat(String(actualBalance)) ||
        hasInSufficientGas
      );
    }
    return true;
  };

  const renderWarningPopupMessage = (message: string) => {
    return (
      <CyDView className='flex flex-row items-center rounded-[15px] justify-center py-[15px] mt-[20px] mb-[10px] bg-warningRedBg'>
        <CyDFastImage
          source={AppImages.CYPHER_WARNING_RED}
          className='h-[20px] w-[20px] ml-[13px] mr-[13px]'
          resizeMode='contain'
        />
        <CyDText className='text-red-500 font-medium text-[12px]  w-[80%] '>
          {message}
        </CyDText>
      </CyDView>
    );
  };

  const RenderWarningMessage = () => {
    if (fromToken) {
      const { actualBalance, chainDetails } = fromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol: string =
        get(NativeTokenMapping, symbol) || symbol;
      const gas = isSwap()
        ? swapParams?.gasFeeETH
        : gasFeeReservation[backendName];
      if (parseFloat(cryptoAmount) > parseFloat(String(actualBalance))) {
        return renderWarningPopupMessage(
          fromChain !== toChain
            ? t<string>('INSUFFICIENT_BALANCE_BRIDGE')
            : t<string>('INSUFFICIENT_BALANCE_SWAP'),
        );
      } else if (
        !GASLESS_CHAINS.includes(backendName) &&
        nativeTokenBalance <= gas
      ) {
        return renderWarningPopupMessage(
          `Insufficient ${nativeTokenSymbol} for gas fee`,
        );
      } else if (
        fromToken?.symbol === nativeTokenSymbol &&
        parseFloat(cryptoAmount) >
          parseFloat((parseFloat(String(actualBalance)) - gas).toFixed(6))
      ) {
        return renderWarningPopupMessage(
          `${t<string>('INSUFFICIENT_GAS_FEE')}`,
        );
      }
    }

    return null;
  };

  const onPressData = (value: string) => {
    const state = selectedReasons.includes(value)
      ? selectedReasons.filter(val => val !== value)
      : [...selectedReasons, value];
    setSelectedReasons(state);
  };

  const renderReasons = (
    reason: string,
    index: number,
    { length }: { length: number },
  ) => {
    return (
      <CyDView
        key={index}
        className={clsx('flex flex-row justify-between p-[13px] mx-[10px]', {
          'border-b-[1px] border-b-sepratorColor': length - 1 !== index,
        })}>
        <CyDView className={'flex flex-row justify-start items-center'}>
          <CyDText className={'font-extrabold text-[14px]'}>{reason}</CyDText>
        </CyDView>
        <CyDView className={'flex flex-wrap justify-end'}>
          <CyDTouchView
            onPress={e => {
              onPressData(reason);
            }}
            className={`h-[20px] w-[20px] ${
              selectedReasons.includes(reason) ? 'bg-appColor' : ''
            } rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center`}>
            {selectedReasons.includes(reason) ? (
              <CyDImage
                style={{ tintColor: 'black' }}
                source={AppImages.CORRECT}
              />
            ) : null}
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  };

  const onSignModalCancel = async () => {
    const dontAsk = await getQuoteCancelReasons();
    if (!dontAsk && fromToken) {
      const { actualBalance, chainDetails } = fromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      if (
        parseFloat(cryptoAmount) > parseFloat(String(actualBalance)) ||
        nativeTokenBalance <= gasFeeReservation[backendName] ||
        (fromToken?.symbol === nativeTokenSymbol &&
          parseFloat(cryptoAmount) >
            parseFloat(
              (
                parseFloat(String()) - get(gasFeeReservation, backendName)
              ).toFixed(6),
            ))
      ) {
        quoteData.reasons.push('Insufficient Funds');
      }
      setSelectedReasons([]);
      setDontAskAgain(false);
      commentsRef.current = '';
      if (
        isReadOnlyWallet ||
        isSwap() ||
        parseFloat(cryptoAmount) > parseFloat(String(actualBalance))
      ) {
        setSignModalVisible(false);
      } else {
        setQuoteCancelVisible(true);
        setAnimation(true);
        setTimeout(() => {
          setAnimation(false);
        }, 100);
      }
    } else {
      setSignModalVisible(false);
    }
  };

  const submitReasons = async (selectedReasons: string[]) => {
    try {
      if (commentsRef.current) {
        selectedReasons.push(commentsRef.current);
      }
      const data = {
        feedback: {
          ...quoteData,
          reasons: selectedReasons,
          chain: `${fromChain.name} -> ${String(toChain?.name)}`,
          token: `${String(fromToken?.name)} -> ${String(toToken?.name)}`,
        },
      };
      await postWithAuth('/v1/notification/slack/user-feedback', data);
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const onCancellingQuote = () => {
    setSignModalVisible(false);
    void setQuoteCancelReasons(dontAskAgain);
    if (commentsRef?.current !== '' || selectedReasons.length) {
      void submitReasons(selectedReasons);
      setTimeout(() => {
        showModal('state', {
          type: 'success',
          title: t('THANKS_FOR_FEEDBACK'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, MODAL_CLOSING_TIMEOUT);
    }
  };

  const QuoteCancelReasons = () => {
    return (
      <CyDAnimatedView entering={animation ? FadeIn : undefined}>
        <CyDView className={'px-[20px]'}>
          <CyDText
            className={
              'text-center font-nunito text-[24px] font-bold font-[#434343] mt-[20px]'
            }>
            {t<string>('HELP_US_UNDERSTAND')}
          </CyDText>
          <CyDView className={'mt-[20px]'}>
            {quoteData.reasons.map(renderReasons)}
          </CyDView>
          <CyDView className={'mt-[17px] px-[15px]'}>
            <CyDText
              className={
                'font-nunito text-[14px] font-semibold font-[#434343] ml-[10px] mb-[5px]'
              }>
              {t<string>('ADDITIONAL_COMMENTS')}
            </CyDText>
            <CyDTextInput
              style={{ textAlignVertical: 'top' }}
              defaultValue={commentsRef.current}
              className={
                'h-[70px] border-[1px] pl-[5px] rounded-[5px] border-inputBorderColor'
              }
              multiline={true}
              onChangeText={text => {
                commentsRef.current = text;
              }}
              secureTextEntry={true}
            />
          </CyDView>
          <CyDView
            className={'flex flex-row justify-center items-center mt-[10px]'}>
            <CyDText>{t<string>('DONT_ASK_AGAIN')}</CyDText>
            <CyDTouchView
              onPress={e => {
                setDontAskAgain(!dontAskAgain);
              }}
              className={`h-[18px] w-[18px] ${
                dontAskAgain ? 'bg-appColor' : ''
              } rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center ml-[5px]`}>
              {dontAskAgain ? (
                <CyDImage
                  style={{ tintColor: 'black' }}
                  source={AppImages.CORRECT}
                  className={'h-[14px] w-[14px]'}
                  resizeMode='contain'
                />
              ) : null}
            </CyDTouchView>
          </CyDView>
        </CyDView>

        <CyDView
          className={
            'flex flex-row w-full justify-between items-center px-[30px] pt-[20px] pb-[30px]'
          }>
          <Button
            onPress={() => {
              setSignModalVisible(false);
              void setQuoteCancelReasons(dontAskAgain);
            }}
            style='h-[60px] px-[45px]'
            title={t('CANCEL')}
            type={ButtonType.SECONDARY}
          />

          <Button
            onPress={() => {
              onCancellingQuote();
            }}
            title={t('SUBMIT')}
            style='h-[60px] px-[45px]'
            type={ButtonType.PRIMARY}
          />
        </CyDView>
      </CyDAnimatedView>
    );
  };

  const onPressQuote = () => {
    if (isInterCosomosBridge() && isReadOnlyWallet) {
      isSignableTransaction(ActivityType.BRIDGE, onGetQuote);
    } else {
      if (validateAmount(amount)) {
        void onGetQuote();
        retryQuote.current = 0;
      }
    }
  };

  const isSwap = () => {
    if (
      fromChain &&
      toChain &&
      fromChain.chainIdNumber === toChain.chainIdNumber &&
      fromChain.backendName === toChain.backendName
    ) {
      return true;
    }
    return false;
  };

  const swap = async ({ showQuote = true }) => {
    try {
      setBridgeLoading(true);
      const nativeTokenSymbol =
        NativeTokenMapping[fromToken?.chainDetails.symbol] ||
        fromToken?.chainDetails.symbol;
      const isNative = fromToken?.symbol === nativeTokenSymbol;
      const fromTokenContractAddress = isNative
        ? '0x0000000000000000000000000000000000000000'
        : fromToken?.contractAddress;
      const payload = {
        fromTokenList: [
          {
            address: fromTokenContractAddress,
            amount: cryptoAmount.toString(),
          },
        ],
        toToken: toToken.isNative
          ? '0x0000000000000000000000000000000000000000'
          : toToken.address,
        slippage,
        walletAddress: ethereum.address,
      };
      const response = await postWithAuth(
        `/v1/swap/evm/chains/${fromChain.chainIdNumber}/quote`,
        payload,
      );
      if (!response.isError) {
        const quoteData = response.data;
        const routerAddress = quoteData.router;
        const web3 = new Web3(
          getWeb3Endpoint(fromToken?.chainDetails, globalContext),
        );
        if (!isNative) {
          const allowanceResponse = await checkAllowance({
            web3,
            fromToken,
            fromTokenContractAddress,
            routerAddress,
            amount: cryptoAmount,
            hdWallet,
          });
          if (!allowanceResponse.isAllowance) {
            const { gasLimit } = allowanceResponse;
            const gasFeeResponse = quoteData.gasInfo;
            let finalGasPrice;
            if (gasFeeResponse.gasPrice > 0) {
              finalGasPrice = gasFeeResponse.gasPrice;
            }

            let gasFeeETH = '';
            if (finalGasPrice) {
              gasFeeETH = web3.utils.fromWei(
                web3.utils.toWei(
                  (parseInt(finalGasPrice) * gasLimit).toFixed(9),
                  'gwei',
                ),
              );
              finalGasPrice = web3.utils.toHex(
                web3.utils.toWei(finalGasPrice.toFixed(9), 'gwei'),
              );
            }

            let gasFeeDollar = '';
            if (gasFeeResponse.tokenPrice > 0) {
              const ethPrice = gasFeeResponse.tokenPrice;
              gasFeeDollar = (parseFloat(gasFeeETH) * ethPrice).toFixed(2);
            }
            setAllowanceParams({
              ...allowanceResponse,
              web3,
              fromTokenContractAddress,
              ethereum,
              routerAddress,
              isNative,
              quoteData,
              gasFeeETH,
              gasFeeDollar,
              isApprovalModalVisible: false,
            });
            void invokeSwap({
              web3,
              routerAddress,
              isNative,
              quoteData,
              isAllowance: false,
            });
          } else {
            setAllowanceParams({
              ...allowanceParams,
              isApprovalModalVisible: false,
              isAllowance: true,
            });
            if (showQuote) {
              void invokeSwap({
                web3,
                routerAddress,
                isNative,
                quoteData,
                isAllowance: true,
              });
            } else {
              void onConfirmSwap({
                web3,
                fromToken,
                toToken,
                amount: cryptoAmount,
                routerAddress,
                quoteData,
                hdWallet,
                isNative,
                isAllowance: true,
              });
            }
          }
        } else {
          setAllowanceParams({ ...allowanceParams, isAllowance: true });
          void invokeSwap({
            web3,
            routerAddress,
            isNative,
            quoteData,
            isAllowance: true,
          });
        }
      } else {
        setBridgeLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: response.error.message ?? t('UNEXCPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      setBridgeLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNEXCPECTED_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const invokeSwap = async ({
    web3,
    routerAddress,
    isNative,
    quoteData,
    isAllowance,
  }: {
    web3: Web3;
    routerAddress: string;
    isNative: boolean;
    quoteData: any;
    isAllowance: boolean;
  }) => {
    try {
      let gasFeeETH = '';
      let gasFeeDollar = '';
      if (
        parseFloat(cryptoAmount) <= parseFloat(String(fromToken?.actualBalance))
      ) {
        const gasLimit = floor(
          get(quoteData, ['gasEstimate']) *
            ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR,
        );
        let finalGasPrice;
        const gasFeeResponse = quoteData.gasInfo;
        if (gasFeeResponse.gasPrice > 0) {
          finalGasPrice = gasFeeResponse.gasPrice;
        }
        if (finalGasPrice) {
          gasFeeETH = web3.utils.fromWei(
            web3.utils.toWei(
              (parseFloat(finalGasPrice) * gasLimit).toFixed(9),
              'gwei',
            ),
          );
          finalGasPrice = web3.utils.toHex(
            web3.utils.toWei(finalGasPrice.toFixed(9), 'gwei'),
          );
        }
        if (gasFeeResponse.tokenPrice > 0) {
          const ethPrice = gasFeeResponse.tokenPrice;
          gasFeeDollar = (parseFloat(gasFeeETH) * ethPrice).toFixed(2);
        }
      }
      setSwapParams({
        web3,
        fromToken,
        toToken,
        amount: cryptoAmount,
        routerAddress,
        quoteData,
        hdWallet,
        isNative,
        isAllowance,
        gasFeeETH,
        gasFeeDollar,
      });
      setSignModalVisible(true);
      setBridgeLoading(false);
    } catch (e) {
      setBridgeLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNEXCPECTED_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const onApproveSwap = async () => {
    setBridgeLoading(true);
    setAllowanceParams({ ...allowanceParams, isApprovalModalVisible: false });
    const {
      web3,
      fromTokenContractAddress,
      gasLimit,
      gasFeeResponse,
      contractData,
      routerAddress,
    } = allowanceParams;
    const response = await getApproval({
      web3,
      fromTokenContractAddress,
      hdWallet,
      gasLimit,
      gasFeeResponse,
      contractData,
      chainDetails: fromChain,
      contractParams: {
        toAddress: routerAddress,
        numberOfTokens: String(parseFloat(cryptoAmount) * 1000000),
      },
    });
    if (response) {
      void swap({ showQuote: false });
    } else {
      setBridgeLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('SWAP_ERROR_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const onConfirmSwap = async (confirmSwapParams: any) => {
    try {
      if (fromChain && toChain && fromToken && toToken) {
        setSignModalVisible(false);
        const { web3, routerAddress, isNative, quoteData, isAllowance } =
          confirmSwapParams;
        if (isAllowance) {
          setBridgeLoading(true);
          const id = genId();
          const activityData: ExchangeTransaction = {
            id,
            status: ActivityStatus.PENDING,
            type: isSwap() ? ActivityType.SWAP : ActivityType.BRIDGE,
            quoteId: quoteData?.quoteId,
            fromChain: fromChain.name,
            toChain: toChain.name,
            fromToken: fromToken?.name,
            toToken: toToken?.name,
            fromSymbol: fromToken?.symbol,
            toSymbol: toToken?.symbol,
            fromTokenLogoUrl: fromToken?.logoUrl,
            toTokenLogoUrl: toToken?.logo,
            fromTokenAmount: parseFloat(cryptoAmount).toFixed(3),
            toTokenAmount: quoteData?.toToken?.amount.toString(),
            datetime: new Date(),
            transactionHash: '',
            quoteData: {
              fromAmountUsd: Number(cryptoAmount) * Number(fromToken?.price),
              toAmountUsd: quoteData?.value,
              gasFee: swapParams.gasFeeDollar,
            },
          };
          activityId.current = id;
          const gasLimit = floor(
            get(quoteData, ['gasEstimate']) *
              ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR,
          );
          const gasFeeResponse = quoteData.gasInfo;
          const response: any = await swapTokens({
            ...confirmSwapParams,
            gasLimit,
            gasFeeResponse,
          });
          if (!response.isError) {
            setBridgeLoading(false);
            activityData.status = ActivityStatus.SUCCESS;
            activityContext.dispatch({
              type: ActivityReducerAction.POST,
              value: activityData,
            });
            showModal('state', {
              type: 'success',
              title: t('SWAP_SUCCESS'),
              description: t('SWAP_SUCCESS_DESCRIPTION'),
              onSuccess: () => onModalHide('success'),
              onFailure: hideModal,
            });
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: response.receipt.transactionHash,
              chain: fromChain.chainName,
            });
          } else {
            setBridgeLoading(false);
            activityData.status = ActivityStatus.FAILED;
            activityContext.dispatch({
              type: ActivityReducerAction.POST,
              value: activityData,
            });
            showModal('state', {
              type: 'error',
              title: '',
              description:
                response?.error?.message ?? t('SWAP_ERROR_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: fromChain.chainName,
              message: parseErrorMessage(response.error),
              screen: route.name,
            });
          }
        } else {
          setTimeout(() => {
            setAllowanceParams({
              ...allowanceParams,
              isApprovalModalVisible: true,
            });
          }, MODAL_HIDE_TIMEOUT_250);
        }
      } else {
        throw 'Insufficient parameters';
      }
    } catch (error) {
      setBridgeLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: fromChain.chainName,
        message: parseErrorMessage(error),
        screen: route.name,
      });
      showModal('state', {
        type: 'error',
        title: t('QUOTE_EXPIRED'),
        description: t('SWAP_QUOTE_EXPIRED'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const ApprovalModal = () => {
    return (
      <CyDView className='mb-[30px] pl-[30px] pr-[30px]'>
        <CyDView className='flex flex-row justify-center'>
          <CyDImage
            source={AppImages.APP_LOGO}
            className='h-[60px] w-[60px]'
            resizeMode='contain'
          />
        </CyDView>
        <CyDText className='text-center font-bold text-[22px] mt-[10px]'>
          Allow Cypher to access your {fromToken?.name}
        </CyDText>
        <CyDView className='flex flex-row justify-between items-center py-[20px] border-t-[1px] border-b-[1px] border-sepratorColor my-[30px]'>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={AppImages.GAS_FEES}
              className='h-[18px] w-[18px]'
              resizeMode='contain'
            />
            <CyDText className=' py-[10px] w-[40%] ml-[15px] font-semibold'>
              {t<string>('GAS_FEE')}
            </CyDText>
          </CyDView>
          <CyDView className='text-center'>
            <CyDText className='text-right font-extrabold text-[14px]'>
              {allowanceParams?.gasFeeDollar} $
            </CyDText>
            <CyDText className='text-right font-semibold text-[14px]'>
              {Number(allowanceParams?.gasFeeETH).toFixed(6)}{' '}
              {fromToken?.chainDetails.symbol}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='flex justify-end my-[30px]'>
          <Button
            title={t('APPROVE')}
            onPress={() => {
              void onApproveSwap();
            }}
            type={ButtonType.PRIMARY}
            style='h-[50px]'
          />
          <Button
            title={t('CANCEL')}
            onPress={() => {
              setBridgeLoading(false);
              setAllowanceParams({
                ...allowanceParams,
                isApprovalModalVisible: false,
              });
            }}
            type={ButtonType.SECONDARY}
            style='mt-[15px]'
          />
        </CyDView>
      </CyDView>
    );
  };

  const onConfirmBridgeOrSwap = () => {
    if (isSwap()) {
      void onConfirmSwap(swapParams);
    } else {
      setSignModalVisible(false);
      isSignableTransaction(
        isSwap() ? ActivityType.SWAP : ActivityType.BRIDGE,
        isReadOnlyWallet ? onGetQuote : onPressBridge,
      );
    }
  };

  const isGetQuoteDisabled = () => {
    if (
      amount === '0.00' ||
      amount === '' ||
      Number(amount) <= 0 ||
      !fromToken ||
      !toToken
    )
      return true;
    else if (!isSwap()) return parseFloat(cryptoAmount) < minimumAmount;
    return false;
  };

  const setMaxAmount = () => {
    if (fromToken) {
      const { actualBalance, chainDetails, price } = fromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const gasReserved =
        (get(NativeTokenMapping, symbol as ChainBackendNames) || symbol) ===
        fromToken?.symbol
          ? gasFeeReservation[backendName]
          : 0;

      const maxAmount = parseFloat(String(actualBalance)) - gasReserved;
      const textAmount =
        maxAmount < 0 ? '0.00' : limitDecimalPlaces(maxAmount.toString(), 6);
      setAmount(textAmount);

      if (enterCryptoAmount) {
        setCryptoAmount(textAmount);
        setUsdAmount((parseFloat(textAmount) * Number(price)).toString());
      } else {
        setCryptoAmount((parseFloat(textAmount) / Number(price)).toString());
        setUsdAmount(textAmount);
      }
    }
  };

  return (
    <CyDSafeAreaView>
      <CyDScrollView className={'h-full w-full pb-[40px] bg-white'}>
        <ChooseTokenModal
          isChooseTokenModalVisible={fromTokenModalVisible}
          // tokenList = {totalHoldings.length ? totalHoldings : []}
          tokenList={fromTokenData?.length ? fromTokenData : []}
          // onSelectingToken = {(token) => { setFromTokenModalVisible(false); setFromToken(token); setFromChainFunction({ item: token.chainDetails }); }}
          onSelectingToken={token => {
            setFromTokenModalVisible(false);
            setFromToken(token);
          }}
          onCancel={() => {
            setFromTokenModalVisible(false);
          }}
          renderPage={renderPage}
        />

        <ChooseTokenModal
          isChooseTokenModalVisible={toTokenModalVisible}
          tokenList={
            toTokenData.filteredTokenData.length
              ? toTokenData.filteredTokenData
              : []
          }
          onSelectingToken={token => {
            setToTokenModalVisible(false);
            setToToken(token);
          }}
          onCancel={() => {
            setToTokenModalVisible(false);
          }}
          type={TokenModalType.SWAP}
        />

        <ChooseChainModal
          setModalVisible={setFromChainModalVisible}
          isModalVisible={fromChainModalVisible}
          data={fromChainData}
          title={'Choose Chain'}
          selectedItem={fromChain.name}
          onPress={setFromChainFunction}
          type={'chain'}
        />

        <ChooseChainModal
          setModalVisible={setToChainModalVisible}
          isModalVisible={toChainModalVisible}
          data={toChainData}
          title={'Choose Chain'}
          selectedItem={toChain?.name}
          onPress={item => {
            setToChain(item.item);
          }}
          type={'chain'}
        />

        <SignatureModal
          isModalVisible={allowanceParams.isApprovalModalVisible}
          setModalVisible={resp =>
            setAllowanceParams({
              ...allowanceParams,
              isApprovalModalVisible: resp,
            })
          }
          onCancel={() => {
            setAllowanceParams({
              ...allowanceParams,
              isApprovalModalVisible: false,
            });
          }}>
          <ApprovalModal />
        </SignatureModal>

        <SignatureModal
          isModalVisible={signModalVisible}
          setModalVisible={setSignModalVisible}
          onCancel={() => {
            void setQuoteCancelReasons(dontAskAgain);
          }}
          avoidKeyboard={true}>
          {quoteCancelVisible ? (
            <QuoteCancelReasons />
          ) : (
            <CyDView>
              <CyDView className={'px-[20px]'}>
                <CyDText
                  className={'text-center text-[24px] font-bold mt-[20px]'}>
                  {t<string>(isSwap() ? 'SWAP_TOKENS' : 'TRANSFER_TOKENS')}
                </CyDText>
                <CyDView
                  className={
                    'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
                  }>
                  <CyDView
                    className={'flex w-[40%] items-center justify-center'}>
                    <CyDView className='items-center'>
                      <CyDImage
                        source={{ uri: fromToken?.logoUrl }}
                        className={'w-[44px] h-[44px]'}
                      />
                      <CyDText
                        className={
                          'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {fromToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                        }>
                        <CyDImage
                          source={fromChain.logo_url}
                          className={'w-[14px] h-[14px]'}
                        />
                        <CyDText
                          className={
                            'ml-[6px] font-nunito font-normal text-black  text-[12px]'
                          }>
                          {fromChain.name}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>

                  <CyDView className={'flex justify-center h-[30px] w-[30px]'}>
                    {fromChain === toChain ? (
                      <CyDFastImage
                        source={AppImages.SWAP}
                        className='h-[22px] w-[22px]'
                        resizeMode='contain'
                      />
                    ) : (
                      <CyDFastImage
                        source={AppImages.APP_SEL}
                        className='h-full w-full'
                        resizeMode='contain'
                      />
                    )}
                  </CyDView>

                  <CyDView
                    className={
                      'flex w-[40%] items-center self-center align-center justify-center '
                    }>
                    <CyDView className='items-center'>
                      <CyDImage
                        source={{ uri: toToken?.logoUrl || toToken?.logo }}
                        className={'w-[44px] h-[44px]'}
                      />
                      <CyDText
                        className={
                          'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {toToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                        }>
                        <CyDImage
                          source={toChain.logo_url}
                          className={'w-[14px] h-[14px]'}
                        />
                        <CyDText
                          className={
                            'ml-[6px] font-nunito text-black font-normal text-[12px]'
                          }>
                          {toChain.name}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDView className={'flex flex-row justify-between'}>
                  <CyDText
                    className={
                      'font-[#434343] font-nunito text-black font-[16px] text-medium'
                    }>
                    {t<string>('SENT_AMOUNT')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex flex-col items-end'}>
                    <CyDText
                      className={
                        'font-nunito font-[16px] text-black font-bold max-w-[150px]'
                      }
                      numberOfLines={1}>
                      {isSwap()
                        ? formatAmount(swapParams?.amount)
                        : quoteData.fromAmount.toFixed(4) +
                          ' ' +
                          String(fromToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito font-[12px] text-[#929292] font-bold'
                      }>
                      {isSwap()
                        ? (
                            Number(swapParams.amount) * Number(fromToken?.price)
                          ).toFixed(4)
                        : quoteData.fromAmountUsd.toFixed(4) + ' USD'}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView
                  className={
                    'mr-[10px] flex flex-row justify-between mt-[20px]'
                  }>
                  <CyDText
                    className={
                      'text-[#434343] font-nunito font-[16px] text-medium'
                    }>
                    {t<string>('TOTAL_RECEIVED')}
                  </CyDText>
                  <CyDView className={'flex flex-col items-end'}>
                    <CyDText
                      className={
                        'font-nunito font-[16px] text-black font-bold max-w-[150px]'
                      }
                      numberOfLines={1}>
                      {isSwap()
                        ? formatAmount(swapParams?.quoteData?.toToken?.amount)
                        : quoteData.toAmount.toFixed(4) +
                          ' ' +
                          String(toToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito font-[12px] text-[#929292] font-bold'
                      }>
                      {isSwap()
                        ? Number(swapParams?.quoteData?.value).toFixed(4)
                        : quoteData.toAmountUsd.toFixed(4) + ' USD'}
                    </CyDText>
                  </CyDView>
                </CyDView>

                {!isSwap() && (
                  <CyDView
                    className={clsx(
                      'mr-[10px] flex flex-row justify-between mt-[20px]',
                      {
                        'mb-[30px]':
                          parseFloat(String(fromToken?.actualBalance)) >
                          parseFloat(cryptoAmount),
                      },
                    )}>
                    <LottieView
                      source={AppImages.ESTIMATED_TIME}
                      resizeMode={'contain'}
                      autoPlay
                      loop
                      style={{ width: 20 }}
                    />
                    <CyDView
                      className={'flex flex-row justify-between items-center'}>
                      <CyDText
                        className={
                          'font-nunito font-[16px] text-black font-bold ml-[12px]'
                        }>
                        {[
                          ChainBackendNames.COSMOS,
                          ChainBackendNames.OSMOSIS,
                          ChainBackendNames.JUNO,
                          ChainBackendNames.EVMOS,
                        ].includes(fromChain.backendName) &&
                        [
                          ChainBackendNames.COSMOS,
                          ChainBackendNames.OSMOSIS,
                          ChainBackendNames.JUNO,
                          ChainBackendNames.EVMOS,
                        ].includes(toChain?.backendName as ChainBackendNames)
                          ? '~ 7 mins'
                          : '~ 15 mins'}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                )}
                {isSwap() && (
                  <CyDView className='flex flex-row justify-between items-center mt-[20px] mr-[10px]'>
                    <CyDView className='flex flex-row'>
                      <CyDText className=' py-[10px] w-[60%] font-semibold'>
                        {t<string>('GAS_FEE') + ' :'}
                      </CyDText>
                    </CyDView>
                    <CyDView className='items-end'>
                      <CyDText className='font-bold'>
                        {formatAmount(swapParams?.gasFeeETH)}
                        {' ' + String(fromToken?.chainDetails.symbol)}
                      </CyDText>
                      <CyDText className='font-bold text-subTextColor'>
                        {String(formatAmount(swapParams?.gasFeeDollar)) +
                          ' USD'}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                )}
                <RenderWarningMessage />
              </CyDView>

              <CyDView
                className={
                  'flex flex-row justify-center items-center px-[20px] pb-[50px] mt-[10px]'
                }>
                <Button
                  title={t<string>('CANCEL')}
                  disabled={bridgeLoading}
                  type={ButtonType.SECONDARY}
                  onPress={() => {
                    void onSignModalCancel();
                  }}
                  style={'h-[60px] w-[166px] mr-[9px]'}
                />
                <Button
                  title={
                    isSwap()
                      ? t('SWAP')
                      : t<string>('BRIDGE_ALL_CAPS') +
                        (quoteExpiryTime
                          ? ' (' + String(quoteExpiryTime) + ')'
                          : '')
                  }
                  loading={bridgeLoading}
                  disabled={isExchangeDisabled()}
                  onPress={() => {
                    onConfirmBridgeOrSwap();
                  }}
                  isPrivateKeyDependent={true}
                  style={'h-[60px] w-[166px] ml-[9px]'}
                />
              </CyDView>
            </CyDView>
          )}
        </SignatureModal>

        {showDropDown && (
          <CyDView className='mt-[20px]'>
            {/* <CyDView
              className='bg-white border-[0.2px] rounded-[8px] border-sepratorColor mx-[20px] px-[20px] py-[10px] shadow shadow-sepratorColor'
              style={styles.shadowProp}>
              <CyDText
                className={
                  'font-extrabold text-[16px] mt-[1px] ml-[3px] font-nunito text-black '
                }>
                {t<string>('FROM')}
              </CyDText>

            </CyDView> */}

            <CyDView
              className={
                'my-[16px] bg-white rounded-[8px] border-sepratorColor border-[0.2px] mx-[20px] px-[20px] pt-[10px] shadow'
              }
              style={styles.shadowProp}>
              {/* disabled bridge - Feb 10th 2024 */}

              {/* <CyDTouchView
                className={
                  'bg-secondaryBackgroundColor my-[5px] border-[1px] border-[#EBEBEB] rounded-[8px]'
                }
                onPress={() => setToChainModalVisible(true)}
                disabled={true}
                // disabled bridge - Feb 10th 2024
              >
                <CyDView
                  className={
                    'h-[50px] px-[18px] flex flex-row justify-between items-center'
                  }>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={toChain?.logo_url}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText
                      className={
                        'text-center text-black font-nunito text-[16px] ml-[8px]'
                      }>
                      {toChain?.name}
                    </CyDText>
                  </CyDView>
                  <CyDImage source={AppImages.DOWN_ARROW} />
                </CyDView>
              </CyDTouchView> */}

              <CyDTouchView
                className={
                  'bg-secondaryBackgroundColor my-[5px] border-[1px] border-[#EBEBEB] rounded-[8px]'
                }
                onPress={() => setFromChainModalVisible(true)}>
                <CyDView
                  className={
                    'px-[18px] h-[50px] flex flex-row justify-between items-center'
                  }>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={fromChain.logo_url}
                      className={'w-[24px] h-[24px]'}
                    />
                    <CyDText
                      className={
                        'text-center text-black font-nunito text-[16px] ml-[8px]'
                      }>
                      {fromChain.name}
                    </CyDText>
                  </CyDView>

                  <CyDImage source={AppImages.DOWN_ARROW} />
                </CyDView>
              </CyDTouchView>

              <CyDTouchView
                className={
                  'bg-[#F7F8FE] my-[5px] border-[1px] border-[#EBEBEB] rounded-[8px]'
                }
                onPress={() => setFromTokenModalVisible(true)}>
                <CyDView className={'h-[50px] flex flex-row w-full'}>
                  <CyDView
                    className={
                      'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[8px] flex justify-center items-center'
                    }>
                    <CyDText
                      className={'text-[#434343] text-[16px] font-extrabold'}>
                      {'From'}
                    </CyDText>
                  </CyDView>

                  <CyDView
                    className={
                      'flex flex-row items-center justify-between w-8/12 px-[18px]'
                    }>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDImage
                        source={{ uri: fromToken?.logoUrl ?? '' }}
                        className={'w-[24px] h-[24px]'}
                      />
                      <CyDText
                        className={
                          'text-center text-black font-nunito text-[16px] ml-[8px] max-w-[70%]'
                        }
                        numberOfLines={1}>
                        {fromToken?.name}
                      </CyDText>
                    </CyDView>
                    <CyDImage source={AppImages.DOWN_ARROW} />
                  </CyDView>
                </CyDView>
              </CyDTouchView>

              <CyDView
                className={
                  'bg-secondaryBackgroundColor mb-[16px] mt-[5px] border-[1px] border-[#EBEBEB] rounded-[8px]'
                }>
                <CyDTouchView
                  disabled={!isSwap()}
                  onPress={() => {
                    setToTokenModalVisible(true);
                  }}
                  className={'h-[50px] flex flex-row w-full'}>
                  <CyDView
                    className={
                      'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[8px] flex justify-center items-center'
                    }>
                    <CyDText
                      className={'text-[#434343] text-[16px] font-extrabold'}>
                      {'To'}
                    </CyDText>
                  </CyDView>

                  <CyDView
                    className={
                      'flex flex-row items-center justify-between w-8/12 px-[18px]'
                    }>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDImage
                        source={{
                          uri: toToken?.logoUrl ?? toToken?.logo ?? '',
                        }}
                        className={'w-[24px] h-[24px]'}
                      />
                      <CyDText
                        className={
                          'text-center text-black font-nunito text-[16px] ml-[8px] max-w-[70%]'
                        }
                        numberOfLines={1}>
                        {toToken?.name}
                      </CyDText>
                    </CyDView>
                    {isSwap() && <CyDImage source={AppImages.DOWN_ARROW} />}
                  </CyDView>
                </CyDTouchView>
              </CyDView>
            </CyDView>
          </CyDView>
        )}
        {!showDropDown && (
          <CyDTouchView
            onPress={() => {
              amount === '' ? setAmount('0.00') : setAmount(amount);
              setShowDropDown(true);
            }}
            className={
              'flex flex-row justify-between items-center my-[30px] bg-[#F7F8FE] rounded-[8px] mx-[20px] px-[15px] py-[20px] shadow shadow-sepratorColor'
            }>
            <CyDView className={'flex w-[40%] items-center justify-center'}>
              <CyDImage
                source={{ uri: fromToken?.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-center text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }>
                {fromToken?.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[8px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={fromChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-nunito text-black font-normal text-[12px]'
                  }>
                  {fromChain.name}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex justify-center h-[30px] w-[30px]'}>
              {fromChain === toChain ? (
                <CyDFastImage
                  source={AppImages.SWAP}
                  className='h-[22px] w-[22px]'
                  resizeMode='contain'
                />
              ) : (
                <CyDFastImage
                  source={AppImages.APP_SEL}
                  className='h-full w-full'
                  resizeMode='contain'
                />
              )}
            </CyDView>

            <CyDView className={'flex w-[40%] items-center justify-center '}>
              <CyDImage
                source={{ uri: toToken?.logoUrl || toToken?.logo }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-center text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }>
                {toToken?.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[8px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={toChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-nunito text-black font-normal text-[12px]'
                  }>
                  {toChain.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDTouchView>
        )}

        <CyDTouchView
          className={clsx('pb-[45px] bg-[#F7F8FE] rounded-[8px] mx-[20px]', {
            'rounded-b-[8px]': showDropDown,
            'rounded-[8px]': !showDropDown,
          })}
          onPress={() => {
            amount === '0.00' ? setAmount('') : setAmount(amount);
            setShowDropDown(false);
          }}>
          <CyDText
            className={
              'font-extrabold text-[22px] text-center mt-[20px] font-nunito text-primaryTextColor'
            }>
            {t<string>('ENTER_AMOUNT')}
          </CyDText>

          <CyDText
            className={
              'font-extrabold text-[20px] text-center mt-[10px] font-nunito bottom-0 text-primaryTextColor'
            }>
            {enterCryptoAmount ? fromToken?.name : 'USD'}
          </CyDText>

          <CyDView className={'flex items-center justify-center'}>
            {showDropDown && (
              <CyDText
                className={clsx(
                  'font-bold text-[70px] h-[80px] text-justify font-nunito mt-[10px] text-primaryTextColor',
                  {
                    'text-[50px]': fromToken?.name === 'Ether',
                  },
                )}>
                {fromToken?.name === 'Ether'
                  ? parseFloat(amount).toFixed(6)
                  : parseFloat(amount).toFixed(2)}
              </CyDText>
            )}
            {!showDropDown && (
              <CyDView className={'flex flex-row items-center relative'}>
                <CyDTouchView
                  onPress={() => {
                    setMaxAmount();
                  }}
                  className={clsx(
                    'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                  )}>
                  <CyDText className={'font-nunito text-black '}>
                    {t<string>('MAX')}
                  </CyDText>
                </CyDTouchView>
                <CyDView className={'flex-col w-8/12 mx-[6px] items-center'}>
                  <CyDTextInput
                    className={clsx(
                      'font-bold text-center text-primaryTextColor h-[85px] font-nunito',
                      {
                        'text-[70px]': amount.length <= 5,
                        'text-[40px]': amount.length > 5,
                      },
                    )}
                    keyboardType='numeric'
                    onChangeText={text => {
                      setAmount(text);
                      if (enterCryptoAmount) {
                        setCryptoAmount(text);
                        setUsdAmount(
                          (
                            parseFloat(text) * Number(fromToken?.price)
                          ).toString(),
                        );
                      } else {
                        setCryptoAmount(
                          (
                            parseFloat(text) / Number(fromToken?.price)
                          ).toString(),
                        );
                        setUsdAmount(text);
                      }
                    }}
                    value={amount}
                    autoFocus={true}
                    ref={input => {
                      enterAmountRef = input;
                    }}
                  />
                  <CyDText
                    className={clsx(
                      'flex items-center justify-center text-primaryTextColor font-bol h-[50px] text-[24px]',
                    )}>
                    {enterCryptoAmount
                      ? (!isNaN(parseFloat(usdAmount))
                          ? formatAmount(usdAmount)
                          : '0.00') + ' USD'
                      : (!isNaN(parseFloat(cryptoAmount))
                          ? formatAmount(cryptoAmount)
                          : '0.00') +
                        ' ' +
                        String(fromToken?.name)}
                  </CyDText>
                </CyDView>
                <CyDTouchView
                  onPress={() => {
                    setEnterCryptoAmount(!enterCryptoAmount);
                    if (!enterCryptoAmount) {
                      setCryptoAmount(amount);
                      setUsdAmount(
                        (
                          parseFloat(amount) * Number(fromToken?.price)
                        ).toString(),
                      );
                    } else {
                      setCryptoAmount(
                        (
                          parseFloat(amount) / Number(fromToken?.price)
                        ).toString(),
                      );
                      setUsdAmount(amount);
                    }
                    enterAmountRef?.focus();
                  }}
                  className={clsx(
                    'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                  )}>
                  <CyDImage
                    source={AppImages.TOGGLE_ICON}
                    className={'w-[14px] h-[16px]'}
                  />
                </CyDTouchView>
              </CyDView>
            )}

            {!isSwap() && (
              <CyDText
                className={
                  'font-semibold text-[14px] text-center text-primaryTextColor font-nunito'
                }>
                {t<string>('ENTER_AMOUNT_GREATER') +
                  '' +
                  minimumAmount.toFixed(3) +
                  ' ' +
                  String(fromToken?.name)}
              </CyDText>
            )}

            <CyDText
              className={
                'font-semibold text-[14px] text-center text-primaryTextColor font-nunito mt-[8px]'
              }>
              {String(fromToken?.name) +
                ' ' +
                t<string>('BALANCE_CAPITAL_FIRST_LETTER') +
                ' '}
              <CyDTokenAmount
                className='text-primaryTextColor'
                decimalPlaces={6}>
                {parseFloat(String(fromToken?.actualBalance))}
              </CyDTokenAmount>
            </CyDText>
          </CyDView>
        </CyDTouchView>

        <CyDView className={'items-center justify-center mt-[-60px]'}>
          <Button
            title={t('GET_QUOTE')}
            style={'w-[70%] h-[60px] my-[30px]'}
            loading={bridgeLoading}
            onPress={() => {
              isSwap()
                ? (() => {
                    void swap({ showQuote: true });
                  })()
                : onPressQuote();
            }}
            isPrivateKeyDependent={isInterCosomosBridge()}
            disabled={isGetQuoteDisabled()}
          />
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  elevated: { elevation: 4 },
  shadowProp: {
    shadowOffset: { width: -2, height: 4 },
    shadowColor: Colors.borderSepratorColor,
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
