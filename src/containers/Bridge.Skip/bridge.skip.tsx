import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../styles/tailwindStyles';
import {
  ActivityContext,
  HdWalletContext,
  PortfolioContext,
  formatAmount,
  getAvailableChains,
  getNativeToken,
  getWeb3Endpoint,
  logAnalytics,
  parseErrorMessage,
  setTimeOutNSec,
} from '../../core/util';
import { SkipApiChainInterface } from '../../models/skipApiChains.interface';
import { SkipApiToken } from '../../models/skipApiTokens.interface';
import useAxios from '../../core/HttpRequest';
import {
  capitalize,
  endsWith,
  filter,
  floor,
  get,
  isEmpty,
  orderBy,
  some,
} from 'lodash';
import {
  Chain,
  ChainBackendNames,
  ChainNameMapping,
  GASLESS_CHAINS,
  NativeTokenMapping,
} from '../../constants/server';
import { SkipApiRouteResponse } from '../../models/skipApiRouteResponse.interface';
import { SkipApiStatus } from '../../models/skipApiStatus.interface';
import { Holding, fetchTokenData } from '../../core/Portfolio';
import { ethers } from 'ethers';
import {
  SkipAPiEvmTx,
  SkipApiCosmosTxn,
  SkipApiSignMsg,
} from '../../models/skipApiSingMsg.interface';
import useSkipApiBridge from '../../core/skipApi';
import * as Sentry from '@sentry/react-native';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import Web3 from 'web3';
import { ChainIdNameMapping } from '../../constants/data';
import TokenSelection from './tokenSelection';
import RoutePreview from './routePreview';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { t } from 'i18next';
import { AnalyticsType, ButtonType } from '../../constants/enum';
import { useRoute } from '@react-navigation/native';
import SignatureModal from '../../components/v2/signatureModal';
import { GasPriceDetail } from '../../core/types';
import { SvgUri } from 'react-native-svg';
import JSONTree from 'react-native-json-tree';
import Loading from '../../components/v2/loading';
import { StyleSheet } from 'react-native';
import {
  AnalyticEvent,
  logAnalytics as firebaseAnalytics,
} from '../../core/analytics';
import { AllowanceParams } from '../../models/swapMetaData';
import useTransactionManager from '../../hooks/useTransactionManager';
import { checkAllowance } from '../../core/swap';
import { ODOS_SWAP_QUOTE_GASLIMIT_MULTIPLICATION_FACTOR } from '../Portfolio/constants';
import { MODAL_HIDE_TIMEOUT, MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { screenTitle } from '../../constants';
import { genId } from '../utilities/activityUtilities';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  ExchangeTransaction,
} from '../../reducers/activity_reducer';
import { Transaction } from '@solana/web3.js';

enum TxnStatus {
  STATE_SUBMITTED = 'STATE_SUBMITTED',
  STATE_PENDING = 'STATE_PENDING',
  STATE_COMPLETED_SUCCESS = 'STATE_COMPLETED_SUCCESS',
  STATE_COMPLETED_ERROR = 'STATE_COMPLETED_ERROR',
  STATE_ABANDONED = 'STATE_ABANDONED',
  STATE_PENDING_ERROR = 'STATE_PENDING_ERROR',
}

