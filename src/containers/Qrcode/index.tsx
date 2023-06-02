/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { CyDView, CyDText, CyDTouchView, CyDImage } from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import * as C from '../../constants/index';
import AppImages from '../../../assets/images/appImages';
import { getMaskedAddress, HdWalletContext } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import Clipboard from '@react-native-clipboard/clipboard';
import { DynamicScrollView } from '../../styles/viewStyle';
import { BackHandler, Platform } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import { CHAIN_COSMOS, CHAIN_ETH, CHAIN_EVMOS, CHAIN_OSMOSIS, CHAIN_JUNO, FundWalletAddressType, CHAIN_POLYGON, CHAIN_AVALANCHE, CHAIN_BSC, CHAIN_FTM, CHAIN_ARBITRUM, CHAIN_OPTIMISM, CHAIN_STARGAZE } from '../../constants/server';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { SHARE_QR_TIMEOUT } from '../../constants/timeOuts';
import { isAndroid } from '../../misc/checkers';

const {
  DynamicView,
  CText,
  DynamicButton,
  DynamicImage
} = require('../../styles');

function copyToClipboard (text: string) {
  Clipboard.setString(text);
};

export interface UserChain {
  id: number
  name: string
  logo_url: string
  chainName: string
  address: string
  backendName: string
}

