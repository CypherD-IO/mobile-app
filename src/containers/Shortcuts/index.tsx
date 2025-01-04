/* eslint-disable @typescript-eslint/no-misused-promises */
import { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDFlatList,
} from '../../styles/tailwindStyles';
import CyDModalLayout from '../../components/v2/modal';
import * as React from 'react';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import {
  Chain,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_AVALANCHE,
  FundWalletAddressType,
  ChainBackendNames,
  CHAIN_POLYGON,
  CHAIN_ARBITRUM,
  CHAIN_BSC,
} from '../../constants/server';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import {
  HdWalletContext,
  getAvailableChains,
  sortJSONArrayByKey,
} from '../../core/util';
import LottieView from 'lottie-react-native';
import analytics from '@react-native-firebase/analytics';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import useIsSignable from '../../hooks/useIsSignable';
import { ActivityType } from '../../reducers/activity_reducer';
import { isIOS } from '../../misc/checkers';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import clsx from 'clsx';

interface IShortcutsData {
  index: number;
  title: string;
  subTitle: string;
  logo: any;
  screenTitle: string;
  navigationProps?: any;
  isPrivateKeyDependent?: boolean;
}

interface IBuyOptionsData {
  index: number;
  title: string;
  displayTitle: string;
  logo: any;
  supportedChains: Chain[];
  currencyType: CurrencyTypes;
  screenTitle: string;
  supportedPaymentModes: string;
  isVisibileInUI: boolean;
}

interface ISellOptionsData {
  index: number;
  title: string;
  displayTitle: string;
  logo: any;
  supportedChains: Chain[];
  currencyType: CurrencyTypes;
  screenTitle: string;
  supportedPaymentModes: string;
  isVisibileInUI: boolean;
}

enum CurrencyTypes {
  USD = 'USD',
  INR = 'INR',
  FIAT = 'FIAT',
}

enum ShortcutsTitle {
  BRIDGE = 'BRIDGE',
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  FUND_CARD = 'FUND_CARD',
  BUY = 'BUY',
  IBC = 'IBC',
  SELL = 'Sell',
  EXCHANGE = 'EXCHANGE',
  SWAP = 'SWAP_TITLE',
}

enum BuyOptions {
  ONMETA = 'ONMETA',
  COINBASE = 'COINBASE',
  TRANSFI = 'TRANSFI',
}

enum SellOptions {
  ONMETA = 'ONMETA',
  COINBASE = 'COINBASE',
  TRANSFI = 'TRANSFI',
}

