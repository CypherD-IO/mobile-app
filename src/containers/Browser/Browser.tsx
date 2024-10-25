/* eslint-disable react-native/no-raw-text */
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
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
  View,
} from 'react-native';
import { URL } from 'react-native-url-polyfill';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AppImages from '../../../assets/images/appImages';
import {
  ChooseChainModal,
  WHERE_BROWSER,
} from '../../components/ChooseChainModal';
import MoreViewModal from '../../components/MoreViewModal';
import { INJECTED_WEB3_CDN } from '../../constants/data';
import { Web3Origin } from '../../constants/enum';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import * as C from '../../constants/index';
import {
  CHAIN_ETH,
  PURE_COSMOS_CHAINS,
  Chain,
  ChainBackendNames,
} from '../../constants/server';
import { Colors } from '../../constants/theme';
import { CommunicationEvents } from '../../constants/web3';
import { showToast } from '../../containers/utilities/toastUtility';
import { HdWalletContext } from '../../core/util';
import useWeb3 from '../../hooks/useWeb3';
import { DynamicScrollView } from '../../styles/viewStyle';
import {
  BrowserHistoryEntry,
  PageType,
  SearchHistoryEntry,
  WebsiteInfo,
} from '../../types/Browser';
import { MODAL_SHOW_TIMEOUT } from '../../constants/timeOuts';
import CryptoJS from 'crypto-js';
import useAxios from '../../core/HttpRequest';
import { screenTitle } from '../../constants/index';
import { CyDSafeAreaView, CyDText, CyDView } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { isIOS } from '../../misc/checkers';
import usePortfolio from '../../hooks/usePortfolio';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView,
  WebsiteInput,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('../../styles');

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
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { params } = route;
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [moreView, setMoreview] = useState<boolean>(false);
  const [onFocus, setFocus] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [injectedCode, setInjectedCode] = useState('');
  const { getWithAuth } = useAxios();
  const { getNativeToken } = usePortfolio();

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

  let homePageUrl = 'https://www.cypherwallet.io/';
  if (Platform.OS === 'ios') {
    homePageUrl = 'https://www.cypherwallet.io/';
  }
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
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true); // or some other action
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    const {
      selectedChain: { chain_id },
      selectedChain,
    } = hdWalletContext.state;
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
    const nativeToken = await getNativeToken(
      selectedChain.backendName as ChainBackendNames,
    );
    if (nativeToken?.actualBalance && websiteInfo.url !== '') {
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
      navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
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

  const onHome = () => {};

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

  return (
    <CyDSafeAreaView className='bg-white flex-1'>
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
          onHome();
          setInbuiltPage('home');
        }}
        onHistory={() => {
          setInbuiltPage('history');
        }}
        onBookmark={() => {
          setInbuiltPage('bookmarks');
        }}
      />
      <DynamicView
        dynamic
        dynamicHeightFix
        dynamicWidth
        width={94}
        jC={'center'}
        aLIT={'center'}
        height={45}
        bGC='white'
        fD={'row'}
        mH={10}
        mT={Platform.OS === 'android' ? 5 : 0}>
        {!onFocus && (
          <DynamicTouchView
            sentry-label='browser-back-button'
            dynamic
            dynamicWidth
            dynamicHeightFix
            mL={30}
            height={10}
            width={8}
            jC={'center'}
            onPress={() => {
              handleBackButton();
            }}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={28}
              width={28}
              resizemode='contain'
              source={AppImages.BACK}
              style={{ tintColor: canGoBack ? 'black' : 'gray' }}
            />
          </DynamicTouchView>
        )}
        {!onFocus && (
          <DynamicTouchView
            sentry-label='browser-forward-button'
            dynamic
            dynamicWidth
            dynamicHeightFix
            height={10}
            width={8}
            jC={'center'}
            onPress={() => {
              handleForwardButton();
            }}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={28}
              width={28}
              resizemode='contain'
              source={AppImages.BACK}
              style={{
                tintColor: canGoForward ? 'black' : 'gray',
                transform: [{ rotate: '180deg' }],
              }}
            />
          </DynamicTouchView>
        )}

        {!onFocus && (
          <DynamicTouchView
            sentry-label='browser-forward-button'
            dynamic
            dynamicWidth
            dynamicHeightFix
            height={10}
            mL={-5}
            width={8}
            jC={'center'}
            onPress={() => {
              handleReload();
            }}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={100}
              width={100}
              resizemode='contain'
              source={AppImages.REFRESH_BROWSER}
              style={{ tintColor: '#555' }}
            />
          </DynamicTouchView>
        )}

        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeightFix
          height={30}
          bO={Platform.OS === 'android' ? 0.9 : 0.6}
          mL={onFocus ? 10 : 5}
          width={onFocus ? 80 : 63}
          bR={8}
          bGC={onFocus ? '#F5F7FF' : '#EDEDED'}
          aLIT={'center'}
          jC={'center'}
          fD={'row'}
          style={{ borderColor: onFocus ? '#222222' : '#FFFFFF' }}>
          {!onFocus &&
            (inbuildPage === 'webview' || inbuildPage === 'webviewError') && (
              <DynamicTouchView
                dynamic
                mL={2}
                sentry-label='browser-search-erase'>
                {isSslSecure && (
                  <DynamicImage
                    style={{ tintColor: '#32cd32' }}
                    dynamic
                    dynamicWidthFix
                    height={15}
                    width={15}
                    mL={5}
                    resizemode='contain'
                    source={AppImages.LOCK_BROWSER}
                  />
                )}
                {!isSslSecure && (
                  <DynamicImage
                    dynamic
                    dynamicWidthFix
                    height={15}
                    width={15}
                    mL={5}
                    resizemode='contain'
                    source={AppImages.BROWSER_SSL}
                  />
                )}
              </DynamicTouchView>
            )}
          {onFocus && (
            <DynamicTouchView sentry-label='browser-search-erase'>
              <DynamicImage
                style={{ tintColor: 'black' }}
                dynamic
                dynamicWidthFix
                height={18}
                width={18}
                mL={0}
                resizemode='contain'
                source={AppImages.SEARCH_BROWSER}
              />
            </DynamicTouchView>
          )}
          <WebsiteInput
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
            style={{
              width: onFocus || isKeyboardVisible ? '83%' : '90%',
              textAlign: onFocus ? 'left' : 'center',
              color: onFocus ? '#000000' : '#555555',
            }}
            selectTextOnFocus={true}
          />
          <DynamicTouchView
            sentry-label='browser-search-erase'
            onPress={() => {
              setCurrentUrl('');
              setInputText('');
            }}>
            {onFocus && (
              <DynamicImage
                style={{ tintColor: 'gray' }}
                dynamic
                dynamicWidthFix
                height={12}
                width={12}
                resizemode='contain'
                source={AppImages.CANCEL}
              />
            )}
          </DynamicTouchView>
        </DynamicView>

        {onFocus && (
          <DynamicTouchView
            sentry-label='browser-search-cancel'
            dynamic
            mL={10}
            onPress={() => {
              Keyboard.dismiss();
              setFocus(false);
            }}>
            <CText
              dynamic
              fF={C.fontsName.FONT_REGULAR}
              fS={16}
              color={Colors.primaryTextColor}>
              Cancel
            </CText>
          </DynamicTouchView>
        )}

        {!onFocus && (
          <DynamicTouchView
            sentry-label='browser-chain-choose'
            dynamic
            dynamicTintColor
            tC={'#767BA1'}
            dynamicWidth
            dynamicHeightFix
            height={30}
            width={10}
            bR={15}
            pH={5}
            mL={5}
            pV={5}
            fD={'row'}
            onPress={() => {
              setChooseChain(true);
            }}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={95}
              width={95}
              resizemode='contain'
              source={hdWalletContext.state.selectedChain.logo_url}
            />
          </DynamicTouchView>
        )}
        {!onFocus && (
          <DynamicTouchView
            sentry-label='browser-more-button'
            dynamic
            dynamicTintColor
            tC={'#767BA1'}
            dynamicWidth
            width={10}
            bR={15}
            pH={4}
            pV={0}
            fD={'row'}
            onPress={() => {
              setMoreview(true);
            }}>
            <DynamicImage
              dynamic
              dynamicWidth
              marginHorizontal={0}
              height={60}
              width={60}
              resizemode='contain'
              source={AppImages.MORE}
            />
          </DynamicTouchView>
        )}
      </DynamicView>
      {onFocus &&
        !websiteInfo.origin.includes('cypherd.io') &&
        websiteInfo.origin !== '' && (
          <DynamicTouchView
            dynamic
            sentry-label='browser-current-url-bookmark'
            fD={'row'}
            heigth={100}
            width={100}
            aLIT={'center'}
            jC={'flex-start'}
            mT={10}>
            <DynamicImage
              dynamic
              dynamicWidth
              height={18}
              width={18}
              resizemode='contain'
              source={{
                uri: `https://www.google.com/s2/favicons?domain=${websiteInfo.host}&sz=32`,
              }}
            />
            <DynamicView dynamic dynamicWidth width={60}>
              <CText
                dynamic
                dynamicWidth
                width={100}
                numberOfLines={1}
                fF={C.fontsName.FONT_REGULAR}
                tA={'left'}
                mL={-15}
                fS={14}
                style={{ color: Colors.primaryTextColor }}>
                {websiteInfo.title}
              </CText>
              <CText
                dynamic
                dynamicWidth
                width={100}
                numberOfLines={1}
                fF={C.fontsName.FONT_REGULAR}
                tA={'left'}
                mL={-15}
                fS={10}
                style={{ color: Colors.primaryTextColor }}>
                {websiteInfo.origin}
              </CText>
            </DynamicView>
            <DynamicTouchView
              dynamic
              dynamicWidth
              width={12}
              onPress={onBookMark}
              fD='row'
              jC='flex-end'>
              <DynamicImage
                dynamic
                dynamicWidth
                height={20}
                width={50}
                mL={-10}
                mT={-5}
                resizemode='contain'
                source={
                  isBookmarkedAlready(websiteInfo.url)
                    ? AppImages.BOOKMARK_FILLED
                    : AppImages.BOOKMARK_BROWSER
                }
                style={{ tintColor: '#333333' }}
              />
            </DynamicTouchView>
          </DynamicTouchView>
        )}
      {onFocus && searchData.length > 0 && (
        <CText
          dynamic
          dynamicWidthFix
          width={170}
          numberOfLines={1}
          fF={C.fontsName.FONT_REGULAR}
          tA={'left'}
          mT={10}
          mL={20}
          fS={13}
          style={{ color: Colors.primaryTextColor }}>
          Recent Searches
        </CText>
      )}
      {onFocus && (
        <DynamicView dynamic dynamicHeight height={100} jC='flex-start'>
          {searchData.map(item => (
            <DynamicTouchView
              key={item.url}
              dynamic
              sentry-label='browser-recent-search-url'
              fD={'row'}
              heigth={100}
              width={100}
              aLIT={'center'}
              jC={'flex-start'}
              mT={10}
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
              <DynamicImage
                dynamic
                dynamicWidth
                height={18}
                width={18}
                resizemode='contain'
                source={{ uri: item.image }}
              />
              <DynamicView dynamic dynamicWidth width={80}>
                <CText
                  dynamic
                  dynamicWidth
                  width={100}
                  numberOfLines={1}
                  fF={C.fontsName.FONT_REGULAR}
                  tA={'left'}
                  mL={-15}
                  fS={14}
                  style={{ color: Colors.primaryTextColor }}>
                  {item.name}
                </CText>
                <CText
                  dynamic
                  dynamicWidth
                  width={100}
                  numberOfLines={1}
                  fF={C.fontsName.FONT_REGULAR}
                  tA={'left'}
                  mL={-15}
                  fS={10}
                  style={{ color: Colors.primaryTextColor }}>
                  {item.origin}
                </CText>
              </DynamicView>
            </DynamicTouchView>
          ))}
        </DynamicView>
      )}

      {inbuildPage === 'history' && !onFocus ? (
        <DynamicScrollView
          dynamic
          dynamicHeight
          height={100}
          style={{ innerHeight: '100%', outerHeight: '100%' }}>
          <DynamicTouchView
            onPress={() => {
              clearHistory();
              analytics()
                .logEvent('browser_clear_history', {
                  from: 'browser',
                })
                .catch(Sentry.captureException);
            }}>
            <CText
              dynamic
              dynamicWidth
              width={90}
              numberOfLines={1}
              fF={C.fontsName.FONT_REGULAR}
              tA={'left'}
              mL={20}
              mT={10}
              fS={12}
              style={{ color: Colors.primaryTextColor }}>
              Clear browsing history
            </CText>
          </DynamicTouchView>

          <View
            style={{
              borderBottomColor: '#d1d1e0',
              borderBottomWidth: 1,
              marginBottom: 5,
              marginTop: 10,
            }}
          />
          {browserHistory.length === 0 ? (
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={100}
              width={100}
              alIT={'center'}
              jC={'center'}>
              <CText
                dynamic
                dynamicWidth
                width={90}
                numberOfLines={1}
                fF={C.fontsName.FONT_REGULAR}
                tA={'center'}
                mT={200}
                fS={12}
                style={{ color: Colors.primaryTextColor }}>
                Start using the browser to view history here
              </CText>
            </DynamicView>
          ) : (
            spliceHistoryByTime().map(historybt => (
              <View key={historybt.dateString}>
                <CText
                  dynamic
                  dynamicWidth
                  width={90}
                  numberOfLines={1}
                  fF={C.fontsName.FONT_REGULAR}
                  tA={'left'}
                  mT={10}
                  mL={20}
                  fS={12}
                  style={{ color: Colors.primaryTextColor }}>
                  {historybt.dateString}
                </CText>
                {historybt.entry.map(item => (
                  <DynamicTouchView
                    key={item.url}
                    sentry-label='browser-history-url'
                    dynamic
                    fD={'row'}
                    width={100}
                    aLIT={'center'}
                    jC={'flex-start'}
                    mT={10}
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
                    <DynamicImage
                      dynamic
                      dynamicWidth
                      height={18}
                      width={18}
                      resizemode='contain'
                      source={{ uri: item.image }}
                    />
                    <DynamicView dynamic dynamicWidth width={80}>
                      <CText
                        dynamic
                        dynamicWidth
                        width={100}
                        numberOfLines={1}
                        fF={C.fontsName.FONT_REGULAR}
                        tA={'left'}
                        mL={-15}
                        fS={14}
                        style={{ color: Colors.primaryTextColor }}>
                        {item.name}
                      </CText>
                      <CText
                        dynamic
                        dynamicWidth
                        width={100}
                        numberOfLines={1}
                        fF={C.fontsName.FONT_REGULAR}
                        tA={'left'}
                        mL={-15}
                        fS={10}
                        style={{ color: Colors.primaryTextColor }}>
                        {item.origin}
                      </CText>
                    </DynamicView>
                    <DynamicTouchView
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
                      <DynamicImage
                        style={{ tintColor: 'gray' }}
                        dynamic
                        dynamicWidthFix
                        height={15}
                        width={15}
                        resizemode='contain'
                        mL={-20}
                        source={AppImages.CANCEL}
                      />
                    </DynamicTouchView>
                  </DynamicTouchView>
                ))}
              </View>
            ))
          )}
        </DynamicScrollView>
      ) : null}
      {inbuildPage === 'webviewError' && (
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeight
          height={100}
          width={100}
          aLIT={'center'}
          jC={'flex-start'}>
          <DynamicImage
            dynamic
            dynamicWidthFix
            dynamicHeightFix
            height={160}
            width={160}
            mT={150}
            resizemode='contain'
            source={webviewErrorCodesMapping[browserErrorCode].image}
          />
          <CText
            dynamic
            dynamicWidth
            width={80}
            numberOfLines={2}
            fF={C.fontsName.FONT_REGULAR}
            tA={'center'}
            fS={12}
            style={{
              color: Colors.primaryTextColor,
            }}>{`Error: ${browserError}`}</CText>
        </DynamicView>
      )}

      {inbuildPage === 'bookmarks' && (
        <DynamicScrollView
          dynamic
          dynamicHeight
          height={100}
          onTouchEnd={(e: any) => {
            if (e.target === e.currentTarget) {
              setRemoveBookmarkMode(false);
              setInbuiltPage('webview');
            }
          }}>
          <DynamicView>
            <CText
              dynamic
              dynamicWidth
              width={58}
              numberOfLines={1}
              fF={C.fontsName.FONT_BOLD}
              tA={'left'}
              mL={22}
              mT={10}
              fS={15}
              style={{ color: Colors.primaryTextColor }}>
              {'bookmarks'.toLocaleUpperCase()}
            </CText>
            {browserFavourites.length === 0 && (
              <CText
                dynamic
                dynamicWidth
                width={100}
                numberOfLines={1}
                tA={'center'}
                mL={0}
                mT={10}
                fS={12}
                style={{ color: Colors.primaryTextColor }}>
                Your bookmarks will be shown here
              </CText>
            )}
            <DynamicView
              dynamic
              fD={'row'}
              dynamicWidth
              width={90}
              aLIT={'center'}
              jC={'flex-start'}
              mL={10}
              style={{ flexWrap: 'wrap', marginBotton: '30px' }}>
              {browserFavourites.map(favourite => (
                <DynamicView
                  key={favourite.url}
                  dynamic
                  style={{ flexBasis: '20%' }}>
                  <DynamicTouchView
                    dynamic
                    dynamicWidthFix
                    dynamicHeightFix
                    height={48}
                    width={48}
                    alIT={'center'}
                    jC={'center'}
                    mL={10}
                    mT={10}
                    bGC={Colors.browserBookmarkBackground}
                    style={{
                      color: Colors.primaryTextColor,
                      borderWidth: 1,
                      borderColor: 'gray',
                      borderRadius: 22,
                    }}
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
                    <DynamicView>
                      <DynamicImage
                        dynamic
                        dynamicWidthFix
                        dynamicHeightFix
                        height={38}
                        width={38}
                        resizemode='contain'
                        source={{ uri: favourite.image }}
                      />
                    </DynamicView>
                  </DynamicTouchView>

                  {removeBookmarkMode && (
                    <DynamicTouchView
                      sentry-label='browser-search-erase'
                      style={{
                        position: 'absolute',
                        tintColor: '#444444',
                        left: 52,
                        top: 5,
                        backgroundColor: 'white',
                        borderRadius: 50,
                      }}
                      onPress={() => {
                        deleteBookmark(favourite);
                      }}>
                      <DynamicImage
                        dynamic
                        dynamicWidthFix
                        height={14}
                        width={14}
                        resizemode='contain'
                        source={AppImages.CANCEL}
                        style={{ tintColor: '#444444' }}
                      />
                    </DynamicTouchView>
                  )}

                  <CText
                    dynamic
                    dynamicWidthFix
                    width={58}
                    numberOfLines={1}
                    fF={C.fontsName.FONT_REGULAR}
                    mL={11}
                    mT={3}
                    fS={12}
                    style={{ color: Colors.primaryTextColor }}>
                    {favourite.name}
                  </CText>
                </DynamicView>
              ))}
            </DynamicView>
          </DynamicView>
        </DynamicScrollView>
      )}

      {!onFocus && inbuildPage === 'home' && (
        <DynamicScrollView dynamic dynamicHeight height={100}>
          {browserHistory.length === 0 ? (
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={100}
              width={100}
              alIT={'center'}
              jC={'center'}>
              <CText
                dynamic
                dynamicWidth
                width={90}
                numberOfLines={1}
                fF={C.fontsName.FONT_REGULAR}
                tA={'center'}
                mT={200}
                fS={12}
                style={{ color: Colors.primaryTextColor }}>
                Start using the browser to view history here
              </CText>
            </DynamicView>
          ) : (
            <>
              <CyDText className=' text-left ml-[22px] mt-[10px] text-[15px]  font-bold'>
                {'history'.toLocaleUpperCase()}
              </CyDText>
              {spliceHistoryByTime().map(historybt => (
                <View key={historybt.dateString}>
                  <CText
                    dynamic
                    dynamicWidth
                    width={90}
                    numberOfLines={1}
                    fF={C.fontsName.FONT_REGULAR}
                    tA={'left'}
                    mT={10}
                    mL={20}
                    fS={12}
                    style={{ color: Colors.primaryTextColor }}>
                    {historybt.dateString}
                  </CText>
                  {historybt.entry.map(item => (
                    <DynamicTouchView
                      key={item.url}
                      sentry-label='browser-history-url'
                      dynamic
                      fD={'row'}
                      width={100}
                      aLIT={'center'}
                      jC={'flex-start'}
                      mT={10}
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
                      <DynamicImage
                        dynamic
                        dynamicWidth
                        height={18}
                        width={18}
                        resizemode='contain'
                        source={{ uri: item.image }}
                      />
                      <DynamicView dynamic dynamicWidth width={80}>
                        <CText
                          dynamic
                          dynamicWidth
                          width={100}
                          numberOfLines={1}
                          fF={C.fontsName.FONT_REGULAR}
                          tA={'left'}
                          mL={-15}
                          fS={14}
                          style={{ color: Colors.primaryTextColor }}>
                          {item.name}
                        </CText>
                        <CText
                          dynamic
                          dynamicWidth
                          width={100}
                          numberOfLines={1}
                          fF={C.fontsName.FONT_REGULAR}
                          tA={'left'}
                          mL={-15}
                          fS={10}
                          style={{ color: Colors.primaryTextColor }}>
                          {item.origin}
                        </CText>
                      </DynamicView>
                      <DynamicTouchView
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
                        <DynamicImage
                          style={{ tintColor: 'gray' }}
                          dynamic
                          dynamicWidthFix
                          height={15}
                          width={15}
                          resizemode='contain'
                          mL={-20}
                          source={AppImages.CANCEL}
                        />
                      </DynamicTouchView>
                    </DynamicTouchView>
                  ))}
                </View>
              ))}
            </>
          )}
        </DynamicScrollView>
      )}
      {loader && inbuildPage === 'webview' && (
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeight
          height={95}
          width={100}
          jC='center'>
          <ActivityIndicator size='large' color={Colors.black} />
        </DynamicView>
      )}
      <CyDView className={clsx('flex-1 pb-[50px]', { 'pb-[75px]': !isIOS() })}>
        <WebView
          key={webviewKey}
          source={{ uri: search }}
          ref={webviewRef}
          startInLoadingState
          onLoadStart={() => setLoader(true)}
          onLoadEnd={() => setLoader(false)}
          injectedJavaScriptBeforeContentLoaded={injectedCode}
          mediaPlaybackRequiresUserAction={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ marginTop: 0 }}
          onNavigationStateChange={navState => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
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
