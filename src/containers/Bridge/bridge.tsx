import React, { useContext, useEffect, useRef, useState } from 'react';
import { CyDAnimatedView, CyDImage, CyDKeyboardAvoidingView, CyDSafeAreaView, CyDScrollView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import {
  ALL_CHAINS,
  Chain,
  CHAIN_STARGAZE,
  ChainBackendNames,
  CosmosStakingTokens,
  ChainNameMapping,
  NativeTokenMapping
} from '../../constants/server';
import {
  ActivityContext,
  convertAmountOfContractDecimal,
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  validateAmount,
  getNativeTokenBalance,
  limitDecimalPlaces
} from '../../core/util';
import AppImages from './../../../assets/images/appImages';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import axios, { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import clsx from 'clsx';
import { BackHandler } from 'react-native';
import LottieView from 'lottie-react-native';
import SignatureModal from '../../components/v2/signatureModal';
import { evmosIbc, interCosmosIbc, sendCosmosTokens, sendInCosmosChain } from '../../core/bridge';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from '../../core/types';
import Web3 from 'web3';
import { getGasPriceFor } from '../Browser/gasHelper';
import { estimateGasForNativeTransaction, sendNativeCoinOrToken } from '../../core/NativeTransactionHandler';
import * as C from '../../constants';
import { screenTitle } from '../../constants';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { useIsFocused } from '@react-navigation/native';
import { getSignerClient } from '../../core/Keychain';
import { useTranslation } from 'react-i18next';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  BridgeTransaction
} from '../../reducers/activity_reducer';
import { getQuoteCancelReasons, setQuoteCancelReasons } from '../../core/asyncStorage';
import { genId } from '../utilities/activityUtilities';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { gasFeeReservation, nativeTokenMapping } from '../../constants/data';
import { bridgeQuoteCosmosInterface } from '../../models/bridgeQuoteCosmos.interface';
import { BridgeDataCosmosInterface } from '../../models/bridgeDataCosmos.interface';
import { BridgeTokenDataInterface } from '../../models/bridgeTokenData.interface';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { hostWorker } from '../../global';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import { isAndroid } from '../../misc/checkers';
import { get } from 'lodash';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import { FadeOut, SlideInDown } from 'react-native-reanimated';
import { MODAL_CLOSING_TIMEOUT } from '../../constants/timeOuts';

export default function Bridge (props) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const routeData = props.route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const evmos = hdWallet.state.wallet.evmos;
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);

  const [loading, setLoading] = useState(true);
  const [bridgeLoading, setBridgeLoading] = useState(false);

  const [fromChain, setFromChain] = useState<Chain>(ALL_CHAINS[0]);
  const [fromTokenData, setFromTokenData] = useState(null);
  const [fromToken, setFromToken] = useState(null);
  const [toChainData, setToChainData] = useState<Chain>(CHAIN_STARGAZE);
  const [toChain, setToChain] = useState<Chain>(ALL_CHAINS[0]);
  const [toToken, setToToken] = useState<BridgeTokenDataInterface>(null);
  const [chainListData, setChainListData] = useState(null);
  const [minimumAmount, setMinimumAmount] = useState<number>(0);

  const [fromChainModalVisible, setFromChainModalVisible] = useState<boolean>(false);
  const [toChainModalVisible, setToChainModalVisible] = useState<boolean>(false);
  const [fromTokenModalVisible, setFromTokenModalVisible] = useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [quoteCancelVisible, setQuoteCancelVisible] = useState<boolean>(false);
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(false);
  const activityId = useRef<string>('id');
  const [showDropDown, setShowDropDown] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('0.00');
  const commentsRef = useRef<string>('');
  const [quoteData, setQuoteData] = useState<bridgeQuoteCosmosInterface>({
    fromAmount: 0,
    fromAmountUsd: 0,
    receiverAddress: '',
    toAmount: 0,
    quoteId: '',
    toAmountUsd: 0,
    minimumAmountReceived: '0',
    cypherdBridgeFee: '0',
    gasFee: '0',
    reasons: []
  });
  const [cosmosBridgeData, setCosmosBridgeData] = useState<BridgeDataCosmosInterface>({
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
    ethereumAddress: ''
  });
  const [enterCryptoAmount, setEnterCryptoAmount] = useState<boolean>(true);
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  function getChainLogo (itemBackEndName: string) {
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
      default:
        return 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png';
    }
  }

  const parseCoinListData = (data: any) => {
    delete data.CYPHERD_TARGET_WALLET_ADDRESS;
    const response: BridgeTokenDataInterface[] = [];
    Object.entries(data).forEach((item) => {
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
        coinGeckoId: itemDetails.tokens[0].coinGeckoId
      };
      response.push(singleData);
    });
    return response;
  };

  const setFromChainFunction = ({ item }) => {
    setFromChain(item);
    if ([ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.EVMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(item.backendName)) {
      const tempData: Chain[] = [];
      portfolioState.statePortfolio.tokenPortfolio[
        ChainNameMapping[item.backendName as ChainBackendNames]
      ].holdings.forEach((data) => {
        if (data.name === CosmosStakingTokens[item.backendName as CosmosStakingTokens]) {
          tempData.push(data);
        }
      });
      setMinimumAmount(
        10 /
        tempData[0].price
      );
      setFromTokenData(tempData);
      setFromToken(
        tempData[0]
      );
    } else {
      setMinimumAmount(
        10 /
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName]
        ].holdings[0].price
      );
      setFromToken(
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName]
        ].holdings[0]
      );
      setFromTokenData(
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName]
        ].holdings
      );
    }
    setNativeTokenBalance(
      getNativeTokenBalance(
        (NativeTokenMapping[item.symbol] || item.symbol).toUpperCase(),
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[item.backendName]
        ].holdings
      )
    );
  };

  function onModalHide (type = '') {
    hideModal();
    setTimeout(() => {
      if (type === 'success') {
        props.navigation.navigate(C.screenTitle.OPTIONS, { screen: C.screenTitle.ACTIVITIES, initial: false });
        props.navigation.popToTop();
      } else {
        props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
      }
    }, MODAL_HIDE_TIMEOUT);
  }

  function transferSentQuote (
    address: string,
    quoteUUID: string,
    txnHash: string
  ) {
    const headers = {
      headers: {
        Authorization: `Bearer ${String(globalStateContext.globalState.token)}`
      }
    };
    axios
      .post(
        `${ARCH_HOST}/v1/bridge/deposit`,
        {
          address,
          quoteUUID,
          txnHash
        },
        headers
      )
      .then(async function (response) {
        if (response.status === 201) {
          await intercomAnalyticsLog('evm_bridge_success', {
            from_token: fromToken,
            from_chain: fromChain,
            to_chain: toChain,
            to_token: toToken,
            amount_crypto: quoteData.fromAmount,
            amount_usd: quoteData.fromAmountUsd
          });
          await intercomAnalyticsLog(`evm_bridge_${String(get(fromToken, 'symbol', '').toLowerCase())}_${String(get(toToken, 'symbol', '').toLowerCase())}_success`, {
            from_token: fromToken,
            from_chain: fromChain,
            to_chain: toChain,
            to_token: toToken,
            amount_crypto: quoteData.fromAmount,
            amount_usd: quoteData.fromAmountUsd
          });
          activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.INPROCESS, quoteId: quoteUUID, transactionHash: txnHash } });
          setBridgeLoading(false);
          setSignModalVisible(false);
          setTimeout(() => {
            showModal('state', { type: 'success', title: 'Success, Bridging in progress!', description: 'Your asset will be deposited at the destination shortly.', onSuccess: () => onModalHide('success'), onFailure: hideModal });
          }, 500);
        } else {
          await intercomAnalyticsLog('bridge_email_send_failed', {
            from_token: fromToken,
            from_chain: fromChain,
            to_chain: toChain,
            to_token: toToken,
            amount_crypto: quoteData.fromAmount,
            amount_usd: quoteData.fromAmountUsd
          });
          activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.FAILED, quoteId: quoteUUID, reason: `Please contact customer support with the quote_id: ${quoteUUID}` } });
          setSignModalVisible(false);
          setTimeout(() => {
            showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quoteUUID}`, onSuccess: onModalHide, onFailure: hideModal });
          }, 500);
          setBridgeLoading(false);
        }
      })
      .catch(async function (error) {
        await intercomAnalyticsLog('bridge_email_send_failed', {
          from_token: fromToken,
          from_chain: fromChain,
          to_chain: toChain,
          to_token: toToken,
          amount_crypto: quoteData.fromAmount,
          amount_usd: quoteData.fromAmountUsd
        });
        setBridgeLoading(false);
        setSignModalVisible(false);

        setTimeout(() => {
          showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quoteUUID}`, onSuccess: onModalHide, onFailure: hideModal });
        }, 500);
        Sentry.captureException(error);
      });
  }

  const handleBridgeTransactionResult = (
    message: string,
    quoteUUID: string,
    fromAddress: string,
    isError: boolean,
    isHashGenerated: boolean = false
  ) => {
    if (isError) {
      if (message === t('INSUFFICIENT_GAS_ERROR')) {
        message = !isHashGenerated
          ? `You need ${String(get(nativeTokenMapping, String(get(fromToken, 'chainDetails.backendName'))))} ( ${String(get(fromToken, 'chainDetails.symbol'))} ) ${t('INSUFFICIENT_GAS')}`
          : `${message}. Please contact customer support with the quote_id: ${quoteUUID}`;
      }
      if (isHashGenerated) {
        activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.FAILED, quoteId: quoteUUID, reason: message } });
      } else {
        activityContext.dispatch({ type: ActivityReducerAction.DELETE, value: { id: activityId.current } });
      }
      setSignModalVisible(false);
      setBridgeLoading(false);
      setTimeout(() => {
        showModal('state', { type: 'error', title: 'Transaction Failed', description: message, onSuccess: onModalHide, onFailure: hideModal });
      }, 500);
    } else {
      transferSentQuote(fromAddress, quoteUUID, message);
    }
  };

  const sendTransaction = (payTokenModalParamsLocal: any) => {
    sendNativeCoinOrToken(
      hdWallet,
      portfolioState,
      fromChain,
      convertAmountOfContractDecimal(cryptoAmount, fromToken.contractDecimals),
      fromToken.contractAddress,
      fromToken.contractDecimals,
      quoteData.quoteId,
      handleBridgeTransactionResult,
      true,
      payTokenModalParamsLocal.finalGasPrice,
      payTokenModalParamsLocal.gasLimit,
      globalStateContext
    );
  };

  const parseBridgeQuoteData = (data) => {
    const quoteData = {
      fromAmount: parseFloat(cryptoAmount),
      fromAmountUsd: parseFloat(cryptoAmount) * fromToken.price,
      receiverAddress: '',
      toAmount: parseFloat(data.transferAmount),
      quoteId: data.quoteUuid,
      toAmountUsd: parseFloat(data.usdValue),
      minimumAmountReceived: data.transferAmount,
      cypherdBridgeFee: '0',
      gasFee: data.estimatedGasFeeUsd,
      reasons: data.reasons
    };
    return quoteData;
  };

  const onGetQuote = async () => {
    setBridgeLoading(true);
    setQuoteCancelVisible(false);
    if ([ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].includes(fromChain.backendName) &&
      [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].includes(toChain.backendName)) {
      const receiverChainAddressCollection = hdWallet.state.wallet[toChain.chainName];
      const receiverChainAddress = receiverChainAddressCollection.wallets[receiverChainAddressCollection.currentIndex].address;
      const fromChainAddressCollection = hdWallet.state.wallet[fromChain.chainName];
      const fromChainAddress = fromChainAddressCollection.wallets[fromChainAddressCollection.currentIndex].address;

      const data = {
        fromAddress: fromChainAddress,
        toAddress: receiverChainAddress,
        fromChainName: fromChain.backendName,
        fromTokenName: fromToken.name,
        fromTokenContractDecimal: fromToken.contractDecimals,
        toChainName: toChain.backendName,
        toTokenName: toToken.name,
        toTokenContractDecimal: toToken.contractDecimals,
        transferAmount: cryptoAmount,
        ethereumAddress: ethereum.address
      };
      setCosmosBridgeData({ ...cosmosBridgeData, ...data });
      try {
        const response = await axios.post(`${ARCH_HOST}/v1/bridge/quote/cosmos`, data);
        setQuoteData(response.data);
        setSignModalVisible(true);
        setBridgeLoading(false);
        await intercomAnalyticsLog('bridge_quote_requested', {
          address: fromChainAddress,
          fromChain: fromChain.name,
          toChain: toChain.name,
          fromToken: fromToken.name,
          toToken: toToken.name
        });
      } catch (e) {
        setBridgeLoading(false);
        showModal('state', { type: 'error', title: 'Transaction failed', description: e.message, onSuccess: hideModal, onFailure: hideModal });
      }
    } else {
      const ethereumAddress = ethereum.address;
      const { address: cosmosFromAddress } = hdWallet.state.wallet[fromChain.chainName];
      const { address: cosmosToAddress } = hdWallet.state.wallet[toChain.chainName];
      const data = {
        fromAddress: [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(fromChain.backendName) ? cosmosFromAddress : ethereumAddress,
        toAddress: [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(toChain.backendName) ? cosmosToAddress : ethereumAddress,
        fromChain: fromChain.backendName,
        toChain: toChain.backendName,
        fromTokenAddress:
          fromChain.backendName === ChainBackendNames.EVMOS && fromToken.chainDetails.backendName === ChainBackendNames.EVMOS
            ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            : fromToken.contractAddress,
        toTokenAddress: toToken.contractAddress.toLowerCase(),
        fromTokenDecimal: fromToken.contractDecimals,
        toTokenDecimal: toToken.contractDecimals,
        fromAmount: parseFloat(cryptoAmount),
        fromTokenLabel: fromToken.name,
        toTokenLabel: toToken.name,
        fromTokenSymbol: fromToken.symbol,
        toTokenSymbol: toToken.symbol,
        fromTokenCoingeckoId: fromToken.coinGeckoId,
        toTokenCoingeckoId: toToken.coinGeckoId
      };

      try {
        const quoteUrl = `${ARCH_HOST}/v1/bridge/quote`;

        const response = await axios.post(quoteUrl, data);

        if (response.data.status !== 'ERROR') {
          const quoteData = parseBridgeQuoteData(response.data);
          setQuoteData(quoteData);
          setSignModalVisible(true);
          setBridgeLoading(false);
          await intercomAnalyticsLog('bridge_quote_requested', {
            address: ethereum.address,
            fromChain: fromChain.name,
            toChain: toChain.name,
            fromToken: fromToken.name,
            toToken: toToken.name
          });
        } else {
          setBridgeLoading(false);
          showModal('state', { type: 'error', title: '', description: response.data.message, onSuccess: onModalHide, onFailure: hideModal });
        }
      } catch (error) {
        setBridgeLoading(false);
        Sentry.captureException(error);
        showModal('state', { type: 'error', title: '', description: `${error.message} Unable to get quote for your request. Please contact Cypher customer support.`, onSuccess: onModalHide, onFailure: hideModal });
      }
    }
  };

  const computeGasFeeInUsd = (gasUsed: number): string => {
    const gasFee = gasUsed * cosmosConfig[ChainNameMapping[fromChain.backendName]].gasPrice;
    const gasFeeInUsd = gasFee * fromToken.price;
    return gasFeeInUsd.toString();
  };

  const onPressBridge = async () => {
    if (parseFloat(usdAmount) > 2500) {
      setSignModalVisible(false);
      setTimeout(() => {
        showModal('state', { type: 'error', title: 'Transaction limit exceeded', description: 'Your bridge value is more than $2500, exceeding our single transaction limit. Try bridging under $2500', onSuccess: hideModal, onFailure: hideModal });
      }, 500);
    } else {
      const id = genId();
      const activityData: BridgeTransaction = {
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
        quoteData
      };
      activityId.current = id;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityData
      });

      await intercomAnalyticsLog('bridge_initiated', {
        from_token: fromToken,
        from_chain: fromChain,
        to_chain: toChain,
        to_token: toToken,
        amount_crypto: quoteData.fromAmount,
        amount_usd: quoteData.fromAmountUsd
      });

      const fromChainRpc = globalStateContext.globalState.rpcEndpoints[fromChain.backendName].primary;
      if ([ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(fromChain.backendName) &&
        [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE]
          .includes(toChain.backendName)) {
        setBridgeLoading(true);
        setSignModalVisible(false);
        const wallets = await getSignerClient(hdWallet);
        try {
          let response;
          let transactionHash = '';
          let sequenceNumber = '0';
          if (fromChain.backendName === ChainBackendNames.OSMOSIS) {
            response = await sendCosmosTokens(fromChainRpc, cryptoAmount, wallets, ChainNameMapping[fromChain.backendName], quoteData.receiverAddress);
            if (response) {
              transactionHash = response.transactionHash;
            }
          } else {
            response = await interCosmosIbc(wallets, fromChain, fromChainRpc, cryptoAmount, quoteData.receiverAddress);
            if (response) {
              transactionHash = response.transactionHash;
              if (response.rawLog) {
                sequenceNumber = JSON.parse(response?.rawLog);
                sequenceNumber = sequenceNumber[0]?.events[4]?.attributes[4]?.value;
              }
            }
          }
          const data = {
            ...cosmosBridgeData,
            transactionHash,
            quoteId: quoteData.quoteId,
            minimumAmountReceived: quoteData.minimumAmountReceived,
            sequenceNumber,
            cypherdBridgeFee: quoteData.cypherdBridgeFee
          };
          await axios.post(`${ARCH_HOST}/v1/bridge/txn/cosmos`, data);

          const gasFeeUsd = computeGasFeeInUsd(response.gasUsed);
          activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.INPROCESS, quoteData: { ...quoteData, gasFee: gasFeeUsd } } });
          setBridgeLoading(false);

          props.navigation.navigate(C.screenTitle.BRIDGE_STATUS, {
            fromChain,
            fromToken,
            toChain,
            toToken,
            sentAmount: cryptoAmount,
            sentAmountUsd: quoteData.fromAmountUsd,
            receivedAmount: quoteData.minimumAmountReceived,
            quoteId: quoteData.quoteId
          });
        } catch (error) {
          activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.FAILED, reason: error.message } });
          Sentry.captureException(error);
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityId.current,
              status: ActivityStatus.FAILED
            }
          });
          setBridgeLoading(false);
        }
        setBridgeLoading(false);
      } else if (fromChain.backendName === ChainBackendNames.EVMOS &&
        [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(toChain.backendName)) {
        setBridgeLoading(true);
        setSignModalVisible(false);

        try {
          const evmosAddress = evmos.wallets[evmos.currentIndex].address;
          const { transactionHash, gasFee }: any = await evmosIbc(evmosAddress, ethereum, quoteData.receiverAddress, cryptoAmount);
          if (transactionHash && gasFee) {
            const data = {
              ...cosmosBridgeData,
              transactionHash,
              quoteId: quoteData.quoteId,
              minimumAmountReceived: quoteData.minimumAmountReceived,
              sequenceNumber: '0',
              cypherdBridgeFee: quoteData.cypherdBridgeFee
            };

            await axios.post(`${ARCH_HOST}/v1/bridge/txn/cosmos`, data);
            const gasFeeUsd = computeGasFeeInUsd(gasFee);
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityId.current,
                status: ActivityStatus.INPROCESS,
                quoteData: {
                  ...quoteData,
                  gasFee: gasFeeUsd
                }
              }
            });
            props.navigation.navigate(C.screenTitle.BRIDGE_STATUS, {
              fromChain,
              fromToken,
              toChain,
              toToken,
              sentAmount: cryptoAmount,
              receivedAmount: quoteData.minimumAmountReceived,
              quoteId: quoteData.quoteId
            });
          } else {
            activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.FAILED, reason: 'IBC failed' } });
          }
        } catch (e) {
          activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityId.current, status: ActivityStatus.FAILED, reason: e.message } });
          Sentry.captureException(e);
        }
        setBridgeLoading(false);
      } else {
        setBridgeLoading(true);
        if ([ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(fromChain.backendName)
        ) {
          const wallets = await getSignerClient(hdWallet);
          await sendInCosmosChain(globalStateContext.globalState.rpcEndpoints[fromChain.backendName].primary, cryptoAmount, wallets, ChainNameMapping[fromChain.backendName], handleBridgeTransactionResult, quoteData);
          setBridgeLoading(false);
        } else {
          let gasPrice: GasPriceDetail = {
            chainId: fromChain.backendName,
            gasPrice: 0,
            tokenPrice: 0
          };
          const web3RPCEndpoint = new Web3(
            getWeb3Endpoint(hdWallet.state.selectedChain, globalStateContext)
          );
          try {
            const gasFeeResponse = await getGasPriceFor(fromChain, web3RPCEndpoint);
            gasPrice = gasFeeResponse;
            estimateGasForNativeTransaction(
              hdWallet,
              fromChain,
              fromToken,
              convertAmountOfContractDecimal(cryptoAmount, fromToken.contractDecimals),
              true,
              gasPrice,
              sendTransaction,
              globalStateContext
            );
          } catch (gasFeeError) {
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityId.current,
                status: ActivityStatus.FAILED
              }
            });
            showModal('state', {
              type: 'error',
              title: '',
              description: gasFeeError,
              onSuccess: onModalHide,
              onFailure: hideModal
            });
            Sentry.captureException(gasFeeError);
            setBridgeLoading(false);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (routeData?.fromChainData) {
      const { fromChainData } = routeData;
      const tempData = { item: fromChainData.chainDetails };
      setFromChain(fromChainData.chainDetails);
      setFromChainFunction(tempData);
      setFromToken(fromChainData);
      setMinimumAmount(
        10 / fromChainData.price
      );
      setNativeTokenBalance(
        getNativeTokenBalance(
          (NativeTokenMapping[fromChainData.chainDetails.symbol] || fromChainData.chainDetails.symbol).toUpperCase(),
          portfolioState.statePortfolio.tokenPortfolio[
            ChainNameMapping[fromChainData.chainDetails.backendName]
          ].holdings
        )
      );
    } else {
      setFromChain(ALL_CHAINS[0]);
      setLoading(true);
      setFromTokenData(portfolioState.statePortfolio.tokenPortfolio?.eth.holdings);
      setFromToken(portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0]);
      setMinimumAmount(
        10 / portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0].price
      );
      setNativeTokenBalance(
        getNativeTokenBalance(
          (NativeTokenMapping[portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0].chainDetails.symbol] || portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0].chainDetails.symbol).toUpperCase(),
          portfolioState.statePortfolio.tokenPortfolio[
            ChainNameMapping[portfolioState.statePortfolio.tokenPortfolio?.eth.holdings[0].chainDetails.backendName]
          ].holdings
        )
      );
    }
    setToChain(ALL_CHAINS[ALL_CHAINS.length - 1]);
    setAmount('0.00');
    setUsdAmount('0.00');
    setShowDropDown(true);

    const getInfo = async () => {
      try {
        const coinListUrl = `${ARCH_HOST}/v1/bridge/coinList`;
        const response = await axios.get(coinListUrl, {
          timeout: 2000
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
          onFailure: hideModal
        });
      }
    };

    getInfo().catch(error => {
      Sentry.captureException(error);
    });
  }, [isFocused]);

  useEffect(() => {
    const chainData: Chain[] = [];
    let tempData: Chain;
    ALL_CHAINS.forEach((item) => {
      if (item.name !== fromChain.name) {
        tempData = item;
        chainData.push(item);
      }
    });
    if (toChain.name === fromChain.name) setToChain(tempData);
    setToChainData(chainData);
  }, [fromChain]);

  useEffect(() => {
    if (chainListData) {
      chainListData.forEach((item) => {
        if (item.backendName === toChain.backendName) {
          setToToken(item);
        }
      });
    }
  }, [toChain, chainListData]);

  if (loading) {
    return (
      <CyDView
        className={'flex justify-center items-center bg-white h-full w-full'}
      >
        <LottieView
          source={AppImages.LOADING_IMAGE}
          autoPlay
          loop
          style={{ height: 150, width: 150 }}
        />
      </CyDView>
    );
  }

  if (!portfolioState.statePortfolio.tokenPortfolio) {
    return (
      <CyDView
        className={'flex justify-center items-center bg-white h-full w-full'}
      >

        <CyDImage source={AppImages.MOVE_FUND_BG} className={'w-[80%] h-[70%]'}/>
        <CyDText className={'mt-[20px] font-normal font-nunito text-black text-[20px]'}>{t<string>('FUND_WALLET_ACCESS_BRIDGE').toString()}</CyDText>

      </CyDView>
    );
  }

  const formatAmount = (amount: string) => {
    if (amount.includes('.')) {
      return amount.slice(0, amount.indexOf('.') + (fromToken.name === 'Ether' ? 7 : 3));
    } else if (amount === '0') return '0.00';
    return amount;
  };

  const isBridgeDisabled = () => {
    const nativeTokenSymbol = NativeTokenMapping[fromToken?.chainDetails.symbol] || fromToken?.chainDetails.symbol;
    return (nativeTokenBalance === 0 ||
    parseFloat(cryptoAmount) > parseFloat(fromToken?.actualBalance) ||
    nativeTokenBalance <= gasFeeReservation[fromToken.chainDetails?.backendName] ||
    (fromToken?.symbol === nativeTokenSymbol && parseFloat(cryptoAmount) > parseFloat((parseFloat(fromToken?.actualBalance) - gasFeeReservation[fromToken?.chainDetails.backendName]).toFixed(6))));
  };

  const RenderWarningMessage = () => {
    const nativeTokenSymbol = NativeTokenMapping[fromToken?.chainDetails.symbol] || fromToken?.chainDetails.symbol;
    if (parseFloat(cryptoAmount) > parseFloat(fromToken?.actualBalance)) {
      return (
        <CyDView>
          <CyDText className={'text-red-500 font-medium text-[12px] mb-[30px] mt-[20px]'}>
            {t<string>('INSUFFICIENT_BALANCE_BRIDGE')}
          </CyDText>
        </CyDView>
      );
    } else if (nativeTokenBalance <= gasFeeReservation[fromToken.chainDetails?.backendName]) {
      return (
        <CyDView>
          <CyDText className={'text-red-500 font-medium text-[12px] mb-[30px] mt-[20px]'}>
            {`* Insufficient ${nativeTokenSymbol} for gas fee`}
          </CyDText>
        </CyDView>
      );
    } else if (fromToken?.symbol === nativeTokenSymbol && parseFloat(cryptoAmount) > parseFloat((parseFloat(fromToken?.actualBalance) - gasFeeReservation[fromToken?.chainDetails.backendName]).toFixed(6))) {
      return (
        <CyDView>
          <CyDText className={'text-red-500 font-medium text-[12px] mb-[30px] mt-[20px]'}>
            {t<string>('INSUFFICIENT_GAS_FEE')}
          </CyDText>
        </CyDView>
      );
    }
    return null;
  };

  const onPressData = (value: string) => {
    const state = selectedReasons.includes(value) ? selectedReasons.filter(val => val !== value) : [...selectedReasons, value];
    setSelectedReasons(state);
  };

  const renderReasons = (reason: string, index: number, { length }: {length: number}) => {
    return (
      <CyDView key={index} className={clsx('flex flex-row justify-between p-[13px] mx-[10px]', { 'border-b-[1px] border-b-sepratorColor': length - 1 !== index })}>
        <CyDView className={'flex flex-row justify-start items-center'}>
          <CyDText className={'font-extrabold text-[14px]'}>{reason}</CyDText>
        </CyDView>
        <CyDView className={'flex flex-wrap justify-end'}>
          <CyDTouchView onPress={(e) => { onPressData(reason); }}
            className={`h-[20px] w-[20px] ${selectedReasons.includes(reason) ? 'bg-appColor' : ''} rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center`}>
            {selectedReasons.includes(reason)
              ? <CyDImage style={{ tintColor: 'black' }} source={AppImages.CORRECT}/>
              : null}
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  };

  const onSignModalCancel = async () => {
    const dontAsk = await getQuoteCancelReasons();
    if (!dontAsk) {
      const nativeTokenSymbol = NativeTokenMapping[fromToken?.chainDetails.symbol] || fromToken?.chainDetails.symbol;
      if (
        (parseFloat(cryptoAmount) > parseFloat(fromToken?.actualBalance)) ||
        (nativeTokenBalance <= gasFeeReservation[fromToken.chainDetails?.backendName]) ||
        (fromToken?.symbol === nativeTokenSymbol && parseFloat(cryptoAmount) > parseFloat((parseFloat(fromToken?.actualBalance) - gasFeeReservation[fromToken?.chainDetails.backendName]).toFixed(6)))
      ) {
        quoteData.reasons.push('Insufficient Funds');
      }
      setSelectedReasons([]);
      setDontAskAgain(false);
      commentsRef.current = '';
      setQuoteCancelVisible(true);
    } else {
      setSignModalVisible(false);
    }
  };

  const submitReasons = async (selectedReasons: string[]) => {
    try {
      if (commentsRef.current) { selectedReasons.push(commentsRef.current); }
      const headers = {
        headers: { Authorization: `Bearer ${String(globalStateContext.globalState.token)}` }
      };
      const data = {
        feedback: {
          ...quoteData,
          reasons: selectedReasons,
          chain: `${fromChain.name} -> ${toChain.name}`,
          token: `${fromToken?.name} -> ${toToken?.name}`
        }
      };
      await axios.post(`${ARCH_HOST}/v1/notification/slack/user-feedback`, data, headers);
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const onCancellingQuote = () => {
    setSignModalVisible(false);
    void setQuoteCancelReasons(dontAskAgain);
    setTimeout(() => {
      showModal('state', { type: 'success', title: t('THANKS_FOR_FEEDBACK'), onSuccess: hideModal, onFailure: hideModal });
    }, MODAL_CLOSING_TIMEOUT);
    void submitReasons(selectedReasons);
  };

  const QuoteCancelReasons = () => {
    return (
      <CyDAnimatedView entering={SlideInDown}>
        <CyDView className={'px-[20px]'}>
          <CyDText
            className={
              'text-center font-nunito text-[24px] font-bold font-[#434343] mt-[20px]'
            }
          >
            {t<string>('HELP_US_UNDERSTAND')}
          </CyDText>
          <CyDView className={'mt-[20px]'}>
            {quoteData.reasons.map(renderReasons)}
          </CyDView>
          <CyDView className={'mt-[20px] px-[15px]'}>
            <CyDText className={'font-nunito text-[14px] font-semibold font-[#434343] ml-[10px] mb-[5px]'}>
              {t<string>('ADDITIONAL_COMMENTS')}
            </CyDText>
            <CyDTextInput
              style={{ textAlignVertical: 'top' }}
              defaultValue={commentsRef.current}
              className={'h-[70px] border-[1px] rounded-[5px] border-inputBorderColor'}
              multiline={true}
              onChangeText={(text) => { commentsRef.current = text; }}
              secureTextEntry={true}
            />
          </CyDView>
          <CyDView className={'flex flex-row justify-center items-center mt-[10px]'}>
            <CyDText>{t<string>('DONT_ASK_AGAIN')}</CyDText>
            <CyDTouchView
              onPress={(e) => {
                setDontAskAgain(!dontAskAgain);
              }}
              className={`h-[18px] w-[18px] ${dontAskAgain ? 'bg-appColor' : ''} rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center ml-[5px]`}>
              {dontAskAgain
                ? <CyDImage
                  style={{ tintColor: 'black' }}
                  source={AppImages.CORRECT}
                  className={'h-[14px] w-[14px]'}
                  resizeMode='contain'
                />
                : null}
            </CyDTouchView>
          </CyDView>
        </CyDView>

        <CyDView
          className={
            'flex flex-row w-full justify-center items-center space-x-[16px] px-[30px] pt-[20px] pb-[30px]'
          }
        >
          <CyDTouchView
            onPress={() => {
              setSignModalVisible(false);
              void setQuoteCancelReasons(dontAskAgain);
            }}
            className={
              'border-[1px] border-[#525252] rounded-[12px] px-[20px] py-[20px] w-1/2 flex items-center'
            }
          >
            <CyDText
              className={
                'text-[#525252] text-[16px] font-extrabold font-nunito'
              }
            >
              {t<string>('CANCEL')}
            </CyDText>
          </CyDTouchView>

          <CyDTouchView
            onPress={() => { onCancellingQuote(); }}
            className={clsx(
              'rounded-[12px] bg-[#FFDE59] px-[20px] w-1/2 items-center'
            )}
          >
            <CyDText
              className={
                'text-[#525252] text-[16px] font-extrabold font-nunito my-[20px]'
              }
            >
              {t<string>('SUBMIT')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDAnimatedView>
    );
  };

  return (
    <CyDSafeAreaView>
    <CyDKeyboardAvoidingView behavior={isAndroid() ? 'height' : 'padding'} enabled className={'h-full flex grow-1'}>
      <CyDScrollView className={'bg-white w-full pb-[40px]'}>
        {/* <CyDView className={"absolute top-[-10px] right-0"}> */}
        {/*  <CyDImage source={AppImages.CANCEL} /> */}
        {/* </CyDView> */}
        <ChooseChainModal
          setModalVisible={setFromChainModalVisible}
          isModalVisible={fromChainModalVisible}
          data={ALL_CHAINS}
          title={'Choose Chain'}
          selectedItem={fromChain.name}
          onPress={setFromChainFunction}
          type={'chain'}
        />

        <ChooseChainModal
          setModalVisible={setFromTokenModalVisible}
          isModalVisible={fromTokenModalVisible}
          data={fromTokenData}
          title={'Choose Token'}
          selectedItem={fromToken?.name}
          onPress={({ item }) => {
            setFromToken(item);
            setMinimumAmount(10 / item.price);
          }}
          type={'token'}
        />

        <ChooseChainModal
          setModalVisible={setToChainModalVisible}
          isModalVisible={toChainModalVisible}
          data={toChainData}
          title={'Choose Chain'}
          selectedItem={toChain.name}
          onPress={(item) => {
            setToChain(item.item);
          }}
          type={'chain'}
        />

        <SignatureModal
          isModalVisible={signModalVisible}
          setModalVisible={setSignModalVisible}
          onCancel={() => { void setQuoteCancelReasons(dontAskAgain); }}
        >
          { quoteCancelVisible
            ? <QuoteCancelReasons />
            : <CyDAnimatedView exiting={FadeOut}>
                <CyDView className={'px-[20px]'}>
                  <CyDText
                    className={
                      'text-center font-nunito text-[24px] font-bold font-[#434343] mt-[20px]'
                    }
                  >
                    {t<string>('TRANSFER_TOKENS')}
                  </CyDText>
                  <CyDView
                    className={
                      'flex flex-row justify-between w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
                    }
                  >
                    <CyDView className={'flex w-[40%] items-center justify-center'}>
                      <CyDView className='items-center'>
                        <CyDImage
                          source={{ uri: fromToken?.logoUrl }}
                          className={'w-[44px] h-[44px]'}
                        />
                        <CyDText
                          className={
                            'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                          }
                        >
                          {fromToken?.name}
                        </CyDText>
                        <CyDView
                          className={
                            'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                          }
                        >
                          <CyDImage
                            source={fromChain.logo_url}
                            className={'w-[14px] h-[14px]'}
                          />
                          <CyDText
                            className={'ml-[6px] font-nunito font-normal text-black  text-[12px]'}
                          >
                            {fromChain.name}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                    </CyDView>

                    <CyDView className={'flex justify-center'}>
                      <CyDImage source={AppImages.APP_SEL}/>
                    </CyDView>

                    <CyDView className={'flex w-[40%] items-center self-center align-center justify-center '}>
                      <CyDView className='items-center'>
                        <CyDImage
                          source={{ uri: toToken?.logoUrl }}
                          className={'w-[44px] h-[44px]'}
                        />
                        <CyDText
                          className={
                            'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                          }
                        >
                          {toToken?.name}
                        </CyDText>
                        <CyDView
                          className={
                            'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                          }
                        >
                          <CyDImage
                            source={toChain.logo_url}
                            className={'w-[14px] h-[14px]'}
                          />
                          <CyDText
                            className={'ml-[6px] font-nunito text-black font-normal text-[12px]'}
                          >
                            {toChain.name}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                  <CyDView className={'flex flex-row justify-between'}>
                    <CyDText
                      className={'font-[#434343] font-nunito text-black font-[16px] text-medium'}
                    >
                      {t<string>('SENT_AMOUNT')}
                    </CyDText>
                    <CyDView className={'mr-[6%] flex flex-col items-end'}>
                      <CyDText
                        className={'font-nunito font-[16px] text-black font-bold max-w-[150px]'}
                        numberOfLines={1}
                      >
                        {`${quoteData.fromAmount.toFixed(4)} ${fromToken?.name}`}
                      </CyDText>
                      <CyDText
                        className={'font-nunito font-[12px] text-[#929292] font-bold'}
                      >
                        {`${(quoteData.fromAmountUsd.toFixed(4))} USD`}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  <CyDView
                    className={
                      'mr-[6%] flex flex-row justify-between mt-[20px]'
                    }
                  >
                    <CyDText
                      className={'text-[#434343] font-nunito font-[16px] text-medium'}
                    >
                      {t<string>('TOTAL_RECEIVED')}
                    </CyDText>
                    <CyDView className={'flex flex-col items-end'}>
                      <CyDText
                        className={'font-nunito font-[16px] text-black font-bold max-w-[150px]'}
                        numberOfLines={1}
                      >
                        {`${quoteData.toAmount.toFixed(4)} ${toToken?.name}`}
                      </CyDText>
                      <CyDText
                        className={'font-nunito font-[12px] text-[#929292] font-bold'}
                      >
                        {`${quoteData.toAmountUsd.toFixed(4)} USD`}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  <CyDView
                    className={
                      clsx('mr-[6%] flex flex-row justify-between mt-[20px]', {
                        'mb-[30px]': parseFloat(fromToken?.actualBalance) > parseFloat(cryptoAmount)
                      })
                    }
                  >
                    <LottieView source={AppImages.ESTIMATED_TIME} resizeMode={'contain'} autoPlay loop style={{ width: 20 }}/>
                    <CyDView className={'flex flex-row justify-between items-center'}>
                      <CyDText
                        className={'font-nunito font-[16px] text-black font-bold ml-[12px]'}
                      >
                        {[ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS].includes(fromChain.backendName) &&
                          [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS].includes(toChain.backendName)
                          ? '~ 7 mins'
                          : '~ 15 mins'}
                      </CyDText>

                    </CyDView>
                  </CyDView>
                  <RenderWarningMessage />
                </CyDView>

                <CyDView
                  className={
                    'flex flex-row w-full justify-center items-center space-x-[16px] px-[30px] pb-[50px]'
                  }
                >
                  <CyDTouchView
                    disabled={bridgeLoading}
                    onPress={() => {
                      void onSignModalCancel();
                    }}
                    className={
                      'border-[1px] border-[#525252] rounded-[12px] px-[20px] py-[20px] w-1/2 flex items-center'
                    }
                  >
                    <CyDText
                      className={
                        'text-[#525252] text-[16px] font-extrabold font-nunito'
                      }
                    >
                      {t<string>('CANCEL')}
                    </CyDText>
                  </CyDTouchView>

                  <CyDTouchView
                    disabled={
                      bridgeLoading ||
                      isBridgeDisabled()
                    }
                    onPress={onPressBridge}
                    className={clsx(
                      'rounded-[12px] bg-[#FFDE59] px-[20px] w-1/2 items-center',
                      {
                        'bg-[#dddd]':
                        isBridgeDisabled()
                      }
                    )}
                  >
                    {bridgeLoading && (
                      <CyDView className={'mr-[16px]'}>
                        <LottieView
                          source={AppImages.LOADING_SPINNER}
                          autoPlay
                          loop
                          style={{ height: 60, left: 2 }}
                        />
                      </CyDView>
                    )}
                    {!bridgeLoading && (
                      <CyDText
                        className={
                          'text-[#525252] text-[16px] font-extrabold font-nunito my-[20px]'
                        }
                      >
                        {t<string>('BRIDGE_ALL_CAPS')}
                      </CyDText>
                    )}
                  </CyDTouchView>
                </CyDView>
              </CyDAnimatedView>
          }
        </SignatureModal>

        {showDropDown && (
          <CyDView>
            <CyDText
              className={
                'font-extrabold text-[24px] text-center mt-[10px] font-nunito text-black '
              }
            >
              {t<string>('FORM')}
            </CyDText>

            <CyDTouchView
              className={
                'bg-[#F7F8FE] mx-[40] my-[16] border-[1px] border-[#EBEBEB] rounded-[16px]'
              }
              onPress={() => setFromChainModalVisible(true)}
            >
              <CyDView
                className={
                  'h-[60px] p-[18px] flex flex-row justify-between items-center'
                }
              >
                <CyDView className={'flex flex-row items-center'}>
                  <CyDImage
                    source={fromChain.logo_url}
                    className={'w-[30px] h-[30px]'}
                  />
                  <CyDText
                    className={
                      'text-center text-black font-nunito text-[16px] ml-[8px]'
                    }
                  >
                    {fromChain.name}
                  </CyDText>
                </CyDView>

                <CyDImage source={AppImages.DOWN_ARROW}/>
              </CyDView>
            </CyDTouchView>

            <CyDTouchView
              className={
                'bg-[#F7F8FE] mx-[40] mb-[16] border-[1px] border-[#EBEBEB] rounded-[16px]'
              }
              onPress={() => setFromTokenModalVisible(true)}
            >
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white p-[18px] rounded-l-[16px] flex items-center'
                  }
                >
                  <CyDText className={'text-[#434343] text-[16px] font-extrabold'}>
                    {'Token'}
                  </CyDText>
                </CyDView>

                <CyDView
                  className={
                    'flex flex-row items-center justify-between w-8/12 p-[18px]'
                  }
                >
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={{ uri: fromToken?.logoUrl }}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText
                      className={
                        'text-center text-black font-nunito text-[16px] ml-[8px] max-w-[70%]'
                      }
                      numberOfLines={1}
                    >
                      {fromToken?.name}
                    </CyDText>
                  </CyDView>
                  <CyDImage source={AppImages.DOWN_ARROW}/>
                </CyDView>
              </CyDView>
            </CyDTouchView>

            <CyDView className={'mt-[16] bg-[#F7F8FE] rounded-t-[20px] mx-[20]'}>
              <CyDText
                className={
                  'font-extrabold text-[24px] text-center mt-[16px] font-nunito text-black '
                }
              >
                {t<string>('TO')}
              </CyDText>

              <CyDTouchView
                className={
                  'bg-white mx-[20] my-[16] border-[1px] border-[#EBEBEB] rounded-[16px]'
                }
                onPress={() => setToChainModalVisible(true)}
              >
                <CyDView
                  className={
                    'h-[60px] p-[18px] flex flex-row justify-between items-center'
                  }
                >
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={toChain.logo_url}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText
                      className={
                        'text-center text-black font-nunito text-[16px] ml-[8px]'
                      }
                    >
                      {toChain.name}
                    </CyDText>
                  </CyDView>

                  <CyDImage source={AppImages.DOWN_ARROW}/>
                </CyDView>
              </CyDTouchView>

              <CyDView
                className={
                  'bg-white mx-[20] mb-[16] border-[1px] border-[#EBEBEB] rounded-[16px]'
                }
              >
                <CyDView className={'h-[60px] flex flex-row w-full'}>
                  <CyDView
                    className={
                      'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white p-[18px] rounded-l-[16px] flex items-center'
                    }
                  >
                    <CyDText
                      className={'text-[#434343] text-[16px] font-extrabold'}
                    >
                      {'Token'}
                    </CyDText>
                  </CyDView>

                  <CyDView
                    className={
                      'flex flex-row items-center justify-between w-8/12 p-[18px]'
                    }
                  >
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDImage
                        source={{ uri: toToken?.logoUrl }}
                        className={'w-[30px] h-[30px]'}
                      />
                      <CyDText
                        className={
                          'text-center text-black font-nunito text-[16px] ml-[8px] max-w-[70%]'
                        }
                        numberOfLines={1}
                      >
                        {toToken?.name}
                      </CyDText>
                    </CyDView>
                    {/* <CyDImage source={AppImages.DOWN_ARROW}/> */}
                  </CyDView>
                </CyDView>
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
              'flex flex-row justify-between my-[30px] bg-[#F7F8FE] rounded-[20px] mx-[20px] px-[15px] py-[20px] '
            }
          >
            <CyDView className={'flex w-[40%] items-center justify-center'}>
              <CyDImage
                source={{ uri: fromToken?.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-center text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }
              >
                {fromToken?.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={fromChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] font-nunito text-black font-normal text-[12px]'}
                >
                  {fromChain.name}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex justify-center'}>
              <CyDImage source={AppImages.APP_SEL}/>
            </CyDView>

            <CyDView className={'flex w-[40%] items-center justify-center '}>
              <CyDImage
                source={{ uri: toToken?.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-center text-[14px] font-semibold flex flex-row justify-center font-nunito'
                }
              >
                {toToken?.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }
              >
                <CyDImage
                  source={toChain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={'ml-[6px] font-nunito text-black font-normal text-[12px]'}
                >
                  {toChain.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDTouchView>
        )}

        <CyDTouchView
          className={clsx('pb-[45px] bg-[#F7F8FE]  mx-[20]', {
            'rounded-b-[20px]': showDropDown,
            'rounded-[20px]': !showDropDown
          })}
          onPress={() => {
            amount === '0.00' ? setAmount('') : setAmount(amount);
            setShowDropDown(false);
          }}
        >
          <CyDText
            className={
              'font-extrabold text-[22px] text-center mt-[20px] font-nunito text-black'
            }
          >
            {t<string>('ENTER_AMOUNT')}
          </CyDText>

          <CyDText
            className={
              'font-extrabold text-[20px] text-center mt-[10px] font-nunito bottom-0 text-black '
            }
          >
            {enterCryptoAmount ? fromToken?.name : 'USD'}
          </CyDText>

          <CyDView className={'flex items-center justify-center items-center'}>
            {showDropDown && (
              <CyDText
                className={clsx(
                  'font-bold text-[70px] h-[80px] text-justify font-nunito mt-[10px] text-black ',
                  {
                    'text-[50px]': fromToken?.name === 'Ether'
                  }
                )}
              >
                {fromToken?.name === 'Ether'
                  ? parseFloat(amount).toFixed(6)
                  : parseFloat(amount).toFixed(2)}
              </CyDText>
            )}
            {!showDropDown && (
              <CyDView className={'flex flex-row items-center relative'}>
                <CyDTouchView
                  onPress={() => {
                    const gasReserved = (NativeTokenMapping[fromToken?.chainDetails?.symbol] || fromToken?.chainDetails?.symbol) === fromToken?.symbol ? gasFeeReservation[fromToken.chainDetails.backendName] : 0;

                    const maxAmount = parseFloat(fromToken?.actualBalance) - gasReserved;
                    const textAmount = maxAmount < 0 ? '0.00' : limitDecimalPlaces(maxAmount.toString(), 6);
                    setAmount(textAmount);

                    if (enterCryptoAmount) {
                      setCryptoAmount(textAmount);
                      setUsdAmount((parseFloat(textAmount) * fromToken.price).toString());
                    } else {
                      setCryptoAmount((parseFloat(textAmount) / fromToken.price).toString());
                      setUsdAmount(textAmount);
                    }
                  }}
                  className={clsx(
                    'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]'
                  )}
                >
                  <CyDText className={'font-nunito text-black '}>{t<string>('MAX')}</CyDText>
                </CyDTouchView>
                <CyDView className={'flex-col w-8/12 mx-[6px] items-center'}>
                  <CyDTextInput
                    className={clsx(
                      'font-bold text-center text-black h-[85px] font-nunito',
                      {
                        'text-[70px]': amount.length <= 5,
                        'text-[40px]': amount.length > 5
                      }
                    )}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      setAmount(text);
                      if (enterCryptoAmount) {
                        setCryptoAmount(text);
                        setUsdAmount((parseFloat(text) * fromToken.price).toString());
                      } else {
                        setCryptoAmount((parseFloat(text) / fromToken.price).toString());
                        setUsdAmount(text);
                      }
                    }}
                    value={amount}
                    autoFocus={true}
                  />
                  <CyDText className={clsx('flex items-center justify-center text-subTextColor font-bol h-[50px] text-[24px]')}>{enterCryptoAmount ? (!isNaN(parseFloat(usdAmount)) ? formatAmount(usdAmount) : '0.00') + ' USD' : (!isNaN(parseFloat(cryptoAmount)) ? formatAmount(cryptoAmount) : '0.00') + ` ${fromToken.name}`}</CyDText>
                </CyDView>
                <CyDTouchView
                  onPress={() => {
                    setEnterCryptoAmount(!enterCryptoAmount);
                    if (!enterCryptoAmount) {
                      setCryptoAmount(amount);
                      setUsdAmount((parseFloat(amount) * fromToken.price).toString());
                    } else {
                      setCryptoAmount((parseFloat(amount) / fromToken.price).toString());
                      setUsdAmount(amount);
                    }
                  }}
                  className={clsx(
                    'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]'
                  )}
                >
                  <CyDImage source={AppImages.TOGGLE_ICON} className={'w-[14px] h-[16px]'} />
                </CyDTouchView>
              </CyDView>
            )}

            <CyDText
              className={
                'font-semibold text-[14px] text-center text-[#929292] font-nunito'
              }
            >
              {`${t<string>('ENTER_AMOUNT_GREATER')} ${minimumAmount.toFixed(3)}  ${fromToken?.name}`}
            </CyDText>

            <CyDText
              className={
                'font-semibold text-[14px] text-center text-[#929292] font-nunito mt-[8px]'
              }
            >
              {`${fromToken?.name} ${t<string>('BALANCE')} `}
              <CyDTokenAmount className='text-[#929292]' decimalPlaces={6}>
                {parseFloat(
                  fromToken?.actualBalance
                )}
              </CyDTokenAmount>
            </CyDText>
          </CyDView>
        </CyDTouchView>

        <CyDView className={'relative flex flex-row items-center justify-center'}>
          <CyDTouchView
            onPress={() => {
              if (validateAmount(amount)) void onGetQuote();
            }}
            disabled={
              parseFloat(cryptoAmount) < minimumAmount ||
              bridgeLoading
            }
            className={clsx(
              'top-[-30px] bg-[#dddddd] rounded-[12px] flex items-center w-3/4 flex flex-row justify-center',
              {
                'bg-[#FFDE59]': parseFloat(cryptoAmount) >= minimumAmount,
                'bg-[#dddddd]':
                  parseFloat(cryptoAmount) < minimumAmount ||
                  amount === ''
              }
            )}
          >
            {bridgeLoading && (
              <CyDView className={'mr-[16px]'}>
                <LottieView
                  source={AppImages.LOADING_SPINNER}
                  autoPlay
                  loop
                  style={{ height: 60, aspectRatio: 200 / 5 }}
                />
              </CyDView>
            )}
            {!bridgeLoading && (
              <CyDText
                className={
                  'font-nunito text-[15px] text-[#1F1F1F] font-extrabold my-[20px]'
                }
              >
                {t<string>('GET_QUOTE')}
              </CyDText>
            )}
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>
    </CyDKeyboardAvoidingView>
    </CyDSafeAreaView>
  );
};