export default function BridgeSkipApi(props: {
  navigation?: any;
  route?: any;
}) {
  const routeData = props.route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const totalHoldings: Holding[] =
    portfolioState.statePortfolio.tokenPortfolio.totalHoldings;
  const { getFromOtherSource, postToOtherSource, getWithAuth, postWithAuth } =
    useAxios();
  const {
    skipApiApproveAndSignEvm,
    skipApiSignAndBroadcast,
    skipApiSignAndApproveSolana,
  } = useSkipApiBridge();
  const hdWallet = useContext<any>(HdWalletContext);
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const route = useRoute();
  const { getApproval, swapTokens } = useTransactionManager();
  const activityContext = useContext<any>(ActivityContext);
  const activityId = useRef<string>('id');

  const slippage = 0.4;
  const ethereum = hdWallet.state.wallet.ethereum;

  const [index, setIndex] = useState<number>(0);
  const [skipApiChainsData, setSkipApiChainsData] = useState<
    SkipApiChainInterface[]
  >([]);
  const [tokenData, setTokenData] = useState<
    Record<string, { assets: SkipApiToken[] }>
  >({});
  const [swapTokenData, setSwapTokenData] = useState<Array<{
    address: string;
    decimals: number;
    isNative: boolean;
    isVerified: boolean;
    logo: string;
    name: string;
    symbol: string;
    tokenPrice: number;
  }> | null>(null);
  const [chainInfo, setChainInfo] = useState<SkipApiChainInterface[]>([]);
  const [fromChainData, setFromChainData] = useState<SkipApiChainInterface[]>(
    [],
  );
  const [toChainData, setToChainData] = useState<SkipApiChainInterface[]>([]);
  const [fromTokenData, setFromTokenData] = useState<SkipApiToken[]>([]);
  const [toTokenData, setToTokenData] = useState<SkipApiToken[]>([]);
  const [selectedFromChain, setSelectedFromChain] =
    useState<SkipApiChainInterface | null>(null);
  const [selectedFromToken, setSelectedFromToken] =
    useState<SkipApiToken | null>(null);
  const [selectedToChain, setSelectedToChain] =
    useState<SkipApiChainInterface | null>(null);
  const [selectedToToken, setSelectedToToken] = useState<SkipApiToken | null>(
    null,
  );
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('0.0');
  const [loading, setLoading] = useState<boolean>(false);
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(false);
  const [routeResponse, setRouteResponse] =
    useState<SkipApiRouteResponse | null>(null);
  const [statusResponse, setStatusResponse] = useState<SkipApiStatus[]>([]);
  const [amountOut, setAmountOut] = useState<string>('0.0');
  const [amountOuUsd, setAmountOutUSd] = useState<string>('0.0');
  const [error, setError] = useState<string>('');
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
  } | null>(null);
  const [evmTxnParams, setEvmTxnParams] = useState<SkipAPiEvmTx | null>(null);
  const [cosmosTxnParams, setCosmosTxnParams] =
    useState<SkipApiCosmosTxn | null>(null);
  const [solanaTxnParams, setSolanaTxnParams] = useState<Transaction | null>(
    null,
  );
  const [toggling, setToggling] = useState<boolean>(false);

  // ------------- for swap states -----------------
  const [swapSupportedChains, setSwapSupportedChains] = useState([
    1, 137, 10, 43114, 42161, 56, 250, 324, 8453, 1101, 1313161554, 1284, 1285,
  ]);
  const [allowanceParams, setAllowanceParams] = useState<AllowanceParams>({
    isApprovalModalVisible: false,
  } as unknown as AllowanceParams);
  const [swapParams, setSwapParams] = useState({});
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const [quoteData, setQuoteData] = useState<any>(null);

  // --------------------- swap funcitons -------------------------

  // for swap
  const getSwapSupportedChains = async (
    skipApiChains: SkipApiChainInterface[],
  ) => {
    const response = await getWithAuth('/v1/swap/evm/chains');
    if (!response.isError && response?.data?.chains) {
      const { chains } = response.data ?? [];

      setSwapSupportedChains(chains);
      return chains;
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: response?.error?.message ?? t('FETCH_SKIP_API_ERROR'),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    }

    return [];
  };

  // for bridge
  const getChains = async () => {
    const {
      isError,
      data,
      error: FetchError,
    } = await getFromOtherSource(
      'https://api.skip.money/v2/info/chains?include_evm=true&include_svm=true',
    );

    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('FETCH_SKIP_API_ERROR'),
        description: 'Unable to fetch data, please try again',
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    } else {
      setError('');
      const skipApiChains: SkipApiChainInterface[] = get(data, 'chains', []);
      setSkipApiChainsData(skipApiChains);
      setChainInfo(skipApiChains);
      const chainsData = getAvailableChains(hdWallet);
      const chains = filter(skipApiChains, item2 => {
        return some(chainsData, item1 => {
          return (
            parseInt(item1.chain_id, 16) === parseInt(item2.chain_id, 10) ||
            item1.chain_id === item2.chain_id
          );
        });
      });
      // setFromChainData(chains);
      let tempSelectedFromChain;
      if (routeData?.fromChainData?.chainDetails) {
        const { chain_id: chainID } = get(
          routeData,
          ['fromChainData', 'chainDetails'],
          '',
        );
        tempSelectedFromChain = chains.find(
          chain =>
            parseInt(chain.chain_id, 10) === parseInt(chainID, 16) ||
            chain.chain_id === chainID,
        );
      } else {
        tempSelectedFromChain = chains[0];
      }

      const swapChains = await getSwapSupportedChains(chains);

      const odosChains = getAvailableChains(hdWallet).filter(chain =>
        swapChains.includes(chain.chainIdNumber),
      );

      const fromChainIDs = new Set(
        skipApiChains.map(chain => parseInt(chain.chain_id, 10)),
      );

      const filteredChains = odosChains.filter(
        chain => !fromChainIDs.has(parseInt(chain.chain_id, 16)),
      );

      const formattedChainData = filteredChains.map(item => {
        return {
          chain_id: item.chainIdNumber.toString(),
          chain_name: item.name,
          chain_type: 'evm',
          logo_uri: item.logo_url,
        };
      }) as unknown as SkipApiChainInterface[];

      setSelectedFromChain(tempSelectedFromChain as any);
      setFromChainData([...chains, ...formattedChainData]);
      await getTokens();
    }
  };

  // for swap
  const getSwapSupportedTokens = async (): Promise<
    Array<{
      address: string;
      decimals: number;
      isNative: boolean;
      isVerified: boolean;
      logo: string;
      name: string;
      symbol: string;
      tokenPrice: number;
    }>
  > => {
    if (
      selectedFromChain &&
      swapSupportedChains.includes(parseInt(selectedFromChain?.chain_id, 10))
    ) {
      const {
        data,
        isError,
        error: swapTokenError,
      } = await getWithAuth(
        `/v1/swap/evm/chains/${selectedFromChain?.chain_id}/tokens`,
      );
      if (!isError) {
        const tempTokens = get(data, 'tokens', []);
        setSwapTokenData(tempTokens);
        return tempTokens;
      } else {
        showModal('state', {
          type: 'error',
          title: '',
          description: swapTokenError?.message ?? t('FETCH_SKIP_API_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
    return [];
  };

  // for bridge
  const getTokens = async () => {
    const {
      isError,
      data,
      error: fetchError,
    } = await getFromOtherSource(
      'https://api.skip.money/v1/fungible/assets?include_no_metadata_assets=false&include_cw20_assets=false&include_evm_assets=true&include_svm_assets=true',
    );
    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('FETCH_SKIP_API_ERROR'),
        description: JSON.stringify(fetchError),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    } else {
      const tokenDataFormApi = get(data, 'chain_to_assets_map');
      setTokenData(tokenDataFormApi);
    }
  };

  const setFromTokens = async () => {
    if (fromChainData && selectedFromChain) {
      const chainsData = getAvailableChains(hdWallet);
      let swapTokensTemp: any = [];

      let chainData;

      const chains = filter(skipApiChainsData, item2 => {
        return some(chainsData, item1 => {
          return (
            parseInt(item1.chain_id, 16) === parseInt(item2.chain_id, 10) ||
            item1.chain_id === item2.chain_id
          );
        });
      });

      const fromChainIDs = new Set(
        chains.map(chain => parseInt(chain.chain_id, 10)),
      );

      const isSwapSupportedChain = swapSupportedChains.includes(
        parseInt(selectedFromChain.chain_id, 10),
      );

      const isOnlySwapSupportedChain =
        swapSupportedChains.includes(
          parseInt(selectedFromChain.chain_id, 10),
        ) && !fromChainIDs.has(parseInt(selectedFromChain.chain_id, 10));

      if (isSwapSupportedChain || isOnlySwapSupportedChain) {
        swapTokensTemp = await getSwapSupportedTokens();
      }

      if (isOnlySwapSupportedChain) {
        const odosChains = getAvailableChains(hdWallet).filter(chain =>
          swapSupportedChains.includes(chain.chainIdNumber),
        );

        const filteredChains = odosChains.filter(
          chain => !fromChainIDs.has(parseInt(chain.chain_id, 16)),
        );

        const formattedChainData = filteredChains.map(item => {
          return {
            chain_id: item.chainIdNumber.toString(),
            chain_name: item.name,
            chain_type: 'evm',
            logo_uri: item.logo_url,
          };
        }) as unknown as SkipApiChainInterface[];

        chainData = [...formattedChainData];
      } else if (isSwapSupportedChain) {
        chainData = [...chains];
      } else {
        chainData = filter(skipApiChainsData, item2 => {
          return some(chainsData, item1 => {
            return (
              (parseInt(item1.chain_id, 16) === parseInt(item2.chain_id, 10) ||
                item1.chain_id === item2.chain_id) &&
              item2.chain_name !== selectedFromChain?.chain_name
            );
          });
        });
      }

      setToChainData([...chainData]);
      if (!toggling) setSelectedToChain(chainData[0]);

      if (totalHoldings) {
        const skipApiTokens = get(
          tokenData,
          [selectedFromChain.chain_id, 'assets'],
          [],
        );

        const tokensToParse = skipApiTokens.filter(item2 => {
          return totalHoldings.some((item1: Holding) => {
            return (
              (parseInt(item1.chainDetails.chain_id, 16) ===
                parseInt(item2.chain_id, 10) ||
                item1.chainDetails.chain_id === item2.chain_id) &&
              (isSwapSupportedChain || isOnlySwapSupportedChain
                ? item1.symbol === item2.symbol
                : item1.symbol === item2.recommended_symbol)
            );
          });
        });

        let filteredTokens;

        if (isOnlySwapSupportedChain) {
          const odosTokens = swapTokensTemp.filter(item2 => {
            return totalHoldings.some((item1: Holding) => {
              return (
                item1.symbol === item2.symbol &&
                item1.chainDetails.chainIdNumber ===
                  parseInt(selectedFromChain.chain_id, 10)
              );
            });
          });

          const formattedTokensData = odosTokens.map(item => {
            return {
              denom: item.address,
              chain_id: selectedFromChain.chain_id,
              origin_denom: '',
              origin_chain_id: '',
              trace: '',
              is_cw20: false,
              is_evm: true,
              is_svm: false,
              symbol: item.symbol,
              name: item.name,
              logo_uri: item.logo,
              decimals: item.decimals,
              coingecko_id: '',
              token_contract: item.address,
              recommended_symbol: item.symbol,
            };
          }) as unknown as SkipApiChainInterface[];
          filteredTokens = formattedTokensData;
        } else if (isSwapSupportedChain || isOnlySwapSupportedChain) {
          const odosTokenSymbol = new Set(
            swapTokensTemp.map(token => token.symbol),
          );

          filteredTokens = tokensToParse.filter(
            token =>
              odosTokenSymbol.has(token.symbol) ||
              odosTokenSymbol.has(token.recommended_symbol),
          );
        } else {
          filteredTokens = tokensToParse;
        }

        const tempTokens = filteredTokens.map(item2 => {
          const matchingWalletToken = totalHoldings.find(
            (item1: Holding) =>
              (parseInt(item1.chainDetails.chain_id, 16) ===
                parseInt(item2.chain_id, 10) ||
                item1.chainDetails.chain_id === item2.chain_id) &&
              item1.symbol === item2.recommended_symbol &&
              item1.isVerified,
          );

          return {
            ...item2,
            balanceInNumbers: matchingWalletToken
              ? matchingWalletToken.actualBalance
              : null,
            totalValue: matchingWalletToken
              ? matchingWalletToken.totalValue
              : null,
            chainDetails: matchingWalletToken
              ? matchingWalletToken.chainDetails
              : null,
            actualBalance: matchingWalletToken
              ? matchingWalletToken.actualBalance
              : null,
            price: matchingWalletToken ? matchingWalletToken.price : null,
            skipApiChain: selectedFromChain,
          };
        });

        setFromTokenData(orderBy(tempTokens, ['balanceInNumbers'], ['desc']));

        let tempSelectedFromToken;
        if (routeData?.fromChainData) {
          const { symbol } = get(routeData, ['fromChainData'], '');
          tempSelectedFromToken = tempTokens.find(
            token =>
              token.recommended_symbol === symbol || token.symbol === symbol,
          );
        } else {
          tempSelectedFromToken = tempTokens[0];
        }

        if (!toggling) setSelectedFromToken(tempSelectedFromToken);
      }
    }
  };

  useEffect(() => {
    try {
      void getChains();
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    }
  }, [portfolioState]);

  useEffect(() => {
    void setFromTokens();
  }, [
    fromChainData,
    selectedFromChain,
    skipApiChainsData,
    tokenData,
    portfolioState,
  ]);

  useEffect(() => {
    if (selectedToChain) {
      if (isSwap() && swapTokenData && selectedFromChain) {
        const tokens = swapTokenData?.map(item => {
          return {
            chain_id: parseInt(selectedFromChain.chain_id, 10).toString(),
            coingecko_id: '',
            decimals: item.decimals,
            denom: item.address,
            description: '',
            is_cw20: false,
            is_evm: true,
            is_svm: false,
            logo_uri: item.logo,
            name: item.name,
            origin_chain_id: '',
            origin_denom: '',
            recommended_symbol: item.symbol,
            symbol: item.symbol,
            trace: '',
            isNative: item.isNative,
          };
        }) as unknown as SkipApiToken[];

        setToTokenData(orderBy(tokens, ['name'], ['asc']));
        const tempTokens = tokens.map(item => {
          return {
            ...item,
            skipApiChain: selectedToChain,
          };
        });
        if (toggling) {
          setToggling(false);
        } else {
          setSelectedToToken(tempTokens[0]);
        }
      } else {
        const skipApiTokens = get(
          tokenData,
          [selectedToChain.chain_id, 'assets'],
          [],
        );
        const tempTokens = skipApiTokens.map(item => {
          return {
            ...item,
            skipApiChain: selectedToChain,
          };
        });
        setToTokenData(orderBy(tempTokens, ['name'], ['asc']));
        if (toggling) {
          setToggling(false);
        } else {
          setSelectedToToken(tempTokens[0]);
        }
      }
    }
  }, [selectedToChain, tokenData, selectedFromChain]);

  useEffect(() => {
    if (
      selectedFromChain &&
      selectedFromToken &&
      selectedToChain &&
      selectedToToken &&
      !isEmpty(cryptoAmount) &&
      parseFloat(cryptoAmount) > 0
    ) {
      if (isSwap()) {
        void swap();
      } else {
        void onGetQuote();
      }
    }
  }, [
    selectedFromChain,
    selectedFromToken,
    selectedToChain,
    selectedToToken,
    cryptoAmount,
  ]);

  useEffect(() => {
    if (selectedFromChain && selectedFromToken && !isEmpty(cryptoAmount)) {
      const tempUsdAmount =
        parseFloat(cryptoAmount) * parseFloat(selectedFromToken.price ?? '0');

      setUsdAmount(tempUsdAmount.toFixed(4));
    } else {
      setUsdAmount('0.0');
    }
  }, [cryptoAmount, selectedFromToken]);

  useEffect(() => {
    if (selectedFromToken) {
      const { chainDetails } = selectedFromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol: string =
        get(NativeTokenMapping, symbol) || symbol;

      const nativeTokBal = getNativeToken(
        nativeTokenSymbol,
        portfolioState.statePortfolio.tokenPortfolio[
          ChainNameMapping[backendName as ChainBackendNames]
        ]?.holdings,
      )?.actualBalance;

      setNativeTokenBalance(nativeTokBal ?? 0);
    }
  }, [selectedFromToken]);

  const handleApprove = () => {
    setApproveModalVisible(false);
    if (modalPromiseResolver) {
      modalPromiseResolver(true);
      setModalPromiseResolver(null);
    }
  };

  const handleReject = () => {
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

  // bridge
  const onGetQuote = async () => {
    if (
      selectedFromToken &&
      selectedToToken &&
      parseFloat(cryptoAmount) > 0 &&
      !isSwap()
    ) {
      setLoading(true);
      const routeBody = {
        amount_in: ethers
          .parseUnits(cryptoAmount, selectedFromToken.decimals)
          .toString(),
        source_asset_denom: get(selectedFromToken, 'denom', ''),
        source_asset_chain_id: get(selectedFromToken, 'chain_id', ''),
        dest_asset_denom: get(selectedToToken, 'denom', ''),
        dest_asset_chain_id: get(selectedToToken, 'chain_id', ''),
        cumulative_affiliate_fee_bps: '0',
        allow_multi_tx: true,
        allow_unsafe: true,
        allow_swaps: true,
        smart_relay: true,
        smart_swap_options: { split_routes: true },
        experimental_features: ['cctp'],
        bridges: ['CCTP', 'IBC'],
      };

      const {
        isError,
        error: quoteError,
        data,
      } = await postToOtherSource(
        'https://api.skip.money/v2/fungible/route',
        routeBody,
      );
      if (!isError) {
        setError('');
        setRouteResponse(data);
        const cryptoAmountTemp = get(data, 'estimated_amount_out', '0.0');
        const usdAmountTemp = get(data, 'usd_amount_out', '0.0');

        setAmountOut(
          ethers.formatUnits(cryptoAmountTemp, selectedToToken.decimals),
        );
        setAmountOutUSd(usdAmountTemp);

        firebaseAnalytics(AnalyticEvent.SKIP_API_BRIDGE_QUOTE, {
          fromChain: selectedFromChain?.chain_name,
          fromToken: selectedFromToken?.name,
          fromTokenSymbol: selectedFromToken.recommended_symbol,
          toChain: selectedToChain?.chain_name,
          toToken: selectedToToken.name,
          toTokenSymbol: selectedToToken.recommended_symbol,
          quoteAmountCrypto: cryptoAmount,
          quoteAmountUsd: usdAmount,
          receivedAmount: amountOut,
          receivedAMountUsd: amountOuUsd,
        });
      } else {
        setRouteResponse(null);
        setError(capitalize(quoteError) ?? 'No route found');
        setAmountOut('0.0');
        setAmountOutUSd('0.0');
      }
      setLoading(false);
    }
  };

  // bridge
  const getAddress = (chains: string[]) => {
    const addressList = chains.map(id => {
      const chainName = get(ChainIdNameMapping, id);
      const chain = get(hdWallet, ['state', 'wallet', chainName]);
      return chain.address;
    });
    return addressList;
  };

  // bridge
  const onGetMsg = async () => {
    if (
      !routeResponse ||
      !selectedFromChain ||
      !selectedToChain ||
      !selectedFromToken ||
      !selectedToToken
    )
      return;

    const requiredAddresses = getAddress(
      routeResponse.required_chain_addresses,
    );

    setLoading(true);

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
        showModal('state', {
          type: 'error',
          title: t('FETCH_SKIP_API_ERROR'),
          description: JSON.stringify(fetchError),
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
        return;
      }
      await evmTxnMsg(data);
      await cosmosTxnMsg(data);
      await solanaTxnMsg(data);

      firebaseAnalytics(AnalyticEvent.SKIP_API_BRIDGE_SUCESS, {
        fromChain: selectedFromChain?.chain_name,
        fromToken: selectedFromToken?.name,
        fromTokenSymbol: selectedFromToken?.recommended_symbol,
        toChain: selectedToChain?.chain_name,
        toToken: selectedToToken?.name,
        toTokenSymbol: selectedToToken?.recommended_symbol,
        quoteAmountCrypto: cryptoAmount,
        quoteAmountUsd: usdAmount,
        receivedAmount: amountOut,
        receivedAMountUsd: amountOuUsd,
      });
    } catch (e: any) {
      setLoading(false);

      // monitoring API
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: `${selectedFromChain?.chain_name ?? ''} to ${selectedToChain?.chain_name ?? ''}`,
        message: `Bridge failed: ${e.message as string}`,
        screen: route.name,
      });
      firebaseAnalytics(AnalyticEvent.SKIP_API_BRIDGE_ERROR, {
        fromChain: selectedFromChain?.chain_name,
        fromToken: selectedFromToken?.name,
        fromTokenSymbol: selectedFromToken?.recommended_symbol,
        toChain: selectedToChain?.chain_name,
        toToken: selectedToToken?.name,
        toTokenSymbol: selectedToToken?.recommended_symbol,
        quoteAmountCrypto: cryptoAmount,
        quoteAmountUsd: usdAmount,
        receivedAmount: amountOut,
        receivedAMountUsd: amountOuUsd,
        error: e.message,
      });
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('UNEXCPECTED_ERROR'),
          description: e?.message ?? JSON.stringify(e),
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  // bridge
  const evmTxnMsg = async (data: SkipApiSignMsg) => {
    const web3 = new Web3(
      getWeb3Endpoint(
        selectedFromToken?.chainDetails as Chain,
        globalStateContext,
      ),
    );

    if (selectedFromToken) {
      try {
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
            await trackSign(cosmosResponse.hash, cosmosResponse.chainId);
          } else {
            throw new Error(cosmosResponse.error);
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
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      } else {
        await trackStatus(tx_hash, chainID, true);
      }
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: onModalHide,
        onFailure: onModalHide,
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
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      } else {
        await trackStatus(hash, chainID, true);
      }
    } catch (e) {
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: JSON.stringify(e),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    }
  };

  // bridge
  const trackStatus = async (
    hash: string,
    chainID: string,
    append: boolean,
  ) => {
    const {
      isError,
      error: fetchError,
      data,
    } = await getFromOtherSource(
      `https://api.skip.money/v2/tx/status?tx_hash=${hash}&chain_id=${chainID}`,
    );
    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('FETCH_SKIP_API_ERROR'),
        description: JSON.stringify(fetchError),
        onSuccess: hideModal,
        onFailure: hideModal,
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
        setStatusResponse(prevResp => [...prevResp, ...tempData]);
      } else {
        setStatusResponse(prevResp => {
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
  };

  function onModalHide(type = '') {
    hideModal();
    setTimeout(() => {
      props.navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  const isSwap = () => {
    if (
      selectedFromChain &&
      selectedToChain &&
      selectedFromChain.chain_id === selectedToChain.chain_id &&
      selectedFromChain.chain_name === selectedToChain.chain_name
    ) {
      return true;
    }
    return false;
  };

  // swap
  const swap = async () => {
    try {
      if (
        selectedToToken &&
        selectedFromToken &&
        selectedToChain &&
        selectedFromChain &&
        isSwap()
      ) {
        setLoading(true);
        const nativeTokenSymbol =
          NativeTokenMapping[selectedFromToken?.chainDetails?.symbol] ||
          selectedFromToken?.chainDetails?.symbol;
        const isNative = selectedFromToken?.symbol === nativeTokenSymbol;
        const fromTokenContractAddress = isNative
          ? '0x0000000000000000000000000000000000000000'
          : selectedFromToken?.denom;
        const payload = {
          fromTokenList: [
            {
              address: fromTokenContractAddress,
              amount: cryptoAmount.toString(),
            },
          ],
          toToken: selectedToToken.isNative
            ? '0x0000000000000000000000000000000000000000'
            : selectedToToken.denom,
          slippage,
          walletAddress: ethereum.address,
        };

        const response = await postWithAuth(
          `/v1/swap/evm/chains/${parseInt(selectedFromChain?.chain_id, 10)}/quote`,
          payload,
        );

        if (!response.isError) {
          setLoading(false);
          const responseQuoteData = response.data;
          setAmountOut(
            parseFloat(responseQuoteData?.toToken?.amount).toFixed(4),
          );
          setAmountOutUSd(parseFloat(responseQuoteData?.value).toFixed(4));
          setQuoteData(responseQuoteData);
        } else {
          setLoading(false);
          throw new Error(response.error);
        }
      }
    } catch (e: any) {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    }
  };

  const onAcceptSwap = async ({ showQuote = true }) => {
    if (
      selectedToToken &&
      selectedFromToken &&
      selectedToChain &&
      selectedFromChain &&
      quoteData
    ) {
      try {
        const routerAddress = quoteData.router;
        const nativeTokenSymbol =
          NativeTokenMapping[selectedFromToken?.chainDetails?.symbol] ||
          selectedFromToken?.chainDetails?.symbol;
        const isNative = selectedFromToken?.symbol === nativeTokenSymbol;
        const fromTokenContractAddress = isNative
          ? '0x0000000000000000000000000000000000000000'
          : selectedFromToken?.denom;

        const web3 = new Web3(
          getWeb3Endpoint(selectedFromToken?.chainDetails, globalStateContext),
        );

        if (!isNative) {
          const allowanceResponse = await checkAllowance({
            web3,
            fromToken: selectedFromToken,
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
                fromToken: selectedFromToken,
                toToken: selectedToToken,
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
      } catch (e: any) {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('UNEXCPECTED_ERROR'),
          description: e?.message ?? JSON.stringify(e),
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      }
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
        parseFloat(cryptoAmount) <=
        parseFloat(String(selectedFromToken?.actualBalance))
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
        fromToken: selectedFromToken,
        toToken: selectedToToken,
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
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: e?.message ?? JSON.stringify(e),
        onSuccess: onModalHide,
        onFailure: onModalHide,
      });
    }
  };

  const onApproveSwap = async () => {
    setLoading(true);
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
      chainDetails: selectedFromChain,
      contractParams: {
        toAddress: routerAddress,
        numberOfTokens: String(parseFloat(cryptoAmount) * 1000000),
      },
    });
    if (!response.isError) {
      void onAcceptSwap({ showQuote: false });
    } else {
      setLoading(false);
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
      if (
        selectedFromChain &&
        selectedToChain &&
        selectedFromToken &&
        selectedToToken
      ) {
        setSignModalVisible(false);
        const { quoteData, isAllowance } = confirmSwapParams;
        if (isAllowance) {
          setLoading(true);
          const id = genId();
          const activityData: ExchangeTransaction = {
            id,
            status: ActivityStatus.PENDING,
            type: isSwap() ? ActivityType.SWAP : ActivityType.BRIDGE,
            quoteId: quoteData?.quoteId,
            fromChain: selectedFromChain.chain_name,
            toChain: selectedToChain.chain_name,
            fromToken: selectedFromToken?.name,
            toToken: selectedToToken?.name,
            fromSymbol: selectedFromToken?.symbol,
            toSymbol: selectedToToken?.symbol,
            fromTokenLogoUrl: selectedFromToken?.logo_uri,
            toTokenLogoUrl: selectedToToken?.logo_uri,
            fromTokenAmount: parseFloat(cryptoAmount).toFixed(3),
            toTokenAmount: quoteData?.toToken?.amount.toString(),
            datetime: new Date(),
            transactionHash: '',
            quoteData: {
              fromAmountUsd:
                Number(cryptoAmount) * Number(selectedFromToken?.price),
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
            setLoading(false);
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
                onModalHide('success');
              },
              onFailure: hideModal,
            });
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: response.receipt.transactionHash,
              chain: selectedFromChain.chain_name,
            });
          } else {
            setLoading(false);
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
              chain: selectedFromChain.chain_name,
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
        throw new Error('Insufficient parameters');
      }
    } catch (error: any) {
      setLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedFromChain?.chain_name,
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
          Allow Cypher to access your {selectedFromToken?.name}
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
              {selectedFromToken?.chainDetails?.symbol}
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
              setLoading(false);
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
    if (selectedFromToken) {
      const { actualBalance, chainDetails } = selectedFromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol: string =
        get(NativeTokenMapping, symbol) || symbol;
      const gas = swapParams?.gasFeeETH;

      if (parseFloat(cryptoAmount) > parseFloat(String(actualBalance))) {
        return renderWarningPopupMessage(
          t<string>('INSUFFICIENT_BALANCE_SWAP'),
        );
      } else if (
        !GASLESS_CHAINS.includes(backendName) &&
        nativeTokenBalance <= gas
      ) {
        return renderWarningPopupMessage(
          `Insufficient ${nativeTokenSymbol} for gas fee`,
        );
      } else if (
        selectedFromToken?.symbol === nativeTokenSymbol &&
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

  const isExchangeDisabled = () => {
    if (selectedFromToken) {
      const { actualBalance, chainDetails } = selectedFromToken;
      const { symbol, backendName } = chainDetails ?? {};
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      const gas = swapParams?.gasFeeETH;
      const isGaslessChain = GASLESS_CHAINS.includes(backendName);
      const hasInSufficientGas =
        (!isGaslessChain && nativeTokenBalance <= gas) ||
        (selectedFromToken?.symbol === nativeTokenSymbol &&
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

  const onBridgeSuccess = async (status: string) => {
    if (
      selectedFromChain &&
      selectedToChain &&
      selectedFromToken &&
      selectedToToken &&
      routeResponse
    ) {
      setPortfolioLoading(true);

      const id = genId();
      const activityData: ExchangeTransaction = {
        id,
        status:
          status === 'success' ? ActivityStatus.SUCCESS : ActivityStatus.FAILED,
        type: isSwap() ? ActivityType.SWAP : ActivityType.BRIDGE,
        quoteId: quoteData?.quoteId,
        fromChain: selectedFromChain.chain_name,
        toChain: selectedToChain.chain_name,
        fromToken: selectedFromToken.name,
        toToken: selectedToToken.name,
        fromSymbol: selectedFromToken.symbol,
        toSymbol: selectedToToken.symbol,
        fromTokenLogoUrl: selectedFromToken.logo_uri,
        toTokenLogoUrl: selectedToToken.logo_uri,
        fromTokenAmount: parseFloat(cryptoAmount).toFixed(3),
        toTokenAmount: parseFloat(routeResponse?.usd_amount_out).toString(3),
        datetime: new Date(),
        transactionHash: '',
        quoteData: {
          fromAmountUsd: parseFloat(routeResponse?.usd_amount_in),
          toAmountUsd: parseFloat(routeResponse?.usd_amount_out),
          gasFee: '',
        },
      };

      activityId.current = id;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityData,
      });

      await fetchTokenData(hdWallet, portfolioState, true);
      setPortfolioLoading(false);
    }
  };

  // eslint-disable-next-line react/no-unstable-nested-components
  function Components() {
    switch (index) {
      case 0:
        return (
          <TokenSelection
            selectedFromChain={selectedFromChain}
            setSelectedFromChain={setSelectedFromChain}
            fromChainData={fromChainData}
            selectedFromToken={selectedFromToken}
            setSelectedFromToken={setSelectedFromToken}
            fromTokenData={fromTokenData}
            selectedToChain={selectedToChain}
            setSelectedToChain={setSelectedToChain}
            toChainData={toChainData}
            selectedToToken={selectedToToken}
            setSelectedToToken={setSelectedToToken}
            toTokenData={toTokenData}
            cryptoAmount={cryptoAmount}
            usdAmount={usdAmount}
            setCryptoAmount={setCryptoAmount}
            amountOut={amountOut}
            usdAmountOut={amountOuUsd}
            setToggling={setToggling}
          />
        );

      case 1:
        return (
          <RoutePreview
            setIndex={setIndex}
            routeResponse={routeResponse}
            chainInfo={chainInfo}
            tokenData={tokenData}
            loading={loading}
            onGetMSg={onGetMsg}
            statusResponse={statusResponse}
            onBridgeSuccess={onBridgeSuccess}
          />
        );
    }
  }

  if (isEmpty(tokenData) || isEmpty(chainInfo) || portfolioLoading)
    return <Loading />;
  return (
    <CyDSafeAreaView>
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
            <CyDView className='flex flex-row justify-center'>
              <CyDImage
                source={AppImages.APP_LOGO}
                className='h-[60px] w-[60px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDText className='text-center font-bold text-[22px] mt-[10px]'>
              Allow Cypher to access your {selectedFromToken?.name}
            </CyDText>
            <CyDView className='border-t-[1px] border-b-[1px] border-sepratorColor my-[30px]'>
              <CyDView className='flex flex-row justify-between items-center pt-[20px]'>
                <CyDView className='flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.UNKNOWN_TXN_TOKEN}
                    className='h-[18px] w-[18px]'
                    resizeMode='contain'
                  />
                  <CyDText className=' py-[10px] w-[50%] ml-[15px] font-semibold'>
                    {t<string>('TOKEN')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDText className='text-right font-extrabold text-[14px]'>
                    {selectedFromToken.recommended_symbol}
                  </CyDText>
                  {endsWith(selectedFromToken?.logo_uri, '.svg') ? (
                    <SvgUri
                      width='24'
                      height='24'
                      className=''
                      uri={selectedFromToken?.logo_uri ?? ''}
                    />
                  ) : (
                    <CyDFastImage
                      source={{
                        uri: selectedFromToken?.logo_uri,
                      }}
                      className={'w-[24px] h-[24px]'}
                    />
                  )}
                </CyDView>
              </CyDView>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDView className='flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.UNKNOWN_TXN_TOKEN}
                    className='h-[18px] w-[18px]'
                    resizeMode='contain'
                  />
                  <CyDText className=' py-[10px] ml-[15px] font-semibold'>
                    {t<string>('AMOUNT_APPROVED')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDText className='text-right font-extrabold text-[14px]'>
                    {`${ethers.formatUnits(approveParams.tokens, selectedFromToken.decimals)}`}
                  </CyDText>
                  {endsWith(selectedFromToken?.logo_uri, '.svg') ? (
                    <SvgUri
                      width='24'
                      height='24'
                      className=''
                      uri={selectedFromToken?.logo_uri ?? ''}
                    />
                  ) : (
                    <CyDFastImage
                      source={{
                        uri: selectedFromToken?.logo_uri,
                      }}
                      className={'w-[24px] h-[24px]'}
                    />
                  )}
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='flex justify-end my-[30px]'>
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
            <CyDText className={'text-center text-[24px] font-bold mt-[20px]'}>
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
              <CyDText className='text-[12px] font-semibold'>{t('TO')}</CyDText>
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
            <CyDText className={'text-center text-[24px] font-bold mt-[20px]'}>
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
            {cosmosTxnParams.msgs.map((item, index) => {
              return (
                <CyDView key={index} className='mt-[8px]'>
                  <CyDText className='text-[12px] font-semibold'>
                    {item.msg_type_url}
                  </CyDText>
                  <CyDScrollView className='h-[200px] p-[4px] rounded-[8px] mt-8px border-separate border '>
                    {/* <CyDText>{item.msg}</CyDText> */}
                    <JSONTree data={JSON.parse(item.msg)} invertTheme={true} />
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
            <CyDText className={'text-center text-[24px] font-bold mt-[20px]'}>
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
          setSignModalVisible(false);
          // void setQuoteCancelReasons(dontAskAgain);
        }}
        avoidKeyboard={true}>
        <CyDView>
          <CyDView className={'px-[20px]'}>
            <CyDText className={'text-center text-[24px] font-bold mt-[20px]'}>
              {t<string>('SWAP_TOKENS')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
              }>
              <CyDView className={'flex w-[40%] items-center justify-center'}>
                <CyDView className='items-center'>
                  {endsWith(selectedFromToken?.logo_uri, '.svg') ? (
                    <SvgUri
                      width='24'
                      height='24'
                      className=''
                      uri={selectedFromToken?.logo_uri ?? ''}
                    />
                  ) : (
                    <CyDImage
                      source={{ uri: selectedFromToken?.logo_uri }}
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
                    {endsWith(selectedFromChain?.logo_uri, '.svg') ? (
                      <SvgUri
                        width='24'
                        height='24'
                        className=''
                        uri={selectedFromChain?.logo_uri ?? ''}
                      />
                    ) : (
                      <CyDImage
                        source={{ uri: selectedFromChain?.logo_uri }}
                        className={'w-[14px] h-[14px]'}
                      />
                    )}
                    <CyDText
                      className={
                        'ml-[6px] font-nunito font-normal text-black  text-[12px]'
                      }>
                      {selectedFromChain?.chain_name}
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
                  {endsWith(selectedToToken?.logo_uri, '.svg') ? (
                    <SvgUri
                      width='24'
                      height='24'
                      className=''
                      uri={selectedToToken?.logo_uri ?? ''}
                    />
                  ) : (
                    <CyDImage
                      source={{ uri: selectedToToken?.logo_uri }}
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
                    {endsWith(selectedToChain?.logo_uri, '.svg') ? (
                      <SvgUri
                        width='24'
                        height='24'
                        className=''
                        uri={selectedToChain?.logo_uri ?? ''}
                      />
                    ) : (
                      <CyDImage
                        source={{ uri: selectedToChain?.logo_uri }}
                        className={'w-[14px] h-[14px]'}
                      />
                    )}
                    <CyDText
                      className={
                        'ml-[6px] font-nunito text-black font-normal text-[12px]'
                      }>
                      {selectedToChain?.chain_name}
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
                  {formatAmount(swapParams?.amount).toString() +
                    ' ' +
                    String(selectedFromToken?.name)}
                </CyDText>
                <CyDText
                  className={
                    'font-nunito font-[12px] text-[#929292] font-bold'
                  }>
                  {(
                    Number(swapParams.amount) * Number(selectedFromToken?.price)
                  ).toFixed(4) + ' USD'}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView
              className={'mr-[10px] flex flex-row justify-between mt-[20px]'}>
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
                    swapParams?.quoteData?.toToken?.amount,
                  ).toString() +
                    ' ' +
                    String(selectedToToken?.name)}
                </CyDText>
                <CyDText
                  className={
                    'font-nunito font-[12px] text-[#929292] font-bold'
                  }>
                  {Number(swapParams?.quoteData?.value).toFixed(4) + ' USD'}
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
                  {' ' + String(selectedFromToken?.chainDetails?.symbol)}
                </CyDText>
                <CyDText className='font-bold text-subTextColor'>
                  {String(formatAmount(swapParams?.gasFeeDollar)) + ' USD'}
                </CyDText>
              </CyDView>
            </CyDView>
            <RenderWarningMessage />
          </CyDView>

          <CyDView
            className={
              'flex flex-row justify-center items-center px-[20px] pb-[50px] mt-[10px]'
            }>
            <Button
              title={t<string>('CANCEL')}
              disabled={loading}
              type={ButtonType.SECONDARY}
              onPress={() => {
                setSignModalVisible(false);
              }}
              style={'h-[60px] w-[166px] mr-[9px]'}
            />
            <Button
              title={t('SWAP')}
              loading={loading}
              onPress={() => {
                void onConfirmSwap(swapParams);
              }}
              disabled={isExchangeDisabled()}
              isPrivateKeyDependent={true}
              style={'h-[60px] w-[166px] ml-[9px]'}
            />
          </CyDView>
        </CyDView>
      </SignatureModal>

      <CyDScrollView className='h-full'>
        {Components()}
        {!isSwap() &&
          (!isEmpty(error) ||
            parseFloat(usdAmount) > (selectedFromToken?.totalValue ?? 0)) && (
            <CyDView className=' bg-red-100 rounded-[8px] p-[12px] flex flex-row gap-x-[12px] mx-[16px] mt-[16px] justify-between items-center'>
              <CyDFastImage
                source={AppImages.CYPHER_WARNING_RED}
                className='w-[32px] h-[32px]'
              />
              <CyDView className='w-[75%]'>
                {!isEmpty(error) && (
                  <CyDView className='flex flex-row gap-x-[8px]'>
                    <CyDText>{'\u2022'}</CyDText>
                    <CyDText>{error}</CyDText>
                  </CyDView>
                )}
                {parseFloat(usdAmount) >
                  (selectedFromToken?.totalValue ?? 0) && (
                  <CyDView className='flex flex-row gap-x-[8px]'>
                    <CyDText>{'\u2022'}</CyDText>
                    <CyDText>{t('INSUFFICIENT_BALANCE_BRIDGE')}</CyDText>
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          )}
        {!isSwap() &&
          !isEmpty(routeResponse?.estimated_fees) &&
          index === 0 && (
            <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px]'>
              {routeResponse?.estimated_fees.map((item, _index) => (
                <CyDView
                  key={_index}
                  className='mt-[8px] flex flex-row gap-x-[12px] justify-between items-center'>
                  <CyDFastImage
                    source={AppImages.GAS_STATION}
                    className='h-[32px] w-[32px]'
                  />
                  <CyDView className='w-[80%]'>
                    <CyDText className='text-[14px] font-medium'>{`$${item.usd_amount}`}</CyDText>
                    <CyDText className='text-[10px] font-medium'>
                      {'Estimated Network fee'}
                    </CyDText>
                    <CyDText className='text-[10px] font-medium'>
                      {`$${item.usd_amount} (${ethers.formatUnits(
                        item.amount,
                        item.origin_asset.decimals,
                      )} ${item.origin_asset.symbol})`}
                    </CyDText>
                  </CyDView>
                </CyDView>
              ))}
            </CyDView>
          )}
        {!isSwap() && routeResponse?.txs_required && index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px] text-[14px] font-semibold'>
            <CyDText className='text-[14px] font-semibold'>{`${routeResponse?.txs_required} signature required`}</CyDText>
          </CyDView>
        )}
        {!isSwap() && routeResponse?.warning && index === 0 && (
          <CyDView className=' w-[92%] ml-[16px] mt-[16px] bg-orange-100 rounded-[8px] p-[12px] flex flex-row justify-between'>
            <CyDView className='w-[15%] flex flex-col items-center justify-center'>
              <CyDFastImage
                source={AppImages.WARNING}
                className='w-[24px] h-[24px]'
              />
            </CyDView>
            <CyDText className='w-[75%]'>
              {routeResponse.warning.message}
            </CyDText>
          </CyDView>
        )}
        {isSwap() && quoteData && (
          <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px]'>
            <CyDView className={'px-[20px]'}>
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
                    {formatAmount(cryptoAmount).toString() +
                      ' ' +
                      String(selectedFromToken?.name)}
                  </CyDText>
                  <CyDText
                    className={
                      'font-nunito font-[12px] text-[#929292] font-bold'
                    }>
                    {(
                      Number(cryptoAmount) * Number(selectedFromToken?.price)
                    ).toFixed(4) + ' USD'}
                  </CyDText>
                </CyDView>
              </CyDView>

              <CyDView
                className={'mr-[10px] flex flex-row justify-between mt-[20px]'}>
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
                    {loading
                      ? 'Fetching data'
                      : formatAmount(quoteData?.toToken?.amount).toString() +
                        ' ' +
                        String(selectedToToken?.name)}
                  </CyDText>
                  <CyDText
                    className={
                      'font-nunito font-[12px] text-[#929292] font-bold'
                    }>
                    {loading
                      ? 'Fetching data'
                      : Number(quoteData?.value).toFixed(4) + ' USD'}
                  </CyDText>
                </CyDView>
              </CyDView>
              <RenderWarningMessage />
            </CyDView>
          </CyDView>
        )}
        {index === 0 && (
          <CyDView className='mx-[16px] mt-[16px]'>
            <Button
              onPress={() => {
                if (isSwap()) {
                  void onAcceptSwap({ showQuote: true });
                } else {
                  setStatusResponse([]);
                  setIndex(1);
                }
              }}
              title={isSwap() ? 'Swap' : 'Preview'}
              disabled={
                isSwap()
                  ? selectedFromToken
                    ? parseFloat(cryptoAmount) >
                      parseFloat(String(selectedFromToken.actualBalance))
                    : true
                  : parseFloat(usdAmount) >
                      (selectedFromToken?.totalValue ?? 0) ||
                    isEmpty(routeResponse)
              }
              loading={loading}
              loaderStyle={styles.loaderStyle}
            />
          </CyDView>
        )}
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderStyle: {
    height: 22,
  },
});
