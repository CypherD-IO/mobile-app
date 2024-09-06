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

export default function QRCodeGenerator(props) {
  const { t } = useTranslation();
  const routeParams = props.route.params;
  const hdWalletContext = useContext<any>(HdWalletContext);

  const data: UserChain[] = [
    { ...CHAIN_ETH, address: hdWalletContext.state.wallet.ethereum.address },
    {
      ...CHAIN_POLYGON,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    { ...CHAIN_BSC, address: hdWalletContext.state.wallet.ethereum.address },
    {
      ...CHAIN_AVALANCHE,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_ARBITRUM,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_OPTIMISM,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_COSMOS,
      address: hdWalletContext.state.wallet.cosmos?.wallets[0]?.address,
    },
    {
      ...CHAIN_OSMOSIS,
      address: hdWalletContext.state.wallet.osmosis?.wallets[0]?.address,
    },
    {
      ...CHAIN_JUNO,
      address: hdWalletContext.state.wallet.juno?.wallets[0]?.address,
    },
    {
      ...CHAIN_STARGAZE,
      address: hdWalletContext.state.wallet.stargaze?.address,
    },
    {
      ...CHAIN_NOBLE,
      address: hdWalletContext.state.wallet.noble?.wallets[0]?.address,
    },
    {
      ...CHAIN_ZKSYNC_ERA,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    { ...CHAIN_BASE, address: hdWalletContext.state.wallet.ethereum.address },
    {
      ...CHAIN_POLYGON_ZKEVM,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_AURORA,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_MOONBEAM,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_MOONRIVER,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_SHARDEUM,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_SHARDEUM_SPHINX,
      address: hdWalletContext.state.wallet.ethereum.address,
    },
    {
      ...CHAIN_COREUM,
      address: hdWalletContext.state.wallet.coreum?.wallets[0]?.address,
    },
    {
      ...CHAIN_INJECTIVE,
      address: hdWalletContext.state.wallet.injective?.wallets[0]?.address,
    },
    {
      ...CHAIN_KUJIRA,
      address: hdWalletContext.state.wallet.kujira?.wallets[0]?.address,
    },
    {
      ...CHAIN_SOLANA,
      address: hdWalletContext.state.wallet.solana?.wallets[0]?.address,
    },
  ];

  const [selectedChain, setSelectedChain] = useState<UserChain>(data[0]);
  const [isCapturingDetails, setIsCapturingDetails] = useState<boolean>(false);

  const handleBackButton = () => {
    props.navigation.goBack();
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
      if (walletAddressType === FundWalletAddressType.POLYGON) {
        setSelectedChain(data[1]);
      } else if (walletAddressType === FundWalletAddressType.BSC) {
        setSelectedChain(data[2]);
      } else if (walletAddressType === FundWalletAddressType.AVALANCHE) {
        setSelectedChain(data[3]);
      } else if (walletAddressType === FundWalletAddressType.ARBITRUM) {
        setSelectedChain(data[5]);
      } else if (walletAddressType === FundWalletAddressType.OPTIMISM) {
        setSelectedChain(data[6]);
      } else if (walletAddressType === FundWalletAddressType.COSMOS) {
        setSelectedChain(data[7]);
      } else if (walletAddressType === FundWalletAddressType.OSMOSIS) {
        setSelectedChain(data[8]);
      } else if (walletAddressType === FundWalletAddressType.JUNO) {
        setSelectedChain(data[9]);
      } else if (walletAddressType === FundWalletAddressType.STARGAZE) {
        setSelectedChain(data[10]);
      } else if (walletAddressType === FundWalletAddressType.NOBLE) {
        setSelectedChain(data[11]);
      } else if (walletAddressType === FundWalletAddressType.ZKSYNC_ERA) {
        setSelectedChain(data[12]);
      } else if (walletAddressType === FundWalletAddressType.BASE) {
        setSelectedChain(data[13]);
      } else if (walletAddressType === FundWalletAddressType.POLYGON_ZKEVM) {
        setSelectedChain(data[14]);
      } else if (walletAddressType === FundWalletAddressType.AURORA) {
        setSelectedChain(data[15]);
      } else if (walletAddressType === FundWalletAddressType.MOONBEAM) {
        setSelectedChain(data[16]);
      } else if (walletAddressType === FundWalletAddressType.MOONRIVER) {
        setSelectedChain(data[17]);
      } else if (walletAddressType === FundWalletAddressType.SHARDEUM) {
        setSelectedChain(data[18]);
      } else if (walletAddressType === FundWalletAddressType.SHARDEUM_SPHINX) {
        setSelectedChain(data[19]);
      } else if (walletAddressType === FundWalletAddressType.COREUM) {
        setSelectedChain(data[20]);
      } else if (walletAddressType === FundWalletAddressType.INJECTIVE) {
        setSelectedChain(data[21]);
      } else if (walletAddressType === FundWalletAddressType.KUJIRA) {
        setSelectedChain(data[22]);
      } else if (walletAddressType === FundWalletAddressType.SOLANA) {
        setSelectedChain(data[23]);
      }
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
              {data.map(item => (
                <RenderQRCode key={item.id} item={item} />
              ))}
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
                  title={''}
                />
              </CyDView>
            )}
            <CyDView
              className={
                'my-[10px] mx-[20px] px-[20px] py-[5px] border border-sepratorColor bg-privacyMessageBackgroundColor rounded-[8px]'
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
                  'text-[15px] text-center font-bold font-nunito items-end mb-[15px]'
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
