/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import React, { useContext, useEffect, useState } from 'react';
import { t } from 'i18next';
import WebView from 'react-native-webview';
import EmptyView from '../../components/EmptyView';
import Loading from '../../components/v2/loading';
import { ChainBackendNames, ChainNames, CHAIN_OPTIMISM } from '../../constants/server';
import { calculateTime, getExplorerUrl, HdWalletContext, isCosmosChain } from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { CyDFastImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import axios from 'axios';
import { hostWorker } from '../../global';
import { PORTFOLIO_TIMEOUT } from '../../core/Http';
import { showToast } from '../utilities/toastUtility';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import { REFRESH_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { RefreshControl } from 'react-native';
import { TokenTransaction } from '../../models/transaction.model';

export function TokenTransactions ({ tokenData, navigation }: { tokenData: TokenMeta, navigation: { navigate: (screen: string, { url }: { url: string | undefined }) => void } }) {
  const [loading, setLoading] = useState<boolean>(false);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const hdWallet = useContext<any>(HdWalletContext);
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [lastPage, setLastPage] = useState<boolean>(false);
  const [noTransaction, setNoTransaction] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const { cosmos, osmosis, juno, stargaze } = hdWallet.state.wallet;
  const evmos = hdWallet.state.wallet.evmos;
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if ((tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && !tokenData.name.includes('IBC')) || (tokenData.chainDetails.chainName === ChainNames.ETH)) {
      setLoading(true);
      void fetchData();
    }
  }, []);

  const fetchData = async (isPullToRefresh?: boolean) => {
    let inputPageNumber = pageNumber;
    if (isPullToRefresh) {
      inputPageNumber = 0;
    }

    const getTransactionUrl = `${ARCH_HOST}/v1/portfolio/transactions`;
    await axios
      .post(getTransactionUrl,
        {
          address: hdWallet.state.wallet.ethereum.address,
          chain: tokenData.chainDetails.backendName,
          tokenAddress: tokenData.contractAddress,
          pageNumber: inputPageNumber,
          pageSize: 20
        },
        {
          timeout: PORTFOLIO_TIMEOUT
        })
      .then(res => {
        const len = Object.keys(res.data.transactions).length;
        if (res.data.hasMore === false) {
          if (inputPageNumber === 0 && len === 0) {
            setNoTransaction(true);
          } else {
            setLastPage(true);
          }
        }
        if (len > 0) {
          const out = [];
          let i = transactionList.length + 1;
          for (const txn of res.data.transactions) {
            txn.id = i;
            out.push(txn);
            i++;
          }
          setPageNumber(inputPageNumber + 1);
          isPullToRefresh ? setTransactionList(out) : setTransactionList(transactionList.concat(out));
        }

        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
        showToast(t('ERROR_RETRIEVING_TRANSACTIONS'));
        Sentry.captureException(error);
      });
  };

  const browserView = (chain: string) => {
    if (chain === ChainBackendNames.COSMOS) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: `https://www.mintscan.io/cosmos/account/${cosmos.wallets[cosmos.currentIndex].address}` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    } else if (chain === ChainBackendNames.OSMOSIS) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: `https://www.mintscan.io/osmosis/account/${osmosis.wallets[osmosis.currentIndex].address}` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    } else if (chain === ChainBackendNames.JUNO) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: `https://www.mintscan.io/juno/account/${juno.wallets[juno.currentIndex].address}` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    } else if (chain === ChainBackendNames.EVMOS) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: `https://www.mintscan.io/evmos/account/${evmos.address}` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    } else if (chain === ChainBackendNames.STARGAZE) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: `https://www.mintscan.io/stargaze/account/${stargaze.address}` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    } else if (chain === ChainBackendNames.OPTIMISM) {
      return (
                <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
                    <CyDView className={'h-[93%] w-[100%] overflow-scroll'}>
                        <WebView
                            nestedScrollEnabled
                            originWhitelist={['*']}
                            source={{ uri: (tokenData.name === 'Optimism Mainnet Ether') ? `https://optimistic.etherscan.io/address/${ethereum.address}` : `https://optimistic.etherscan.io/address/${ethereum.address}#tokentxns` }}
                            startInLoadingState={true}
                            scalesPageToFit={true} />
                    </CyDView></>
      );
    }
  };

  const emptyView = () => {
    return (
        <CyDView className={'h-[140px] bg-whiteColor flex flex-row items-center justify-center mt-[100px]'}>
            <EmptyView
                text={t('EMPTY_TRANSCATION_DETAIL_MSG')}
                image={AppImages.EMPTY}
                buyVisible={false}
                marginTop={0}
            />
        </CyDView>
    );
  };

  const renderTransactionStatusImage = (transaction: TokenTransaction) => {
    if (transaction.status) {
      return transaction.direction === 'TO' ? AppImages.DEPOSIT : AppImages.SEND;
    } else {
      return AppImages.CROSS_PINK;
    }
  };

  const Item = ({ item }: { item: TokenTransaction }) => {
    return <>
            <CyDTouchView sentry-label='txn-detail-explorer' className={'flex flex-row py-[8px] justify-between'} onPress={() => {
              navigation.navigate(screenTitle.TRANS_DETAIL, {
                url: getExplorerUrl(tokenData.chainDetails.symbol, tokenData.chainDetails.name, item?.txnHash)
              });
            }}>
                <CyDView className={'flex flex-row h-[54px] rounded-[20px]'}>
                    <CyDView className={clsx('flex flex-row h-[25px] w-[25px] items-center justify-center bg-paleGrey rounded-[20px]', {
                      'bg-paleGrey': item?.status,
                      'bg-babyPink': !item?.status
                    })}>
                        <CyDFastImage className={'h-[12px] w-[12px]'}
                            source={renderTransactionStatusImage(item)} />
                    </CyDView>
                    <CyDView className={'w-[140px] h-[54px] items-start flex flex-column justify-center px-[8px] mt-[-8px]'}>
                        <CyDText className={'w-[100px] font-bold text-[15px] text-primaryTextColor'}>{
                            item?.txnHash?.substring(0, 3) + '...' + item?.txnHash?.substring(item?.txnHash?.length - 4, item?.txnHash?.length)}</CyDText>
                        <CyDText className={'font-bold text-[13px] text-subTextColor'}>{calculateTime(item?.date)}</CyDText>
                    </CyDView>
                </CyDView>
                <CyDView className={'h-[54px] flex flex-row justify-center'}>
                    <CyDView className={'flex flex-column w-[150px] h-[54px] items-end justify-center'}>
                        <CyDText className={clsx('font-black text-[15px]', { 'text-primaryTextColor': item?.status && item?.direction === 'TO', 'text-toastColor': item?.status && item?.direction === 'TO', 'text-pinkCyD': !item?.status })}>{item?.direction === 'TO' ? '+' : '-'}{item?.tokenQuantity.toFixed(6)} {item?.tokenSymbol}</CyDText>
                        <CyDText className={'text-[12px] text-[subTextColor]'}>{(item?.tokenQuantity * Number(tokenData.price)).toFixed(2).toString() + ' USD'}</CyDText>
                        {!item?.status && <CyDText className={'text-[10px] font-bold text-pinkCyD mb-[12px]'}>{t<string>('TRANSACTION_FAILED')}</CyDText>}
                    </CyDView>
                </CyDView>
            </CyDTouchView>
            <CyDView className={'h-[1px] w-100 bg-portfolioBorderColor mt-[-10px] mb-[10px]'} />
        </>;
  };

  const renderItem = (item: TokenTransaction) => {
    return <Item item={item} />;
  };

  const onRefresh = () => {
    setRefreshing(true);
    void fetchData(true);
    setTimeout(() => {
      setRefreshing(false);
    }, REFRESH_CLOSING_TIMEOUT);
  };

  return (
    <CyDView className={'h-full bg-whiteColor'}>
          <CyDView className={'px-[15px] mt-[6px]'}>
              {
                  (isCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.OPTIMISM && tokenData.name.includes('IBC')))
                    ? browserView(tokenData.chainDetails.backendName)
                    : (loading
                        ? <Loading></Loading>
                        : !noTransaction
                            ? <CyDScrollView className={'mt-[10px] mb-[60px]'} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                                  {transactionList.map((transaction, index) => {
                                    return <CyDView key={`data-${index}`}>
                                          {renderItem(transaction)}
                                      </CyDView>;
                                  })}
                                  {!lastPage && transactionList.length > 0 && <CyDView>
                                      <CyDTouchView className={'justify-start mt-[20px]'} onPress={() => { void fetchData(false); }}>
                                          <CyDText className={'font-bold text-[16px] mb-[20px] text-toastColor text-center underline'}>{t<string>('VIEW_MORE')}</CyDText>
                                      </CyDTouchView>
                                  </CyDView>}
                              </CyDScrollView>
                            : emptyView())
              }
          </CyDView>
    </CyDView>
  );
};
