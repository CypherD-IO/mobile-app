import React, { useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../styles/tailwindStyles';
import {
  HdWalletContext,
  PortfolioContext,
  getAvailableChains,
  getWeb3Endpoint,
  logAnalytics,
  setTimeOutNSec,
} from '../../core/util';
import { SkipApiChainInterface } from '../../models/skipApiChains.interface';
import { SkipApiToken } from '../../models/skipApiTokens.interface';
import useAxios from '../../core/HttpRequest';
import { capitalize, endsWith, filter, get, isEmpty, some } from 'lodash';
import { ALL_CHAINS, Chain, EVM_CHAINS } from '../../constants/server';
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
import {
  AnalyticsType,
  ButtonType,
  ConnectionTypes,
} from '../../constants/enum';
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
import { getConnectionType } from '../../core/asyncStorage';

enum TxnStatus {
  STATE_SUBMITTED = 'STATE_SUBMITTED',
  STATE_PENDING = 'STATE_PENDING',
  STATE_COMPLETED_SUCCESS = 'STATE_COMPLETED_SUCCESS',
  STATE_COMPLETED_ERROR = 'STATE_COMPLETED_ERROR',
  STATE_ABANDONED = 'STATE_ABANDONED',
  STATE_PENDING_ERROR = 'STATE_PENDING_ERROR',
}

export default function BridgeSkipApi({ navigation }: { navigation: any }) {
  const portfolioState = useContext<any>(PortfolioContext);
  const totalHoldings: Holding[] =
    portfolioState.statePortfolio.tokenPortfolio.totalHoldings;
  const { getFromOtherSource, postToOtherSource } = useAxios();
  const { skipApiApproveAndSignEvm, skipApiSignAndBroadcast } =
    useSkipApiBridge();
  const hdWallet = useContext<any>(HdWalletContext);
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const route = useRoute();

  const [index, setIndex] = useState<number>(0);
  const [skipApiChainsData, setSkipApiChainsData] = useState<
    SkipApiChainInterface[]
  >([]);
  const [tokenData, setTokenData] = useState<
    Record<string, { assets: SkipApiToken[] }>
  >({});
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

  const getChains = async () => {
    const {
      isError,
      data,
      error: fetchError,
    } = await getFromOtherSource(
      'https://api.skip.money/v2/info/chains?include_evm=true',
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
      setFromChainData(chains);
      setSelectedFromChain(chains[0]);
    }
    await getTokens();
  };

  const getTokens = async () => {
    const {
      isError,
      data,
      error: fetchError,
    } = await getFromOtherSource(
      'https://api.skip.money/v1/fungible/assets?include_no_metadata_assets=false&include_cw20_assets=false&include_evm_assets=true&include_svm_assets=false',
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
      const tokenDataFormApi = get(data, 'chain_to_assets_map');
      setTokenData(tokenDataFormApi);
    }
  };

  useEffect(() => {
    try {
      void getChains();
    } catch (e) {
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: JSON.stringify(e),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }, [portfolioState]);

  useEffect(() => {
    const initialiseTokens = async () => {
      if (fromChainData && selectedFromChain) {
        const chainsData = getAvailableChains(hdWallet);
        const chains = filter(skipApiChainsData, item2 => {
          return some(chainsData, item1 => {
            return (
              (parseInt(item1.chain_id, 16) === parseInt(item2.chain_id, 10) ||
                item1.chain_id === item2.chain_id) &&
              item2.chain_name !== selectedFromChain?.chain_name
            );
          });
        });

        setToChainData(chains);
        setSelectedToChain(chains[0]);

        if (totalHoldings) {
          const skipApiTokens = get(
            tokenData,
            [selectedFromChain.chain_id, 'assets'],
            [],
          );

          const tokensToParse = skipApiTokens
            .filter(item2 => {
              return totalHoldings.some((item1: Holding) => {
                return (
                  (parseInt(item1.chainDetails.chain_id, 16) ===
                    parseInt(item2.chain_id, 10) ||
                    item1.chainDetails.chain_id === item2.chain_id) &&
                  item1.symbol === item2.recommended_symbol
                );
              });
            })
            .map(item2 => {
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
                price: matchingWalletToken ? matchingWalletToken.price : null,
                skipApiChain: selectedFromChain,
              };
            });

          setFromTokenData(tokensToParse);
          setSelectedFromToken(tokensToParse[0]);
        }
      }
    };
    void initialiseTokens();
  }, [
    fromChainData,
    selectedFromChain,
    skipApiChainsData,
    tokenData,
    portfolioState,
  ]);

  useEffect(() => {
    if (selectedToChain) {
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
      setToTokenData(tempTokens);
      setSelectedToToken(tempTokens[0]);
    }
  }, [selectedToChain, tokenData]);

  useEffect(() => {
    if (
      selectedFromChain &&
      selectedFromToken &&
      selectedToChain &&
      selectedToToken &&
      !isEmpty(cryptoAmount) &&
      parseFloat(cryptoAmount) > 0
    ) {
      void onGetQuote();
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

  const onGetQuote = async () => {
    if (selectedFromToken && selectedToToken && parseFloat(cryptoAmount) > 0) {
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

  const getAddress = (chains: string[]) => {
    const addressList = chains.map(id => {
      const chainName = get(ChainIdNameMapping, id);
      const chain = get(hdWallet, ['state', 'wallet', chainName]);
      return chain.address;
    });
    return addressList;
  };

  const onGetMsg = async () => {
    if (!routeResponse) return;
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
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      await evmTxnMsg(data);
      await cosmosTxnMsg(data);

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
          description: e.message,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

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
        throw new Error(e.message);
      }
    }
  };

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
          throw new Error(e.message);
        }
      }
    }
  };

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
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        await trackStatus(hash, chainID, true);
      }
    } catch (e) {
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: JSON.stringify(e),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

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

  const onBridgeSuccess = async () => {
    setPortfolioLoading(true);
    await fetchTokenData(hdWallet, portfolioState, true);
    setPortfolioLoading(false);
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
            loading={loading}
            onMax={() => {}}
            onGetQuote={onGetQuote}
            amountOut={amountOut}
            usdAmountOut={amountOuUsd}
            setIndex={setIndex}
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
            // navigation={navigation}
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

      <CyDScrollView>
        {Components()}
        {(!isEmpty(error) ||
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
              {parseFloat(usdAmount) > (selectedFromToken?.totalValue ?? 0) && (
                <CyDView className='flex flex-row gap-x-[8px]'>
                  <CyDText>{'\u2022'}</CyDText>
                  <CyDText>{t('INSUFFICIENT_BALANCE_BRIDGE')}</CyDText>
                </CyDView>
              )}
            </CyDView>
          </CyDView>
        )}
        {!isEmpty(routeResponse?.estimated_fees) && (
          <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px]'>
            {routeResponse?.estimated_fees.map((item, index) => (
              <CyDView
                key={index}
                className='mt-[8px] flex flex-row gap-x-[12px] justify-between items-center'>
                <CyDFastImage
                  source={AppImages.INFO_CIRCLE}
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
        {routeResponse?.txs_required && index === 0 && (
          <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px] text-[14px] font-semibold'>
            <CyDText className='text-[14px] font-semibold'>{`${routeResponse?.txs_required} signature required`}</CyDText>
          </CyDView>
        )}
        {routeResponse?.warning && index === 0 && (
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
        {index === 0 && (
          <CyDView className='mx-[16px] mt-[16px]'>
            <Button
              onPress={() => {
                setStatusResponse([]);
                setIndex(1);
              }}
              title={'Review Route'}
              disabled={
                parseFloat(usdAmount) > (selectedFromToken?.totalValue ?? 0) ||
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
