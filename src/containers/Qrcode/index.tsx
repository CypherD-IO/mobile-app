/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDScrollView,
  CyDFastImage,
} from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { HdWalletContext, getMaskedAddress } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import Clipboard from '@react-native-clipboard/clipboard';

import { BackHandler } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import {
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  FundWalletAddressType,
  CHAIN_POLYGON,
  CHAIN_AVALANCHE,
  CHAIN_BSC,
  CHAIN_ARBITRUM,
  CHAIN_OPTIMISM,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_POLYGON_ZKEVM,
  CHAIN_AURORA,
  CHAIN_MOONBEAM,
  CHAIN_MOONRIVER,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_KUJIRA,
  CHAIN_SOLANA,
} from '../../constants/server';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { SHARE_QR_TIMEOUT } from '../../constants/timeOuts';
import { isAndroid } from '../../misc/checkers';
import Button from '../../components/v2/button';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

function copyToClipboard(text: string) {
  Clipboard.setString(text);
}

export interface UserChain {
  id: number;
  name: string;
  logo_url: number;
  chainName: string;
  address: string;
  backendName: string;
}

interface RouteParams {
  addressType: FundWalletAddressType;
}

export default function QRCodeGenerator() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const routeParams = route?.params;
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;

  const getChainDataWithAddress = (
    walletAddressType: FundWalletAddressType,
  ) => {
    switch (walletAddressType) {
      case FundWalletAddressType.EVM:
        return {
          ...CHAIN_ETH,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.POLYGON:
        return {
          ...CHAIN_POLYGON,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.AVALANCHE:
        return {
          ...CHAIN_AVALANCHE,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.ARBITRUM:
        return {
          ...CHAIN_ARBITRUM,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.OPTIMISM:
        return {
          ...CHAIN_OPTIMISM,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.BSC:
        return {
          ...CHAIN_BSC,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.SHARDEUM:
        return {
          ...CHAIN_SHARDEUM,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.SHARDEUM_SPHINX:
        return {
          ...CHAIN_SHARDEUM_SPHINX,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.ZKSYNC_ERA:
        return {
          ...CHAIN_ZKSYNC_ERA,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.BASE:
        return {
          ...CHAIN_BASE,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.POLYGON_ZKEVM:
        return {
          ...CHAIN_POLYGON_ZKEVM,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.AURORA:
        return {
          ...CHAIN_AURORA,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.MOONBEAM:
        return {
          ...CHAIN_MOONBEAM,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.MOONRIVER:
        return {
          ...CHAIN_MOONRIVER,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
      case FundWalletAddressType.SOLANA:
        return {
          ...CHAIN_SOLANA,
          address: hdWalletContext.state.wallet.solana?.wallets[0]?.address,
        };

      case FundWalletAddressType.COSMOS:
        return {
          ...CHAIN_COSMOS,
          address: hdWalletContext.state.wallet.cosmos?.wallets[0]?.address,
        };
      case FundWalletAddressType.OSMOSIS:
        return {
          ...CHAIN_OSMOSIS,
          address: hdWalletContext.state.wallet.osmosis?.wallets[0]?.address,
        };
      case FundWalletAddressType.JUNO:
        return {
          ...CHAIN_JUNO,
          address: hdWalletContext.state.wallet.juno?.wallets[0]?.address,
        };
      case FundWalletAddressType.STARGAZE:
        return {
          ...CHAIN_STARGAZE,
          address: hdWalletContext.state.wallet.stargaze?.address,
        };
      case FundWalletAddressType.NOBLE:
        return {
          ...CHAIN_NOBLE,
          address: hdWalletContext.state.wallet.noble?.wallets[0]?.address,
        };
      case FundWalletAddressType.COREUM:
        return {
          ...CHAIN_COREUM,
          address: hdWalletContext.state.wallet.coreum?.wallets[0]?.address,
        };
      case FundWalletAddressType.INJECTIVE:
        return {
          ...CHAIN_INJECTIVE,
          address: hdWalletContext.state.wallet.injective?.wallets[0]?.address,
        };
      case FundWalletAddressType.KUJIRA:
        return {
          ...CHAIN_KUJIRA,
          address: hdWalletContext.state.wallet.kujira?.wallets[0]?.address,
        };

      default:
        return {
          ...CHAIN_ETH,
          address: hdWalletContext.state.wallet.ethereum.address,
        };
    }
  };

  const [selectedChain, setSelectedChain] = useState<UserChain>({
    ...CHAIN_ETH,
    address: hdWalletContext.state.wallet.ethereum.address,
  });
  const [isCapturingDetails, setIsCapturingDetails] = useState<boolean>(false);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  const viewRef = useRef();

  async function shareQRImage() {
    const url = await captureRef(viewRef, {
      format: 'png',
      quality: 0.7,
      result: 'base64',
    });

    const shareImage = {
      title: t('SHARE_TITLE'),
      message: `${selectedChain.address}`,
      subject: t('SHARE_TITLE'),
      url: `data:image/jpeg;base64,${url}`,
    };

    if (!isAndroid()) {
      delete shareImage.message;
    }

    await Share.open(shareImage)
      .then(res => {
        return res;
      })
      .catch(err => {
        return err;
      });
    setIsCapturingDetails(false);
  }

  async function shareQR() {
    setIsCapturingDetails(true);
    setTimeout(() => {
      void shareQRImage();
    }, SHARE_QR_TIMEOUT);
  }

  const RenderQRCode = (chain: { item: UserChain }) => {
    return selectedChain.backendName === chain.item.backendName &&
      chain.item.address ? (
      <QRCode
        content={chain.item.address}
        codeStyle='dot'
        logo={AppImages.QR_LOGO}
        logoSize={60}
      />
    ) : null;
  };

  useEffect(() => {
    if (routeParams) {
      const walletAddressType = routeParams.addressType;

      const chainAddressData = getChainDataWithAddress(walletAddressType);
      setSelectedChain(chainAddressData);
    }

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDView className='bg-white h-full w-full'>
      <CyDScrollView className='flex flex-start h-full w-full'>
        <CyDView className={'bg-white'} ref={viewRef}>
          <CyDView
            className={
              isCapturingDetails
                ? 'flex flex-col justify-center items-center mt-[15px]'
                : 'flex flex-col items-center justify-center'
            }>
            <CyDFastImage
              source={selectedChain.logo_url}
              className={' w-[24px] h-[24px] mt-[2px]'}
            />
            <CyDText className={'text-[20px] text-center font-bold mt-[6px]'}>
              {selectedChain.name}
            </CyDText>
          </CyDView>
          <CyDView>
            <CyDView className='flex justify-center items-center px-[20px] py-[10px] w-full'>
              <RenderQRCode key={selectedChain.id} item={selectedChain} />

              {!isCapturingDetails && !selectedChain.address && (
                <CyDText className='text-[18px] text-center font-extrabold'>
                  {selectedChain.name} {t<string>('ADDRESS_NOT_ACCESSIBLE')}
                </CyDText>
              )}
              <CyDText
                className={
                  isCapturingDetails
                    ? 'text-[20px] font-extrabold text-center mt-[20px]'
                    : 'mt-[20px] text-[20px] font-extrabold text-center'
                }>
                {getMaskedAddress(selectedChain?.address)}
              </CyDText>
              <CyDView className='flex flex-row'>
                <CyDText className={'text-[14px] text-center font-extrabold'}>
                  {selectedChain?.address.slice(
                    0,
                    selectedChain.chainName === 'ethereum' ? 8 : 12,
                  )}
                </CyDText>
                <CyDText className={'text-[14px] text-center'}>
                  {selectedChain?.address.slice(
                    selectedChain.chainName === 'ethereum' ? 8 : 12,
                    selectedChain?.address.length - 6,
                  )}
                </CyDText>
                <CyDText className={'text-[14px] text-center font-extrabold'}>
                  {selectedChain?.address.slice(
                    selectedChain.address.length - 6,
                    selectedChain.address.length,
                  )}
                </CyDText>
              </CyDView>
            </CyDView>
            {!isCapturingDetails && selectedChain.address && (
              <CyDView className='mt-[10px] justify-center items-center flex flex-row'>
                <Button
                  image={AppImages.COPY}
                  onPress={() => {
                    copyToClipboard(selectedChain.address);
                    showToast(t('ADDRESS_COPY'));
                  }}
                  style='w-[40px] h-[40px] mr-[10px] rounded-[8px]'
                  imageStyle='self-center  h-[18px] w-[18px]'
                  type='secondary'
                  title={''}
                />
                <Button
                  image={AppImages.SHARE}
                  onPress={() => {
                    void shareQR();
                  }}
                  style='w-[40px] h-[40px] ml-[10px] rounded-[8px]'
                  imageStyle='self-center h-[18px] w-[18px]'
                  type='secondary'
                  title={''}
                />
              </CyDView>
            )}
            <CyDView
              className={
                'my-[10px] mx-[20px] px-[20px] py-[5px] border border-n40 bg-privacyMessageBackgroundColor rounded-[8px]'
              }>
              <CyDText className={'text-[14px] text-center'}>
                {t('QRCODE_SUBTITLE')}
              </CyDText>
              <CyDText className={'text-[14px] text-center font-bold'}>
                {selectedChain.chainName === 'ethereum'
                  ? 'Ethereum, Polygon, Binance Smart Chain, zkSync Era, Base, Polygon zkEVM, Avalanche, Optimism, Arbitrum, Aurora, Moonbeam, Moonriver, Shardeum'
                  : selectedChain.name}
              </CyDText>
            </CyDView>

            {isCapturingDetails && (
              <CyDText
                className={
                  'text-[15px] text-center font-bold items-end mb-[15px]'
                }>
                {t('SHARE_QR_TEXT')}
              </CyDText>
            )}
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}
