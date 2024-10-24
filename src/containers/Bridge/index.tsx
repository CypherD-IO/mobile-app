import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '../../components/v2/loading';
import {
  CyDFastImage,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import useAxios from '../../core/HttpRequest';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import TokenSelectionV2 from './tokenSelection';
import { SkipApiRouteResponse } from '../../models/skipApiRouteResponse.interface';
import BridgeRoutePreview from './bridgePreview';
import { SkipApiStatus } from '../../models/skipApiStatus.interface';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { debounce, endsWith, floor, get, isEmpty, isNil } from 'lodash';
import { ChainIdNameMapping, gasFeeReservation } from '../../constants/data';
import {
  ActivityContext,
  formatAmount,
  getWeb3Endpoint,
  HdWalletContext,
  logAnalytics,
  parseErrorMessage,
  setTimeOutNSec,
} from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

import { AnalyticsType, ButtonType } from '../../constants/enum';
import {
  SkipApiCosmosTxn,
  SkipAPiEvmTx,
  SkipApiSignMsg,
} from '../../models/skipApiSingMsg.interface';
import Web3 from 'web3';
import useSkipApiBridge from '../../core/skipApi';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import * as Sentry from '@sentry/react-native';
import { Transaction } from '@solana/web3.js';
import SignatureModal from '../../components/v2/signatureModal';
import AppImages from '../../../assets/images/appImages';
import { SvgUri } from 'react-native-svg';
import { ethers } from 'ethers';
import Button from '../../components/v2/button';
import JSONTree from 'react-native-json-tree';
import { ALL_CHAINS, Chain } from '../../constants/server';
import {
  ActivityContextDef,
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  ExchangeTransaction,
} from '../../reducers/activity_reducer';
import { OdosSwapQuoteResponse } from '../../models/osdoQuote.interface';
import useTransactionManager from '../../hooks/useTransactionManager';
import { ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR } from '../Portfolio/constants';
import { StyleSheet } from 'react-native';
import { genId } from '../utilities/activityUtilities';
import { GasPriceDetail } from '../../core/types';
import { screenTitle } from '../../constants';
import {
  BridgeContext,
  BridgeContextDef,
  BridgeReducerAction,
  BridgeStatus,
} from '../../reducers/bridge.reducer';
import { DEFAULT_AXIOS_TIMEOUT } from '../../core/Http';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import analytics from '@react-native-firebase/analytics';
import usePortfolio from '../../hooks/usePortfolio';
import useIsSignable from '../../hooks/useIsSignable';

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
    checkAllowance,
  } = useSkipApiBridge();
  const { getApproval, swapTokens } = useTransactionManager();
  const globalStateContext = useContext(GlobalContext) as GlobalContextDef;
  const { state: bridgeState, dispatch: bridgeDispatch } = useContext(
    BridgeContext,
  ) as BridgeContextDef;
  const activityContext = useContext(ActivityContext) as ActivityContextDef;
  const activityId = useRef<string>('id');
  const [isSignableTransaction] = useIsSignable();

  const slippage = 0.4;
  const ethereum = hdWallet.state.wallet.ethereum;

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
    gasFeeResponse: GasPriceDetail;
    gasLimit: number;
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
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

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
    const chainResult = await getWithAuth('/v1/swap/chains?newData=true');
    setChainData(chainResult.data);
    setSelectedFromChain(chainResult.data[0]);
    bridgeDispatch({
      type: BridgeReducerAction.SUCCESS,
      payload: {
        chainData: chainResult,
      },
    });
  };

  const fetchTokenData = async () => {
    const tokenResult = await getWithAuth('/v1/swap/tokens?newData=true');
    setTokenData(tokenResult.data);
    bridgeDispatch({
      type: BridgeReducerAction.SUCCESS,
      payload: {
        tokenData: tokenResult,
      },
    });
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
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (bridgeState.status === BridgeStatus.ERROR) void fetchData();
      else {
        setIndex(0);
        setChainData(bridgeState.chainData);
        setTokenData(bridgeState.tokenData);
        setChainData(bridgeState.chainData);
        if (routeParamsTokenData?.chainDetails) {
          const selectedChain = bridgeState.chainData.find(
            chain =>
              chain.chainId === routeParamsTokenData.chainDetails.chain_id ||
              Number(chain.chainId) ===
                Number(routeParamsTokenData.chainDetails.chainIdNumber),
          );
          setSelectedFromChain(selectedChain ?? bridgeState.chainData[0]);
        } else {
          setSelectedFromChain(bridgeState.chainData[0]);
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

  const setUpdataTemp = filteredTokens => {};

  const setFromTokenAndTokenData = async () => {
    const currentChain = ALL_CHAINS.find(
      chain =>
        chain.chainIdNumber === Number(selectedFromChain?.chainId) ||
        chain.chain_id === selectedFromChain?.chainId,
    );
    setFromChainDetails(currentChain as Chain);

    // Filter tokens based on totalHoldings
    const localPortfolio = await getLocalPortfolio();
    const totalHoldings = localPortfolio?.totalHoldings;

    let filteredTokens = tokenData[selectedFromChain?.chainId]
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
          balance: matchingHolding?.actualBalance ?? 0,
          balanceInNumbers: matchingHolding?.totalValue ?? 0,
        };
      })
      .sort((a, b) => b.balanceInNumbers - a.balanceInNumbers);

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

    console.log('🚀 ~ selectedFromToken:', selectedFromToken);

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
        _selectedFromToken = routeToken ?? filteredTokens[0];

        setSelectedFromToken(_selectedFromToken);
      } else {
        _selectedFromToken = filteredTokens[0];
        setSelectedFromToken(_selectedFromToken);
      }
      console.log(
        '🚀 ~ setFromTokenAndTokenData ~ _selectedFromToken:',
        _selectedFromToken,
      );

      setUsdAmount(
        parseFloat(cryptoAmount) > 0
          ? String(Number(cryptoAmount) * Number(_selectedFromToken))
          : '0',
      );
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

  const fetchQuote = async (): Promise<void> => {
    // Cancel any ongoing request
    if (abortController?.abort) {
      abortController?.abort();
    }

    // Create a new AbortController for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setLoading(prevLoading => ({ ...prevLoading, quoteLoading: true }));

    try {
      if (isOdosSwap()) {
        await getSwapQuote(newAbortController.signal);
      } else {
        await getBridgeQuote(newAbortController.signal);
      }
    } finally {
      setLoading(prevLoading => ({ ...prevLoading, quoteLoading: false }));
    }
  };

  const debouncedFetchQuote = useCallback(
    debounce((amount: string) => {
      if (
        Number(amount) > 0 &&
        selectedFromChain &&
        selectedToChain &&
        selectedFromToken &&
        selectedToToken
      ) {
        resetValues();
        void fetchQuote();
      }
    }, 1000),
    [cryptoAmount, selectedFromToken, selectedToToken],
  );

  useEffect(() => {
    if (Number(cryptoAmount) > 0) {
      setLoading(prevLoading => ({ ...prevLoading, quoteLoading: true }));
      debouncedFetchQuote(cryptoAmount);
    } else {
      setLoading(prevLoading => ({ ...prevLoading, quoteLoading: false }));
    }

    return () => {
      debouncedFetchQuote.cancel();
      if (abortController) {
        abortController.abort();
      }
    };
  }, [cryptoAmount, selectedFromToken, selectedToToken]);

  const onClickMax = () => {
    const isNativeToken = selectedFromToken?.isNative ?? false;

    const bal = isNativeToken
      ? (
          get(selectedFromToken, 'balance', 0) -
          get(gasFeeReservation, [fromChainDetails?.backendName ?? ''], 0)
        )?.toString()
      : get(selectedFromToken, 'balance', 0)?.toString();

    if (Number(bal) > 0) {
      setCryptoAmount(bal);
      setUsdAmount(String(Number(bal) * Number(selectedFromToken?.price)));
    } else {
      setError('Insufficient balance for gas fee');
    }
  };

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

  const getBridgeQuote = async (signal: AbortSignal) => {
    try {
      if (
        selectedFromToken &&
        selectedToToken &&
        parseFloat(cryptoAmount) > 0 &&
        !isOdosSwap()
      ) {
        const routeBody = {
          amountIn: ethers
            .parseUnits(cryptoAmount, selectedFromToken.decimals)
            .toString(),
          sourceAssetDenom: selectedFromToken.denom,
          sourceAssetChainId: selectedFromToken.chainId,
          destAssetDenom: selectedToToken.denom,
          destAssetChainId: selectedToToken.chainId,
        };

        const {
          isError,
          error: quoteError,
          data,
        } = await postWithAuth(
          '/v1/swap/bridge/quote',
          routeBody,
          DEFAULT_AXIOS_TIMEOUT,
          { signal },
        );

        if (!isError) {
          const responseQuoteData = data as SkipApiRouteResponse;

          setQuoteData(responseQuoteData);
          setUsdAmount(responseQuoteData?.usd_amount_in);
          setAmountOut(
            ethers.formatUnits(
              responseQuoteData?.amount_out,
              selectedToToken?.decimals,
            ),
          );
          setUsdAmountOut(responseQuoteData?.usd_amount_out);
          setSignaturesRequired(responseQuoteData?.txs_required);
          setLoading({ ...loading, quoteLoading: false });
        } else {
          setLoading({ ...loading, quoteLoading: false });
          if (
            quoteError?.message.includes('no routes') ||
            quoteError?.message.includes('transfer across') ||
            quoteError?.message.includes('bridge relay')
          ) {
            setQuoteData(null);
            setError(quoteError?.message);
          } else {
            setError(quoteError?.message);
            void analytics().logEvent('BRIDGE_QUOTE_ERROR', {
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
            });
          }
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
        void analytics().logEvent('BRIDGE_QUOTE_ERROR', {
          error: e,
        });
        Sentry.captureException(e);
      }
    }
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
      fromToken: selectedFromToken?.name,
      toToken: selectedToToken?.name,
      fromSymbol: selectedFromToken?.symbol,
      toSymbol: selectedToToken?.symbol,
      fromTokenLogoUrl: selectedFromToken?.logoUrl,
      toTokenLogoUrl: selectedToToken?.logoUrl,
      fromChainLogoUrl: selectedFromChain.logoUrl,
      toChainLogoUrl: selectedToChain.logoUrl,
      fromTokenAmount: ethers
        .formatUnits(_quoteData?.amount_in, selectedFromToken.decimals)
        .toString(),
      toTokenAmount: ethers
        .formatUnits(_quoteData?.amount_out, selectedToToken.decimals)
        .toString(),
      datetime: new Date(),
      transactionHash: '',
      quoteData: {
        fromAmountUsd: _quoteData?.usd_amount_in,
        toAmountUsd: _quoteData?.usd_amount_out,
        gasFee: '',
      },
    };
    activityId.current = id;

    try {
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
      const {
        isError,
        error: fetchError,
        data,
      } = await postToOtherSource(
        'https://api.skip.money/v2/fungible/msgs',
        body,
      );

      if (isError) {
        Sentry.captureException(fetchError);
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedFromChain.chainName,
          message: parseErrorMessage(fetchError),
          screen: route.name,
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

      await evmTxnMsg(data);
      await cosmosTxnMsg(data);
      await solanaTxnMsg(data);
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
            },
          });
          navigateToPortfolio();
        },
        onFailure: navigateToPortfolio,
      });

      void analytics().logEvent('BRIDGE_SUCCESS');
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
        void analytics().logEvent('BRIDGE_ERROR', {
          error: e,
        });
        Sentry.captureException(e);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: selectedFromChain.chainName,
          message: parseErrorMessage(e),
          screen: route.name,
        });
      }
    }
  };

  // bridge
  const evmTxnMsg = async (data: SkipApiSignMsg) => {
    if (selectedFromToken && fromChainDetails) {
      try {
        const web3 = new Web3(
          getWeb3Endpoint(fromChainDetails, globalStateContext),
        );
        const txs = data.txs;
        for (const tx of txs) {
          const evmTx = get(tx, 'evm_tx');
          if (evmTx) {
            setEvmTxnParams(evmTx);
            const evmResponse = await skipApiApproveAndSignEvm({
              web3,
              evmTx,
              selectedFromToken,
              hdWallet,
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
            } else {
              throw new Error(
                evmResponse?.error ?? 'Error processing Evm transaction',
              );
            }
          }
        }
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
  };

  const solanaTxnMsg = async (data: SkipApiSignMsg) => {
    const txs = data.txs;
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
            await submitSign(solanaResponse.txn, solanaResponse.chainId);
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
        title: t('UNEXCPECTED_ERROR'),
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
        title: t('UNEXCPECTED_ERROR'),
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
          title: t('UNEXCPECTED_ERROR'),
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
      const temp =
        parseFloat(cryptoAmount) > selectedFromToken.balance ||
        isNil(quoteData) ||
        !isEmpty(error);

      return temp;
    } else {
      return true;
    }
  };

  const getSwapQuote = async (signal: AbortSignal) => {
    try {
      if (
        selectedToToken &&
        selectedFromToken &&
        selectedToChain &&
        selectedFromChain &&
        isOdosSwap()
      ) {
        const payload = {
          fromTokenList: [
            {
              address: selectedFromToken?.isNative
                ? '0x0000000000000000000000000000000000000000'
                : selectedFromToken?.tokenContract,
              amount: cryptoAmount.toString(),
            },
          ],
          toToken: selectedToToken.isNative
            ? '0x0000000000000000000000000000000000000000'
            : selectedToToken.tokenContract,
          slippage,
          walletAddress: ethereum.address,
        };

        const response = await postWithAuth(
          `/v1/swap/evm/chains/${selectedFromChain?.chainId ?? ''}/quote`,
          payload,
          DEFAULT_AXIOS_TIMEOUT,
          { signal },
        );

        if (!response.isError) {
          const responseQuoteData = response.data as OdosSwapQuoteResponse;
          setUsdAmount(
            (
              parseFloat(responseQuoteData?.fromToken?.[0].amount.toString()) *
                selectedFromToken?.price ?? 0
            ).toString(),
          );
          setAmountOut(responseQuoteData?.toToken?.amount.toString());
          setUsdAmountOut(responseQuoteData?.value.toString());
          setQuoteData(responseQuoteData);
          setLoading({ ...loading, quoteLoading: false });
        } else {
          setQuoteData(null);
          setError(response.error);
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
        void analytics().logEvent('SWAP_QUOTE_ERROR', {
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
          const web3 = new Web3(
            getWeb3Endpoint(fromChainDetails, globalStateContext),
          );

          if (!selectedFromToken.isNative) {
            const allowanceResp = await checkAllowance({
              web3,
              fromToken: selectedFromToken,
              routerAddress,
              amount: ethers
                .parseUnits(cryptoAmount, selectedFromToken?.decimals)
                .toString(),
              hdWallet,
            });

            if (!allowanceResp.isAllowanceEnough) {
              setApproveParams({
                tokens: allowanceResp.tokens,
                gasLimit: allowanceResp.gasLimit,
                gasFeeResponse: allowanceResp.gasFeeResponse,
                contractAddress: routerAddress,
              });
              const approveGranted = await showModalAndGetResponse(
                setApproveModalVisible,
              );
              if (approveGranted) {
                const approvalResp = await getApproval({
                  web3,
                  fromTokenContractAddress: selectedFromToken.tokenContract,
                  hdWallet,
                  gasLimit: allowanceResp.gasLimit,
                  gasFeeResponse: allowanceResp.gasFeeResponse,
                  contractData: allowanceResp.contractData,
                  chainDetails: fromChainDetails,
                  contractParams: allowanceResp.contractData,
                });

                if (approvalResp.isError) {
                  setLoading({ ...loading, acceptSwapLoading: false });
                  return { isError: true, error: 'Error approving allowance' };
                }
              }
            }
          }
          let gasFeeETH = '';
          let gasFeeDollar = '';
          const gasLimit = floor(
            get(response, ['gasEstimate']) *
              ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR,
          );

          let finalGasPrice;
          const gasFeeResponse = response?.gasInfo;
          if (gasFeeResponse && gasFeeResponse?.gasPrice > 0) {
            finalGasPrice = gasFeeResponse.gasPrice;

            if (finalGasPrice) {
              gasFeeETH = web3.utils.fromWei(
                web3.utils.toWei((finalGasPrice * gasLimit).toFixed(9), 'gwei'),
              );
            }

            if (gasFeeResponse.tokenPrice > 0) {
              const ethPrice = gasFeeResponse.tokenPrice;
              gasFeeDollar = (parseFloat(gasFeeETH) * ethPrice).toFixed(2);
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
          title: t('UNEXCPECTED_ERROR'),
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
          fromToken: selectedFromToken?.name,
          toToken: selectedToToken?.name,
          fromSymbol: selectedFromToken?.symbol,
          toSymbol: selectedToToken?.symbol,
          fromTokenLogoUrl: selectedFromToken?.logoUrl,
          toTokenLogoUrl: selectedToToken?.logoUrl,
          fromChainLogoUrl: selectedFromChain?.logoUrl,
          toChainLogoUrl: selectedToChain?.logoUrl,
          fromTokenAmount: parseFloat(cryptoAmount).toFixed(3),
          toTokenAmount: _quoteData?.toToken?.amount.toString(),
          datetime: new Date(),
          transactionHash: '',
          quoteData: {
            fromAmountUsd:
              Number(cryptoAmount) * Number(selectedFromToken?.price),
            toAmountUsd: _quoteData?.value,
            gasFee: _quoteData?.gasEstimateValue,
          },
        };
        activityId.current = id;
        const gasLimit = floor(
          get(quoteData, ['gasEstimate']) *
            ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR,
        );
        const gasFeeResponse = _quoteData?.gasInfo;
        const web3 = new Web3(
          getWeb3Endpoint(fromChainDetails, globalStateContext),
        );
        setSignModalVisible(false);

        const response: any = await swapTokens({
          web3,
          fromToken: selectedFromToken,
          contractData: _quoteData?.data,
          routerAddress: _quoteData?.router,
          hdWallet,
          gasLimit,
          gasFeeResponse,
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
              activityData.status = ActivityStatus.SUCCESS;
              activityContext.dispatch({
                type: ActivityReducerAction.POST,
                value: activityData,
              });
              navigateToPortfolio();
            },
            onFailure: navigateToPortfolio,
          });
          void logAnalytics({
            type: AnalyticsType.SUCCESS,
            txnHash: response.receipt.transactionHash,
            chain: selectedFromChain.chainName,
          });
          void analytics().logEvent('SWAP_SUCCESS');
        } else {
          activityData.status = ActivityStatus.FAILED;
          activityContext.dispatch({
            type: ActivityReducerAction.POST,
            value: activityData,
          });
          setLoading({ ...loading, swapLoading: false });
          showModal('state', {
            type: 'error',
            title: t('SWAP_ERROR'),
            description:
              response?.error?.message ?? t('SWAP_ERROR_DESCRIPTION'),
            onSuccess: navigateToPortfolio,
            onFailure: navigateToPortfolio,
          });
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.ERROR,
            chain: selectedFromChain.chainName,
            message: parseErrorMessage(response.error),
            screen: route.name,
          });
          void analytics().logEvent('SWAP_ERROR', {
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
      });
      void analytics().logEvent('SWAP_ERROR', {
        error: err,
      });
      Sentry.captureException(err);
    }
  };

  const onToggle = () => {
    resetValues();

    const oldFromChain = selectedFromChain;
    const oldFromToken = selectedFromToken;
    const oldToChain = selectedToChain;
    const oldToToken = selectedToToken;

    setSelectedFromToken(oldToToken);
    setSelectedToToken(oldFromToken);
    setSelectedFromChain(oldToChain);
    setSelectedToChain(oldFromChain);
    resetValues();
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

  if (loading.pageLoading || bridgeState.status === BridgeStatus.FETCHING) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className='mb-[45px]'>
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
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[32px] h-[32px]'
              />
            </CyDTouchView>
          )}
          <CyDText className='text-black font-extrabold text-[28px] font-manrope'>
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
                    <CyDText className=' ml-[15px] font-semibold text-left text-[14px]'>
                      {`${approveParams.contractAddress} `}
                    </CyDText>
                    <CyDText className=' pt-[10px] ml-[15px] font-medium text-left text-[12px]'>
                      {`to spend up to`}
                    </CyDText>
                    <CyDText className=' ml-[15px] font-bold text-left text-[14px]'>
                      {`${ethers.formatUnits(approveParams.tokens, selectedFromToken?.decimals)} ${selectedFromChain?.chainName ?? ''} ${selectedFromToken?.symbol ?? ''} tokens`}
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
            // void setQuoteCancelReasons(dontAskAgain);
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
                    'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
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
                          'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {selectedFromToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
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
                            'ml-[6px] font-nunito font-normal text-black  text-[12px]'
                          }>
                          {selectedFromChain?.chainName}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>

                  <CyDView className={'flex justify-center h-[30px] w-[30px]'}>
                    <CyDFastImage
                      source={AppImages.SWAP}
                      className='h-[22px] w-[22px]'
                      resizeMode='contain'
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
                          'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'
                        }>
                        {selectedToToken?.name}
                      </CyDText>
                      <CyDView
                        className={
                          'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
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
                            'ml-[6px] font-nunito text-black font-normal text-[12px]'
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
                      'text-[#434343] font-nunito font-[16px] text-medium'
                    }>
                    {t<string>('SENT_AMOUNT')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex flex-col items-end'}>
                    <CyDText
                      className={
                        'font-nunito font-[16px] text-black font-bold max-w-[150px]'
                      }
                      numberOfLines={1}>
                      {formatAmount(
                        (quoteData as OdosSwapQuoteResponse)?.fromToken?.[0]
                          ?.amount,
                      ).toString() +
                        ' ' +
                        String(selectedFromToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito font-[12px] text-[#929292] font-bold'
                      }>
                      {(
                        Number(
                          (quoteData as OdosSwapQuoteResponse)?.fromToken?.[0]
                            ?.amount,
                        ) * Number(selectedFromToken?.price)
                      ).toFixed(4) + ' USD'}
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
                      {formatAmount(
                        (quoteData as OdosSwapQuoteResponse)?.toToken?.amount,
                      ).toString() +
                        ' ' +
                        String(selectedToToken?.name)}
                    </CyDText>
                    <CyDText
                      className={
                        'font-nunito font-[12px] text-[#929292] font-bold'
                      }>
                      {(
                        Number(
                          (quoteData as OdosSwapQuoteResponse)?.toToken?.amount,
                        ) * Number(selectedToToken?.price)
                      ).toFixed(4) + ' USD'}
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
                      {String(formatAmount(swapParams?.gasFeeDollar)) + ' USD'}
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
            loading={loading.quoteLoading || loading.pageLoading}
            // fetchQuote={() => {
            //   resetValues();
            //   void fetchQuote();
            // }}
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
            parseFloat(cryptoAmount) > (selectedFromToken?.balance ?? 0)) &&
          !loading.quoteLoading && (
            <CyDView className=' bg-red-100 rounded-[8px] p-[12px] flex flex-row gap-x-[12px] mx-[16px] mt-[16px] justify-between items-center'>
              <CyDFastImage
                source={AppImages.CYPHER_WARNING_RED}
                className='w-[32px] h-[32px]'
              />
              <CyDView className='w-[80%]'>
                {!isEmpty(error) && (
                  <CyDView className='flex flex-row gap-x-[8px]'>
                    <CyDText>{'\u2022'}</CyDText>
                    <CyDText>{error}</CyDText>
                  </CyDView>
                )}
                {parseFloat(usdAmount) > (selectedFromToken?.balance ?? 0) && (
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
        {!isEmpty(quoteData) && index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px] flex flex-row items-start '>
            <CyDImage
              className='w-[20px] h-[20px] mr-[4px]'
              source={AppImages.CURRENCY_DETAILS}
            />
            <CyDView className=''>
              {!isOdosSwap() && (
                <CyDView className=' flex flex-row gap-x-[12px] justify-between items-center'>
                  <CyDText className='text-[14px] font-semibold font-manrope'>{`$${(quoteData as SkipApiRouteResponse)?.estimated_fees?.[0]?.usd_amount ?? '0'}`}</CyDText>
                </CyDView>
              )}
              {isOdosSwap() && (
                <CyDText className='text-[14px] font-semibold'>{`$${(quoteData as OdosSwapQuoteResponse)?.gasEstimateValue?.toFixed(4)}`}</CyDText>
              )}
              <CyDText className='text-[10px] font-regular font-manrope'>
                {t('ESTIMATED_NETWORK_FEE')}
              </CyDText>

              {!isOdosSwap() && (
                <CyDView className='flex flex-row justify-between items-center w-[95%] mt-[12px]'>
                  <CyDText className='text-[14px] font-semibold font-manrope w-[50%]'>{`${signaturesRequired} signature required`}</CyDText>
                  <CyDView className='flex flex-row items-center w-[50%] justify-end'>
                    <CyDImage
                      className='w-[20px] h-[20px] mr-[4px]'
                      source={AppImages.CLOCK}
                    />
                    <CyDText className='text-[14px] font-semibold'>{`${
                      (quoteData as SkipApiRouteResponse)
                        ?.estimated_route_duration_seconds > 60
                        ? `${Math.floor((quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds / 60)}m ${(quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds % 60}s` // Convert to minutes and seconds
                        : `${(quoteData as SkipApiRouteResponse)?.estimated_route_duration_seconds}s`
                    }`}</CyDText>
                  </CyDView>
                </CyDView>
              )}
            </CyDView>
          </CyDView>
        )}
        {index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] mb-[80px]'>
            <Button
              onPress={() => {
                if (isOdosSwap()) {
                  isSignableTransaction(ActivityType.SWAP, () => {
                    void onAcceptSwap();
                  });
                } else {
                  setSkipApiStatusResponse([]);
                  setIndex(1);
                }
              }}
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
