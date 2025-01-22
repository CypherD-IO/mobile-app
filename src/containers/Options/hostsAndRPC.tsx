/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDScrollView,
  CyDTextInput,
  CyDTouchView,
  CyDImage,
  CyDSwitch,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindStyles';
import { copyToClipboard } from '../../core/util';
import { GlobalContext } from '../../core/globalContext';
import clsx from 'clsx';
import { t } from 'i18next';
import Loading from '../../components/v2/loading';
import {
  setRpcEndpoints,
  clearRpcEndpoints,
  clearHost,
  setRpcPreference,
  getRpcPreference,
  getIsRcEnabled,
  setIsRcEnabled,
  getDeveloperMode,
} from '../../core/asyncStorage';
import { hostWorker } from '../../global';
import { ChainBackendNames } from '../../constants/server';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import RNExitApp from 'react-native-exit-app';
import AppImages from '../../../assets/images/appImages';
import { showToast } from '../utilities/toastUtility';
import { RPCPreference } from '../../constants/enum';
import { BackHandler, Keyboard } from 'react-native';
import useCardUtilities from '../../hooks/useCardUtilities';

export default function HostsAndRPCScreen({ navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const [devMode, setDevMode] = useState<boolean>(false);
  const { getHost, setHost } = hostWorker;
  const [rpcPreference, setRPCPreference] = useState<
    string | null | undefined
  >();
  const [isRcEnabledValue, setIsRcEnabledValue] = useState(false);
  const { checkIsRCEnabled } = useCardUtilities();

  const [loading, setLoading] = useState<boolean>(true);

  const [hosts, setHosts] = useState({
    archHost: getHost('ARCH_HOST'),
    portfolioHost: getHost('PORTFOLIO_HOST'),
  });

  const [rpcEndpoints, setRPCEndpoints] = useState({
    ethereum: globalContext.globalState.rpcEndpoints.ETH.primary,
    polygon: globalContext.globalState.rpcEndpoints.POLYGON.primary,
    avalanche: globalContext.globalState.rpcEndpoints.AVALANCHE.primary,
    arbitrum: globalContext.globalState.rpcEndpoints.ARBITRUM.primary,
    optimism: globalContext.globalState.rpcEndpoints.OPTIMISM.primary,
    bsc: globalContext.globalState.rpcEndpoints.BSC.primary,
    osmosis: globalContext.globalState.rpcEndpoints.OSMOSIS.primary,
    cosmos: globalContext.globalState.rpcEndpoints.COSMOS.primary,
    juno: globalContext.globalState.rpcEndpoints.JUNO.primary,
    noble: globalContext.globalState.rpcEndpoints?.NOBLE?.primary,
    shardeum: globalContext.globalState.rpcEndpoints?.SHARDEUM?.primary,
    shardeum_sphinx:
      globalContext.globalState.rpcEndpoints?.SHARDEUM_SPHINX?.primary,
    zksync_era: globalContext.globalState.rpcEndpoints?.ZKSYNC_ERA?.primary,
    base: globalContext.globalState.rpcEndpoints?.BASE?.primary,
    polygon_zkevm:
      globalContext.globalState.rpcEndpoints?.POLYGON_ZKEVM?.primary,
    aurora: globalContext.globalState.rpcEndpoints?.AURORA?.primary,
    moonbeam: globalContext.globalState.rpcEndpoints?.MOONBEAM?.primary,
    moonriver: globalContext.globalState.rpcEndpoints?.MOONRIVER?.primary,
    coreum: globalContext.globalState.rpcEndpoints?.COREUM?.primary,
    injective: globalContext.globalState.rpcEndpoints?.INJECTIVE?.primary,
    kujira: globalContext.globalState.rpcEndpoints?.KUJIRA?.primary,
  });

  const handleBackButton = () => {
    Keyboard.dismiss();
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const getRPCPreference = async () => {
      const preference: string | null | undefined = await getRpcPreference();
      setRPCPreference(preference);
      setLoading(false);
    };

    const checkIsRCEnabledValue = async () => {
      const isRcEnabledInDB = await checkIsRCEnabled();
      const isRcEnabledInAsync = await getIsRcEnabled();
      if (isRcEnabledInAsync !== null) {
        isRcEnabledInAsync === 'true'
          ? setIsRcEnabledValue(true)
          : setIsRcEnabledValue(false);
      } else {
        setIsRcEnabledValue(isRcEnabledInDB);
      }
    };
    void fetchDevMode();
    void getRPCPreference();
    void checkIsRCEnabledValue();
  }, []);

  const fetchDevMode = async () => {
    const tempDevMode = await getDeveloperMode();
    setDevMode(tempDevMode);
  };

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
    showModal('state', {
      type: 'warning',
      title: t('RESTORE_DEFAULT_HOSTS_RPC_TITLE'),
      description: t('RESTORE_DEFAULT_HOSTS_RPC_DESCRIPTION'),
      onSuccess: reset,
      onFailure: hideModal,
    });
  };

  const promptUpdate = () => {
    showModal('state', {
      type: 'warning',
      title: t('UPDATE_HOSTS_RPC_TITLE'),
      description: t('UPDATE_HOSTS_RPC_DESCRIPTION'),
      onSuccess: update,
      onFailure: hideModal,
    });
  };

  const reset = async () => {
    hideModal();
    setLoading(true);
    await setRpcPreference(RPCPreference.DEFAULT);
    await clearRpcEndpoints();
    await clearHost('ARCH_HOST');
    await clearHost('PORTFOLIO_HOST');
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
    tempRPCEndpoints.ARBITRUM.primary = rpcEndpoints.arbitrum;
    tempRPCEndpoints.OPTIMISM.primary = rpcEndpoints.optimism;
    tempRPCEndpoints.BSC.primary = rpcEndpoints.bsc;
    tempRPCEndpoints.OSMOSIS.primary = rpcEndpoints.osmosis;
    tempRPCEndpoints.COSMOS.primary = rpcEndpoints.cosmos;
    tempRPCEndpoints.JUNO.primary = rpcEndpoints.juno;
    if (tempRPCEndpoints?.NOBLE?.primary) {
      tempRPCEndpoints.NOBLE.primary = rpcEndpoints?.noble;
    }
    if (tempRPCEndpoints?.COREUM?.primary) {
      tempRPCEndpoints.COREUM.primary = rpcEndpoints?.coreum;
    }
    if (tempRPCEndpoints?.INJECTIVE?.primary) {
      tempRPCEndpoints.INJECTIVE.primary = rpcEndpoints?.injective;
    }
    if (tempRPCEndpoints?.KUJIRA?.primary) {
      tempRPCEndpoints.KUJIRA.primary = rpcEndpoints?.kujira;
    }
    if (tempRPCEndpoints?.SHARDEUM?.primary) {
      tempRPCEndpoints.SHARDEUM.primary = rpcEndpoints?.shardeum;
    }
    if (tempRPCEndpoints?.SHARDEUM_SPHINX?.primary) {
      tempRPCEndpoints.SHARDEUM_SPHINX.primary = rpcEndpoints?.shardeum_sphinx;
    }

    setLoading(true);
    await setRpcPreference(RPCPreference.OVERIDDEN);
    await setRpcEndpoints(JSON.stringify(tempRPCEndpoints));
    setHost('ARCH_HOST', hosts.archHost);
    setHost('PORTFOLIO_HOST', hosts.portfolioHost);
    setTimeout(() => {
      setLoading(false);
      RNExitApp.exitApp();
    }, 1500);
  };

  const onPressSeedPharse = () => {
    copyToClipboard(globalContext.globalState.token);
    showToast(t('JWT_COPY'));
  };

  return loading ? (
    <Loading />
  ) : (
    <CyDScrollView className={'bg-n20 h-full px-[24px] pt-[20px]'}>
      <CyDKeyboardAwareScrollView>
        {devMode && (
          <CyDView>
            <CyDView className={'mt-[18px]'}>
              <CyDText className={'text-[16px] font-black'}>
                {t<string>('JWT')}
              </CyDText>
              <CyDView className={'flex flex-row justify-between items-center'}>
                <CyDTextInput
                  className={clsx(
                    'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]    w-[90%]',
                  )}
                  editable={false}
                  value={globalContext.globalState.token}
                  autoCapitalize='none'
                  key='jwt'
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  placeholder=''
                />
                <CyDTouchView onPress={() => onPressSeedPharse()}>
                  <CyDMaterialDesignIcons
                    name={'content-copy'}
                    size={20}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
            </CyDView>
            <CyDView className='mt-[18px] flex felx-row'>
              <CyDText className={'text-[16px] font-black'}>
                {'ENABLE RC'}
              </CyDText>
              <CyDSwitch
                onValueChange={async () => {
                  await setIsRcEnabled(!isRcEnabledValue);
                  setIsRcEnabledValue(!isRcEnabledValue);
                }}
                value={isRcEnabledValue}
              />
            </CyDView>
          </CyDView>
        )}
        <CyDText className={'mt-[18px] underline text-[18px] font-black'}>
          {t<string>('HOSTS_ALL_CAPS')}
        </CyDText>
        <CyDView className={'mt-[18px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {t<string>('ARCH_ALL_CAPS')}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            editable={devMode}
            value={maskString(hosts.archHost)}
            autoCapitalize='none'
            key='arch'
            onChangeText={value => {
              setHosts({ ...hosts, archHost: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {t<string>('PORTFOLIO_ALL_CAPS')}
          </CyDText>
        </CyDView>
        <CyDView
          className={'mt-[25px] flex flex-row items-center justify-between'}>
          <CyDView>
            <CyDText className={'underline text-[18px] font-black'}>
              {t<string>('RPC_ENDPOINTS_ALL_CAPS')}
            </CyDText>
          </CyDView>
          {devMode && (
            <CyDView>
              <CyDText>
                {rpcPreference === RPCPreference.DEFAULT ||
                rpcPreference === '' ||
                !rpcPreference
                  ? `(${t<string>('DEFAULT_INIT_CAPS')})`
                  : `(${t<string>('UPDATED_INIT_CAPS')})`}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
        <CyDView className={'mt-[18px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {t<string>('ETHEREUM_ALL_CAPS')}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            editable={devMode}
            value={maskString(rpcEndpoints.ethereum)}
            autoCapitalize='none'
            key='ethereum'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, ethereum: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.POLYGON}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.polygon)}
            editable={devMode}
            autoCapitalize='none'
            key='polygon'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, polygon: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.AVALANCHE}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.avalanche)}
            editable={devMode}
            autoCapitalize='none'
            key='avalanche'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, avalanche: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.ARBITRUM}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.arbitrum)}
            editable={devMode}
            autoCapitalize='none'
            key='arbitrum'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, arbitrum: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.OPTIMISM}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.optimism)}
            editable={devMode}
            autoCapitalize='none'
            key='optimism'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, optimism: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.BSC}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.bsc)}
            editable={devMode}
            autoCapitalize='none'
            key='bsc'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, bsc: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.OSMOSIS}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.osmosis)}
            editable={devMode}
            autoCapitalize='none'
            key='osmosis'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, osmosis: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.COSMOS}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.cosmos)}
            editable={devMode}
            autoCapitalize='none'
            key='cosmos'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, cosmos: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        <CyDView className={'mt-[25px]'}>
          <CyDText className={'text-[16px] font-black'}>
            {ChainBackendNames.JUNO}
          </CyDText>
          <CyDTextInput
            className={clsx(
              'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
            )}
            value={maskString(rpcEndpoints.juno)}
            editable={devMode}
            autoCapitalize='none'
            key='juno'
            onChangeText={value => {
              setRPCEndpoints({ ...rpcEndpoints, juno: value });
            }}
            autoCorrect={false}
            placeholderTextColor={'#C5C5C5'}
            placeholder=''
          />
        </CyDView>
        {rpcEndpoints.noble ? (
          <CyDView className={'mt-[25px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.NOBLE}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.noble)}
              editable={devMode}
              autoCapitalize='none'
              key='noble'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, noble: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.shardeum ? (
          <CyDView className={'mt-[25px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.SHARDEUM}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.shardeum)}
              editable={devMode}
              autoCapitalize='none'
              key='shardeum'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, shardeum: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        <CyDView className='mb-[30px]' />
        {rpcEndpoints.shardeum_sphinx ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.SHARDEUM_SPHINX}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.shardeum_sphinx)}
              editable={devMode}
              autoCapitalize='none'
              key='shardeum_sphinx'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, shardeum_sphinx: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.zksync_era ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.ZKSYNC_ERA}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.zksync_era)}
              editable={devMode}
              autoCapitalize='none'
              key='zksync_era'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, zksync_era: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.base ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.BASE}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.base)}
              editable={devMode}
              autoCapitalize='none'
              key='base'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, base: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.polygon_zkevm ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.POLYGON_ZKEVM}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.polygon_zkevm)}
              editable={devMode}
              autoCapitalize='none'
              key='polygon_zkevm'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, polygon_zkevm: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.aurora ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.AURORA}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.aurora)}
              editable={devMode}
              autoCapitalize='none'
              key='aurora'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, aurora: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.moonbeam ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.MOONBEAM}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.moonbeam)}
              editable={devMode}
              autoCapitalize='none'
              key='moonbeam'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, moonbeam: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.moonriver ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.MOONRIVER}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.moonriver)}
              editable={devMode}
              autoCapitalize='none'
              key='moonriver'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, moonriver: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.coreum ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.COREUM}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.coreum)}
              editable={devMode}
              autoCapitalize='none'
              key='coreum'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, coreum: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.injective ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.INJECTIVE}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.injective)}
              editable={devMode}
              autoCapitalize='none'
              key='moonriver'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, injective: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        {rpcEndpoints.kujira ? (
          <CyDView className={'mb-[30px]'}>
            <CyDText className={'text-[16px] font-black'}>
              {ChainBackendNames.KUJIRA}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'mt-[10px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px]  ',
              )}
              value={maskString(rpcEndpoints.kujira)}
              editable={devMode}
              autoCapitalize='none'
              key='moonriver'
              onChangeText={value => {
                setRPCEndpoints({ ...rpcEndpoints, kujira: value });
              }}
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              placeholder=''
            />
          </CyDView>
        ) : (
          <CyDView />
        )}
        <CyDView
          className={'flex flex-row justify-center items-center mb-[40px]'}>
          {devMode && (
            <CyDTouchView
              onPress={async () => promptReset()}
              className={
                'bg-appColor py-[10px] rounded-[12px] w-[48%] mr-[10px]'
              }>
              <CyDText className={'text-center font-semibold'}>
                {t<string>('RESTORE_DEFAULTS')}
              </CyDText>
            </CyDTouchView>
          )}
          {devMode && (
            <CyDTouchView
              onPress={async () => promptUpdate()}
              className={'bg-appColor py-[10px] rounded-[12px] w-[48%]'}>
              <CyDText className={'text-center font-semibold'}>
                {t<string>('UPDATE')}
              </CyDText>
            </CyDTouchView>
          )}
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDScrollView>
  );
}
