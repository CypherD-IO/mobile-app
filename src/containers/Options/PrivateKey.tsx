/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { CyDView, CyDText, CyDTouchView, CyDImage, CyDScrollView } from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import Clipboard from '@react-native-clipboard/clipboard';
import { BackHandler, NativeModules } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import { CHAIN_COSMOS, CHAIN_ETH, CHAIN_EVMOS, CHAIN_OSMOSIS, CHAIN_JUNO, FundWalletAddressType } from '../../constants/server';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import { useIsFocused } from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';

function copyToClipboard (text: string) {
  Clipboard.setString(text);
};

export interface UserChain {
  id: number
  name: string
  logo_url: string
  chainName: string
  privateKey: string
  backendName: string
}

export default function PrivateKey (props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [showChainModal, setShowChainModal] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);

  const data: UserChain[] = [
    { ...CHAIN_ETH, privateKey: hdWalletContext.state.wallet.ethereum.wallets[0].privateKey },
    { ...CHAIN_EVMOS, privateKey: hdWalletContext.state.wallet.evmos.wallets[0].privateKey },
    { ...CHAIN_COSMOS, privateKey: hdWalletContext.state.wallet.cosmos.wallets[0].privateKey },
    { ...CHAIN_OSMOSIS, privateKey: hdWalletContext.state.wallet.osmosis.wallets[0].privateKey },
    { ...CHAIN_JUNO, privateKey: hdWalletContext.state.wallet.juno.wallets[0].privateKey }
  ];

  const [selectedChain, setSelectedChain] = useState<UserChain>(data[0]);

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const togglePrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const RenderQRCode = (chain: { item: UserChain}) => {
    return (
      selectedChain.backendName === chain.item.backendName
        ? (
        <QRCode
          content={chain.item.privateKey}
          codeStyle='dot'
          logo={AppImages.QR_LOGO}
          logoSize={60}
        />
          )
        : null
    );
  };

  useEffect(() => {
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
      const walletAddressType = portfolioState.statePortfolio.selectedChain.backendName;
      if (walletAddressType === FundWalletAddressType.EVMOS) {
        setSelectedChain(data[1]);
      } else if (walletAddressType === FundWalletAddressType.COSMOS) {
        setSelectedChain(data[2]);
      } else if (walletAddressType === FundWalletAddressType.OSMOSIS) {
        setSelectedChain(data[3]);
      } else if (walletAddressType === FundWalletAddressType.JUNO) {
        setSelectedChain(data[4]);
      }
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isFocused]);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDScrollView className={'bg-white h-full w-full relative'}>
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
      <CyDView className={'flex justify-center items-center w-full'}>
        <CyDView className={'mt-[10px] bg-[#F8F8F8] rounded-[18px] mx-[20px] px-[20px] py-[15px]'}>
          <CyDText className={'text-[15px] text-center text-[#434343] font-nunito'}>{t('PRIVATE_KEY_SUBTITLE')}</CyDText>
        </CyDView>
        <CyDView className={'flex items-center justify-center pt-[20px] w-full'}>
            {data.map((item) => <RenderQRCode key={item.id} item={item}/>)}
          <CyDView className={'w-[85%] border-[0.5px] border-portfolioBorderColor mt-[20px]'} />
          <CyDTouchView className={'mt-[30px]'}
            onPress={() => togglePrivateKey()}
          >
            {showPrivateKey
              ? (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[#1F1F1F] text-[22px] font-semibold'}>
                  {t('HIDE_PRIVATE_KEY')}
                </CyDText>
                <CyDImage source={AppImages.EYE_OPEN} className={'w-[27px] h-[18px] ml-[7px]'} />
              </CyDView>
                )
              : (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[#434343] text-[15px] font-semibold'}>
                  {'\u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24'}
                </CyDText>
                <CyDImage source={AppImages.EYE_CLOSE} className={'w-[27px] h-[22px] ml-[7px] mt-[5px]'} />
              </CyDView>
                )}
            {!showPrivateKey && <CyDText className={'text-[#1F1F1F] text-[16px] font-semibold mt-[15px]'}>{t('TAP_REVEAL_PRIVATE_KEY')}</CyDText>}
          </CyDTouchView>
          {showPrivateKey && <CyDView className={'flex justify-center items-center mt-[15px] w-11/12 border-[1px] border-portfolioBorderColor px-[10px] py-[5px] rounded-[4px]'}>
            <CyDText className={'text-addressColor text-[16px] text-center font-semibold'}>{selectedChain.privateKey}</CyDText>
          </CyDView>
          }
        </CyDView>
        <CyDTouchView
          className={
            'flex flex-row items-center justify-center mt-[30px] h-[60px] w-3/4 border-[1px] border-[#8E8E8E] rounded-[12px]'
          }
          onPress={() => {
            copyToClipboard(selectedChain.privateKey);
            showToast(t('PRIVATE_KEY_COPY'));
          }}
        >
          <CyDImage source={AppImages.COPY} className={'absolute left-[20] w-[16px] h-[18px]'} />
          <CyDText className={'text-[#434343] text-[16px] font-extrabold'}>{t('COPY_TO_CLIPBOARD')}</CyDText>
        </CyDTouchView>
        <CyDTouchView
          className={'bg-[#E5FCFB] rounded-[36px] py-[8px] px-[20px] flex flex-row justify-between items-center w-10/12 mt-[20px] mb-[20px]'}
          onPress={() => { setShowChainModal(true); }}
        >
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage source={selectedChain.logo_url} className={'w-[22px] h-[22px] mr-[10px]'}/>
            <CyDText className={'font-semibold font-nunito text-[18px]'}>{`${t('CHAIN')}: `}</CyDText>
            <CyDText className={'font-nunito text-[18px]'}>{selectedChain.name}</CyDText>
          </CyDView>
          <CyDImage source={AppImages.DOWN} className={'w-[10px] h-[9px]'}/>
        </CyDTouchView>
      </CyDView>
    </CyDScrollView>
  );
}
