/**
 * @format
 * @flow
 */

import React, { useEffect, useState, useContext, useLayoutEffect } from 'react';
import WalletConnect from '@walletconnect/client';
import { useTranslation } from 'react-i18next';
import { DynamicTouchView, DynamicView } from '../../styles/viewStyle';
import * as C from '../../constants/index';
import AppImages from './../../../assets/images/appImages';
import { storeConnectWalletData } from '../../core/asyncStorage';
import LoadingStack from '../../routes/loading';
import analytics from '@react-native-firebase/analytics';
import {
  BackHandler
  , FlatList
} from 'react-native';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { CyDText, CyDSafeAreaView, CyDView, CyDImage, CyDTouchView } from '../../styles/tailwindStyles';
import { WalletConnectContext, walletConnectContextDef, WalletConnectActions } from '../../reducers/wallet_connect_reducer';
import { DynamicImage } from '../../styles/imageStyle';
import { QRScannerScreens } from '../../constants/server';
import { CText } from '../../styles/textStyle';

export default function WalletConnectCamera (props) {
  const { navigation, route } = props;
  const { walletConnectState, walletConnectDispatch } = useContext<walletConnectContextDef>(WalletConnectContext);

  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { t } = useTranslation();

  const [walletConnectURI, setWalletConnectURI] = useState('');

  const [loading, setLoading] = useState(true);

  const connectWallet = async (uri) => {
    setWalletConnectURI('');
    const connector = new WalletConnect({ uri });
    walletConnectDispatch({ type: WalletConnectActions.ADD_CONNECTOR, value: connector });
  };

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const endSession = (key) => {
    const connector = walletConnectState.connectors[key];
    if (connector) {
      connector.killSession();
    }
    walletConnectDispatch({ type: WalletConnectActions.DELETE_DAPP_INFO, value: { connector } });
  };

  const onSuccess = (e) => {
    props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
    const link = e.data;
    if (link.startsWith('wc')) {
      analytics().logEvent('wallet_connect_url_scan', { fromEthAddress: ethereum.address });
      setLoading(true);
      setWalletConnectURI(link);
    }
  };

  const renderItem = (item) => {
    const element = item.item;
    const key = item.index;
    return (
      <CyDView className={'flex items-center justify-center'}>
     <CyDView className={'flex flex-row justify-around mb-[10px] bg-[#FFFFFF] rounded-[20px] px-[20px] py-[10px] mt-[20px] w-11/12 border border-[#EBEBEB]'} style = {{ borderColor: '#929292' }}>
     <CyDView className={'flex-auto flex-row items-center justify-between'}>
       <CyDView className={'flex-row'}>
         <CyDView>
           <CyDImage source={{ uri: element.icons[0] }} className={' w-[40px] h-[40px]'}/>
         </CyDView>
         <CyDView>
           <CyDView>
           <CyDText className={'text-black text-[18px] font-semibold justify-center px-[20px] font-nunito'}>{element.name.length > 10 ? element.name.substring(0, 20) + '....' : element.name}</CyDText>
           </CyDView>
           <CyDView>
           <CyDText className={'text-gray-400 text-[14px] font-regular justify-center px-[20px] font-nunito'}>{element.url}</CyDText>
           </CyDView>
         </CyDView>
       </CyDView>
       <CyDTouchView className={'flex-auto flex-row items-center justify-end'} onPress ={() => { endSession(key); }}>
         <CyDImage source={AppImages.DISCONNECT} className={'mr-[10px] '}/>
       </CyDTouchView>
   </CyDView>
 </CyDView>
 </CyDView>
    );
  };

  useLayoutEffect(() => {
    props.navigation.setOptions({
      headerRight: () => (
         <DynamicTouchView
             dynamic
             style = {{ width: 30 }}
             onPress = { () => {
               props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, { fromPage: QRScannerScreens.WALLET_CONNECT, onSuccess });
             }}
             fD={'row'}
             >
               <DynamicImage
                 dynamic
                 height={20}
                 width={22}
                 resizemode="contain"
                 source={AppImages.QR_CODE}
               />
             </DynamicTouchView>

      )
    });
  }, [props.navigation]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const link = portfolioState.statePortfolio.walletConnectURI;
    if (link.startsWith('wc')) {
      portfolioState.dispatchPortfolio({ value: { walletConnectURI: '' } });
      analytics().logEvent('wallet_connect_url_scan', { fromEthAddress: ethereum.address });
      setLoading(true);
      connectWallet(link);
    }
  }, [portfolioState.statePortfolio.walletConnectURI]);

  // This useEffect is to store the session for each update
  useEffect(() => {
    let data;
    if (walletConnectState?.dAppInfo?.length === 0) {
      data = { connectors: [], dAppInfo: [] };
    } else {
      data = { connectors: walletConnectState?.connectors?.map((element) => { return element.session; }), dAppInfo: walletConnectState?.dAppInfo };
    }
    storeConnectWalletData(data, hdWalletContext.state.wallet.ethereum.wallets[0].address);
  }, [walletConnectState]);

  useEffect(() => {
    if (loading && walletConnectURI.startsWith('wc')) {
      connectWallet(walletConnectURI);
    }
  }, [loading, walletConnectURI]);

  useEffect(() => {
    if (walletConnectState?.connectors?.length === walletConnectState?.dAppInfo?.length) {
      setLoading(false);
    }
  }, [walletConnectState]);

  if (loading) {
    return (<LoadingStack />);
  }

  return (
           <CyDSafeAreaView className={'bg-white h-full w-full'}>

                     {walletConnectState.dAppInfo.length > 0
                       ? <FlatList
                       data={walletConnectState.dAppInfo}
                       renderItem={(item) => renderItem(item)}
                       style={{ width: '100%', height: '100%', marginBottom: 20 }}
                       showsVerticalScrollIndicator={true}
                     />
                       : (<DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} pH={10} jC='center'>
                       <DynamicImage dynamic dynamicWidth height={110} width={100} resizemode='contain' source={AppImages.WALLET_CONNECT_EMPTY} />
                       <CText style={{ color: 'black', marginTop: 30, fontSize: 20, fontWeight: '600', width: 300, textAlign: 'center', fontFamily: 'Nunito' }}>{t('NO_CONNECTIONS')}</CText>
                       </DynamicView>)
                 }
          </CyDSafeAreaView>
  );
}
