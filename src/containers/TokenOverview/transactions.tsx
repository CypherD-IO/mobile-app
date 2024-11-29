import React, { useContext, useEffect, useState } from 'react';
import { t } from 'i18next';
import WebView from 'react-native-webview';
import EmptyView from '../../components/EmptyView';
import Loading from '../../components/v2/loading';
import { ChainBackendNames, ChainNames } from '../../constants/server';
import {
  calculateTime,
  getExplorerUrl,
  HdWalletContext,
  isCosmosChain,
} from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import axios from 'axios';
import { hostWorker } from '../../global';
import { PORTFOLIO_TIMEOUT } from '../../core/Http';
import { showToast } from '../utilities/toastUtility';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import { REFRESH_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { Dimensions, RefreshControl } from 'react-native';
import { TokenTransaction } from '../../models/transaction.model';
import analytics from '@react-native-firebase/analytics';

export function TokenTransactions({
  tokenData,
  navigation,
}: {
  tokenData: TokenMeta;
  navigation: {
    navigate: (screen: string, { url }: { url: string | undefined }) => void;
  };
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const hdWallet = useContext<any>(HdWalletContext);
  const { ethereum, solana } = hdWallet.state.wallet;
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [lastPage, setLastPage] = useState<boolean>(false);
  const [noTransaction, setNoTransaction] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const { cosmos, osmosis, juno, stargaze, noble, coreum, injective, kujira } =
    hdWallet.state.wallet;
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (tokenData.chainDetails.chainName === ChainNames.ETH) {
      setLoading(true);
      void analytics().logEvent('visited_transactions_page');
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
      .post(
        getTransactionUrl,
        {
          address: ethereum.address,
          chain: tokenData.chainDetails.backendName,
          tokenAddress: tokenData.contractAddress,
          pageNumber: inputPageNumber,
          pageSize: 20,
        },
        {
          timeout: PORTFOLIO_TIMEOUT,
        },
      )
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
          isPullToRefresh
            ? setTransactionList(out)
            : setTransactionList(transactionList.concat(out));
        }

        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
        showToast(t('ERROR_RETRIEVING_TRANSACTIONS'));
        Sentry.captureException(error);
      });
  };

  const BrowserView = ({ chain }: { chain: string }) => {
    let uri = '';
    const { height } = Dimensions.get('window');
    switch (chain) {
      case ChainBackendNames.COSMOS:
        uri = `https://www.mintscan.io/cosmos/account/${cosmos.wallets[cosmos.currentIndex].address}`;
        break;
      case ChainBackendNames.OSMOSIS:
        uri = `https://www.mintscan.io/osmosis/account/${osmosis.wallets[osmosis.currentIndex].address}`;
        break;
      case ChainBackendNames.JUNO:
        uri = `https://www.mintscan.io/juno/account/${juno.wallets[juno.currentIndex].address}`;
        break;
      case ChainBackendNames.STARGAZE:
        uri = `https://www.mintscan.io/stargaze/account/${stargaze.address}`;
        break;
      case ChainBackendNames.NOBLE:
        uri = `https://www.mintscan.io/noble/account/${noble.address}`;
        break;
      case ChainBackendNames.COREUM:
        uri = `https://www.mintscan.io/coreum/account/${coreum.address}`;
        break;
      case ChainBackendNames.INJECTIVE:
        uri = `https://www.mintscan.io/injective/account/${injective.address}`;
        break;
      case ChainBackendNames.KUJIRA:
        uri = `https://atomscan.com/kujira/accounts/${kujira.address}`;
        break;
      case ChainBackendNames.OPTIMISM:
        uri =
          tokenData.name === 'Optimism Mainnet Ether'
            ? `https://optimistic.etherscan.io/address/${ethereum.address}`
            : `https://optimistic.etherscan.io/address/${ethereum.address}#tokentxns`;
        break;
      case ChainBackendNames.SHARDEUM:
        uri = `https://explorer-liberty20.shardeum.org/account/${ethereum.address}`;
        break;
      case ChainBackendNames.SHARDEUM_SPHINX:
        uri = `https://explorer-sphinx.shardeum.org/account/${ethereum.address}`;
        break;
      case ChainBackendNames.SOLANA:
        uri = `https://solscan.io/account/${solana.address}`;
        break;
    }
    return (
      <CyDView className={'w-[100%]'} style={{ height: height - 230 }}>
        <WebView
          nestedScrollEnabled
          originWhitelist={['*']}
          source={{ uri }}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </CyDView>
    );
  };

  const emptyView = () => {
    return (
      <CyDView
        className={
          'h-[140px] bg-whiteColor flex flex-row items-center justify-center mt-[100px]'
        }>
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
      return transaction.direction === 'TO'
        ? AppImages.DEPOSIT
        : AppImages.SEND;
    } else {
      return AppImages.CROSS_PINK;
    }
  };

  const Item = ({ item }: { item: TokenTransaction }) => {
    return (
      <>
        <CyDTouchView
          sentry-label='txn-detail-explorer'
          className={'flex flex-row py-[8px] justify-between'}
          onPress={() => {
            navigation.navigate(screenTitle.TRANS_DETAIL, {
              url: getExplorerUrl(
                tokenData.chainDetails.symbol,
                tokenData.chainDetails.name,
                item?.txnHash,
              ),
            });
          }}>
          <CyDView
            className={
              'flex flex-row h-[54px] rounded-[20px] items-center justify-between'
            }>
            <CyDView
              className={clsx(
                'flex flex-row h-[25px] w-[32px] items-center justify-center bg-paleGrey rounded-[20px]',
                {
                  'bg-paleGrey': item?.status,
                  'bg-babyPink': !item?.status,
                },
              )}>
              <CyDFastImage
                className={'h-[32px] w-[32px]'}
                source={renderTransactionStatusImage(item)}
              />
            </CyDView>
            <CyDView
              className={
                'w-[140px] h-[54px] items-start flex flex-column justify-center px-[8px] mt-[-8px]'
              }>
              <CyDText className={'w-[100px] font-bold text-[15px] '}>
                {item?.txnHash?.substring(0, 3) +
                  '...' +
                  item?.txnHash?.substring(
                    item?.txnHash?.length - 4,
                    item?.txnHash?.length,
                  )}
              </CyDText>
              <CyDText
                className={'font-semibold text-[13px] text-subTextColor'}>
                {calculateTime(item?.date)}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className={'h-[54px] flex flex-row justify-center'}>
            <CyDView
              className={
                'flex flex-column w-[160px] h-[54px] items-end justify-center'
              }>
              <CyDText
                className={clsx('text-right font-semibold text-[18px]', {
                  '': item?.status && item?.direction === 'TO',
                  'text-toastColor': item?.status && item?.direction === 'TO',
                  'text-pinkCyD': !item?.status,
                })}>
                {item?.direction === 'TO' ? '+' : '-'}
                {item?.tokenQuantity.toFixed(6)} {item?.tokenSymbol}
              </CyDText>
              <CyDText className={'text-[16px] text-tokenPriceColor'}>
                {(item?.tokenQuantity * Number(tokenData.price))
                  .toFixed(2)
                  .toString() + ' USD'}
              </CyDText>
              {!item?.status && (
                <CyDText
                  className={'text-[10px] font-bold text-pinkCyD mb-[12px]'}>
                  {t<string>('TRANSACTION_FAILED')}
                </CyDText>
              )}
            </CyDView>
          </CyDView>
        </CyDTouchView>
        <CyDView className={'h-[1px] w-100 bg-portfolioBorderColor my-[5px]'} />
      </>
    );
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
    <CyDView className={'bg-whiteColor h-full'}>
      <CyDView className={'flex-1 px-[15px] mt-[6px]'}>
        {isCosmosChain(tokenData.chainDetails.backendName) ||
        (tokenData.chainDetails.backendName === ChainBackendNames.OPTIMISM &&
          tokenData.name.includes('IBC')) ||
        tokenData.chainDetails.backendName === ChainBackendNames.SHARDEUM ||
        tokenData.chainDetails.backendName === ChainBackendNames.SOLANA ? (
          <BrowserView chain={tokenData.chainDetails.backendName} />
        ) : loading ? (
          <Loading />
        ) : !noTransaction ? (
          <CyDView
            className={'mt-[10px] mb-[60px]'}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {transactionList.map((transaction, index) => {
              return (
                <CyDView key={`data-${index}`}>
                  {renderItem(transaction)}
                </CyDView>
              );
            })}
            {!lastPage && transactionList.length > 0 && (
              <CyDView>
                <CyDTouchView
                  className={'justify-start mt-[20px]'}
                  onPress={() => {
                    void fetchData(false);
                  }}>
                  <CyDText
                    className={
                      'font-bold text-[16px] mb-[20px] text-toastColor text-center underline'
                    }>
                    {t<string>('VIEW_MORE')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}
          </CyDView>
        ) : (
          emptyView()
        )}
      </CyDView>
    </CyDView>
  );
}