export default function ShortcutsModal() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const [sortedShortcutsData, setSortedShortcutsData] = useState<
    IShortcutsData[]
  >([]);
  const [isSignableTransaction] = useIsSignable();

  const emptyWalletShortcutsData: IShortcutsData[] = [
    {
      index: 0,
      title: ShortcutsTitle.BUY,
      subTitle: t('BUY_SHORTCUTS_SUBTITLE'),
      logo: AppImages.BUY_SHORTCUT,
      screenTitle: '',
      isPrivateKeyDependent: true,
    },
    {
      index: 4,
      title: ShortcutsTitle.RECEIVE,
      subTitle: t('RECEIVE_SHORTCUTS_SUBTITLE'),
      logo: AppImages.RECEIVE_SHORTCUT,
      screenTitle: screenTitle.QRCODE,
    },
  ];

  const shortcutsData: IShortcutsData[] = [
    ...emptyWalletShortcutsData,
    {
      index: 3,
      title: ShortcutsTitle.SEND,
      logo: AppImages.SEND_SHORTCUT,
      subTitle: t('SEND_SHORTCUTS_SUBTITLE'),
      screenTitle: screenTitle.ENTER_AMOUNT,
    },
    {
      index: 5,
      title: ShortcutsTitle.SELL,
      logo: AppImages.SELL_SHORTCUT,
      subTitle: t('SELL_SHORTCUTS_SUBTITLE'),
      screenTitle: '',
      isPrivateKeyDependent: true,
    },
  ];

  const buyOptionsData: IBuyOptionsData[] = [
    {
      index: 0,
      title: BuyOptions.ONMETA,
      displayTitle: t('ONMETA_BUY_DISPLAY_TITLE'),
      logo: AppImages.ONMETA,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
        CHAIN_ARBITRUM,
        CHAIN_BSC,
      ],
      currencyType: CurrencyTypes.INR,
      screenTitle: screenTitle.ON_META,
      supportedPaymentModes: 'UPI',
      isVisibileInUI: true,
    },
    {
      index: 1,
      title: BuyOptions.COINBASE,
      displayTitle: t('COINBASE_DISPLAY_TITLE'),
      logo: AppImages.COINBASE,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_COSMOS,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
      ],
      currencyType: CurrencyTypes.USD,
      screenTitle: screenTitle.CB_PAY,
      supportedPaymentModes: '',
      isVisibileInUI: true,
    },
  ];

  const sellOptionsData: ISellOptionsData[] = [
    {
      index: 0,
      title: SellOptions.ONMETA,
      displayTitle: t('ONMETA_SELL_DISPLAY_TITLE'),
      logo: AppImages.ONMETA,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
        CHAIN_ARBITRUM,
        CHAIN_BSC,
      ],
      currencyType: CurrencyTypes.FIAT,
      screenTitle: screenTitle.ON_META,
      supportedPaymentModes: 'Instant Bank Deposit using IMPS',
      isVisibileInUI: true,
    },
  ];

  const [shortcutsModalVisible, setShortcutsModalVisible] =
    useState<boolean>(false);
  const [buyModalVisible, setBuyModalVisible] = useState<boolean>(false);
  const [buyChooseChainModalVisible, setBuyChooseChainModalVisible] =
    useState<boolean>(false);
  const [sellModalVisible, setSellModalVisible] = useState<boolean>(false);
  const [sellChooseChainModalVisible, setSellChooseChainModalVisible] =
    useState<boolean>(false);
  const [chainData, setChainData] = useState<Chain[]>([CHAIN_ETH]);
  const [buyType, setBuyType] = useState<IBuyOptionsData>(buyOptionsData[0]);
  const [sellType, setSellType] = useState<ISellOptionsData>(
    sellOptionsData[0],
  );
  const [chooseChainModal, setChooseChainModal] = useState<boolean>(false);
  const [selectedChain, setSelectedChain] = useState<Chain>(CHAIN_ETH);
  const [selectedOption, setSelectedOption] = useState<ShortcutsTitle>(
    ShortcutsTitle.RECEIVE,
  );
  const [appState, setAppState] = useState<string>('');
  const [animation, setAnimation] = useState<any>();

  const onSelectingShortCutItems = async (item: any) => {
    await analytics().logEvent(`shortcuts_button_${item.title}`);
    setSelectedOption(item.title);
    setShortcutsModalVisible(false);
    switch (item.title) {
      case ShortcutsTitle.BUY:
        setTimeout(() => setBuyModalVisible(true), 250);
        break;
      case ShortcutsTitle.SELL:
        setTimeout(() => setSellModalVisible(true), 250);
        break;
      case ShortcutsTitle.SEND:
        navigation.navigate(item.screenTitle);
        break;
      case ShortcutsTitle.RECEIVE:
        setChainData(getAvailableChains(hdWallet));
        setTimeout(() => setChooseChainModal(true), 250);
        break;

      default:
        item?.navigationProps
          ? setTimeout(
              () =>
                navigation.navigate(item.screenTitle, {
                  ...item.navigationProps,
                }),
              250,
            )
          : navigation.navigate(item.screenTitle);
    }
  };

  const onPressShortcutsItem = (item: IShortcutsData) => {
    if (item.isPrivateKeyDependent) {
      setShortcutsModalVisible(false);
      isSignableTransaction(ActivityType.BUY, () => {
        void onSelectingShortCutItems(item);
      });
    } else {
      void onSelectingShortCutItems(item);
    }
  };

  const renderShortcutsItem = (item: IShortcutsData) => {
    return (
      <CyDTouchView
        className={''}
        onPress={async () => {
          onPressShortcutsItem(item);
        }}>
        <CyDView className={'flex flex-row items-center py-[16px]'}>
          <CyDImage
            source={item.logo}
            className={'w-[46px] h-[46px] mr-[18px]'}
          />
          <CyDView>
            <CyDText className={'font-bold text-[18px] '}>
              {t(item.title).toString()}
            </CyDText>
            <CyDText className={'font-semibold text-subTextColor text-[14px] '}>
              {t(item.subTitle).toString()}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className={'h-[0.5px] w-full bg-n40'} />
      </CyDTouchView>
    );
  };

  const renderBuyPlatformItem = (item: IBuyOptionsData) => {
    return (
      item.isVisibileInUI && (
        <CyDTouchView
          className={'mb-[16px]'}
          onPress={() => {
            setBuyType(item);
            setChainData(item.supportedChains);
            setBuyModalVisible(false);
            setTimeout(() => setBuyChooseChainModalVisible(true), 250);
          }}>
          <CyDView className={'bg-n0 p-[16px] rounded-[18px]'}>
            <CyDView className={'flex flex-row justify-between'}>
              <CyDView className={'flex flex-row items-center'}>
                <CyDImage
                  source={item.logo}
                  className={'w-[22px] h-[22px] mr-[6px]'}
                />
                <CyDText className={'font-bold text-[18px]'}>
                  {item.displayTitle}
                </CyDText>
              </CyDView>
              {/* <CyDText className={'font-bold text-[18px] '}>{item.currencyType}</CyDText> */}
            </CyDView>
            <CyDView className={'flex flex-row flex-wrap mt-[16px] pl-[2px]'}>
              {item.supportedChains.map(chain => (
                <CyDView
                  key={chain.backendName}
                  className={'flex flex-row items-center mr-[12px] mb-[6px]'}>
                  <CyDImage
                    source={chain.logo_url}
                    className={'w-[12px] h-[12px] mr-[4px]'}
                  />
                  <CyDText
                    className={'text-subTextColor font-medium text-[12px]'}>
                    {chain.name.toUpperCase()}
                  </CyDText>
                </CyDView>
              ))}
            </CyDView>
            <CyDView className={'w-full h-[1px] bg-n40 my-[16px]'} />
            {item.title !== BuyOptions.COINBASE &&
              item.title !== BuyOptions.TRANSFI && (
                <CyDView className='pl-[2px]'>
                  <CyDText className={'text-subTextColor'}>
                    {t('MODES_INIT_CAPS')} :{' '}
                    <CyDText className={'font-black text-subTextColor'}>
                      {item.supportedPaymentModes}
                    </CyDText>
                  </CyDText>
                </CyDView>
              )}
          </CyDView>
        </CyDTouchView>
      )
    );
  };

  const renderSellPlatformItem = (item: ISellOptionsData, navigation: any) => {
    return (
      item.isVisibileInUI && (
        <CyDTouchView
          className={'mb-[16px]'}
          onPress={() => {
            setSellType(item);
            setChainData(item.supportedChains);
            setSellModalVisible(false);
            setTimeout(() => setSellChooseChainModalVisible(true), 250);
          }}>
          <CyDView className={'bg-n0 p-[16px] rounded-[18px]'}>
            <CyDView className={'flex flex-row justify-between'}>
              <CyDView className={'flex flex-row items-center'}>
                <CyDImage
                  source={item.logo}
                  className={'w-[22px] h-[22px] mr-[6px]'}
                />
                <CyDText className={'font-bold text-[18px] '}>
                  {item.displayTitle}
                </CyDText>
              </CyDView>
              {/* <CyDText className={'font-bold text-[18px] '}>{item.currencyType}</CyDText> */}
            </CyDView>
            <CyDView className={'flex flex-row flex-wrap mt-[16px]'}>
              {item.supportedChains.map(chain => (
                <CyDView
                  key={chain.backendName}
                  className={
                    'flex flex-row items-center mr-[12px] mb-[6px] pl-[2px]'
                  }>
                  <CyDImage
                    source={chain.logo_url}
                    className={'w-[12px] h-[12px] mr-[4px]'}
                  />
                  <CyDText
                    className={'text-subTextColor font-medium text-[12px]'}>
                    {chain.name.toUpperCase()}
                  </CyDText>
                </CyDView>
              ))}
            </CyDView>
            <CyDView className={'w-full h-[1px] bg-base20 my-[16px]'} />
            {item.title !== SellOptions.COINBASE && (
              <CyDView className='pl-[2px]'>
                <CyDText className={'text-subTextColor'}>
                  {t('MODES_INIT_CAPS')}:{' '}
                  <CyDText className={'font-black text-subTextColor'}>
                    {item.supportedPaymentModes}
                  </CyDText>
                </CyDText>
              </CyDView>
            )}
          </CyDView>
        </CyDTouchView>
      )
    );
  };

  const renderChainItem = (item: Chain, navigation: any) => {
    return (
      <CyDTouchView
        className={'p-[20px] bg-n0 rounded-[18px] mb-[10px]'}
        onPress={() => {
          setBuyChooseChainModalVisible(false);
          navigation.navigate(buyType.screenTitle, {
            url: item.backendName,
            operation: 'buy',
          });
        }}>
        <CyDView className={'flex flex-row items-center justify-between'}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={item.logo_url}
              className={'w-[18px] h-[18px] mr-[10px]'}
            />
            <CyDText className={'font-medium text-[17px] '}>
              {item.name.toUpperCase()}
            </CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.BROWSER_REDIRECT}
            className={'w-[18px] h-[18px] ml-[10px]'}
          />
        </CyDView>
      </CyDTouchView>
    );
  };

  const renderSellChainItem = (item: Chain, navigation: any) => {
    return (
      <CyDTouchView
        className={'p-[20px] bg-n0 rounded-[18px] mb-[10px]'}
        onPress={() => {
          setSellChooseChainModalVisible(false);
          navigation.navigate(sellType.screenTitle, {
            url: item.backendName,
            operation: 'sell',
          });
        }}>
        <CyDView className={'flex flex-row items-center justify-between'}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={item.logo_url}
              className={'w-[18px] h-[18px] mr-[10px]'}
            />
            <CyDText className={'font-medium text-[17px] '}>
              {item.name.toUpperCase()}
            </CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.BROWSER_REDIRECT}
            className={'w-[18px] h-[18px] ml-[10px]'}
          />
        </CyDView>
      </CyDTouchView>
    );
  };

  const onSelectingChain = ({ item }) => {
    if (ShortcutsTitle.RECEIVE === selectedOption) {
      let addressTypeQRCode = FundWalletAddressType.EVM;
      switch (item.backendName) {
        case ChainBackendNames.POLYGON:
          addressTypeQRCode = FundWalletAddressType.POLYGON;
          break;
        case ChainBackendNames.BSC:
          addressTypeQRCode = FundWalletAddressType.BSC;
          break;
        case ChainBackendNames.AVALANCHE:
          addressTypeQRCode = FundWalletAddressType.AVALANCHE;
          break;
        case ChainBackendNames.ARBITRUM:
          addressTypeQRCode = FundWalletAddressType.ARBITRUM;
          break;
        case ChainBackendNames.OPTIMISM:
          addressTypeQRCode = FundWalletAddressType.OPTIMISM;
          break;
        case ChainBackendNames.COSMOS:
          addressTypeQRCode = FundWalletAddressType.COSMOS;
          break;
        case ChainBackendNames.OSMOSIS:
          addressTypeQRCode = FundWalletAddressType.OSMOSIS;
          break;
        case ChainBackendNames.JUNO:
          addressTypeQRCode = FundWalletAddressType.JUNO;
          break;
        case ChainBackendNames.STARGAZE:
          addressTypeQRCode = FundWalletAddressType.STARGAZE;
          break;
        case ChainBackendNames.NOBLE:
          addressTypeQRCode = FundWalletAddressType.NOBLE;
          break;
        case ChainBackendNames.SHARDEUM:
          addressTypeQRCode = FundWalletAddressType.SHARDEUM;
          break;
        case ChainBackendNames.SHARDEUM_SPHINX:
          addressTypeQRCode = FundWalletAddressType.SHARDEUM_SPHINX;
          break;
        case ChainBackendNames.COREUM:
          addressTypeQRCode = FundWalletAddressType.COREUM;
          break;
        case ChainBackendNames.INJECTIVE:
          addressTypeQRCode = FundWalletAddressType.INJECTIVE;
          break;
        case ChainBackendNames.KUJIRA:
          addressTypeQRCode = FundWalletAddressType.KUJIRA;
          break;
        case ChainBackendNames.SOLANA:
          addressTypeQRCode = FundWalletAddressType.SOLANA;
          break;
      }
      setChooseChainModal(false);
      setTimeout(
        () =>
          navigation.navigate(screenTitle.QRCODE, {
            addressType: addressTypeQRCode,
          }),
        70,
      );
    } else {
      setSelectedChain(item);
    }
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (
      (appState === 'inactive' || appState === 'background') &&
      nextAppState === 'active'
    ) {
      if (animation) {
        animation.play();
      }
    }
    setAppState(nextAppState);
  };

  useEffect(() => {
    void populateShortcutsData();
    const appStateChangeListener = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      appStateChangeListener.remove();
    };
  }, [appState]);

  const populateShortcutsData = () => {
    const data = sortJSONArrayByKey(shortcutsData, 'index');
    setSortedShortcutsData(data);
  };

  return (
    <CyDTouchView
      className={'bg-transparent'}
      onPress={async () => {
        setShortcutsModalVisible(true);
        await analytics().logEvent('shortcuts_button_click');
      }}>
      {/* shortcuts modal */}
      <CyDModalLayout
        isModalVisible={shortcutsModalVisible}
        setModalVisible={setShortcutsModalVisible}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        style={{ justifyContent: 'flex-end', margin: 0, padding: 0 }}>
        <CyDView
          className={'relative bg-n0 p-[32px] rounded-t-[36px] pb-[40px]'}>
          <CyDTouchView
            onPress={() => setShortcutsModalVisible(false)}
            className={'z-50 absolute top-[24px] right-[24px]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px]'}
            />
          </CyDTouchView>
          <CyDFlatList
            data={sortedShortcutsData}
            renderItem={({ item }) => renderShortcutsItem(item, navigation)}
            key={({ item }) => item.index}
            className={''}
            showsVerticalScrollIndicator={true}
          />
        </CyDView>
      </CyDModalLayout>

      {/* buy coin modal */}
      <CyDModalLayout
        isModalVisible={buyModalVisible}
        setModalVisible={setBuyModalVisible}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        style={{ justifyContent: 'flex-end', margin: 0, padding: 0 }}>
        <CyDView
          className={
            'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px] max-h-[90%]'
          }>
          <CyDTouchView
            onPress={() => setBuyModalVisible(false)}
            className={'z-50 absolute top-[24px] right-[24px]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px]'}
            />
          </CyDTouchView>
          <CyDText className={'text-center font-bold text-[22px] mb-[14px]'}>
            {'Choose platform to buy'}
          </CyDText>
          <CyDFlatList
            data={buyOptionsData}
            renderItem={({ item }) => renderBuyPlatformItem(item, navigation)}
            key={({ item }) => item.index}
            showsVerticalScrollIndicator={true}
          />
        </CyDView>
      </CyDModalLayout>

      {/* sell coin modal */}
      <CyDModalLayout
        isModalVisible={sellModalVisible}
        setModalVisible={setSellModalVisible}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        style={{ justifyContent: 'flex-end', margin: 0, padding: 0 }}>
        <CyDView
          className={'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px]'}>
          <CyDTouchView
            onPress={() => setSellModalVisible(false)}
            className={'z-50 absolute top-[24px] right-[24px]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px]'}
            />
          </CyDTouchView>
          <CyDText className={'text-center font-bold text-[22px] mb-[14px]'}>
            {'Choose platform to sell'}
          </CyDText>
          <CyDFlatList
            data={sellOptionsData}
            renderItem={({ item }) => renderSellPlatformItem(item, navigation)}
            key={({ item }) => item.index}
            showsVerticalScrollIndicator={true}
          />
        </CyDView>
      </CyDModalLayout>

      {/* select chain in buy coin modal */}
      <CyDModalLayout
        isModalVisible={buyChooseChainModalVisible}
        setModalVisible={setBuyChooseChainModalVisible}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        style={{ justifyContent: 'flex-end', margin: 0, padding: 0 }}>
        <CyDView
          className={'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px]'}>
          <CyDView className={'flex flex-row justify-between items-center '}>
            <CyDTouchView
              onPress={() => {
                setBuyChooseChainModalVisible(false);
                setTimeout(() => setBuyModalVisible(true), 250);
              }}
              className={''}>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className={'w-[32px] h-[32px]'}
              />
            </CyDTouchView>
            <CyDView className={'flex flex-row'}>
              <CyDImage source={buyType.logo} className={'w-[20px] h-[20px]'} />
              <CyDText className={'text-center font-bold text-[16px] ml-[6px]'}>
                {buyType.title}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => setBuyChooseChainModalVisible(false)}
              className={''}>
              <CyDImage
                source={AppImages.CLOSE}
                className={'w-[16px] h-[16px]'}
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className={'text-center font-bold text-[22px] my-[20px]'}>
            {'Choose Chain'}
          </CyDText>
          <CyDFlatList
            data={chainData}
            renderItem={({ item }) => renderChainItem(item, navigation)}
            key={({ item }) => item.index}
            className={''}
            showsVerticalScrollIndicator={true}
          />
        </CyDView>
      </CyDModalLayout>

      {/* select chain in sell coin modal */}
      <CyDModalLayout
        isModalVisible={sellChooseChainModalVisible}
        setModalVisible={setSellChooseChainModalVisible}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        style={{ justifyContent: 'flex-end', margin: 0, padding: 0 }}>
        <CyDView
          className={'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px]'}>
          <CyDView className={'flex flex-row justify-between items-center '}>
            <CyDTouchView
              onPress={() => {
                setSellChooseChainModalVisible(false);
                setTimeout(() => setSellModalVisible(true), 250);
              }}
              className={''}>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className={'w-[32px] h-[32px]'}
              />
            </CyDTouchView>
            <CyDView className={'flex flex-row'}>
              <CyDImage
                source={sellType.logo}
                className={'w-[20px] h-[20px]'}
              />
              <CyDText className={'text-center font-bold text-[16px] ml-[6px]'}>
                {sellType.title}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => setSellChooseChainModalVisible(false)}
              className={''}>
              <CyDImage
                source={AppImages.CLOSE}
                className={'w-[16px] h-[16px]'}
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className={'text-center font-bold text-[22px] my-[20px]'}>
            {'Choose Chain'}
          </CyDText>
          <CyDFlatList
            data={chainData}
            renderItem={({ item }) => renderSellChainItem(item, navigation)}
            key={({ item }) => item.index}
            className={''}
            showsVerticalScrollIndicator={true}
          />
        </CyDView>
      </CyDModalLayout>

      {/* choose chain modal for send, receive, ibc */}
      <ChooseChainModal
        setModalVisible={setChooseChainModal}
        isModalVisible={chooseChainModal}
        data={chainData}
        title={'Choose Chain'}
        selectedItem={selectedChain.name}
        onPress={onSelectingChain}
        type={'chain'}
        customStyle={{ justifyContent: 'flex-end', padding: 0 }}
        isClosable={true}
        animationOut={'slideOutDown'}
        animationIn={'slideInUp'}
      />

      <CyDView
        className={
          isIOS()
            ? 'mx-[12px] bg-transparent'
            : 'mx-[12px] mt-[4px] bg-transparent'
        }>
        <LottieView
          source={AppImages.SHORTCUTS}
          ref={ref => setAnimation(ref)}
          autoPlay
          loop
          resizeMode={'contain'}
          style={{ width: 50, height: 50 }}
        />
      </CyDView>
    </CyDTouchView>
  );
}
