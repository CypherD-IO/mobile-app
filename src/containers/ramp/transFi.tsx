/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import React, { useContext, useEffect, useState } from 'react';
import { CyDImage, CyDText, CyDView } from '../../styles/tailwindStyles';
import { HdWalletContext } from '../../core/util';
import WebView from 'react-native-webview';
import Loading from '../../components/v2/loading';
import { useIsFocused } from '@react-navigation/native';
import useAxios from '../../core/HttpRequest';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import { StyleSheet } from 'react-native';
import { TransfiRampReactNativeSdkView } from 'transfi-ramp-react-native-sdk';

export default function TransFiScreen ({ route, navigation }: { route: any, navigation: any }) {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();
  const [state, setState] = useState({
    loading: true,
    isError: false,
    transFiApiKey: ''
  });
  const { ethereum } = hdWalletContext.state.wallet;
  const { operation, url: chain }: { operation: string, url: string } = route.params;
  const { address: ethAddress } = ethereum;
  // const ethAddress = '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm'; // Sandbox address
  const currency = 'USD';
  const country = 'United States';
  const transFiCryptoNetworkMapping = {
    ETH: 'ERC20',
    ARBITRUM: 'Arbitrum',
    OPTIMISM: 'Optimism',
    POLYGON: 'Polygon',
    BSC: 'BEP20',
    AVALANCHE: 'C-Chain'
    // FANTOM: ''
    // COSMOS: 'Cosmos'
  };
  const transFiCryptoTickerMapping = {
    ETH: 'ETH',
    ARBITRUM: 'ETH',
    OPTIMISM: 'ETH',
    POLYGON: 'MATIC',
    BSC: 'BNB',
    AVALANCHE: 'AVAX'
    // FANTOM: 'FTM'
    // COSMOS: 'ATOM'
  };

  useEffect(() => {
    void getTransFiCredentials();
  }, [isFocused]);

  const ErrorScreen = () => {
    return (
      <CyDView className={'mt-[60%]'}>
        <CyDView className={'flex flex-row justify-center'}>
          <CyDImage className={'h-[120px] w-[240px]'} source={AppImages.CYPHER_ERROR} resizeMode='contain' />
        </CyDView>
        <CyDText className={'text-center text-[24px] mt-[20px]'}>{t<string>('WARNING_TITLE')}</CyDText>
      </CyDView>
    );
  };

  const getTransFiCredentials = async () => {
    const resp = await getWithAuth('/v1/authentication/creds/transfi');
    if (!resp.isError) {
      const { data } = resp;
      const { apiKey } = data;
      if (apiKey && apiKey !== '') {
        setState({ ...state, transFiApiKey: apiKey });
      } else {
        setState({ ...state, isError: true, loading: false });
      }
    } else {
      setState({ ...state, isError: true, loading: false });
    }
  };

  return (
  // <CyDView className={'h-full w-full bg-white'}>
  //   {state.loading && <Loading />}
  //   {!state.isError && state.transFiApiKey !== '' && <CyDView className={'h-[100%] w-[100%] overflow-scroll'}>
  //     <WebView
  //       onLoadEnd={() => setState({ ...state, loading: false })}
  //       source={{ uri: `https://buy.transfi.com?fiatTicker=${currency}&product=${operation}&country=${country}&cryptoNetwork=${transFiCryptoNetworkMapping[chain]}&cryptoTicker=${transFiCryptoTickerMapping[chain]}&walletAddress=${ethAddress}&apiKey=${state.transFiApiKey}` }}
  //     />
  //   </CyDView>}
  //   {state.isError && <ErrorScreen />}
  // </CyDView>

  <TransfiRampReactNativeSdkView
    style={styles.sdkContainer}
    source={{ uri: `https://buy.transfi.com?product=${operation}&country=${country}&cryptoNetwork=${transFiCryptoNetworkMapping[chain]}&cryptoTicker=${transFiCryptoTickerMapping[chain]}&walletAddress=${ethAddress}&apiKey=${state.transFiApiKey}` }}
    javaScriptEnabled={true}
    messagingEnabled={true}
    domStorageEnabled={true}
    onMessage={(event: any) => {
      console.log('event', event?.nativeEvent?.data);
    }}
  />
  );
}

const styles = StyleSheet.create({
  sdkContainer: {
    height: '100%',
    width: '100%'
  }
});
