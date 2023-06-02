/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useContext, useState } from 'react';
import { CyDView, CyDText, CyDScrollView, CyDTextInput, CyDTouchView, CyDImage } from '../../styles/tailwindStyles';
import { copyToClipboard, HdWalletContext, PortfolioContext } from '../../core/util';
import { GlobalContext } from '../../core/globalContext';
import clsx from 'clsx';
import { t } from 'i18next';
import Loading from '../../components/v2/loading';
import { setRpcEndpoints, clearRpcEndpoints, clearHost } from '../../core/asyncStorage';
import { hostWorker } from '../../global';
import { ChainBackendNames } from '../../constants/server';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import RNExitApp from 'react-native-exit-app';
import AppImages from '../../../assets/images/appImages';
import { showToast } from '../utilities/toastUtility';

export default function HostsAndRPCScreen ({ navigation }) {
  const portfolioState = useContext<any>(PortfolioContext);
  const globalContext = useContext<any>(GlobalContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const devMode = portfolioState.statePortfolio.developerMode;
  const { getHost, setHost } = hostWorker;

  const [loading, setLoading] = useState<boolean>(false);

  const [hosts, setHosts] = useState({
    archHost: getHost('ARCH_HOST'),
    portfolioHost: getHost('PORTFOLIO_HOST'),
    owlracleHost: getHost('OWLRACLE_HOST')
  });

  const [rpcEndpoints, setRPCEndpoints] = useState({
    ethereum: globalContext.globalState.rpcEndpoints.ETH.primary,
    polygon: globalContext.globalState.rpcEndpoints.POLYGON.primary,
    avalanche: globalContext.globalState.rpcEndpoints.AVALANCHE.primary,
    fantom: globalContext.globalState.rpcEndpoints.FANTOM.primary,
    arbitrum: globalContext.globalState.rpcEndpoints.ARBITRUM.primary,
    optimism: globalContext.globalState.rpcEndpoints.OPTIMISM.primary,
    bsc: globalContext.globalState.rpcEndpoints.BSC.primary,
    evmos: globalContext.globalState.rpcEndpoints.EVMOS.primary,
    osmosis: globalContext.globalState.rpcEndpoints.OSMOSIS.primary,
    cosmos: globalContext.globalState.rpcEndpoints.COSMOS.primary,
    juno: globalContext.globalState.rpcEndpoints.JUNO.primary
  });

  const maskString = (endpoint: string) => {
    if (!devMode) {
      let tempString = endpoint.substring(0, 15);
      tempString += '************';
      return tempString;
    } else {
      return endpoint;
    }
  };

  const promptReset = () => {
    showModal('state', { type: 'warning', title: t('RESTORE_DEFAULT_HOSTS_RPC_TITLE'), description: t('RESTORE_DEFAULT_HOSTS_RPC_DESCRIPTION'), onSuccess: reset, onFailure: hideModal });
  };

  const promptUpdate = () => {
    showModal('state', { type: 'warning', title: t('UPDATE_HOSTS_RPC_TITLE'), description: t('UPDATE_HOSTS_RPC_DESCRIPTION'), onSuccess: update, onFailure: hideModal });
  };

  const reset = async () => {
    hideModal();
    setLoading(true);
    await clearRpcEndpoints();
    await clearHost('ARCH_HOST');
    await clearHost('PORTFOLIO_HOST');
    await clearHost('OWLRACLE_HOST');
    setTimeout(() => {
      setLoading(false);
      RNExitApp.exitApp();
    }, 1500);
  };

  const update = async () => {
    hideModal();
    const tempRPCEndpoints = globalContext.globalState.rpcEndpoints;
    tempRPCEndpoints.ETH.primary = rpcEndpoints.ethereum;
    tempRPCEndpoints.POLYGON.primary = rpcEndpoints.polygon;
    tempRPCEndpoints.AVALANCHE.primary = rpcEndpoints.avalanche;
    tempRPCEndpoints.FANTOM.primary = rpcEndpoints.fantom;
    tempRPCEndpoints.ARBITRUM.primary = rpcEndpoints.arbitrum;
    tempRPCEndpoints.OPTIMISM.primary = rpcEndpoints.optimism;
    tempRPCEndpoints.BSC.primary = rpcEndpoints.bsc;
    tempRPCEndpoints.EVMOS.primary = rpcEndpoints.evmos;
    tempRPCEndpoints.OSMOSIS.primary = rpcEndpoints.osmosis;
    tempRPCEndpoints.COSMOS.primary = rpcEndpoints.cosmos;
    tempRPCEndpoints.JUNO.primary = rpcEndpoints.juno;

    setLoading(true);
    await setRpcEndpoints(JSON.stringify(tempRPCEndpoints));
    setHost('ARCH_HOST', hosts.archHost);
    setHost('PORTFOLIO_HOST', hosts.portfolioHost);
    setHost('OWLRACLE_HOST', hosts.owlracleHost);
    setTimeout(() => {
      setLoading(false);
      RNExitApp.exitApp();
    }, 1500);
  };

  const onPressSeedPharse = () => {
    copyToClipboard(globalContext.globalState.token);
    showToast(t('JWT_COPY'));
  };

  return (
    loading
      ? <Loading></Loading>
      : <CyDScrollView className={'bg-white h-full px-[24px] pt-[20px]'}>
        {devMode && <CyDView>
          <CyDView className={'mt-[18px]'}>
            <CyDText className={'text-[16px] font-black'}>{t<string>('JWT')}</CyDText>
            <CyDView className={'flex flex-row justify-between items-center'}>
              <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor  w-[90%]')}
                editable={false}
                value={globalContext.globalState.token}
                autoCapitalize="none"
                key="jwt"
                autoCorrect={false}
                placeholderTextColor={'#C5C5C5'}
                placeholder='' />
              <CyDTouchView onPress={() => onPressSeedPharse()}><CyDImage source={AppImages.COPY} className={'w-[20px] h-[22px]'} /></CyDTouchView>
            </CyDView>
            </CyDView>
        </CyDView>}
        <CyDText className={'mt-[18px] underline text-[18px] font-black'}>{t<string>('HOSTS_ALL_CAPS')}</CyDText>
        <CyDView className={'mt-[18px]'}>
          <CyDText className={'text-[16px] font-black'}>{t<string>('ARCH_ALL_CAPS')}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            editable={devMode}
            value={maskString(hosts.archHost)}
            autoCapitalize="none"
            key="arch"
            onChangeText={(value) => { setHosts({ ...hosts, archHost: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{t<string>('PORTFOLIO_ALL_CAPS')}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(hosts.portfolioHost)}
            editable={devMode}
            autoCapitalize="none"
            key="portfolio"
            onChangeText={(value) => { setHosts({ ...hosts, portfolioHost: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{t<string>('OWLRACLE_ALL_CAPS')}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(hosts.owlracleHost)}
            editable={devMode}
            autoCapitalize="none"
            key="owlracle"
            onChangeText={(value) => { setHosts({ ...hosts, owlracleHost: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDText className={'underline mt-[25px] text-[18px] font-black'}>{t<string>('RPC_ENDPOINTS_ALL_CAPS')}</CyDText>
        <CyDView className={'mt-[18px]'}>
          <CyDText className={'text-[16px] font-black'}>{t<string>('ETHEREUM_ALL_CAPS')}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            editable={devMode}
            value={maskString(rpcEndpoints.ethereum)}
            autoCapitalize="none"
            key="ethereum"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, ethereum: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.POLYGON}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.polygon)}
            editable={devMode}
            autoCapitalize="none"
            key="polygon"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, polygon: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.AVALANCHE}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.avalanche)}
            editable={devMode}
            autoCapitalize="none"
            key="avalanche"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, avalanche: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.FANTOM}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.fantom)}
            editable={devMode}
            autoCapitalize="none"
            key="fantom"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, fantom: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.ARBITRUM}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.arbitrum)}
            editable={devMode}
            autoCapitalize="none"
            key="arbitrum"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, arbitrum: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.OPTIMISM}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.optimism)}
            editable={devMode}
            autoCapitalize="none"
            key="optimism"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, optimism: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.BSC}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.bsc)}
            editable={devMode}
            autoCapitalize="none"
            key="bsc"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, bsc: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.EVMOS}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.evmos)}
            editable={devMode}
            autoCapitalize="none"
            key="evmos"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, evmos: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.OSMOSIS}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.osmosis)}
            editable={devMode}
            autoCapitalize="none"
            key="osmosis"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, osmosis: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.COSMOS}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.cosmos)}
            editable={devMode}
            autoCapitalize="none"
            key="cosmos"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, cosmos: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'mt-[25px] mb-[30px]'}>
          <CyDText className={'text-[16px] font-black'}>{ChainBackendNames.JUNO}</CyDText>
          <CyDTextInput className={clsx('mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor')}
            value={maskString(rpcEndpoints.juno)}
            editable={devMode}
            autoCapitalize="none"
            key="juno"
            onChangeText={(value) => { setRPCEndpoints({ ...rpcEndpoints, juno: value }); }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder='' />
        </CyDView>
        <CyDView className={'flex flex-row justify-center items-center mb-[40px]'}>
          {devMode && <CyDTouchView onPress={async () => promptReset()}
            className={'bg-appColor py-[10px] rounded-[12px] w-[48%] mr-[10px]'}>
            <CyDText className={'text-center font-semibold'}>{t<string>('RESTORE_DEFAULTS')}</CyDText>
          </CyDTouchView>}
          {devMode && <CyDTouchView onPress={async () => promptUpdate()}
            className={'bg-appColor py-[10px] rounded-[12px] w-[48%]'}>
            <CyDText className={'text-center font-semibold'}>{t<string>('UPDATE')}</CyDText>
          </CyDTouchView>}
        </CyDView>
      </CyDScrollView>
  );
};
