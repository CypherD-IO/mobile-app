/* eslint-disable react-native/no-inline-styles */

/**
 * @format
 * @flow
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import clsx from 'clsx';
import CryptoJS from 'crypto-js';
import { get, min, round } from 'lodash';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, BackHandler, Keyboard } from 'react-native';
import { URL } from 'react-native-url-polyfill';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AppImages from '../../../assets/images/appImages';
import {
  ChooseChainModal,
  WHERE_BROWSER,
} from '../../components/ChooseChainModal';
import MoreViewModal from '../../components/MoreViewModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { gasFeeReservation, INJECTED_WEB3_CDN } from '../../constants/data';
import { Web3Origin } from '../../constants/enum';
import {
  Chain,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_SOLANA,
  ChainBackendNames,
  ChainNames,
  COSMOS_CHAINS,
  PURE_COSMOS_CHAINS,
} from '../../constants/server';
import { Colors } from '../../constants/theme';
import { MODAL_SHOW_TIMEOUT } from '../../constants/timeOuts';
import { CommunicationEvents } from '../../constants/web3';
import { showToast } from '../../containers/utilities/toastUtility';
import useAxios from '../../core/HttpRequest';
import { getWeb3Endpoint, HdWalletContext } from '../../core/util';
import usePortfolio from '../../hooks/usePortfolio';
import useWeb3 from '../../hooks/useWeb3';
import { isIOS } from '../../misc/checkers';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { DynamicScrollView } from '../../styles/viewStyle';
import {
  BrowserHistoryEntry,
  PageType,
  SearchHistoryEntry,
  WebsiteInfo,
} from '../../types/Browser';
import Loading from '../../components/v2/loading';
import { DecimalHelper } from '../../utils/decimalHelper';
import useGasService from '../../hooks/useGasService';
import useCosmosSigner from '../../hooks/useCosmosSigner';
import Web3 from 'web3';
import { GlobalContext } from '../../core/globalContext';

enum BROWSER_ERROR {
  SSL = 'ssl',
  HOSTNAME = 'hostname',
  INTERNET = 'internet',
  OTHER = 'other',
}

const webviewErrorCodes = ['-1200', '-1003', '-1003'];
const webviewErrorCodesMapping: Record<string, { error: string; image: any }> =
  {
    '-1200': { error: BROWSER_ERROR.SSL, image: AppImages.BROWSER_SSL },
    '-1003': { error: BROWSER_ERROR.HOSTNAME, image: AppImages.BROWSER_404 },
    '-1009': {
      error: BROWSER_ERROR.INTERNET,
      image: AppImages.BROWSER_NOINTERNET,
    },
    '-1022': { error: BROWSER_ERROR.SSL, image: AppImages.BROWSER_SSL },
    default: { error: BROWSER_ERROR.OTHER, image: AppImages.BROWSER_404 },
  };

export default function Browser({ route, navigation }: any) {
  const { params } = route;
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [moreView, setMoreview] = useState<boolean>(false);
  const [onFocus, setFocus] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const [fetchingInjection, setFetchingInjection] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [injectedCode, setInjectedCode] = useState('');
  const { getWithAuth } = useAxios();
  const { getNativeToken } = usePortfolio();
  const { estimateGasForEvm, estimateGasForCosmosRest, estimateGasForSolana } =
    useGasService();
  const { getCosmosSignerClient } = useCosmosSigner();

  const urlMappings: Record<string, string> = {
    home: '',
    history: 'cypherd://history',
    webviewError: onFocus ? inputText : currentUrl,
  };

  const [websiteInfo, setWebsiteInfo] = useState<WebsiteInfo>({
    host: '',
    title: 'Webpage',
    origin: '',
    url: '',
  });

  const [handleWeb3, handleWeb3Cosmos] = useWeb3(Web3Origin.BROWSER);

  const [browserError, setBrowserError] = useState('');
  const [isSslSecure, setIsSslSecure] = useState(true);

  const homePageUrl = 'https://cypherhq.io';
  const [search, setSearch] = useState(homePageUrl);
  const webviewRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const isFocused = useIsFocused();
  const [searchData, setSearchData] = useState<SearchHistoryEntry[]>([]);
  const [browserHistory, setBrowserHistory] = useState<BrowserHistoryEntry[]>(
    [],
  );
  const [browserFavourites, setBrowserFavourites] = useState<
    BrowserHistoryEntry[]
  >([]);
  const [removeBookmarkMode, setRemoveBookmarkMode] = useState(false);
  const [inbuildPage, setInbuiltPage] = useState<PageType>('home');
  const [browserErrorCode, setBrowserErrorCode] = useState('');
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { showModal, hideModal } = useGlobalModalContext();
  const [selectedDappChain, setSelectedDappChain] = useState<Chain>(CHAIN_ETH);
  const globalContext = useContext(GlobalContext);

  const spliceHistoryByTime = (): Array<{
    entry: BrowserHistoryEntry[];
    dateString: string;
  }> => {
    if (browserHistory.length === 0) {
      return [];
    }
    const browserhistory: any[] = [...browserHistory];
    const historyByDate = browserhistory.reduce((first: any, sec: any) => {
      const dateTime = moment(new Date(sec.datetime)).format('MMM DD, YYYY');
      if (!first[dateTime]) first[dateTime] = [];

      first[dateTime].push(sec);

      return first;
    }, {});

    const now = new Date();
    const today = moment(now).format('MMM DD, YYYY');
    now.setDate(now.getDate() - 1);

    const yesterday = moment(new Date(now)).format('MMM DD, YYYY');

    const tBrowserHistory: Array<{
      entry: BrowserHistoryEntry[];
      dateString: string;
    }> = [];
    for (const date in historyByDate) {
      const tDate =
        (date === today
          ? 'Today - '
          : date === yesterday
            ? 'Yesterday - '
            : '') + date;
      tBrowserHistory.push({ dateString: tDate, entry: historyByDate[date] });
    }

    return tBrowserHistory;
  };

  useEffect(() => {
    if (params?.url) {
      setInbuiltPage('webview');
      const url = new URL(params.url);
      setSearch(params.url);
      setInputText(url.hostname);
      setCurrentUrl(params.url);
    }
  }, [isFocused]);

  useEffect(() => {
    if (websiteInfo.title !== 'Webpage') {
      const curr = {
        name: websiteInfo.title,
        image: `https://www.google.com/s2/favicons?domain=${websiteInfo.host}&sz=32`,
        url: websiteInfo.url,
        origin: websiteInfo.origin,
      };

      const tSearchData = searchData
        .flatMap(h => {
          return h.origin === curr.origin ? [] : [h];
        })
        .splice(0, 4);

      setSearchData([curr, ...tSearchData]);

      const tHistory = browserHistory.flatMap(h => {
        return h.url === curr.url && h.name === curr.name ? [] : [h];
      });

      const currHistory = { ...curr, datetime: new Date().toISOString() };

      setBrowserHistory([currHistory, ...tHistory]);
    }
  }, [websiteInfo]);

  useEffect(() => {
    searchData.length > 0 &&
      AsyncStorage.setItem('searchHistory', JSON.stringify(searchData));
  }, [searchData]);

  useEffect(() => {
    browserHistory.length > 0 &&
      AsyncStorage.setItem('browserHistory', JSON.stringify(browserHistory));
  }, [browserHistory]);

  useEffect(() => {
    browserFavourites.length > 0 &&
      AsyncStorage.setItem(
        'browserBookmarks',
        JSON.stringify(browserFavourites),
      );
  }, [browserFavourites]);

  useEffect(() => {
    AsyncStorage.getItem('browserHistory')
      .then(browserHistory => {
        browserHistory !== null &&
          setBrowserHistory(JSON.parse(browserHistory));
      })
      .catch(Sentry.captureException);

    AsyncStorage.getItem('searchHistory')
      .then(searchHistory => {
        searchHistory != null && setSearchData(JSON.parse(searchHistory));
      })
      .catch(Sentry.captureException);

    AsyncStorage.getItem('browserBookmarks')
      .then(bookmarks => {
        bookmarks != null && setBrowserFavourites(JSON.parse(bookmarks));
      })
      .catch(Sentry.captureException);
  }, []);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    // setWebviewKey(webviewKey + 1);
  }, [hdWalletContext.state.selectedChain]);

  useEffect(() => {
    const {
      selectedChain: { chain_id },
      selectedChain,
    } = hdWalletContext.state;
    console.log('selectedChain in Browser ::: ', selectedChain);
    console.log('selectedDappChain in Browser ::: ', selectedDappChain);
    if (selectedDappChain && selectedDappChain !== selectedChain) {
      setSelectedDappChain(selectedChain);
      if (isFocused) {
        void checkNativeTokenBalance(selectedChain);
      }
    }
    if (webviewRef.current?.postMessage) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: 'chainChanged',
          result: chain_id,
        }),
      );
    }
  }, [hdWalletContext.state.selectedChain, isFocused]);

  const checkNativeTokenBalance = async (selectedChain: Chain) => {
    console.log('selectedChain in checkNativeTokenBalance ::: ', selectedChain);
    const nativeToken = await getNativeToken(
      selectedChain.backendName as ChainBackendNames,
    );
    let gasDetails;
    if (COSMOS_CHAINS.includes(selectedChain.chainName)) {
      console.log('cosmos chains gas fee calculation');
      const cosmosWallet = hdWalletContext.state.wallet;
      gasDetails = await estimateGasForCosmosRest({
        chain: selectedChain,
        denom: nativeToken.denom,
        amount: nativeToken.balanceDecimal,
        fromAddress: get(cosmosWallet, selectedChain.chainName, null)?.address,
        toAddress: get(cosmosWallet, selectedChain.chainName, null)?.address,
      });
      console.log('gasDetails ::: ', gasDetails);
    } else if (selectedChain.backendName === CHAIN_SOLANA.backendName) {
      const solana = hdWalletContext.state.wallet.solana;
      gasDetails = await estimateGasForSolana({
        fromAddress: solana.address,
        toAddress: solana.address,
        amountToSend: String(nativeToken.balanceDecimal),
        contractAddress: nativeToken.contractAddress,
        contractDecimals: nativeToken.contractDecimals,
      });
    } else if (selectedChain.chainName === ChainNames.ETH) {
      const web3 = new Web3(getWeb3Endpoint(selectedChain, globalContext));
      gasDetails = await estimateGasForEvm({
        web3,
        chain: selectedChain.backendName as ChainBackendNames,
        fromAddress: ethereum.address,
        toAddress: ethereum.address,
        amountToSend: String(nativeToken.balanceDecimal),
        contractAddress: nativeToken.contractAddress,
        contractDecimals: nativeToken.contractDecimals,
      });
    }
    console.log('gasDetails ::: ', gasDetails);
    const balanceAfterGasReservation = DecimalHelper.subtract(
      nativeToken.balanceDecimal,
      gasDetails?.gasFeeInCrypto,
    );
    console.log('balanceAfterGasReservation ::: ', balanceAfterGasReservation);
    const isGasEnough = DecimalHelper.isGreaterThanOrEqualTo(
      balanceAfterGasReservation,
      0,
    );

    if (!isGasEnough && websiteInfo.url !== '') {
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('INSUFFICIENT_FUNDS'),
          description: `You don't have sufficient ${nativeToken.symbol} to pay gas fee`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, MODAL_SHOW_TIMEOUT);
    }
  };

  const injectWeb3FromCDN = async () => {
    try {
      setFetchingInjection(true);
      const response = await axios.get(INJECTED_WEB3_CDN);
      const hash = CryptoJS.SHA256(response.data);
      const hashForInjectedWeb3 = hash.toString(CryptoJS.enc.Hex);
      const resp = await getWithAuth('/v1/configuration/checksum/injectedWeb3');
      if (!resp.isError) {
        const { data } = resp;
        const { hash: hashFromServerForInjectedWeb3 } = data;
        if (hashForInjectedWeb3 === hashFromServerForInjectedWeb3) {
          setInjectedCode(response.data);
        }
      }

      setFetchingInjection(false);
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  useEffect(() => {
    void injectWeb3FromCDN();
  }, []);

  async function onWebviewMessage(event: WebViewMessageEvent) {
    const jsonObj = JSON.parse(event.nativeEvent.data);
    const { type } = jsonObj;

    switch (type) {
      case CommunicationEvents.WEBINFO: {
        const { host, title, origin } = jsonObj.webinfo;
        const url = currentUrl;
        const info = { host, title, origin, url };
        if (info !== websiteInfo) {
          setWebsiteInfo(info);
        }
        break;
      }
      case CommunicationEvents.ANALYTICS: {
        const { chain, payload } = jsonObj;

        analytics()
          .logEvent('web3Instance_undefined_props', { ...payload, chain })
          .catch(Sentry.captureException);
        break;
      }
      case CommunicationEvents.WEB3: {
        const { payload } = jsonObj;
        const response = await handleWeb3(jsonObj.payload, websiteInfo);
        webviewRef.current.postMessage(
          JSON.stringify({
            id: payload.id,
            type: CommunicationEvents.WEB3,
            ...response,
          }),
        );
        break;
      }
      case CommunicationEvents.WEB3COSMOS: {
        const { id, method } = jsonObj;
        const response = await handleWeb3Cosmos(jsonObj, websiteInfo);
        webviewRef.current.postMessage(
          JSON.stringify({
            id,
            type: CommunicationEvents.WEB3COSMOS,
            method,
            result: response,
          }),
        );
      }
    }
  }

  function upgradeURL(uri: string) {
    const isURL = uri.split(' ').length === 1 && uri.includes('.');
    if (isURL) {
      let final = uri;
      const urlReg = /^([hH][tT][tT][Pp]([Ss])?):(\/{2})/;
      if (!urlReg.test(uri)) {
        final = 'https://' + uri;
      }
      return new URL(final).href;
    }
    const encodedURI = encodeURI(uri);
    return `https://www.google.com/search?q=${encodedURI}`;
  }

  function handleTextInput(e: any) {
    setFocus(false);
    if (e?.nativeEvent?.text.startsWith('cypherd://')) {
      return;
    }
    const upgradedURL = upgradeURL(
      e?.nativeEvent?.text === undefined ? e : e.nativeEvent.text,
    );
    setSearch(upgradedURL);
    analytics()
      .logEvent('browser_addressbar', {
        from: ethereum.address,
        chain: hdWalletContext.state.selectedChain.name,
        url: e?.nativeEvent?.text === undefined ? e : e.nativeEvent.text,
      })
      .catch(Sentry.captureException);
  }

  // https://amanhimself.dev/blog/handle-navigation-in-webviews-react-native/
  const handleBackButton = () => {
    if (!canGoBack) {
      setInbuiltPage('webview');
    } else if (webviewRef.current) {
      webviewRef.current.goBack();
      setIsSslSecure(true);
      setInbuiltPage('webview');
    }
    return true;
  };

  const handleForwardButton = () => {
    if (webviewRef.current) webviewRef.current.goForward();
  };

  // https://medium.com/codesight/creating-an-embedded-browser-with-react-native-aea42b54740
  const handleReload = () => {
    if (webviewRef.current) webviewRef.current.reload();
  };

  const getValueForWebsiteInput = () => {
    if (inbuildPage === 'webview' || inbuildPage === 'webviewError') {
      return onFocus ? currentUrl : inputText;
    } else {
      return !onFocus ? urlMappings[inbuildPage] : '';
    }
  };

  const deleteHistory = (item: BrowserHistoryEntry) => {
    const history = browserHistory.filter(h => h !== item);
    if (history.length === 0) {
      AsyncStorage.setItem('browserHistory', JSON.stringify([])).catch(
        Sentry.captureException,
      );
    }
    setBrowserHistory(history);
  };

  const deleteBookmark = (item: BrowserHistoryEntry) => {
    const bookmarks = browserFavourites.filter(h => h !== item);
    if (bookmarks.length === 0) {
      AsyncStorage.setItem('browserBookmarks', JSON.stringify([])).catch(
        Sentry.captureException,
      );
    }
    setBrowserFavourites(bookmarks);
  };

  const clearHistory = () => {
    AsyncStorage.setItem('browserHistory', JSON.stringify([])).catch(
      Sentry.captureException,
    );
    setBrowserHistory([]);
  };

  const onBookMark = () => {
    if (isBookmarkedAlready(websiteInfo.url)) {
      const favourites = browserFavourites.filter(
        fav => fav.url !== websiteInfo.url,
      );
      setBrowserFavourites(favourites);
      showToast('Bookmark removed successfully');
      return;
    }
    const curr = {
      name: websiteInfo.title,
      // retrieving high quality image for displaying favourites
      image: `https://www.google.com/s2/favicons?domain=${websiteInfo.host}&sz=128`,
      url: websiteInfo.url,
      origin: websiteInfo.origin,
      datetime: new Date().toISOString(),
    };

    if (inbuildPage === 'webview') {
      setBrowserFavourites([...browserFavourites, curr]);
      showToast(t('BOOKMARK_SUCCESSFUL'));
    } else {
      showToast(t('CANNOT_BOOKMARK'));
    }
  };

  const isBookmarkedAlready = (url: string) => {
    return browserFavourites.filter(fav => fav.url === url).length > 0;
  };

  if (fetchingInjection) return <Loading />;

  return (
    <CyDSafeAreaView className='bg-n20 flex-1'>
      <ChooseChainModal
        isModalVisible={chooseChain}
        onPress={() => {
          setChooseChain(false);
        }}
        where={WHERE_BROWSER}
        selectedChain={selectedDappChain ?? CHAIN_ETH}
        setSelectedChain={setSelectedDappChain}
      />
      <MoreViewModal
        isModalVisible={moreView}
        onPress={() => {
          setMoreview(false);
        }}
        onHome={() => {
          setInbuiltPage('home');
        }}
        onHistory={() => {
          setInbuiltPage('history');
        }}
        onBookmark={() => {
          setInbuiltPage('bookmarks');
        }}
      />
      <CyDView className='bg-n0 h-[45px] mt-1 flex flex-row justify-between items-center p-3'>
        <CyDView className='flex flex-row items-center'>
          {!onFocus && (
            <CyDTouchView
              className='ml-3'
              onPress={() => {
                handleBackButton();
              }}>
              <CyDMaterialDesignIcons
                name='chevron-left'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          )}
          {!onFocus && (
            <CyDTouchView
              className=''
              onPress={() => {
                handleForwardButton();
              }}>
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          )}

          {!onFocus && (
            <CyDTouchView
              className=''
              onPress={() => {
                handleReload();
              }}>
              <CyDMaterialDesignIcons
                name='refresh'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          )}
        </CyDView>

        <CyDView
          className={clsx('h-[30px] flex flex-row items-center', {
            'w-[80%]': onFocus,
            'w-[63%]': !onFocus,
          })}>
          {!onFocus &&
            (inbuildPage === 'webview' || inbuildPage === 'webviewError') && (
              <CyDView className='ml-[2px]' sentry-label='browser-search-erase'>
                {isSslSecure && (
                  <CyDMaterialDesignIcons
                    name='lock'
                    size={20}
                    className='text-base400 ml-[5px]'
                  />
                )}
                {!isSslSecure && (
                  <CyDFastImage
                    className='ml-[5px] h-4 w-4'
                    resizeMode='contain'
                    source={AppImages.BROWSER_SSL}
                  />
                )}
              </CyDView>
            )}
          {onFocus && (
            <CyDTouchView sentry-label='browser-search-erase'>
              <CyDMaterialDesignIcons
                name='magnify'
                size={20}
                className='text-base400 mr-1'
              />
            </CyDTouchView>
          )}
          <CyDTextInput
            returnKeyType='go'
            autoCapitalize='none'
            onSubmitEditing={(e: any) => {
              Keyboard.dismiss();
              handleTextInput(e);
            }}
            onChangeText={(text: string) => {
              setInputText(text);
              setCurrentUrl(text);
              setInbuiltPage('webview');
              if (
                PURE_COSMOS_CHAINS.includes(
                  hdWalletContext.state.selectedChain.chainName,
                )
              ) {
                hdWalletContext.dispatch({
                  type: 'CHOOSE_CHAIN',
                  value: { selectedChain: CHAIN_ETH },
                });
              }
            }}
            onFocus={() => {
              setFocus(true);
            }}
            placeholder='Search or enter address'
            placeholderTextColor='#777777'
            onBlur={() => setFocus(false)}
            value={getValueForWebsiteInput()}
            autoCorrect={false}
            className={clsx('flex-1 text-base400 bg-n20 mx-2 p-2', {
              'text-left': onFocus,
              'text-center': !onFocus,
              'w-[80%]': onFocus,
              'w-[63%]': !onFocus,
            })}
            selectTextOnFocus={true}
          />
          <CyDTouchView
            sentry-label='browser-search-erase'
            onPress={() => {
              setCurrentUrl('');
              setInputText('');
            }}>
            {onFocus && (
              <CyDMaterialDesignIcons
                name='close-circle'
                size={20}
                className='text-base400'
              />
            )}
          </CyDTouchView>
        </CyDView>

        {onFocus && (
          <CyDTouchView
            className=''
            onPress={() => {
              Keyboard.dismiss();
              setFocus(false);
            }}>
            <CyDText>Cancel</CyDText>
          </CyDTouchView>
        )}

        {!onFocus && (
          <CyDTouchView
            sentry-label='browser-chain-choose'
            onPress={() => {
              setChooseChain(true);
            }}>
            <CyDFastImage
              resizeMode='contain'
              className='h-[24px] w-[24px]'
              source={hdWalletContext.state.selectedChain.logo_url}
            />
          </CyDTouchView>
        )}
        {!onFocus && (
          <CyDTouchView
            sentry-label='browser-more-button'
            onPress={() => {
              setMoreview(true);
            }}>
            <CyDMaterialDesignIcons
              name={'dots-vertical'}
              size={24}
              className={'text-base400'}
            />
          </CyDTouchView>
        )}
      </CyDView>
      {onFocus &&
        !websiteInfo.origin.includes('cypherd.io') &&
        websiteInfo.origin !== '' && (
          <CyDView
            className='flex flex-row items-center mt-2 mx-3 justify-between'
            sentry-label='browser-current-url-bookmark'>
            <CyDView className='flex flex-row items-center'>
              <CyDView className='w-[20px] h-[20px]'>
                <CyDFastImage
                  className='h-[18px] w-[18px]'
                  source={{
                    uri: `https://www.google.com/s2/favicons?domain=${websiteInfo.host}&sz=32`,
                  }}
                />
              </CyDView>
              <CyDView>
                <CyDText className=' text-[14px]'>{websiteInfo.title}</CyDText>
                <CyDText className='text-[10px]'>{websiteInfo.origin}</CyDText>
              </CyDView>
            </CyDView>
            <CyDTouchView onPress={onBookMark} className=''>
              <CyDMaterialDesignIcons
                name={
                  isBookmarkedAlready(websiteInfo.url)
                    ? 'bookmark'
                    : 'bookmark-outline'
                }
                size={20}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
        )}
      {onFocus && searchData.length > 0 && (
        <CyDText className='text-base ml-2 mt-2'>Recent Searches</CyDText>
      )}
      {onFocus && (
        <CyDView className='h-full'>
          {searchData.map(item => (
            <CyDTouchView
              key={item.url}
              sentry-label='browser-recent-search-url '
              className='mt-2 flex flex-row items-center justify-start mx-3'
              onPress={() => {
                setInputText(item.url);
                setCurrentUrl(item.url);
                handleTextInput(item.url);
                setInbuiltPage('webview');
                setFocus(false);
                Keyboard.dismiss();
                analytics()
                  .logEvent('browser_recent_url_click', {
                    url: item.url,
                    from: 'browser',
                  })
                  .catch(Sentry.captureException);
              }}>
              <CyDFastImage
                className='h-[18px] w-[18px]'
                source={{ uri: item.image }}
              />
              <CyDView>
                <CyDText className='text-[14px]'>{item.name}</CyDText>
                <CyDText className='text-[10px]'>{item.origin}</CyDText>
              </CyDView>
            </CyDTouchView>
          ))}
        </CyDView>
      )}

      {inbuildPage === 'history' && !onFocus ? (
        <CyDScrollView className='h-full'>
          <CyDTouchView
            onPress={() => {
              clearHistory();
              analytics()
                .logEvent('browser_clear_history', {
                  from: 'browser',
                })
                .catch(Sentry.captureException);
            }}>
            <CyDText className='text-[14px] p-3 text-center'>
              Clear browsing history
            </CyDText>
          </CyDTouchView>

          <CyDView className='border-b border-n40 mb-5' />
          {browserHistory.length === 0 ? (
            <CyDView>
              <CyDText className='text-[22px]'>
                Start using the browser to view history here
              </CyDText>
            </CyDView>
          ) : (
            spliceHistoryByTime().map(historybt => (
              <CyDView key={historybt.dateString} className='mx-3'>
                <CyDText className='text-[12px]'>
                  {historybt.dateString}
                </CyDText>
                {historybt.entry.map(item => (
                  <CyDTouchView
                    key={item.url}
                    sentry-label='browser-history-url'
                    className='flex flex-row items-center justify-between mt-4 w-full'
                    onPress={() => {
                      setInputText(item.url);
                      setCurrentUrl(item.url);
                      handleTextInput(item.url);
                      setFocus(false);
                      setInbuiltPage('webview');
                      analytics()
                        .logEvent('browser_history_url_click', {
                          url: item.url,
                          from: 'browser',
                        })
                        .catch(e => Sentry.captureException(e));
                    }}>
                    <CyDView className='flex flex-row items-center'>
                      <CyDFastImage
                        className='h-[18px] w-[18px]'
                        source={{ uri: item.image }}
                      />
                      <CyDView className='flex flex-col ml-[8px]'>
                        <CyDText className='text-[14px]'>{item.name}</CyDText>
                        <CyDText className='text-[10px]'>{item.origin}</CyDText>
                      </CyDView>
                    </CyDView>
                    <CyDTouchView
                      sentry-label='browser_history_url_clear'
                      onPress={() => {
                        deleteHistory(item);
                        analytics()
                          .logEvent('browser_history_url_clear', {
                            url: item.url,
                            from: 'browser',
                          })
                          .catch(e => Sentry.captureException(e));
                      }}>
                      <CyDMaterialDesignIcons
                        name='close-circle'
                        size={20}
                        className='text-base400 '
                      />
                    </CyDTouchView>
                  </CyDTouchView>
                ))}
              </CyDView>
            ))
          )}
        </CyDScrollView>
      ) : null}
      {inbuildPage === 'webviewError' && (
        <CyDView className='flex flex-col items-center justify-center h-[95px] w-full'>
          <CyDFastImage
            className='mt-[100px] h-[1]'
            source={webviewErrorCodesMapping[browserErrorCode].image}
          />
          <CyDText className='text-[12px]'>{`Error: ${browserError}`}</CyDText>
        </CyDView>
      )}

      {inbuildPage === 'bookmarks' && (
        <CyDScrollView
          className='h-full'
          onTouchEnd={(e: any) => {
            if (e.target === e.currentTarget) {
              setRemoveBookmarkMode(false);
              setInbuiltPage('webview');
            }
          }}>
          <CyDView className='p-4'>
            <CyDText className=''>{'bookmarks'.toLocaleUpperCase()}</CyDText>
            {browserFavourites.length === 0 && (
              <CyDText className='text-[12px] '>
                Your bookmarks will be shown here
              </CyDText>
            )}
            <CyDView className='flex flex-row flex-wrap mb-[30px] items-center justify-start m-[10px]'>
              {browserFavourites.map(favourite => (
                <CyDTouchView key={favourite.url} className=''>
                  <CyDTouchView
                    className='flex items-center justify-center bg-n0 border border-n40  w-[48px] h-[48px] rounded-md'
                    // dynamic
                    // dynamicWidthFix
                    // dynamicHeightFix
                    // height={48}
                    // width={48}
                    // alIT={'center'}
                    // jC={'center'}
                    // mL={10}
                    // mT={10}
                    // bGC={Colors.browserBookmarkBackground}
                    // style={{
                    //   color: Colors.primaryTextColor,
                    //   borderWidth: 1,
                    //   borderColor: 'gray',
                    //   borderRadius: 22,
                    // }}
                    onPress={(e: any) => {
                      setInputText(favourite.url);
                      setCurrentUrl(favourite.url);
                      handleTextInput(favourite.url);
                      setFocus(false);
                      setInbuiltPage('webview');
                      // Change
                      analytics()
                        .logEvent('browser_favourite_url_click', {
                          url: favourite.url,
                          from: 'browser',
                        })
                        .catch(Sentry.captureException);
                    }}
                    onLongPress={() => {
                      setRemoveBookmarkMode(true);
                    }}>
                    <CyDFastImage
                      className='h-[38px] w-[38px]'
                      source={{ uri: favourite.image }}
                    />
                  </CyDTouchView>

                  {removeBookmarkMode && (
                    <CyDTouchView
                      sentry-label='browser-search-erase'
                      className='absolute right-[0px] top-[0px] rounded-full'
                      // style={{
                      //   position: 'absolute',
                      //   tintColor: '#444444',
                      //   left: 52,
                      //   top: 5,
                      //   backgroundColor: 'white',
                      //   borderRadius: 50,
                      // }}
                      onPress={() => {
                        deleteBookmark(favourite);
                      }}>
                      <CyDMaterialDesignIcons
                        name='close-circle'
                        size={20}
                        className='text-base400 ml-[-20px]'
                      />
                    </CyDTouchView>
                  )}

                  <CyDView className='w-[60px] overflow-hidden mt-1'>
                    <CyDText
                      className='text-center text-[10px] truncate'
                      numberOfLines={1}>
                      {favourite.name}
                    </CyDText>
                  </CyDView>
                </CyDTouchView>
              ))}
            </CyDView>
          </CyDView>
        </CyDScrollView>
      )}

      {!onFocus && inbuildPage === 'home' && (
        <DynamicScrollView dynamic dynamicHeight height={100}>
          {browserHistory.length === 0 ? (
            <CyDView className='flex flex-row items-center justify-center'>
              <CyDText className='text-[12px]'>
                Start using the browser to view history here
              </CyDText>
            </CyDView>
          ) : (
            <>
              <CyDText className=' text-left ml-3 mt-[10px] text-[15px] font-bold'>
                {'history'.toLocaleUpperCase()}
              </CyDText>
              {spliceHistoryByTime().map(historybt => (
                <CyDView key={historybt.dateString} className='mx-3'>
                  <CyDText className='text-[12px] '>
                    {historybt.dateString}
                  </CyDText>
                  {historybt.entry.map(item => (
                    <CyDTouchView
                      key={item.url}
                      sentry-label='browser-history-url'
                      className='flex flex-row items-center mt-4 w-full'
                      onPress={() => {
                        setInputText(item.url);
                        setCurrentUrl(item.url);
                        handleTextInput(item.url);
                        setFocus(false);
                        setInbuiltPage('webview');
                        analytics()
                          .logEvent('browser_history_url_click', {
                            url: item.url,
                            from: 'browser',
                          })
                          .catch(e => {
                            Sentry.captureException(e);
                          });
                      }}>
                      <CyDView className='flex flex-row items-center flex-1'>
                        <CyDFastImage
                          className='h-[18px] w-[18px] mr-2'
                          resizeMode='contain'
                          source={{ uri: item.image }}
                        />
                        <CyDView>
                          <CyDText className='text-[14px]'>{item.name}</CyDText>
                          <CyDText className='text-[10px]'>
                            {item.origin}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      <CyDTouchView
                        sentry-label='browser_history_url_clear'
                        onPress={() => {
                          deleteHistory(item);
                          analytics()
                            .logEvent('browser_history_url_clear', {
                              url: item.url,
                              from: 'browser',
                            })
                            .catch(e => {
                              Sentry.captureException(e);
                            });
                        }}>
                        <CyDMaterialDesignIcons
                          name='close-circle'
                          size={20}
                          className='text-base400 ml-3'
                        />
                      </CyDTouchView>
                    </CyDTouchView>
                  ))}
                </CyDView>
              ))}
            </>
          )}
        </DynamicScrollView>
      )}
      {loader && inbuildPage === 'webview' && (
        <CyDView className='flex flex-row items-center justify-center h-full w-full'>
          <ActivityIndicator size='large' color={Colors.black} />
        </CyDView>
      )}
      <CyDView
        className={clsx('flex-1 pb-[50px] bg-n20', { 'pb-[75px]': !isIOS() })}>
        <WebView
          key={webviewKey}
          webviewDebuggingEnabled={true}
          source={{ uri: search }}
          ref={webviewRef}
          startInLoadingState
          onLoadStart={() => setLoader(true)}
          onLoadEnd={() => setLoader(false)}
          injectedJavaScriptBeforeContentLoaded={injectedCode}
          mediaPlaybackRequiresUserAction={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          renderLoading={() => {
            return <Loading />;
          }}
          style={{ marginTop: 0 }}
          onNavigationStateChange={navState => {
            setCanGoBack(navState.canGoBack);
            setCurrentUrl(navState.url);
          }}
          onLoad={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            const finalTitle = nativeEvent.title.replace('- Google Search', '');
            setIsSslSecure(true);
            if (nativeEvent.url !== null) {
              const url = new URL(nativeEvent.url);
              setInputText(url.hostname);
              setCurrentUrl(nativeEvent.url);
            } else {
              setInputText(finalTitle);
              setCurrentUrl(nativeEvent.url);
            }
          }}
          onError={syntheticEvent => {
            setInbuiltPage('webviewError');
            const { code, description } = syntheticEvent.nativeEvent;
            setBrowserError(description);
            setBrowserErrorCode(
              webviewErrorCodes.includes(`${code}`) ? `${code}` : 'default',
            );
            if (code) {
              const mapping =
                webviewErrorCodesMapping[
                  Object.keys(webviewErrorCodesMapping).includes(
                    code.toString(),
                  )
                    ? code.toString()
                    : 'default'
                ];

              const isSSLError = mapping.error === BROWSER_ERROR.SSL;
              setIsSslSecure(!isSSLError);
            }
          }}
          onHttpError={Sentry.captureException}
          onMessage={onWebviewMessage}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