export default function QRCodeGenerator (props) {
  const { t } = useTranslation();
  const routeParams = props.route.params;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [showChainModal, setShowChainModal] = useState<boolean>(false);

  const data: UserChain[] = [
    { ...CHAIN_ETH, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_POLYGON, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_BSC, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_AVALANCHE, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_FTM, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_ARBITRUM, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_OPTIMISM, address: hdWalletContext.state.wallet.ethereum.address },
    { ...CHAIN_EVMOS, address: hdWalletContext.state.wallet.evmos.wallets[0].address },
    { ...CHAIN_COSMOS, address: hdWalletContext.state.wallet.cosmos.wallets[0].address },
    { ...CHAIN_OSMOSIS, address: hdWalletContext.state.wallet.osmosis.wallets[0].address },
    { ...CHAIN_JUNO, address: hdWalletContext.state.wallet.juno.wallets[0].address },
    { ...CHAIN_STARGAZE, address: hdWalletContext.state.wallet.stargaze.address }
  ];

  const [selectedChain, setSelectedChain] = useState<UserChain>(data[0]);
  const [isCapturingDetails, setIsCapturingDetails] = useState<boolean>(false);

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const viewRef = useRef();

  async function shareQRImage () {
    const url = await captureRef(viewRef, {
      format: 'png',
      quality: 0.7,
      result: 'base64'
    });

    const shareImage = {
      title: t('SHARE_TITLE'),
      message: `${selectedChain.address}`,
      subject: t('SHARE_TITLE'),
      url: `data:image/jpeg;base64,${url}`
    };

    if (!isAndroid()) {
      delete shareImage.message;
    }

    await Share.open(shareImage)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        return err;
      });
    setIsCapturingDetails(false);
  }

  async function shareQR () {
    setIsCapturingDetails(true);
    setTimeout(() => {
      void shareQRImage();
    }, SHARE_QR_TIMEOUT);
  }

  const RenderQRCode = (chain: { item: UserChain}) => {
    return (
      selectedChain.backendName === chain.item.backendName
        ? (
        <QRCode
          content={chain.item.address}
          codeStyle='dot'
          logo={AppImages.QR_LOGO}
          logoSize={60}
        />
          )
        : null
    );
  };

  useEffect(() => {
    if (routeParams) {
      const walletAddressType = routeParams.addressType;
      if (walletAddressType === FundWalletAddressType.EVMOS) {
        setSelectedChain(data[7]);
      } else if (walletAddressType === FundWalletAddressType.POLYGON) {
        setSelectedChain(data[1]);
      } else if (walletAddressType === FundWalletAddressType.BSC) {
        setSelectedChain(data[2]);
      } else if (walletAddressType === FundWalletAddressType.AVALANCHE) {
        setSelectedChain(data[3]);
      } else if (walletAddressType === FundWalletAddressType.FANTOM) {
        setSelectedChain(data[4]);
      } else if (walletAddressType === FundWalletAddressType.ARBITRUM) {
        setSelectedChain(data[5]);
      } else if (walletAddressType === FundWalletAddressType.OPTIMISM) {
        setSelectedChain(data[6]);
      } else if (walletAddressType === FundWalletAddressType.COSMOS) {
        setSelectedChain(data[8]);
      } else if (walletAddressType === FundWalletAddressType.OSMOSIS) {
        setSelectedChain(data[9]);
      } else if (walletAddressType === FundWalletAddressType.JUNO) {
        setSelectedChain(data[10]);
      } else if (walletAddressType === FundWalletAddressType.STARGAZE) {
        setSelectedChain(data[11]);
      }
    }

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <DynamicView dynamic dynamicHeight dynamicWidth width={100} height={100} bGC={'white'}>
          <ChooseChainModal
            isModalVisible={showChainModal}
            data={data} setModalVisible={setShowChainModal}
            title={t('CHOOSE_CHAIN')}
            onPress={({ item }) => {
              setSelectedChain(item);
            }}
            selectedItem={selectedChain.name}
            customStyle={{ justifyContent: 'flex-end', padding: 0 }}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            isClosable={true}
          />
            <DynamicScrollView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' >
              <CyDView className={'bg-white'} ref={viewRef}>
                <CyDView className={isCapturingDetails ? 'flex flex-row justify-center mt-[15px]' : 'flex flex-row justify-center' }>
                  <CyDImage source={selectedChain.logo_url} className={' w-[25px] h-[25px] mr-[10px] mt-[2px]'}/>
                  <CyDText className={
                      'text-[22px] text-center font-extrabold font-nunito'
                    }>
                    {`${selectedChain.name}`}
                  </CyDText>
                </CyDView>
                <CyDView className={'mt-[10] bg-[#F8F8F8] rounded-[18px] mx-[20] px-[20px] py-[15px]'}>
                  <CyDText className={
                    'text-[13px] text-center text-[#434343] font-nunito'
                  }>
                    {`${t('QRCODE_SUBTITLE')}${selectedChain.chainName === 'ethereum' ? 'chains: Ethereum, Polygon, Binance Smart Chain, Avalanche, Fantom, Optimism, Arbitrum, Evmos' : `chain: ${selectedChain.name}`}`}
                  </CyDText>
                </CyDView>
                <DynamicView dynamic pV={10}>
                    <DynamicView dynamic dynamicWidth width={90} jC='center' pT={10} pB={24} mT={20} bR={10} bC={Colors.sepratorColor} aLIT={'center'} pH={20} pV={20}>
                        {data.map((item) => <RenderQRCode key={item.id} item={item}/>)}
                        <DynamicView dynamic dynamicHeight dynamicWidth width={100} height={0.5} bGC={Colors.addressBorderColor} mT={30} />
                        {!isCapturingDetails && <DynamicView dynamic dynamicWidth width={90} jC='center' mT={10} aLIT={'center'} fD={'row'}>
                            <DynamicView dynamic dynamicWidth width={65} jC='flex-start' aLIT={'flex-start'}>
                                <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} color={Colors.addressColor}>{getMaskedAddress(selectedChain.address)}</CText>
                            </DynamicView>
                            <DynamicButton sentry-label='qrcode-address-copy' dynamic dynamicFixWidth width={10} height={45}
                                onPress={() => {
                                  copyToClipboard(selectedChain.address);
                                  showToast(t('ADDRESS_COPY'));
                                }}>
                                <DynamicImage dynamic source={AppImages.COPY} width={13} height={13} />
                            </DynamicButton>
                            <DynamicButton dynamic dynamicFixWidth width={10} height={45} mH={20}
                                onPress={() => {
                                  void shareQR();
                                }}>
                                <DynamicImage dynamic source={AppImages.SHARE} width={13} height={13} />
                            </DynamicButton>
                        </DynamicView>}
                        {/* <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={13} color={Colors.addressColor}>{selectedChain.address}</CText> */}
                        <CyDText className={isCapturingDetails ? 'text-[18px] font-extrabold text-center mt-[10px]' : 'text-[13px]'}>{selectedChain.address}</CyDText>
                    </DynamicView>
                  {!isCapturingDetails && <CyDTouchView className={'bg-[#E5FCFB] rounded-[36px] py-[8px] px-[20px] flex flex-row justify-between items-center w-10/12'}
                  onPress={() => { setShowChainModal(true); }}>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDImage source={selectedChain.logo_url} className={'w-[22px] h-[22px] mr-[10px]'}/>
                      <CyDText className={'font-semibold font-nunito text-[18px]'}>{`${t('CHAIN')}: `}</CyDText>
                      <CyDText className={'font-nunito text-[18px]'}>{selectedChain.name}</CyDText>
                    </CyDView>
                      <CyDImage source={AppImages.DOWN} className={'w-[10px] h-[9px]'}/>
                  </CyDTouchView>}
                  {isCapturingDetails &&
                    <CyDText className={
                        'text-[15px] text-center font-bold font-nunito items-end mb-[15px]'
                      }>
                      {t('SHARE_QR_TEXT')}
                    </CyDText>}
                </DynamicView>
              </CyDView>
            </DynamicScrollView>
        </DynamicView>
  );
}
