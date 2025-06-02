import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  capitalize,
  debounce,
  endsWith,
  get,
  isEmpty,
  isNil,
  min,
} from 'lodash';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import Loading from '../../components/v2/loading';
import {
  ChainIdNameMapping,
  ChainIdToBackendNameMapping,
  ChainNameToChainMapping,
  GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
} from '../../constants/data';
import useAxios from '../../core/HttpRequest';
import {
  ActivityContext,
  formatAmount,
  getAvailableChains,
  getViemPublicClient,
  getWeb3Endpoint,
  hasSufficientBalanceAndGasFee,
  HdWalletContext,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  setTimeOutNSec,
} from '../../core/util';
import { SkipApiRouteResponse } from '../../models/skipApiRouteResponse.interface';
import { SkipApiStatus } from '../../models/skipApiStatus.interface';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import {
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import BridgeRoutePreview from './bridgePreview';
import TokenSelectionV2 from './tokenSelection';

import * as Sentry from '@sentry/react-native';
import { Transaction } from '@solana/web3.js';
import clsx from 'clsx';
import { Decimal } from 'decimal.js';
import { StyleSheet } from 'react-native';
import JSONTree from 'react-native-json-tree';
import { SvgUri } from 'react-native-svg';
import { v4 as uuidv4 } from 'uuid';
import {
  encodeFunctionData,
  formatEther,
  formatUnits,
  parseEther,
  parseGwei,
  parseUnits,
  PublicClient,
  toHex,
} from 'viem';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import SignatureModal from '../../components/v2/signatureModal';
import CyDSkeleton from '../../components/v2/skeleton';
import { screenTitle } from '../../constants';
import {
  AnalyticsType,
  ButtonType,
  ConnectionTypes,
} from '../../constants/enum';
import {
  ALL_CHAINS,
  CAN_ESTIMATE_L1_FEE_CHAINS,
  Chain,
  ChainBackendNames,
  COSMOS_CHAINS,
} from '../../constants/server';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { DEFAULT_AXIOS_TIMEOUT } from '../../core/Http';
import { Holding } from '../../core/portfolio';
import useSkipApiBridge from '../../core/skipApi';
import { allowanceApprovalContractABI } from '../../core/swap';
import useGasService from '../../hooks/useGasService';
import useIsSignable from '../../hooks/useIsSignable';
import usePortfolio from '../../hooks/usePortfolio';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';
import useTransactionManager from '../../hooks/useTransactionManager';
import { OdosSwapQuoteResponse } from '../../models/osdoQuote.interface';
import {
  SkipApiCosmosTxn,
  SkipAPiEvmTx,
  SkipApiSignMsg,
} from '../../models/skipApiSingMsg.interface';
import {
  ActivityContextDef,
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  ExchangeTransaction,
} from '../../reducers/activity_reducer';
import {
  BridgeContext,
  BridgeContextDef,
  BridgeReducerAction,
  BridgeStatus,
} from '../../reducers/bridge.reducer';
import { DecimalHelper } from '../../utils/decimalHelper';
import { ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR } from '../Portfolio/constants';
import { genId } from '../utilities/activityUtilities';
import useConnectionManager from '../../hooks/useConnectionManager';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

export interface SwapBridgeChainData {
  chainName: string;
  chainId: string;
  logoUrl: string;
  prettyName: string;
  chainType: 'evm' | 'cosmos' | 'svm';
  bech32Prefix: string;
  isOdos: boolean;
  isSkip: boolean;
}

export interface SwapBridgeTokenData {
  denom: string;
  chainId: string;
  isNative: boolean;
  isEvm: boolean;
  isSvm: boolean;
  symbol: string;
  name: string;
  logoUrl: string;
  tokenContract: string;
  decimals: number;
  coingeckoId: string;
  recommendedSymbol: string;
  isOdos: boolean;
  isSkip: boolean;
  price: number;
  balance: number;
  balanceInNumbers: number;
  balanceDecimal: string;
}

enum TxnStatus {
  STATE_SUBMITTED = 'STATE_SUBMITTED',
  STATE_PENDING = 'STATE_PENDING',
  STATE_COMPLETED_SUCCESS = 'STATE_COMPLETED_SUCCESS',
  STATE_COMPLETED_ERROR = 'STATE_COMPLETED_ERROR',
  STATE_ABANDONED = 'STATE_ABANDONED',
  STATE_PENDING_ERROR = 'STATE_PENDING_ERROR',
}

interface RouteParams {
  tokenData?: any;
  backVisible?: boolean;
}

const Bridge: React.FC = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState({
    pageLoading: false,
    quoteLoading: false,
    acceptSwapLoading: false,
    swapLoading: false,
    bridgeGetMsg: false,
    approvalLoading: false,
    maxAmountLoading: false,
  });
  const { getWithAuth, postToOtherSource, getFromOtherSource, postWithAuth } =
    useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const route = useRoute<
    RouteProp<ParamListBase, 'bridgeSkipApiScreen'> & { params: RouteParams }
  >();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {
    skipApiApproveAndSignEvm,
    skipApiSignAndBroadcast,
    skipApiSignAndApproveSolana,
  } = useSkipApiBridge();
  const {
    executeApprovalRevokeContract,
    swapTokens,
    checkIfAllowanceIsEnough,
  } = useTransactionManager();
  const { getGasPrice } = useGasService();
  const globalStateContext = useContext(GlobalContext) as GlobalContextDef;
  const { state: bridgeState, dispatch: bridgeDispatch } = useContext(
    BridgeContext,
  ) as BridgeContextDef;
  const activityContext = useContext(ActivityContext) as ActivityContextDef;
  const activityId = useRef<string>('id');
  const [isSignableTransaction] = useIsSignable();
  const { getNativeToken } = usePortfolio();
  const { refreshPortfolio } = usePortfolioRefresh();
  const slippage = 0.4;
  const ethereum = get(hdWallet, 'state.wallet.ethereum', '');
  const ethereumAddress = get(ethereum, 'address', '');

  const [chainData, setChainData] = useState<SwapBridgeChainData[]>([]);
  const [tokenData, setTokenData] = useState<
    Record<string, SwapBridgeTokenData[]>
  >({});
  const [fromChainDetails, setFromChainDetails] = useState<Chain | null>(null);

  const [selectedFromChain, setSelectedFromChain] =
    useState<SwapBridgeChainData | null>(null);
  const [selectedFromToken, setSelectedFromToken] =
    useState<SwapBridgeTokenData | null>(null);
  const [selectedToChain, setSelectedToChain] =
    useState<SwapBridgeChainData | null>(null);
  const [selectedToToken, setSelectedToToken] =
    useState<SwapBridgeTokenData | null>(null);
  const [toTokenData, setToTokenData] = useState<SwapBridgeTokenData[]>([]);
  const [fromTokenData, setFromTokenData] = useState<SwapBridgeTokenData[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [skipApiStatusResponse, setSkipApiStatusResponse] = useState<
    SkipApiStatus[]
  >([]);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [usdAmountOut, setUsdAmountOut] = useState('');
  const [evmTxnParams, setEvmTxnParams] = useState<SkipAPiEvmTx | null>(null);
  const [cosmosTxnParams, setCosmosTxnParams] =
    useState<SkipApiCosmosTxn | null>(null);
  const [solanaTxnParams, setSolanaTxnParams] = useState<Transaction | null>(
    null,
  );
  const [approveModalVisible, setApproveModalVisible] =
    useState<boolean>(false);
  const [evmModalVisible, setEvmModalVisible] = useState<boolean>(false);
  const [cosmosModalVisible, setCosmosModalVisible] = useState<boolean>(false);
  const [solanaModalVisible, setSolanaModalVisible] = useState<boolean>(false);
  const [modalPromiseResolver, setModalPromiseResolver] = useState<
    ((value: boolean) => void) | null
  >(null);
  const [approveParams, setApproveParams] = useState<{
    tokens: string;
    contractAddress: string;
  } | null>(null);
  const [swapParams, setSwapParams] = useState<{
    gasFeeETH: string;
    gasFeeDollar: string;
  }>({
    gasFeeETH: '0',
    gasFeeDollar: '0',
  });
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<
    SkipApiRouteResponse | OdosSwapQuoteResponse | null
  >(null);
  const [error, setError] = useState<string>('');
  const routeParamsTokenData = route?.params?.tokenData;
  const routeParamsBackVisible = route?.params?.backVisible;
  const { getLocalPortfolio } = usePortfolio();
  const [signaturesRequired, setSignaturesRequired] = useState<number>(0);
  const [toggle, setToggle] = useState<boolean>(false);
  const {
    estimateGasForCosmosCustomContractRest,
    estimateGasForEvmCustomContract,
    estimateReserveFee,
    estimateReserveFeeForCustomContract,
    estimateGasForSolanaCustomContract,
  } = useGasService();
  const [nativeToken, setNativeToken] = useState<Holding | null>(null);
  const globalContext = useContext(GlobalContext);
  const [currentMaxAmount, setCurrentMaxAmount] = useState<string>('');

  // Add new ref to store the interval
  const quoteRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Add new state to track time until next refresh
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(30);

  const navigateToPortfolio = () => {
    hideModal();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: screenTitle.PORTFOLIO,
        },
      ],
    });
  };

  const fetchChainData = async () => {
    const chainResult = await getWithAuth('/v1/swap/chains');
    const availableChains = getAvailableChains(hdWallet);

    const filteredChainData = bridgeState.chainData.filter(
      (chain: SwapBridgeChainData) =>
        availableChains.some(
          availableChain =>
            availableChain.chainIdNumber.toString() ===
              chain.chainId.toLowerCase() ||
            availableChain.chain_id.toString() === chain.chainId.toLowerCase(),
        ),
    );

    setChainData(filteredChainData);

    bridgeDispatch({
      type: BridgeReducerAction.SUCCESS,
      payload: {
        chainData: chainResult,
      },
    });
  };

  const fetchTokenData = async () => {
    const tokenResult = await getWithAuth('/v1/swap/tokens');
    setTokenData(tokenResult.data);
    bridgeDispatch({
      type: BridgeReducerAction.SUCCESS,
      payload: {
        tokenData: tokenResult,
      },
    });
  };

  const getSelectedChainAddress = () => {
    return get(
      hdWallet,
      [
        'state',
        'wallet',
        get(ChainIdNameMapping, selectedFromChain?.chainId, 'ethereum'),
        'address',
      ],
      '',
    );
  };

  const fetchData = async () => {
    try {
      setLoading({ ...loading, pageLoading: true });
      bridgeDispatch({
        type: BridgeReducerAction.FETCHING,
      });
      const results = await Promise.allSettled([
        fetchChainData(),
        fetchTokenData(),
      ]);
      const hasError = results.some(result => result.status === 'rejected');
      if (hasError) {
        bridgeDispatch({
          type: BridgeReducerAction.ERROR,
        });
        throw new Error('Failed to fetch one or more data sources');
      }
      setLoading({ ...loading, pageLoading: false });
    } catch (err) {
      setLoading({ ...loading, pageLoading: false });
      bridgeDispatch({
        type: BridgeReducerAction.ERROR,
      });
      showModal('state', {
        type: 'error',
        title: t('UNEXPECTED_ERROR'),
        description: 'Unable to fetch data, try again later',
        onSuccess: hideModal,
        onFailure: hideModal,
      });

      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: 'Bridge data token fetch',
        message: parseErrorMessage(err),
        screen: route.name,
        address: getSelectedChainAddress(),
        other: {
          selectedFromChain: selectedFromChain?.chainName,
          selectedToChain: selectedToChain?.chainName,
          selectedFromToken: selectedFromToken?.name,
          selectedToToken: selectedToToken?.name,
          selectedFromAmount: cryptoAmount,
          selectedToAmount: amountOut,
          selectedFromUsdAmount: usdAmount,
          selectedToUsdAmount: usdAmountOut,
        },
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (bridgeState.status === BridgeStatus.ERROR) {
        void fetchData();
      } else {
        setIndex(0);
        const availableChains = getAvailableChains(hdWallet);

        const filteredChainData = bridgeState.chainData.filter(
          (chain: SwapBridgeChainData) =>
            availableChains.some(
              availableChain =>
                availableChain.chainIdNumber.toString() ===
                  chain.chainId.toLowerCase() ||
                availableChain.chain_id.toString() ===
                  chain.chainId.toLowerCase(),
            ),
        );

        setChainData(filteredChainData);
        const chainDataSelected = filteredChainData[0];
        setTokenData(bridgeState.tokenData);

        if (routeParamsTokenData?.chainDetails) {
          const selectedChain = bridgeState.chainData.find(
            chain =>
              chain.chainId === routeParamsTokenData.chainDetails.chain_id ||
              Number(chain.chainId) ===
                Number(routeParamsTokenData.chainDetails.chainIdNumber),
          );
          setSelectedFromChain(selectedChain ?? bridgeState.chainData[0]);
        } else {
          setSelectedFromChain(chainDataSelected);
        }
      }
    }, []),
  );

  // when from chain changes set the from token data, tokens those are available in the token holdings
  // when to chain changes update the from token data beacuse the to chain can be different one from from chain, if so it is ment to be bridge, in that case we
  // need to only show tokens supported by skip api
  useEffect(() => {
    if (selectedFromChain) {
      void setFromTokenAndTokenData();
    }
  }, [selectedFromChain, tokenData, selectedToChain]);

  const setFromTokenAndTokenData = async () => {
    const currentChain = ALL_CHAINS.find(
      chain =>
        chain.chainIdNumber === Number(selectedFromChain?.chainId) ||
        chain.chain_id === selectedFromChain?.chainId,
    );
    setFromChainDetails(currentChain as Chain);

    const nativeToken = await getNativeToken(
      currentChain?.backendName as ChainBackendNames,
    );
    setNativeToken(nativeToken);

    // Filter tokens based on totalHoldings
    const localPortfolio = await getLocalPortfolio();
    const totalHoldings = localPortfolio?.totalHoldings;

    let filteredTokens =
      tokenData[selectedFromChain?.chainId]
        ?.map(token => {
          const matchingHolding = totalHoldings?.find(
            holding =>
              holding.coinGeckoId === token.coingeckoId &&
              (holding.chainDetails.chainIdNumber ===
                Number(selectedFromChain?.chainId) ||
                holding.chainDetails.chain_id === selectedFromChain?.chainId),
          );
          return {
            ...token,
            balance: matchingHolding?.balanceDecimal ?? 0,
            balanceInNumbers: matchingHolding?.totalValue ?? 0,
            balanceDecimal: matchingHolding?.balanceDecimal ?? 0,
          };
        })
        .sort(
          (a, b) => Number(b.balanceInNumbers) - Number(a.balanceInNumbers),
        ) ?? [];

    if (selectedToChain && selectedFromChain) {
      filteredTokens = filteredTokens?.filter(item => {
        // Check if both chains are Odos
        // if both chains are same and isOdos true for the chain, then the tokens shown in from token data should be odos tokens,

        if (
          selectedFromChain.isOdos &&
          selectedToChain.isOdos &&
          selectedFromChain.chainId === selectedToChain.chainId
        ) {
          return item.isOdos;
        }
        // Check if both chains are Skip
        // if the chains are different then it should be only skip supported tokend for bridging.
        if (selectedFromChain.isSkip && selectedToChain.isSkip) {
          return item.isSkip;
        }
        return true;
      });
    }

    setFromTokenData(filteredTokens);

    if (
      !filteredTokens?.find(
        token =>
          token.tokenContract === selectedFromToken?.tokenContract ||
          token.denom === selectedFromToken?.denom,
      )
    ) {
      let _selectedFromToken;
      if (routeParamsTokenData) {
        const routeToken = filteredTokens.find(
          token =>
            token.denom === routeParamsTokenData.denom ||
            token.tokenContract === routeParamsTokenData.contractAddress,
        );
        _selectedFromToken = routeToken ?? filteredTokens?.[0];

        setSelectedFromToken(_selectedFromToken);
      } else {
        _selectedFromToken = filteredTokens?.[0];
        setSelectedFromToken(_selectedFromToken);
      }

      setUsdAmount(
        DecimalHelper.isGreaterThan(cryptoAmount, 0)
          ? DecimalHelper.toString(
              DecimalHelper.multiply(cryptoAmount, _selectedFromToken?.price),
            )
          : '0',
      );
    } else if (toggle) {
      const _selectedFromToken = filteredTokens.find(
        token =>
          token.tokenContract === selectedFromToken?.tokenContract ||
          token.denom === selectedFromToken?.denom,
      );
      setSelectedFromToken(_selectedFromToken);
      setToggle(false);
    }

    if (!selectedToChain) setSelectedToChain(selectedFromChain);
  };

  useEffect(() => {
    if (selectedToChain) {
      // if from chains are same then it is odos swap both the from list and to list are same without the from token in the to list
      if (
        selectedFromChain &&
        selectedFromChain.chainId === selectedToChain.chainId &&
        selectedFromChain.isOdos &&
        selectedToChain.isOdos
      ) {
        // Set to token data same as from token data excluding selected from token
        const filteredToTokens = tokenData[selectedToChain.chainId]?.filter(
          token =>
            token.tokenContract !== selectedFromToken?.tokenContract &&
            token.isOdos,
        );
        setToTokenData(filteredToTokens);
        if (
          !filteredToTokens?.find(
            token => token.denom === selectedToToken?.denom,
          )
        ) {
          setSelectedToToken(filteredToTokens?.[0]);
        }
      } else if (
        selectedFromChain &&
        selectedFromChain.chainId === selectedToChain.chainId &&
        selectedFromChain.isSkip &&
        selectedToChain.isSkip
      ) {
        // Set to token data same as from token data excluding selected from token
        const filteredToTokens = tokenData[selectedToChain.chainId]?.filter(
          token => token.denom !== selectedFromToken?.denom && token.isSkip,
        );
        setToTokenData(filteredToTokens);
        if (
          !filteredToTokens?.find(
            token => token.denom === selectedToToken?.denom,
          )
        ) {
          setSelectedToToken(filteredToTokens?.[0]);
        }
      } else if (selectedFromChain) {
        let filteredToTokens = tokenData[selectedToChain.chainId] || [];
        // if the two chains are different then the tokens should be skip supported ones
        filteredToTokens = filteredToTokens.filter(token => {
          return token.isSkip;
        });

        if (
          !filteredToTokens?.find(
            token => token.denom === selectedToToken?.denom,
          )
        ) {
          setSelectedToToken(filteredToTokens?.[0]);
        }

        setToTokenData(filteredToTokens);
        // setSelectedToToken(filteredToTokens?.[0]);
      }
    }
  }, [selectedFromChain, selectedToChain, tokenData, selectedFromToken]);

  const resetValues = () => {
    setQuoteData(null);
    setError('');
    setUsdAmountOut('');
    setAmountOut('');
  };

  useEffect(() => {
    resetValues();
    setCryptoAmount('');
    setUsdAmount('');
  }, [selectedFromChain, selectedToChain, selectedFromToken, selectedToToken]);

  const onClickMax = async () => {
    setLoading(prev => ({
      ...prev,
      quoteLoading: true,
      maxAmountLoading: true,
    }));

    try {
      const isNativeToken = selectedFromToken?.isNative ?? false;
      const amount = selectedFromToken?.balanceDecimal;

      if (!amount) {
        throw new Error('Invalid amount');
      }

      // Calculate final balance first
      const selectedChainDetails = get(
        ChainNameToChainMapping,
        get(ChainIdToBackendNameMapping, selectedFromChain?.chainId),
      );

      // Get quote from API
      const response = isOdosSwap()
        ? await getSwapQuoteFromApi(amount)
        : await getBridgeQuoteFromApi(amount);
      const skipResponseQuoteData = response.data as SkipApiRouteResponse;
      const odosResponseQuoteData = response.data as OdosSwapQuoteResponse;

      if (response.isError) {
        handleQuoteError(response.error);
        return;
      }

      let gasFeeRequired;
      if (isOdosSwap()) {
        // Handle Odos swap gas calculation
        const gasPrice = get(response, ['data', 'gasInfo', 'gasPrice']);
        const gasLimit = get(response, ['data', 'data', 'gas']);
        const gasPriceInWei = parseGwei(gasPrice.toString()).toString();
        const totalGasFee = BigInt(gasLimit) * BigInt(gasPriceInWei);
        if (
          CAN_ESTIMATE_L1_FEE_CHAINS.includes(
            selectedChainDetails.backendName,
          ) &&
          isNativeToken
        ) {
          const gasFeeRequiredToReserve =
            await estimateReserveFeeForCustomContract({
              tokenData: nativeToken as any,
              fromAddress: hdWallet?.state?.wallet?.ethereum
                ?.address as `0x${string}`,
              toAddress: hdWallet?.state?.wallet?.ethereum
                ?.address as `0x${string}`,
              rpc: getWeb3Endpoint(selectedChainDetails, globalContext),
              gas: gasLimit,
              gasPrice,
              gasFeeInCrypto: DecimalHelper.toDecimal(
                DecimalHelper.multiply(gasLimit, gasPrice),
                9,
              ).toString(),
            });
          gasFeeRequired = DecimalHelper.add(
            DecimalHelper.multiply(
              formatUnits(totalGasFee, 18),
              GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
            ),
            gasFeeRequiredToReserve,
          );
        } else {
          gasFeeRequired = DecimalHelper.multiply(
            formatUnits(totalGasFee, 18),
            GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
          ).toString();
        }
      } else {
        // Handle Skip API gas calculation
        const routeResponse = response.data as SkipApiRouteResponse;
        const requiredAddresses = getAddress(
          routeResponse?.required_chain_addresses,
        );
        const skipApiMessages = await fetchSkipApiMessages(
          routeResponse,
          requiredAddresses,
        );

        if (COSMOS_CHAINS.includes(selectedChainDetails.chainName)) {
          // Handle Cosmos chain
          const cosmosContractData = get(skipApiMessages, [
            'data',
            'txs',
            0,
            'cosmos_tx',
          ]);
          const gasDetails = await estimateGasForCosmosCustomContractRest(
            selectedChainDetails,
            cosmosContractData,
          );
          gasFeeRequired = gasDetails?.gasFeeInCrypto;
        } else if (['solana'].includes(selectedChainDetails.chainName)) {
          const solanaContractData = get(skipApiMessages, [
            'data',
            'txs',
            0,
            'svm_tx',
            'tx',
          ]);
          const gasDetails =
            await estimateGasForSolanaCustomContract(solanaContractData);
          gasFeeRequired = gasDetails?.gasFeeInCrypto;
        } else {
          // Handle EVM chain
          const evmContractData = get(skipApiMessages, [
            'data',
            'txs',
            0,
            'evm_tx',
          ]);
          const publicClient = getViemPublicClient(
            getWeb3Endpoint(selectedChainDetails, globalContext),
          );

          const requiredErc20Approvals = get(
            evmContractData,
            'required_erc20_approvals',
            [],
          );

          // get Approval for EVM chains inorder to calculate the gas required
          // approval check and approval granting is only required for non-native tokens
          if (!isNativeToken) {
            const approvalResp = await handleTokenApprovals({
              publicClient,
              selectedFromToken,
              requiredErc20Approvals,
              selectedChainDetails,
              nativeToken,
              hdWallet,
              globalContext,
            });
            if (approvalResp?.isError) {
              setError(JSON.stringify(approvalResp?.error));
              return;
            }
          }

          if (
            CAN_ESTIMATE_L1_FEE_CHAINS.includes(
              selectedChainDetails.backendName,
            ) &&
            isNativeToken
          ) {
            gasFeeRequired = await estimateReserveFee({
              tokenData: nativeToken,
              fromAddress: hdWallet?.state?.wallet?.ethereum
                ?.address as `0x${string}`,
              toAddress: hdWallet?.state?.wallet?.ethereum
                ?.address as `0x${string}`,
              publicClient,
              rpc: getWeb3Endpoint(selectedChainDetails, globalContext),
            });
          } else {
            const gasDetails = await estimateGasForEvmCustomContract(
              selectedChainDetails,
              evmContractData,
              publicClient,
            );
            gasFeeRequired = DecimalHelper.multiply(
              gasDetails?.gasFeeInCrypto,
              1.1,
            );
          }
        }
      }

      if (!gasFeeRequired) {
        showModal('state', {
          type: 'error',
          title: t('GAS_FEE_ERROR'),
          description: t('GAS_FEE_ERROR_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      // Calculate final balance
      const bal = isNativeToken
        ? DecimalHelper.subtract(amount, gasFeeRequired)
        : DecimalHelper.fromString(amount);

      const { hasSufficientBalance, hasSufficientGasFee } =
        hasSufficientBalanceAndGasFee(
          isNativeToken,
          String(gasFeeRequired),
          nativeToken?.balanceDecimal,
          bal,
          selectedFromToken?.balanceDecimal,
        );

      const isBalanceAndGasFeeSufficient =
        hasSufficientBalance && hasSufficientGasFee;
      if (isBalanceAndGasFeeSufficient) {
        // Set a flag to prevent the useEffect from triggering another quote fetch
        const finalAmount = DecimalHelper.isLessThan(bal, 0)
          ? '0'
          : DecimalHelper.toString(bal);

        // Update the quote data directly here
        setQuoteData(response.data);
        if (isOdosSwap()) {
          setUsdAmount(
            DecimalHelper.toString(
              DecimalHelper.multiply(
                finalAmount,
                selectedFromToken?.price ?? 0,
              ),
            ),
          );
          setAmountOut(odosResponseQuoteData?.toToken?.amount.toString());
          setUsdAmountOut(odosResponseQuoteData?.value.toString());
          setError('');
        } else {
          setUsdAmount(skipResponseQuoteData.usd_amount_in);
          setAmountOut(
            formatUnits(
              skipResponseQuoteData?.amount_out,
              selectedToToken?.decimals,
            ),
          );
          setUsdAmountOut(skipResponseQuoteData?.usd_amount_out);
          setSignaturesRequired(skipResponseQuoteData?.txs_required);
          setError('');
        }
        setCurrentMaxAmount(finalAmount);

        // Set the crypto amount last to avoid triggering another quote fetch
        setCryptoAmount(finalAmount);
      } else {
        setError(
          t('GAS_ESTIMATION_FAILED_DESCRIPTION_WITH_LOAD_MORE', {
            tokenName: nativeToken?.name,
            chainName: selectedFromChain?.chainName,
            gasFeeRequired: formatAmount(gasFeeRequired),
          }),
        );
      }
    } catch (error) {
      setError(error?.message ?? 'An unexpected error occurred');
    } finally {
      setTimeout(() => {
        setLoading(prev => ({
          ...prev,
          quoteLoading: false,
          maxAmountLoading: false,
        }));
      }, 2500);
    }
  };

  const fetchQuote = async (amount: string): Promise<void> => {
    setLoading(prevLoading => ({ ...prevLoading, quoteLoading: true }));

    try {
      if (isOdosSwap()) {
        await getSwapQuote(amount);
      } else {
        await getBridgeQuote(amount);
      }

      setTimeUntilRefresh(30);
    } catch (e) {
      Sentry.captureException(e);
    } finally {
      setLoading(prevLoading => ({
        ...prevLoading,
        quoteLoading: false,
        maxAmountLoading: false,
      }));
    }
  };

  const debouncedFetchQuote = useCallback(
    debounce((amount: string) => {
      if (
        DecimalHelper.isGreaterThan(amount, 0) &&
        selectedFromChain &&
        selectedToChain &&
        selectedFromToken &&
        selectedToToken
      ) {
        void fetchQuote(amount);
      }
    }, 500),
    [selectedFromChain, selectedToChain, selectedFromToken, selectedToToken],
  );

  const manualRefreshQuote = useCallback(async () => {
    if (DecimalHelper.isGreaterThan(cryptoAmount, 0)) {
      if (quoteRefreshInterval.current) {
        clearInterval(quoteRefreshInterval.current);
        quoteRefreshInterval.current = null;
      }

      await fetchQuote(cryptoAmount);

      quoteRefreshInterval.current = setInterval(() => {
        void fetchQuote(cryptoAmount);
      }, 30000);
    }
  }, [cryptoAmount, selectedFromToken, selectedToToken]);

  useEffect(() => {
    const fetchAndUpdateQuote = () => {
      if (DecimalHelper.isGreaterThan(cryptoAmount, 0)) {
        // Only fetch quote if we don't already have quote data this chcek is added to prevent another quote fetching when already quote fetching is done when max is clicked (the or condition is to allow for quote fetching when the entered amount changes after clicking on max)
        if (
          DecimalHelper.notEqual(currentMaxAmount, cryptoAmount) ||
          !quoteData
        ) {
          resetValues();
          setUsdAmount(
            limitDecimalPlaces(
              DecimalHelper.multiply(cryptoAmount, selectedFromToken?.price),
              6,
            ),
          );

          debouncedFetchQuote(cryptoAmount);
        }
      } else {
        setLoading(prevLoading => ({ ...prevLoading, quoteLoading: false }));
      }
    };

    fetchAndUpdateQuote();

    if (DecimalHelper.isGreaterThan(cryptoAmount, 0)) {
      if (quoteRefreshInterval.current) {
        clearInterval(quoteRefreshInterval.current);
      }

      setTimeUntilRefresh(30);
      quoteRefreshInterval.current = setInterval(() => {
        void fetchQuote(cryptoAmount);
        setTimeUntilRefresh(30);
      }, 30000);

      const timerInterval = setInterval(() => {
        setTimeUntilRefresh(prev => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        clearInterval(timerInterval);
        if (quoteRefreshInterval.current) {
          clearInterval(quoteRefreshInterval.current);
          quoteRefreshInterval.current = null;
        }
      };
    }

    return () => {
      debouncedFetchQuote.cancel();
    };
  }, [
    cryptoAmount,
    selectedFromToken,
    selectedToToken,
    selectedFromChain,
    selectedToChain,
  ]);

  // Also clear interval when component unmounts
  useEffect(() => {
    return () => {
      if (quoteRefreshInterval.current) {
        clearInterval(quoteRefreshInterval.current);
        quoteRefreshInterval.current = null;
      }
    };
  }, []);

  const handleApprove = () => {
    setApproveModalVisible(false);
    if (modalPromiseResolver) {
      modalPromiseResolver(true);
      setModalPromiseResolver(null);
    }
  };

  const handleReject = () => {
    setApproveModalVisible(false);
    setLoading({
      ...loading,
      pageLoading: false,
      quoteLoading: false,
      acceptSwapLoading: false,
      swapLoading: false,
      bridgeGetMsg: false,
      approvalLoading: false,
      maxAmountLoading: false,
    });
    if (modalPromiseResolver) {
      modalPromiseResolver(false);
      setModalPromiseResolver(null);
    }
  };

  const showModalAndGetResponse = async (setter: any): Promise<boolean> => {
    return await new Promise<boolean>(resolve => {
      setModalPromiseResolver(() => resolve);
      setter(true);
    });
  };

  const getAddress = (chains: string[]) => {
    const addressList = chains.map(id => {
      const chainName = get(ChainIdNameMapping, id);
      const chain = get(hdWallet, ['state', 'wallet', chainName]);
      return chain.address;
    });
    return addressList;
  };

  const getBridgeQuoteFromApi = async (amount: string) => {
    const routeBody = {
      amountIn: DecimalHelper.toString(
        DecimalHelper.toInteger(
          DecimalHelper.round(amount, selectedFromToken.decimals),
          min([10, selectedFromToken.decimals]),
        ),
      ),
      sourceAssetDenom: selectedFromToken.denom,
      sourceAssetChainId: selectedFromToken.chainId,
      destAssetDenom: selectedToToken.denom,
      destAssetChainId: selectedToToken.chainId,
    };

    return await postWithAuth(
      '/v1/swap/bridge/quote',
      routeBody,
      DEFAULT_AXIOS_TIMEOUT,
    );
  };

  const handleQuoteError = (quoteError: any) => {
    setQuoteData(null);
    setAmountOut('');
    setUsdAmountOut('');
    setSignaturesRequired(0);
    setLoading(prev => ({ ...prev, quoteLoading: false }));

    if (isOdosSwap()) {
      if (quoteError instanceof Error && quoteError.name !== 'AbortError') {
        setQuoteData(null);
        showModal('state', {
          type: 'error',
          title: t('QUOTE_ERROR'),
          description: parseErrorMessage(quoteError) ?? t('UNEXPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void logAnalyticsToFirebase(AnalyticEvent.SWAP_QUOTE_ERROR, {
          error: quoteError,
        });
        Sentry.captureException(quoteError);
      }
    } else {
      if (
        quoteError?.message.includes('no routes') ||
        quoteError?.message.includes('transfer across') ||
        quoteError?.message.includes('bridge relay')
      ) {
        // Handle routing-specific errors
        if (quoteError?.message.includes('no routes')) {
          const fromIsUSDC = selectedFromToken?.symbol.toLowerCase() === 'usdc';
          const toIsUSDC = selectedToToken?.symbol.toLowerCase() === 'usdc';

          if (fromIsUSDC && !toIsUSDC) {
            setError(
              `Try bridging to USDC token instead of ${selectedToToken?.name}`,
            );
          } else if (!fromIsUSDC && toIsUSDC) {
            setError(
              `Try bridging from USDC token instead of ${selectedFromToken?.name}`,
            );
          } else if (!fromIsUSDC && !toIsUSDC) {
            setError(
              `Try bridging from USDC token in ${selectedFromChain?.chainName} to USDC token in ${selectedToChain?.chainName}`,
            );
          } else {
            setError(quoteError?.message);
          }
        } else {
          setError(quoteError?.message);
        }
      } else {
        // Handle other errors

        setError(quoteError?.message);
        void logAnalyticsToFirebase(AnalyticEvent.BRIDGE_QUOTE_ERROR, {
          error: quoteError,
        });
        Sentry.captureException(quoteError);
        showModal('state', {
          type: 'error',
          title: t('QUOTE_ERROR'),
          description:
            parseErrorMessage(quoteError) ?? t('QUOTE_ERROR_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedFromChain?.chainName ?? '',
          message: `Bridge Quote error: ${parseErrorMessage(quoteError) ?? String(quoteError)}`,
          screen: route.name,
          address: getSelectedChainAddress(),
          other: {
            selectedFromChain: selectedFromChain?.chainName,
            selectedToChain: selectedToChain?.chainName,
            selectedFromToken: selectedFromToken?.name,
            selectedToToken: selectedToToken?.name,
            selectedFromAmount: cryptoAmount,
            selectedToAmount: amountOut,
            selectedFromUsdAmount: usdAmount,
            selectedToUsdAmount: usdAmountOut,
          },
        });
      }
    }
  };

  const getBridgeQuote = async (amount: string) => {
    try {
      if (
        selectedFromToken &&
        selectedToToken &&
        selectedToChain &&
        selectedFromChain &&
        DecimalHelper.isGreaterThan(amount, 0) &&
        !isOdosSwap()
      ) {
        const {
          isError,
          error: quoteError,
          data,
        } = await getBridgeQuoteFromApi(amount);

        if (!isError) {
          const responseQuoteData = data as SkipApiRouteResponse;
          setQuoteData(responseQuoteData);
          setUsdAmount(responseQuoteData?.usd_amount_in);
          setAmountOut(
            formatUnits(
              BigInt(responseQuoteData?.amount_out),
              selectedToToken?.decimals,
            ),
          );
          setUsdAmountOut(responseQuoteData?.usd_amount_out);
          setSignaturesRequired(responseQuoteData?.txs_required);
          setError('');
          setLoading({ ...loading, quoteLoading: false });
        } else {
          handleQuoteError(quoteError);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        showModal('state', {
          type: 'error',
          title: t('QUOTE_ERROR'),
          description: parseErrorMessage(e) ?? t('UNEXPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void logAnalyticsToFirebase(AnalyticEvent.BRIDGE_QUOTE_ERROR, {
          error: e,
        });
        Sentry.captureException(e);
      }
    }
  };

  const fetchSkipApiMessages = async (
    routeResponse: SkipApiRouteResponse,
    requiredAddresses: string[],
  ) => {
    const body = {
      source_asset_denom: routeResponse.source_asset_denom,
      source_asset_chain_id: routeResponse.source_asset_chain_id,
      dest_asset_denom: routeResponse.dest_asset_denom,
      dest_asset_chain_id: routeResponse.dest_asset_chain_id,
      amount_in: routeResponse.amount_in,
      amount_out: routeResponse.amount_out,
      address_list: requiredAddresses,
      slippage_tolerance_percent: '1',
      operations: routeResponse.operations,
    };

    return await postToOtherSource(
      'https://api.skip.money/v2/fungible/msgs',
      body,
    );
  };

  const onGetMsg = async () => {
    if (
      !quoteData ||
      !selectedFromChain ||
      !selectedToChain ||
      !selectedFromToken ||
      !selectedToToken
    )
      return;

    setLoading({ ...loading, bridgeGetMsg: true });
    const routeResponse = quoteData as SkipApiRouteResponse;

    const requiredAddresses = getAddress(
      routeResponse.required_chain_addresses,
    );

    const _quoteData = quoteData as SkipApiRouteResponse;

    const id = genId();
    const activityData: ExchangeTransaction = {
      id,
      status: ActivityStatus.PENDING,
      type: ActivityType.BRIDGE,
      quoteId: uuidv4(),
      fromChain: selectedFromChain.chainName,
      toChain: selectedToChain.chainName,
      fromChainId: selectedFromChain.chainId,
      toChainId: selectedToChain.chainId,
      fromToken: selectedFromToken?.name,
      toToken: selectedToToken?.name,
      fromSymbol: selectedFromToken?.symbol,
      toSymbol: selectedToToken?.symbol,
      fromTokenLogoUrl: selectedFromToken?.logoUrl,
      toTokenLogoUrl: selectedToToken?.logoUrl,
      fromChainLogoUrl: selectedFromChain.logoUrl,
      toChainLogoUrl: selectedToChain.logoUrl,
      fromTokenAmount: formatUnits(
        BigInt(_quoteData?.amount_in),
        selectedFromToken.decimals,
      ).toString(),
      toTokenAmount: formatUnits(
        BigInt(_quoteData?.amount_out),
        selectedToToken.decimals,
      ).toString(),
      datetime: new Date(),
      transactionHash: '',
      quoteData: {
        fromAmountUsd: _quoteData?.usd_amount_in,
        toAmountUsd: _quoteData?.usd_amount_out,
        gasFee: '',
      },
    };
    activityId.current = id;
    let transactionHash = '';

    try {
      const {
        isError,
        error: fetchError,
        data,
      } = await fetchSkipApiMessages(routeResponse, requiredAddresses);

      if (isError) {
        Sentry.captureException(fetchError);
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedFromChain.chainName,
          message: parseErrorMessage(fetchError),
          screen: route.name,
          address: getSelectedChainAddress(),
          other: {
            selectedFromChain: selectedFromChain?.chainName,
            selectedToChain: selectedToChain?.chainName,
            selectedFromToken: selectedFromToken?.name,
            selectedToToken: selectedToToken?.name,
            selectedFromAmount: cryptoAmount,
            selectedToAmount: amountOut,
            selectedFromUsdAmount: usdAmount,
            selectedToUsdAmount: usdAmountOut,
          },
        });
        showModal('state', {
          type: 'error',
          title: t('FETCH_SKIP_API_ERROR'),
          description: parseErrorMessage(fetchError),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
        return;
      }

      activityData.status = ActivityStatus.INPROCESS;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityData,
      });

      const txnFunctions = [evmTxnMsg, cosmosTxnMsg, solanaTxnMsg];

      for (const txnFunc of txnFunctions) {
        const hash = await txnFunc(data);
        if ((isEmpty(transactionHash) || isNil(transactionHash)) && hash) {
          transactionHash = hash;
        }
      }

      setLoading({ ...loading, bridgeGetMsg: false });
      showModal('state', {
        type: 'success',
        title: t('BRIDGE_SUCCESS'),
        description: t('BRIDGE_SUCCESS_DESCRIPTION'),
        onSuccess: () => {
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityData.id,
              status: ActivityStatus.SUCCESS,
              transactionHash,
            },
          });
          navigateToPortfolio();
        },
        onFailure: navigateToPortfolio,
      });

      void logAnalyticsToFirebase(AnalyticEvent.BRIDGE_SUCCESS);
      void refreshPortfolio();
    } catch (e: unknown) {
      const errMsg = parseErrorMessage(e);
      activityContext.dispatch({
        type: ActivityReducerAction.PATCH,
        value: {
          id: activityData.id,
          status: ActivityStatus.FAILED,
          reason: JSON.stringify(errMsg),
        },
      });
      setLoading({ ...loading, bridgeGetMsg: false });
      showModal('state', {
        type: 'error',
        title: t('BRIDGE_ERROR'),
        description: parseErrorMessage(e) ?? t('BRIDGE_ERROR_DESCRIPTION'),
        onSuccess: navigateToPortfolio,
        onFailure: navigateToPortfolio,
      });

      if (!errMsg.includes('reject')) {
        void logAnalyticsToFirebase(AnalyticEvent.BRIDGE_ERROR, {
          error: e,
        });
        Sentry.captureException(e);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedFromChain.chainName,
          message: parseErrorMessage(e),
          screen: route.name,
          address: getSelectedChainAddress(),
          other: {
            selectedFromChain: selectedFromChain?.chainName,
            selectedToChain: selectedToChain?.chainName,
            selectedFromToken: selectedFromToken?.name,
            selectedToToken: selectedToToken?.name,
            selectedFromAmount: cryptoAmount,
            selectedToAmount: amountOut,
            selectedFromUsdAmount: usdAmount,
            selectedToUsdAmount: usdAmountOut,
          },
        });
      }
    }
  };

  // bridge
  const evmTxnMsg = async (data: SkipApiSignMsg) => {
    if (selectedFromToken && fromChainDetails) {
      try {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(fromChainDetails, globalStateContext),
        );
        const txs = data.txs;
        let firstHash = null;

        for (const tx of txs) {
          const evmTx = get(tx, 'evm_tx');
          if (evmTx) {
            setEvmTxnParams(evmTx);
            const evmResponse = await skipApiApproveAndSignEvm({
              publicClient,
              evmTx,
              selectedFromToken,
              walletAddress: ethereumAddress as `0x${string}`,
              setApproveModalVisible,
              showModalAndGetResponse,
              setApproveParams,
              setEvmModalVisible,
            });
            if (
              !evmResponse?.isError &&
              evmResponse?.hash &&
              evmResponse.chainId
            ) {
              setSignaturesRequired(prev => prev - 1);
              await trackSign(evmResponse.hash, evmResponse.chainId);
              if (firstHash === null) {
                firstHash = evmResponse.hash;
              }
            } else {
              throw new Error(
                evmResponse?.error ?? 'Error processing Evm transaction',
              );
            }
          }
        }

        return firstHash;
      } catch (e: any) {
        if (!e.message.includes('User denied transaction signature.')) {
          Sentry.captureException(e);
        }
        throw new Error(e?.message ?? JSON.stringify(e));
      }
    }
  };

  // bridge
  const cosmosTxnMsg = async (data: SkipApiSignMsg) => {
    const txs = data.txs;
    let hash = null;
    for (const tx of txs) {
      const cosmosTx = get(tx, 'cosmos_tx');
      if (cosmosTx) {
        setCosmosTxnParams(cosmosTx);
        try {
          const cosmosResponse = await skipApiSignAndBroadcast({
            cosmosTx,
            chain: cosmosTx.chain_id,
            showModalAndGetResponse,
            setCosmosModalVisible,
          });

          if (
            !cosmosResponse?.isError &&
            cosmosResponse?.hash &&
            cosmosResponse.chainId
          ) {
            setSignaturesRequired(prev => prev - 1);
            await trackSign(cosmosResponse.hash, cosmosResponse.chainId);
            if (hash === null) {
              hash = cosmosResponse.hash;
            }
          } else {
            throw new Error(cosmosResponse.error);
          }
        } catch (e: unknown) {
          const errMsg = parseErrorMessage(e);
          if (e instanceof Error && !errMsg.includes('reject')) {
            Sentry.captureException(e);
          }
          throw new Error(errMsg);
        }
      }
    }

    return hash;
  };

  const solanaTxnMsg = async (data: SkipApiSignMsg) => {
    const txs = data.txs;
    let hash = null;
    for (const tx of txs) {
      const svmTx = get(tx, 'svm_tx');
      if (svmTx) {
        try {
          const solanaResponse = await skipApiSignAndApproveSolana({
            svmTx,
            showModalAndGetResponse,
            setSolanaModalVisible,
            setSolanaTxnParams,
          });
          if (
            !solanaResponse?.isError &&
            solanaResponse?.txn &&
            solanaResponse.chainId
          ) {
            setSignaturesRequired(prev => prev - 1);
            const solanaHash = await submitSign(
              solanaResponse.txn,
              solanaResponse.chainId,
            );
            if (hash === null) {
              hash = solanaHash;
            }
          } else {
            throw new Error(solanaResponse.error);
          }
        } catch (e: any) {
          if (!e.message.includes('User denied transaction signature.')) {
            Sentry.captureException(e);
          }
          throw new Error(e?.message ?? JSON.stringify(e));
        }
      }
    }

    return hash;
  };

  const submitSign = async (txn: string, chainID: string) => {
    const body = {
      tx: txn,
      chain_id: chainID,
    };
    try {
      const {
        isError,
        error: fetchError,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        data: { tx_hash },
      } = await postToOtherSource('https://api.skip.money/v2/tx/submit', body);

      if (isError) {
        showModal('state', {
          type: 'error',
          title: t('FETCH_SKIP_API_ERROR'),
          description: JSON.stringify(fetchError),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
      } else {
        await trackStatus(tx_hash, chainID, true);
        return tx_hash;
      }
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('UNEXPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: navigateToPortfolio,
        onFailure: navigateToPortfolio,
      });
    }
  };

  // bridge
  const trackSign = async (hash: string, chainID: string) => {
    const body = {
      tx_hash: hash,
      chain_id: chainID,
    };
    try {
      const { isError, error: fetchError } = await postToOtherSource(
        'https://api.skip.money/v2/tx/track',
        body,
      );
      if (isError) {
        showModal('state', {
          type: 'error',
          title: t('FETCH_SKIP_API_ERROR'),
          description: JSON.stringify(fetchError),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
      } else {
        await trackStatus(hash, chainID, true);
      }
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('UNEXPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: navigateToPortfolio,
        onFailure: navigateToPortfolio,
      });
    }
  };

  // bridge
  const trackStatus = async (
    hash: string,
    chainID: string,
    append: boolean,
  ) => {
    try {
      const {
        isError,
        error: fetchError,
        data,
      } = await getFromOtherSource(
        `https://api.skip.money/v2/tx/status?tx_hash=${hash}&chain_id=${chainID}`,
        DEFAULT_AXIOS_TIMEOUT,
      );

      if (isError) {
        showModal('state', {
          type: 'error',
          title: t('FETCH_SKIP_API_ERROR'),
          description: JSON.stringify(fetchError),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
      } else {
        let tempData;
        if (data.transfer_sequence.length > 0) {
          tempData = data.transfer_sequence.map((item: any) => {
            return { state: data.state, transfer_sequence: item };
          });
        } else {
          tempData = [{ state: data.state, transfer_sequence: null }];
        }
        if (data && append) {
          setSkipApiStatusResponse(prevResp => [...prevResp, ...tempData]);
        } else {
          setSkipApiStatusResponse(prevResp => {
            const arrayLength = prevResp.length;
            const tempDataLength = prevResp.filter(
              item =>
                item.state === TxnStatus.STATE_PENDING ||
                item.state === TxnStatus.STATE_SUBMITTED,
            ).length;
            if (arrayLength > 0) {
              return [
                ...prevResp.slice(0, arrayLength - tempDataLength),
                ...tempData,
              ];
            } else {
              return [...tempData];
            }
          });
        }
        if (
          data?.state &&
          (data.state === TxnStatus.STATE_PENDING ||
            data.state === TxnStatus.STATE_SUBMITTED)
        ) {
          await setTimeOutNSec(2000);
          await trackStatus(hash, chainID, false);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showModal('state', {
          type: 'error',
          title: t('UNEXPECTED_ERROR'),
          description: err?.message ?? JSON.stringify(err),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
      }
    }
  };

  const isOdosSwap = () => {
    if (
      selectedFromChain &&
      selectedToChain &&
      selectedFromChain.chainId === selectedToChain.chainId &&
      selectedFromChain.chainName === selectedToChain.chainName &&
      selectedFromChain.isOdos &&
      selectedToChain.isOdos &&
      selectedFromToken?.isOdos &&
      selectedToToken?.isOdos
    ) {
      return true;
    }
    return false;
  };

  const isSkipSwap = () => {
    if (
      selectedFromChain &&
      selectedToChain &&
      selectedFromChain.chainId === selectedToChain.chainId &&
      selectedFromChain.chainName === selectedToChain.chainName &&
      selectedFromChain.isSkip &&
      selectedToChain.isSkip &&
      selectedFromToken?.isSkip &&
      selectedToToken?.isSkip
    ) {
      return true;
    }
    return false;
  };

  const isPreviewDisabled = () => {
    if (
      selectedFromToken &&
      selectedToToken &&
      selectedFromChain &&
      selectedToChain
    ) {
      return (
        DecimalHelper.isGreaterThan(
          cryptoAmount,
          selectedFromToken.balanceDecimal,
        ) ||
        isNil(quoteData) ||
        !isEmpty(error)
      );
    } else {
      return true;
    }
  };

  const getSwapQuoteFromApi = async (amount: string) => {
    const payload = {
      fromTokenList: [
        {
          address: selectedFromToken?.isNative
            ? '0x0000000000000000000000000000000000000000'
            : selectedFromToken?.tokenContract,
          amount: limitDecimalPlaces(amount, selectedFromToken.decimals),
        },
      ],
      toToken: selectedToToken.isNative
        ? '0x0000000000000000000000000000000000000000'
        : selectedToToken.tokenContract,
      slippage,
      walletAddress: ethereumAddress,
    };

    const response = await postWithAuth(
      `/v1/swap/evm/chains/${selectedFromChain?.chainId ?? ''}/quote`,
      payload,
      DEFAULT_AXIOS_TIMEOUT,
    );

    return response;
  };

  const getSwapQuote = async (amount: string) => {
    try {
      if (
        selectedToToken &&
        selectedFromToken &&
        selectedToChain &&
        selectedFromChain &&
        isOdosSwap()
      ) {
        const response = await getSwapQuoteFromApi(amount);

        if (!response.isError) {
          const responseQuoteData = response.data as OdosSwapQuoteResponse;
          setUsdAmount(
            DecimalHelper.multiply(
              responseQuoteData?.fromToken?.[0].amount.toString(),
              selectedFromToken?.price ?? 0,
            ).toString(),
          );
          setAmountOut(responseQuoteData?.toToken?.amount.toString());
          setUsdAmountOut(responseQuoteData?.value.toString());
          setQuoteData(responseQuoteData);
          setError('');
          setLoading({ ...loading, quoteLoading: false });
        } else {
          setQuoteData(null);
          setError(response?.error?.error?.message);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setQuoteData(null);
        showModal('state', {
          type: 'error',
          title: t('QUOTE_ERROR'),
          description: parseErrorMessage(err) ?? t('UNEXPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void logAnalyticsToFirebase(AnalyticEvent.SWAP_QUOTE_ERROR, {
          error: err,
        });
        Sentry.captureException(err);
      }
    }
  };

  const onAcceptSwap = async () => {
    if (
      selectedToToken &&
      selectedFromToken &&
      selectedToChain &&
      selectedFromChain &&
      quoteData
    ) {
      try {
        const response = quoteData as OdosSwapQuoteResponse;
        const routerAddress = response.router;
        setLoading({ ...loading, acceptSwapLoading: true });

        if (fromChainDetails) {
          const publicClient = getViemPublicClient(
            getWeb3Endpoint(fromChainDetails, globalStateContext),
          );

          if (!selectedFromToken.isNative) {
            const allowanceResp = await checkIfAllowanceIsEnough({
              publicClient,
              tokenContractAddress:
                selectedFromToken.tokenContract as `0x${string}`,
              routerAddress: routerAddress as `0x${string}`,
              amount: parseUnits(
                cryptoAmount,
                selectedFromToken?.decimals,
              ).toString(),
            });

            if (!allowanceResp.isError) {
              if (!allowanceResp.hasEnoughAllowance) {
                const contractData = encodeFunctionData({
                  abi: allowanceApprovalContractABI,
                  functionName: 'approve',
                  args: [routerAddress as `0x${string}`, allowanceResp.tokens],
                });

                setApproveParams({
                  tokens: allowanceResp.tokens.toString(),
                  contractAddress: routerAddress,
                });

                const approveGranted = await showModalAndGetResponse(
                  setApproveModalVisible,
                );
                if (approveGranted) {
                  const approvalResp = await executeApprovalRevokeContract({
                    publicClient,
                    tokenContractAddress:
                      selectedFromToken.tokenContract as `0x${string}`,
                    walletAddress: (ethereumAddress ?? '') as `0x${string}`,
                    contractData,
                    chainDetails: fromChainDetails,
                    tokens: allowanceResp.tokens,
                    isErc20: !selectedFromToken.isNative,
                  });

                  if (approvalResp.isError) {
                    setLoading({ ...loading, acceptSwapLoading: false });
                    return {
                      isError: true,
                      error: 'Error approving allowance',
                    };
                  }
                }
              }
            } else {
              return { isError: true, error: allowanceResp.error };
            }
          }
          let gasFeeETH = '';
          let gasFeeDollar = '';
          const gasLimit = DecimalHelper.multiply(
            get(response, ['gasEstimate']),
            ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR,
          );

          let finalGasPrice;
          const gasFeeResponse = response?.gasInfo;
          if (gasFeeResponse && gasFeeResponse?.gasPrice > 0) {
            finalGasPrice = gasFeeResponse.gasPrice;

            if (finalGasPrice) {
              const gasPriceInWei = parseGwei(finalGasPrice.toString());
              gasFeeETH = DecimalHelper.multiply(
                formatEther(gasPriceInWei),
                gasLimit,
              ).toString();
            }

            if (gasFeeResponse.tokenPrice > 0) {
              const ethPrice = gasFeeResponse.tokenPrice;
              gasFeeDollar = DecimalHelper.multiply(
                gasFeeETH,
                ethPrice,
              ).toString();
            }
          }

          setSwapParams({
            gasFeeETH,
            gasFeeDollar,
          });
          setLoading({ ...loading, acceptSwapLoading: false });
          setSignModalVisible(true);
        } else {
          throw new Error('Invalid chain');
        }
      } catch (err: unknown) {
        setLoading({ ...loading, acceptSwapLoading: false });
        showModal('state', {
          type: 'error',
          title: t('UNEXPECTED_ERROR'),
          description: parseErrorMessage(err) ?? JSON.stringify(err),
          onSuccess: navigateToPortfolio,
          onFailure: navigateToPortfolio,
        });
        Sentry.captureException(err);
      }
    }
  };

  const onConfirmSwap = async () => {
    try {
      if (
        selectedToToken &&
        selectedFromToken &&
        selectedToChain &&
        selectedFromChain &&
        fromChainDetails &&
        isOdosSwap()
      ) {
        setLoading({ ...loading, swapLoading: true });
        const _quoteData = quoteData as OdosSwapQuoteResponse;
        const id = genId();
        const activityData: ExchangeTransaction = {
          id,
          status: ActivityStatus.PENDING,
          type: ActivityType.SWAP,
          quoteId: uuidv4(),
          fromChain: selectedFromChain.chainName,
          toChain: selectedToChain.chainName,
          fromChainId: selectedFromChain.chainId,
          toChainId: selectedToChain.chainId,
          fromToken: selectedFromToken?.name,
          toToken: selectedToToken?.name,
          fromSymbol: selectedFromToken?.symbol,
          toSymbol: selectedToToken?.symbol,
          fromTokenLogoUrl: selectedFromToken?.logoUrl,
          toTokenLogoUrl: selectedToToken?.logoUrl,
          fromChainLogoUrl: selectedFromChain?.logoUrl,
          toChainLogoUrl: selectedToChain?.logoUrl,
          fromTokenAmount: limitDecimalPlaces(cryptoAmount, 3),
          toTokenAmount: _quoteData?.toToken?.amount.toString(),
          datetime: new Date(),
          transactionHash: '',
          quoteData: {
            fromAmountUsd: DecimalHelper.toNumber(
              DecimalHelper.multiply(
                cryptoAmount,
                selectedFromToken?.price ?? 0,
              ),
            ),
            toAmountUsd: _quoteData?.value,
            gasFee: _quoteData?.gasEstimateValue,
          },
        };
        activityId.current = id;

        setSignModalVisible(false);

        activityContext.dispatch({
          type: ActivityReducerAction.POST,
          value: activityData,
        });

        const response = await swapTokens({
          quoteData: _quoteData,
          chainDetails: fromChainDetails,
        });

        if (!response.isError) {
          resetAndSetIndex();
          setLoading({ ...loading, swapLoading: false });
          showModal('state', {
            type: 'success',
            title: t('SWAP_SUCCESS'),
            description: t('SWAP_SUCCESS_DESCRIPTION'),
            onSuccess: () => {
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityData.id,
                  transactionHash: response?.hash ?? '',
                  status: ActivityStatus.SUCCESS,
                },
              });
              navigateToPortfolio();
            },
            onFailure: navigateToPortfolio,
          });
          void logAnalytics({
            type: AnalyticsType.SUCCESS,
            txnHash: response.hash,
            chain: selectedFromChain.chainName,
            address: getSelectedChainAddress(),
            other: {
              selectedFromChain: selectedFromChain?.chainName,
              selectedToChain: selectedToChain?.chainName,
              selectedFromToken: selectedFromToken?.name,
              selectedToToken: selectedToToken?.name,
              selectedFromAmount: cryptoAmount,
              selectedToAmount: amountOut,
              selectedFromUsdAmount: usdAmount,
              selectedToUsdAmount: usdAmountOut,
            },
          });
          void logAnalyticsToFirebase(AnalyticEvent.SWAP_SUCCESS);
          void refreshPortfolio();
        } else {
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityData.id,
              status: ActivityStatus.FAILED,
            },
          });
          setLoading({ ...loading, swapLoading: false });
          showModal('state', {
            type: 'error',
            title: t('SWAP_ERROR'),
            description:
              parseErrorMessage(response.error) ?? t('SWAP_ERROR_DESCRIPTION'),
            onSuccess: navigateToPortfolio,
            onFailure: navigateToPortfolio,
          });
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.ERROR,
            chain: selectedFromChain.chainName,
            message: parseErrorMessage(response.error),
            screen: route.name,
            address: getSelectedChainAddress(),
            other: {
              selectedFromChain: selectedFromChain?.chainName,
              selectedToChain: selectedToChain?.chainName,
              selectedFromToken: selectedFromToken?.name,
              selectedToToken: selectedToToken?.name,
              selectedFromAmount: cryptoAmount,
              selectedToAmount: amountOut,
              selectedFromUsdAmount: usdAmount,
              selectedToUsdAmount: usdAmountOut,
            },
          });
          void logAnalyticsToFirebase(AnalyticEvent.SWAP_ERROR, {
            error: response.error,
          });
          Sentry.captureException(response.error);
        }
      } else {
        throw new Error('Chain details not found');
      }
    } catch (err: unknown) {
      setLoading({ ...loading, swapLoading: false });
      showModal('state', {
        type: 'error',
        title: t('SWAP_ERROR'),
        description: parseErrorMessage(err) ?? t('SWAP_ERROR_DESCRIPTION'),
        onSuccess: navigateToPortfolio,
        onFailure: navigateToPortfolio,
      });
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedFromChain?.chainName ?? '',
        message: parseErrorMessage(err),
        screen: route.name,
        address: getSelectedChainAddress(),
        other: {
          selectedFromChain: selectedFromChain?.chainName,
          selectedToChain: selectedToChain?.chainName,
          selectedFromToken: selectedFromToken?.name,
          selectedToToken: selectedToToken?.name,
          selectedFromAmount: cryptoAmount,
          selectedToAmount: amountOut,
          selectedFromUsdAmount: usdAmount,
          selectedToUsdAmount: usdAmountOut,
        },
      });
      void logAnalyticsToFirebase(AnalyticEvent.SWAP_ERROR, {
        error: err,
      });
      Sentry.captureException(err);
    }
  };

  const onToggle = () => {
    setToggle(true);
    resetValues();
    const oldFromChain = selectedFromChain;
    const oldFromToken = selectedFromToken;
    const oldToChain = selectedToChain;
    const oldToToken = selectedToToken;

    setSelectedFromToken(oldToToken);
    setSelectedToToken(oldFromToken);
    setSelectedFromChain(oldToChain);
    setSelectedToChain(oldFromChain);
  };

  const resetAndSetIndex = () => {
    setIndex(0);
    setSkipApiStatusResponse([]);
    setCryptoAmount('');
    setUsdAmount('');
    setAmountOut('');
    setUsdAmountOut('');
    setEvmTxnParams(null);
    setCosmosTxnParams(null);
    setSolanaTxnParams(null);
    setApproveParams(null);
    setSwapParams({
      gasFeeETH: '0',
      gasFeeDollar: '0',
    });
    setQuoteData(null);
    setError('');
    setSignaturesRequired(0);
  };

  // Modify the preview button click handler
  const handlePreviewClick = async () => {
    try {
      setLoading(prevLoading => ({ ...prevLoading, quoteLoading: true }));

      // First get quote and store it
      let quoteResponse;
      if (isOdosSwap()) {
        quoteResponse = await getSwapQuoteFromApi(cryptoAmount);
      } else {
        quoteResponse = await getBridgeQuoteFromApi(cryptoAmount);
      }

      if (quoteResponse.isError) {
        handleQuoteError(quoteResponse.error);
        return;
      }

      // Store quote data for later use
      setQuoteData(quoteResponse.data);

      // Now check balance and estimate gas using the quote data
      try {
        const isNativeToken = selectedFromToken?.isNative ?? false;

        // Get chain details and calculate gas fee
        const selectedChainDetails = get(
          ChainNameToChainMapping,
          get(ChainIdToBackendNameMapping, selectedFromChain?.chainId),
        );

        let gasFeeRequired;
        if (isOdosSwap()) {
          // Handle Odos swap gas calculation

          const gasPriceDetail = get(quoteResponse, [
            'data',
            'gasInfo',
            'gasPrice',
          ]);
          const gasLimit = get(quoteResponse, ['data', 'gasEstimate']);
          const gasPriceWei = parseUnits(gasPriceDetail.toString(), 9);
          const totalWei = DecimalHelper.multiply(gasLimit, gasPriceWei);

          gasFeeRequired = DecimalHelper.multiply(
            formatUnits(BigInt(totalWei.toFixed(0)), 18),
            GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
          ).toString();
        } else {
          // Handle Skip API gas calculation
          const routeResponse = quoteResponse.data as SkipApiRouteResponse;
          const requiredAddresses = getAddress(
            routeResponse?.required_chain_addresses,
          );
          const skipApiMessages = await fetchSkipApiMessages(
            routeResponse,
            requiredAddresses,
          );

          if (COSMOS_CHAINS.includes(selectedChainDetails.chainName)) {
            // Handle Cosmos chain
            const cosmosContractData = get(skipApiMessages, [
              'data',
              'txs',
              0,
              'cosmos_tx',
            ]);
            const gasDetails = await estimateGasForCosmosCustomContractRest(
              selectedChainDetails,
              cosmosContractData,
            );
            gasFeeRequired = gasDetails?.gasFeeInCrypto;
          } else if (['solana'].includes(selectedChainDetails.chainName)) {
            const solanaContractData = get(skipApiMessages, [
              'data',
              'txs',
              0,
              'svm_tx',
              'tx',
            ]);
            const gasDetails =
              await estimateGasForSolanaCustomContract(solanaContractData);
            gasFeeRequired = gasDetails?.gasFeeInCrypto;
          } else {
            // Handle EVM chain
            const evmContractData = get(skipApiMessages, [
              'data',
              'txs',
              0,
              'evm_tx',
            ]);
            const publicClient = getViemPublicClient(
              getWeb3Endpoint(selectedChainDetails, globalContext),
            );

            const requiredErc20Approvals = get(
              evmContractData,
              'required_erc20_approvals',
              [],
            );
            // approval check and approval granting is only required for non-native tokens
            if (!isNativeToken) {
              const approvalResp = await handleTokenApprovals({
                publicClient,
                selectedFromToken,
                requiredErc20Approvals,
                selectedChainDetails,
                nativeToken,
                hdWallet,
                globalContext,
              });
              if (approvalResp?.isError) {
                setError(JSON.stringify(approvalResp?.error));
                return;
              }
            }

            if (
              CAN_ESTIMATE_L1_FEE_CHAINS.includes(
                selectedChainDetails.backendName,
              ) &&
              isNativeToken
            ) {
              gasFeeRequired = await estimateReserveFee({
                tokenData: nativeToken,
                fromAddress: hdWallet.state.wallet.ethereum
                  .address as `0x${string}`,
                toAddress: hdWallet.state.wallet.ethereum
                  .address as `0x${string}`,
                publicClient,
                rpc: getWeb3Endpoint(selectedChainDetails, globalContext),
              });
            } else {
              const gasDetails = await estimateGasForEvmCustomContract(
                selectedChainDetails,
                evmContractData,
                publicClient,
              );
              gasFeeRequired = gasDetails?.gasFeeInCrypto;
            }
          }
        }

        if (!gasFeeRequired) {
          showModal('state', {
            type: 'error',
            title: t('GAS_FEE_ERROR'),
            description: t('GAS_FEE_ERROR_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }

        // Calculate final balance and check if sufficient
        const bal = isNativeToken
          ? DecimalHelper.subtract(cryptoAmount, gasFeeRequired)
          : DecimalHelper.fromString(cryptoAmount);

        const { hasSufficientBalance, hasSufficientGasFee } =
          hasSufficientBalanceAndGasFee(
            isNativeToken,
            gasFeeRequired.toString(),
            nativeToken?.balanceDecimal,
            bal,
            selectedFromToken?.balanceDecimal,
          );

        const isBalanceAndGasFeeSufficient =
          hasSufficientBalance && hasSufficientGasFee;

        if (!isBalanceAndGasFeeSufficient) {
          setError(
            t('GAS_ESTIMATION_FAILED_DESCRIPTION_WITH_LOAD_MORE', {
              tokenName: nativeToken?.name,
              chainName: selectedFromChain?.chainName,
              gasFeeRequired: formatAmount(gasFeeRequired),
            }),
          );
          return;
        }

        // If all checks pass, proceed with the transaction
        if (isOdosSwap()) {
          isSignableTransaction(ActivityType.SWAP, () => {
            void onAcceptSwap();
          });
        } else {
          setSkipApiStatusResponse([]);
          setIndex(1);
        }
      } catch (error) {
        setError(parseErrorMessage(error) || 'An unexpected error occurred');
      }
    } catch (error) {
      setError(parseErrorMessage(error) || 'An unexpected error occurred');
    } finally {
      setLoading(prevLoading => ({ ...prevLoading, quoteLoading: false }));
    }
  };

  const handleTokenApprovals = async ({
    publicClient,
    selectedFromToken,
    requiredErc20Approvals,
    selectedChainDetails,
    nativeToken,
    hdWallet,
    globalContext,
  }: {
    publicClient: PublicClient;
    selectedFromToken: any;
    requiredErc20Approvals: any[];
    selectedChainDetails: any;
    nativeToken: any;
    hdWallet: any;
    globalContext: any;
  }) => {
    for (const approval of requiredErc20Approvals) {
      const allowanceResp = await checkIfAllowanceIsEnough({
        publicClient,
        tokenContractAddress: get(
          approval,
          'token_contract',
          '',
        ) as `0x${string}`,
        routerAddress: get(approval, 'spender', '') as `0x${string}`,
        amount: get(approval, 'amount', '').toString(),
      });

      if (!allowanceResp.isError) {
        if (!allowanceResp.hasEnoughAllowance) {
          const contractData = encodeFunctionData({
            abi: allowanceApprovalContractABI,
            functionName: 'approve',
            args: [
              get(approval, 'spender', '') as `0x${string}`,
              allowanceResp.tokens,
            ],
          });

          const gasFeeResponse = await getGasPrice(
            selectedChainDetails.backendName,
            publicClient,
          );

          const gasLimit = await publicClient.estimateGas({
            account: ethereumAddress as `0x${string}`,
            to: approval.token_contract as `0x${string}`,
            value: parseEther('0'),
            data: contractData,
          });

          let gasFeeReserveRequired: number | Decimal = 0;
          if (
            CAN_ESTIMATE_L1_FEE_CHAINS.includes(
              selectedChainDetails.backendName,
            )
          ) {
            gasFeeReserveRequired = await estimateReserveFeeForCustomContract({
              tokenData: nativeToken,
              fromAddress: ethereumAddress,
              toAddress: get(approval, 'spender', ''),
              rpc: getWeb3Endpoint(selectedChainDetails, globalContext),
              gas: toHex(gasLimit),
              gasPrice: gasFeeResponse?.gasPrice,
              gasFeeInCrypto: DecimalHelper.toDecimal(
                DecimalHelper.multiply(gasLimit, gasFeeResponse?.gasPrice),
                9,
              ).toString(),
            });
          }

          const gasCostForApproval = DecimalHelper.toDecimal(
            DecimalHelper.multiply(gasLimit, gasFeeResponse?.gasPrice),
            9,
          );

          if (
            DecimalHelper.isGreaterThan(
              DecimalHelper.add(gasCostForApproval, gasFeeReserveRequired),
              nativeToken?.balanceDecimal,
            )
          ) {
            throw new Error(
              `Insufficient ${nativeToken?.name} tokens in ${capitalize(selectedChainDetails.backendName)} chain for Bridge approval. Load more ${nativeToken?.name} tokens and try again.`,
            );
          }

          setApproveParams({
            tokens: allowanceResp.tokens.toString(),
            contractAddress: get(approval, 'spender', ''),
          });

          const approveGranted = await showModalAndGetResponse(
            setApproveModalVisible,
          );

          if (approveGranted) {
            const approvalResp = await executeApprovalRevokeContract({
              publicClient,
              tokenContractAddress: get(approval, 'token_contract', ''),
              contractData,
              chainDetails: selectedChainDetails,
              tokens: allowanceResp.tokens,
              walletAddress: ethereumAddress as `0x${string}`,
              isErc20: !selectedFromToken.isNative,
            });

            if (approvalResp.isError) {
              return {
                isError: true,
                error: 'Error approving allowance',
              };
            }
          } else {
            return {
              isError: true,
              error: 'Token approvel rejected by user',
            };
          }
        }
      } else {
        return {
          isError: true,
          error: allowanceResp.error,
        };
      }
    }
  };

  // Update the useEffect that was watching for input changes to just reset error state
  useEffect(() => {
    setError('');
  }, [
    cryptoAmount,
    selectedFromToken,
    selectedToToken,
    selectedFromChain,
    selectedToChain,
  ]);

  if (loading.pageLoading || bridgeState.status === BridgeStatus.FETCHING) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className='mb-[45px] bg-n20 flex-1'>
      <CyDKeyboardAwareScrollView>
        <CyDView
          className={clsx(
            'flex flex-row justify-between items-center px-[16px] mt-[16px]',
            {
              'mb-[40px]': index === 1,
            },
          )}>
          {(index === 1 || routeParamsBackVisible) && (
            <CyDTouchView
              className=''
              onPress={() => {
                routeParamsBackVisible && index === 0
                  ? navigation.goBack()
                  : resetAndSetIndex();
              }}>
              <CyDIcons name='arrow-left' size={24} className='text-base400' />
            </CyDTouchView>
          )}
          <CyDText className='text-base400 font-extrabold text-[28px] font-manrope'>
            {index === 1 ? 'Preview' : 'Bridge'}
          </CyDText>
          <CyDView />
        </CyDView>
        {/* Token approval modal */}
        <SignatureModal
          isModalVisible={approveModalVisible}
          setModalVisible={setApproveModalVisible}
          onCancel={() => {
            setApproveModalVisible(false);
            handleReject();
          }}>
          {approveParams && selectedFromToken ? (
            <CyDView className='mb-[30px] pl-[30px] pr-[30px]'>
              <CyDText className='text-center font-bold text-[22px] mt-[10px]'>
                {t('TOKEN_ALLOWANCE_APPROVE')}
              </CyDText>
              <CyDView className=' my-[12px]'>
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDView className=''>
                    <CyDText className=' pt-[10px] ml-[15px] font-medium text-left text-[12px]'>
                      {`You are granting permission to `}
                    </CyDText>
                    <CyDText className=' ml-[15px] font-bold text-left text-[12px]'>
                      {`${approveParams.contractAddress} `}
                    </CyDText>
                    <CyDText className=' pt-[10px] ml-[15px] font-medium text-left text-[12px]'>
                      {`to spend up to`}
                    </CyDText>
                    <CyDText className=' ml-[15px] font-bold text-left text-[14px]'>
                      {`${formatUnits(BigInt(approveParams.tokens), selectedFromToken?.decimals)} ${selectedFromToken?.name ?? ''} tokens on ${selectedFromChain?.chainName ?? ''} chain`}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView className='flex justify-end my-[12px]'>
                <Button
                  title={t('APPROVE')}
                  onPress={() => {
                    setApproveModalVisible(false);
                    handleApprove();
                  }}
                  type={ButtonType.PRIMARY}
                  style='h-[50px]'
                />
                <Button
                  title={t('CANCEL')}
                  onPress={() => {
                    setApproveModalVisible(false);
                    handleReject();
                  }}
                  type={ButtonType.SECONDARY}
                  style='mt-[15px]'
                />
              </CyDView>
            </CyDView>
          ) : null}
        </SignatureModal>

        {/* Transfer token Modal evm */}
        <SignatureModal
          isModalVisible={evmModalVisible}
          setModalVisible={setEvmModalVisible}
          onCancel={() => {
            setEvmModalVisible(false);
            handleReject();
          }}>
          {evmTxnParams ? (
            <CyDView className={'px-[20px]'}>
              <CyDText
                className={'text-center text-[24px] font-bold mt-[20px]'}>
                {t<string>('TRANSFER_TOKENS')}
              </CyDText>
              <CyDView className='mt-[8px]'>
                <CyDText className='text-[12px] font-semibold'>
                  {t('FROM')}
                </CyDText>
                <CyDText className='text-[14px] font-bold mt-[2px]'>
                  {evmTxnParams.signer_address}
                </CyDText>
              </CyDView>
              <CyDView className='mt-[8px]'>
                <CyDText className='text-[12px] font-semibold'>
                  {t('TO')}
                </CyDText>
                <CyDText className='text-[14px] font-bold mt-[2px]'>
                  {evmTxnParams.to}
                </CyDText>
              </CyDView>
              <CyDView className='mt-[8px]'>
                <CyDText className='text-[12px] font-semibold'>
                  {t('DATA')}
                </CyDText>
                <CyDScrollView className='h-[200px] p-[4px] rounded-[8px] mt-8px border-separate border '>
                  <CyDText>{evmTxnParams.data}</CyDText>
                </CyDScrollView>
              </CyDView>
              <CyDView className='flex justify-end my-[30px]'>
                <Button
                  title={t('APPROVE')}
                  onPress={() => {
                    setEvmModalVisible(false);
                    handleApprove();
                  }}
                  type={ButtonType.PRIMARY}
                  style='h-[50px]'
                />
                <Button
                  title={t('CANCEL')}
                  onPress={() => {
                    setEvmModalVisible(false);
                    handleReject();
                  }}
                  type={ButtonType.SECONDARY}
                  style='mt-[15px]'
                />
              </CyDView>
            </CyDView>
          ) : null}
        </SignatureModal>

        {/* Transfer token Modal cosmos */}
        <SignatureModal
          isModalVisible={cosmosModalVisible}
          setModalVisible={setCosmosModalVisible}
          onCancel={() => {
            setCosmosModalVisible(false);
            handleReject();
          }}>
          {cosmosTxnParams ? (
            <CyDView className={'px-[20px]'}>
              <CyDText
                className={'text-center text-[24px] font-bold mt-[20px]'}>
                {t<string>('TRANSFER_TOKENS')}
              </CyDText>
              <CyDView className='mt-[8px]'>
                <CyDText className='text-[12px] font-semibold'>
                  {t('FROM')}
                </CyDText>
                <CyDText className='text-[14px] font-bold mt-[2px]'>
                  {cosmosTxnParams.signer_address}
                </CyDText>
              </CyDView>
              {cosmosTxnParams.msgs.map((item, _index) => {
                return (
                  <CyDView key={_index} className='mt-[8px]'>
                    <CyDText className='text-[12px] font-semibold'>
                      {item.msg_type_url}
                    </CyDText>
                    <CyDScrollView className='h-[200px] p-[4px] rounded-[8px] mt-8px border-separate border '>
                      {/* <CyDText>{item.msg}</CyDText> */}
                      <JSONTree
                        data={JSON.parse(item.msg)}
                        invertTheme={true}
                      />
                    </CyDScrollView>
                  </CyDView>
                );
              })}
              <CyDView className='flex justify-end my-[30px]'>
                <Button
                  title={t('APPROVE')}
                  onPress={() => {
                    setCosmosModalVisible(false);
                    handleApprove();
                  }}
                  type={ButtonType.PRIMARY}
                  style='h-[50px]'
                />
                <Button
                  title={t('CANCEL')}
                  onPress={() => {
                    setCosmosModalVisible(false);
                    handleReject();
                  }}
                  type={ButtonType.SECONDARY}
                  style='mt-[15px]'
                />
              </CyDView>
            </CyDView>
          ) : null}
        </SignatureModal>

        {/* Transfer token Modal solana */}
        <SignatureModal
          isModalVisible={solanaModalVisible}
          setModalVisible={setSolanaModalVisible}
          onCancel={() => {
            setCosmosModalVisible(false);
            handleReject();
          }}>
          {solanaTxnParams ? (
            <CyDView className={'px-[20px]'}>
              <CyDText
                className={'text-center text-[24px] font-bold mt-[20px]'}>
                {t<string>('TRANSFER_TOKENS')}
              </CyDText>

              {solanaTxnParams && (
                <CyDScrollView className='h-[200px] p-[4px] rounded-[8px] mt-8px border-separate border '>
                  <JSONTree
                    data={JSON.parse(JSON.stringify(solanaTxnParams))}
                    invertTheme={true}
                  />
                </CyDScrollView>
              )}
              <CyDView className='flex justify-end my-[30px]'>
                <Button
                  title={t('APPROVE')}
                  onPress={() => {
                    setSolanaModalVisible(false);
                    handleApprove();
                  }}
                  type={ButtonType.PRIMARY}
                  style='h-[50px]'
                />
                <Button
                  title={t('CANCEL')}
                  onPress={() => {
                    setSolanaModalVisible(false);
                    handleReject();
                  }}
                  type={ButtonType.SECONDARY}
                  style='mt-[15px]'
                />
              </CyDView>
            </CyDView>
          ) : null}
        </SignatureModal>

        {/* swap confirmation modal */}
        <SignatureModal
          isModalVisible={signModalVisible}
          setModalVisible={setSignModalVisible}
          onCancel={() => {
            setSignModalVisible(false);
          }}
          avoidKeyboard={true}>
          {isOdosSwap() ? (
            <CyDView>
              <CyDView className={'px-[20px]'}>
                <CyDText
                  className={'text-center text-[24px] font-bold mt-[20px]'}>
                  {t<string>('SWAP_TOKENS')}
                </CyDText>
                <CyDView
                  className={
                    'flex flex-row justify-between items-center w-[100%] my-[20px] rounded-[20px] px-[15px] py-[20px] '
                  }>
                  <CyDView
                    className={'flex w-[40%] items-center justify-center'}>
                    <CyDView className='items-center'>
                      {endsWith(selectedFromToken?.logoUrl, '.svg') ? (
                        <SvgUri
                          width='24'
                          height='24'
                          className=''
                          uri={selectedFromToken?.logoUrl ?? ''}
                        />
                      ) : (
                        <CyDImage
                          source={{ uri: selectedFromToken?.logoUrl }}
                          className={'w-[44px] h-[44px]'}
                        />
                      )}

                      <CyDText
                        className={
                          'my-[6px] mx-[2px] text-base400 text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {selectedFromToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                        }>
                        {endsWith(selectedFromChain?.logoUrl, '.svg') ? (
                          <SvgUri
                            width='24'
                            height='24'
                            className=''
                            uri={selectedFromChain?.logoUrl ?? ''}
                          />
                        ) : (
                          <CyDImage
                            source={{ uri: selectedFromChain?.logoUrl }}
                            className={'w-[14px] h-[14px]'}
                          />
                        )}
                        <CyDText
                          className={
                            'ml-[6px] font-nunito font-normal text-base400  text-[12px]'
                          }>
                          {selectedFromChain?.chainName}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>

                  <CyDView className={'flex justify-center h-[30px] w-[30px]'}>
                    <CyDIcons
                      name='refresh'
                      size={32}
                      className='text-base400'
                    />
                  </CyDView>

                  <CyDView
                    className={
                      'flex w-[40%] items-center self-center align-center justify-center '
                    }>
                    <CyDView className='items-center'>
                      {endsWith(selectedToToken?.logoUrl, '.svg') ? (
                        <SvgUri
                          width='24'
                          height='24'
                          className=''
                          uri={selectedToToken?.logoUrl ?? ''}
                        />
                      ) : (
                        <CyDImage
                          source={{ uri: selectedToToken?.logoUrl }}
                          className={'w-[44px] h-[44px]'}
                        />
                      )}
                      <CyDText
                        className={
                          'my-[6px] mx-[2px] text-base400 text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {selectedToToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                        }>
                        {endsWith(selectedToChain?.logoUrl, '.svg') ? (
                          <SvgUri
                            width='24'
                            height='24'
                            className=''
                            uri={selectedToChain?.logoUrl ?? ''}
                          />
                        ) : (
                          <CyDImage
                            source={{ uri: selectedToChain?.logoUrl }}
                            className={'w-[14px] h-[14px]'}
                          />
                        )}
                        <CyDText
                          className={
                            'ml-[6px] font-nunito text-base400 font-normal text-[12px]'
                          }>
                          {selectedToChain?.chainName}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDView className={'flex flex-row justify-between'}>
                  <CyDText
                    className={
                      'text-base200 font-nunito text-[16px] font-medium'
                    }>
                    {t<string>('SENT_AMOUNT')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex flex-col items-end'}>
                    <CyDText
                      className={
                        'font-nunito text-[16px] text-base400 font-bold max-w-[150px]'
                      }
                      numberOfLines={1}>
                      {formatAmount(
                        (quoteData as OdosSwapQuoteResponse)?.fromToken?.[0]
                          ?.amount,
                      ) +
                        ' ' +
                        String(selectedFromToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito text-[12px] text-base100 font-bold'
                      }>
                      {limitDecimalPlaces(
                        DecimalHelper.multiply(
                          (quoteData as OdosSwapQuoteResponse)?.fromToken?.[0]
                            ?.amount ?? 0,
                          selectedFromToken?.price ?? 0,
                        ),
                        4,
                      ) + ' USD'}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView
                  className={
                    'mr-[10px] flex flex-row justify-between mt-[20px]'
                  }>
                  <CyDText
                    className={
                      'text-base200 font-nunito text-[16px] font-medium'
                    }>
                    {t<string>('TOTAL_RECEIVED')}
                  </CyDText>
                  <CyDView className={'flex flex-col items-end'}>
                    <CyDText
                      className={
                        'font-nunito text-[16px] text-base400 font-bold max-w-[150px]'
                      }
                      numberOfLines={1}>
                      {formatAmount(
                        (quoteData as OdosSwapQuoteResponse)?.toToken?.amount,
                      ) +
                        ' ' +
                        String(selectedToToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito text-[12px] text-base100 font-bold'
                      }>
                      {limitDecimalPlaces(
                        DecimalHelper.multiply(
                          (quoteData as OdosSwapQuoteResponse)?.toToken?.amount,
                          selectedToToken?.price ?? 0,
                        ),
                        4,
                      ) + ' USD'}
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDView className='flex flex-row justify-between items-center mt-[20px] mr-[10px]'>
                  <CyDView className='flex flex-row'>
                    <CyDText className=' py-[10px] w-[60%] font-semibold'>
                      {t<string>('GAS_FEE') + ' :'}
                    </CyDText>
                  </CyDView>
                  <CyDView className='items-end'>
                    <CyDText className='font-bold'>
                      {formatAmount(swapParams?.gasFeeETH)}
                      {' ' + String(fromChainDetails?.symbol)}
                    </CyDText>
                    <CyDText className='font-bold text-subTextColor'>
                      {formatAmount(swapParams?.gasFeeDollar) + ' USD'}
                    </CyDText>
                  </CyDView>
                </CyDView>
                {/* <RenderWarningMessage /> */}
              </CyDView>

              <CyDView
                className={
                  'flex flex-row justify-center items-center px-[20px] pb-[50px] mt-[10px]'
                }>
                <Button
                  title={t<string>('CANCEL')}
                  disabled={loading.swapLoading}
                  type={ButtonType.SECONDARY}
                  onPress={() => {
                    setSignModalVisible(false);
                  }}
                  style={'h-[60px] w-[166px] mr-[9px]'}
                />
                <Button
                  title={t('SWAP')}
                  loading={loading.swapLoading}
                  onPress={() => {
                    void onConfirmSwap();
                  }}
                  disabled={loading.swapLoading}
                  isPrivateKeyDependent={true}
                  style={'h-[60px] w-[166px] ml-[9px]'}
                />
              </CyDView>
            </CyDView>
          ) : (
            <></>
          )}
        </SignatureModal>

        {index === 0 && (
          <TokenSelectionV2
            selectedFromChain={selectedFromChain}
            setSelectedFromChain={setSelectedFromChain}
            fromChainData={chainData}
            selectedFromToken={selectedFromToken}
            setSelectedFromToken={setSelectedFromToken}
            fromTokenData={fromTokenData}
            selectedToChain={selectedToChain}
            setSelectedToChain={setSelectedToChain}
            toChainData={chainData}
            selectedToToken={selectedToToken}
            setSelectedToToken={setSelectedToToken}
            toTokenData={toTokenData}
            cryptoAmount={cryptoAmount}
            setCryptoAmount={setCryptoAmount}
            usdAmount={usdAmount}
            setUsdAmount={setUsdAmount}
            amountOut={amountOut}
            usdAmountOut={usdAmountOut}
            onClickMax={onClickMax}
            onToggle={onToggle}
            loading={loading}
          />
        )}
        {!isOdosSwap() && index === 1 && (
          <BridgeRoutePreview
            routeResponse={quoteData as SkipApiRouteResponse}
            chainInfo={chainData}
            tokenData={tokenData}
            loading={loading.bridgeGetMsg}
            onGetMSg={onGetMsg}
            statusResponse={skipApiStatusResponse}
            signaturesRequired={signaturesRequired}
          />
        )}
        {index === 0 &&
          (!isEmpty(error) ||
            (cryptoAmount &&
              DecimalHelper.isGreaterThan(
                cryptoAmount,
                selectedFromToken?.balanceDecimal ?? 0,
              ))) &&
          !loading.quoteLoading && (
            <CyDView className=' bg-red20 rounded-[8px] p-[12px] flex flex-row mx-[16px] mt-[16px] justify-between items-center'>
              <CyDFastImage
                source={AppImages.CYPHER_WARNING_RED}
                className='w-[32px] h-[32px]'
              />
              <CyDView className='w-[87%]'>
                {!isEmpty(error) && (
                  <CyDView className='flex flex-row gap-x-[8px]'>
                    <CyDText>{'\u2022'}</CyDText>
                    <CyDText className='w-[90%]'>{error}</CyDText>
                  </CyDView>
                )}
                {cryptoAmount &&
                  DecimalHelper.isGreaterThan(
                    cryptoAmount,
                    selectedFromToken?.balanceDecimal ?? 0,
                  ) && (
                    <CyDView className='flex flex-row gap-x-[8px]'>
                      <CyDText>{'\u2022'}</CyDText>
                      {!isOdosSwap() && !isSkipSwap() && (
                        <CyDText>{t('INSUFFICIENT_BALANCE_BRIDGE')}</CyDText>
                      )}
                      {(isOdosSwap() || isSkipSwap()) && (
                        <CyDText>{t('INSUFFICIENT_BALANCE_SWAP')}</CyDText>
                      )}
                    </CyDView>
                  )}
              </CyDView>
            </CyDView>
          )}
        {index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] bg-n0 rounded-[8px] p-[12px] flex flex-row items-start '>
            <CyDView className='flex-1'>
              <CyDView className='flex flex-row justify-between'>
                <CyDView>
                  {!isOdosSwap() && (
                    <CyDSkeleton
                      width={100}
                      height={10}
                      value={!loading.quoteLoading}>
                      <CyDText className='text-[14px] font-semibold font-manrope'>{`$${(quoteData as SkipApiRouteResponse)?.estimated_fees?.[0]?.usd_amount ?? '0'}`}</CyDText>
                    </CyDSkeleton>
                  )}
                  {isOdosSwap() && (
                    <CyDSkeleton
                      width={100}
                      height={10}
                      value={!loading.quoteLoading}>
                      <CyDText className='text-[14px] font-semibold'>{`$${(quoteData as OdosSwapQuoteResponse)?.gasEstimateValue?.toFixed(4) ?? '0'}`}</CyDText>
                    </CyDSkeleton>
                  )}
                </CyDView>
                <CyDTouchView
                  className='flex flex-row items-center bg-n40 rounded-[4px] py-[4px] px-[4px]'
                  onPress={() => {
                    void manualRefreshQuote();
                  }}
                  disabled={loading.quoteLoading}>
                  <CyDMaterialDesignIcons
                    name='autorenew'
                    size={14}
                    className={clsx('mr-[4px] text-base400', {
                      'opacity-50': loading.quoteLoading,
                    })}
                  />
                  <CyDText
                    className={clsx('text-[10px] font-semibold', {
                      'opacity-50': loading.quoteLoading,
                    })}>
                    Refresh
                  </CyDText>
                </CyDTouchView>
              </CyDView>

              <CyDSkeleton
                width={100}
                height={10}
                value={!loading.quoteLoading}
                className='mt-[6px] w-[50%]'>
                <CyDText className='text-[10px] font-regular font-manrope'>
                  {t('ESTIMATED_NETWORK_FEE')}
                </CyDText>
              </CyDSkeleton>
              {!isOdosSwap() && (
                <CyDView className='flex flex-row justify-between items-center w-full mt-[12px]'>
                  <CyDSkeleton
                    width={30}
                    height={20}
                    value={!loading.quoteLoading}
                    className='text-[14px] font-semibold font-manrope w-[50%]'>
                    <CyDText>{`${signaturesRequired} signature required`}</CyDText>
                  </CyDSkeleton>
                  <CyDView className='flex flex-row items-center w-[50%] justify-end'>
                    <CyDMaterialDesignIcons
                      name={'clock-time-five'}
                      size={20}
                      className='text-base400 mr-[4px]'
                    />
                    <CyDSkeleton
                      width={50}
                      height={20}
                      value={!loading.quoteLoading}>
                      <CyDText className='text-[14px] font-semibold'>{`${
                        (quoteData as SkipApiRouteResponse)
                          ?.estimated_route_duration_seconds
                          ? (quoteData as SkipApiRouteResponse)
                              ?.estimated_route_duration_seconds > 60
                            ? `${Math.floor((quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds / 60)}m ${(quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds % 60}s` // Convert to minutes and seconds
                            : `${(quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds}s`
                          : '0s'
                      }`}</CyDText>
                    </CyDSkeleton>
                  </CyDView>
                </CyDView>
              )}

              <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
                <CyDSkeleton
                  width={100}
                  height={10}
                  value={!loading.quoteLoading}>
                  <CyDText className='text-[10px] font-regular text-n200'>
                    {`Quote will refresh in ${timeUntilRefresh}s`}
                  </CyDText>
                </CyDSkeleton>
              </CyDView>
            </CyDView>
          </CyDView>
        )}
        {index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] mb-[80px]'>
            <Button
              onPress={handlePreviewClick}
              title={'Preview'}
              disabled={isPreviewDisabled()}
              loading={
                loading.acceptSwapLoading ||
                loading.quoteLoading ||
                loading.swapLoading
              }
              isPrivateKeyDependent={true}
              loaderStyle={styles.loaderStyle}
            />
          </CyDView>
        )}
      </CyDKeyboardAwareScrollView>
    </CyDSafeAreaView>
  );
};

export default Bridge;

const styles = StyleSheet.create({
  loaderStyle: {
    height: 22,
  },
});
