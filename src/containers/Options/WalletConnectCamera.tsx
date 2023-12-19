/* eslint-disable react/prop-types */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/**
 * @format
 * @flow
 */

import React, {
  useEffect,
  useState,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import WalletConnect from '@walletconnect/client';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import AppImages from './../../../assets/images/appImages';
import { storeConnectWalletData } from '../../core/asyncStorage';
import LoadingStack from '../../routes/loading';
import analytics from '@react-native-firebase/analytics';
import { BackHandler, FlatList } from 'react-native';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import {
  CyDText,
  CyDSafeAreaView,
  CyDView,
  CyDImage,
  CyDTouchView,
  CyDFastImage,
} from '../../styles/tailwindStyles';
import {
  WalletConnectContext,
  walletConnectContextDef,
  WalletConnectActions,
} from '../../reducers/wallet_connect_reducer';
import { QRScannerScreens } from '../../constants/server';
import {
  deleteTopic,
  web3WalletPair,
  web3wallet,
} from '../../core/walletConnectV2Utils';
import { has } from 'lodash';
import moment from 'moment';
import clsx from 'clsx';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { WALLET_CONNECT_PROPOSAL_LISTENER } from '../../constants/timeOuts';

export default function WalletConnectCamera(props) {
  const { walletConnectState, walletConnectDispatch } =
    useContext<walletConnectContextDef>(WalletConnectContext);

  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { t } = useTranslation();

  const [walletConnectURI, setWalletConnectURI] = useState('');

  const [selectedPairingTopic, setSelectedPairingTopic] = useState<string>('');
  const [sessionsForAPairing, setSessionsForAPairing] = useState<any>([]);
  const [totalSessions, setTotalSessions] = useState<any>([]);
  const [isPairingSessionsModalVisible, setPairingSessionsModalVisible] =
    useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const loading = useRef(true);
  const sessionProposalListener = useRef<NodeJS.Timeout>();
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  const connectWallet = async (uri: string) => {
    if (uri.includes('relay-protocol')) {
      try {
        const pairPromise = await web3WalletPair({ uri });
        const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
        if (pairPromise?.expiry <= currentTimestampInSeconds) {
          loading.current = false;
          showModal('state', {
            type: 'error',
            title: t('WALLET_CONNECT_PROPOSAL_EXPIRED'),
            description: t('WC_PROPOSAL_EXPIRED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        } else {
          sessionProposalListener.current = setTimeout(() => {
            if (loading.current) {
              loading.current = false;
              showModal('state', {
                type: 'error',
                title: t('WALLET_CONNECT_PROPOSAL_EXPIRED'),
                description: t('WC_PROPOSAL_EXPIRED_DESCRIPTION'),
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            }
          }, WALLET_CONNECT_PROPOSAL_LISTENER);
          web3wallet?.on('session_proposal', () => {
            loading.current = false;
            clearTimeout(sessionProposalListener.current);
          });
        }
      } catch (e) {
        loading.current = false;
        showModal('state', {
          type: 'error',
          title: t('WALLET_CONNECT_PROPOSAL_EXPIRED'),
          description: t('WC_PROPOSAL_EXPIRED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      const connector = new WalletConnect({ uri });
      walletConnectDispatch({
        type: WalletConnectActions.ADD_CONNECTOR,
        value: connector,
      });
    }
  };

  const handleBackButton = () => {
    props?.navigation?.goBack();
    return true;
  };

  const endSession = async (key: number) => {
    const connector = walletConnectState.connectors[key];
    walletConnectDispatch({
      type: WalletConnectActions.DELETE_DAPP_INFO,
      value: { connector },
    });
    if (connector) {
      await connector?.killSession();
    }
  };

  const onSuccess = e => {
    props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
    const link = e.data;
    if (link.startsWith('wc')) {
      loading.current = true;
      void connectWallet(link);
      void analytics().logEvent('wallet_connect_url_scan', {
        fromEthAddress: ethereum.address,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('INVALID_CONNECTION_REQUEST'),
        description: t('INVALID_CONNECTION_REQUEST_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  useLayoutEffect(() => {
    props.navigation.setOptions({
      headerRight: () => (
        <CyDTouchView
          onPress={() => {
            props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
              fromPage: QRScannerScreens.WALLET_CONNECT,
              onSuccess,
            });
          }}>
          <CyDFastImage
            source={AppImages.QR_CODE_SCANNER_BLACK}
            className='h-[25px] w-[25px]'
            resizeMode='contain'
          />
        </CyDTouchView>
      ),
    });
  }, [props.navigation]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      setWalletConnectURI('');
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const link = portfolioState.statePortfolio.walletConnectURI;
    if (link.startsWith('wc')) {
      portfolioState.dispatchPortfolio({ value: { walletConnectURI: '' } });
      loading.current = true;
      void connectWallet(link);
      void analytics().logEvent('wallet_connect_url_scan', {
        fromEthAddress: ethereum.address,
      });
    }
  }, [portfolioState.statePortfolio.walletConnectURI]);

  const buildWalletConnectDataFromAsync = async () => {
    let data;
    if (walletConnectState?.dAppInfo?.length === 0) {
      data = { connectors: [], dAppInfo: [] };
    } else {
      data = {
        connectors: walletConnectState?.connectors?.map(element => {
          return element.session ?? element;
        }),
        dAppInfo: walletConnectState?.dAppInfo,
      };
    }
    await storeConnectWalletData(
      data,
      hdWalletContext.state.wallet.ethereum.wallets[0].address,
    );
    if (web3wallet) getv2Sessions();
  };

  // This useEffect is to store the session for each update
  useEffect(() => {
    if (walletConnectState) {
      void buildWalletConnectDataFromAsync();
    }
  }, [walletConnectState]);

  useEffect(() => {
    if (loading.current !== isLoadingConnections) {
      setIsLoadingConnections(loading.current);
    }
    if (loading.current && walletConnectURI.startsWith('wc')) {
      void connectWallet(walletConnectURI);
    }
  }, [loading.current, walletConnectURI]);

  const getv2Sessions = () => {
    if (web3wallet?.getActiveSessions()) {
      const sessions = Object.values(web3wallet.getActiveSessions());
      if (sessions) {
        setTotalSessions(sessions);
        const activeSessionTopics = sessions.map(
          session => session.pairingTopic,
        );
        const staleConnectors: number[] = [];
        const connectors = walletConnectState?.connectors.filter(
          (connector, index) => {
            if (activeSessionTopics.includes(connector?.topic)) {
              return true;
            }
            staleConnectors.push(index);
            return false;
          },
        );
        const dAppInfo = walletConnectState?.dAppInfo.filter(
          (dApp, index) => !staleConnectors.includes(index),
        );
        if (staleConnectors.length) {
          walletConnectDispatch({
            type: WalletConnectActions.RESTORE_SESSION,
            value: { connectors, dAppInfo },
          });
        }
      }
    }
  };

  const getSessionsForAPairing = (pairingTopic: string) => {
    const tempSessions = totalSessions.filter(
      (session: any) => session.pairingTopic === pairingTopic,
    );
    return tempSessions;
  };

  useEffect(() => {
    if (selectedPairingTopic !== '') {
      const pairingSessions = getSessionsForAPairing(selectedPairingTopic);
      setSessionsForAPairing(pairingSessions);
      setPairingSessionsModalVisible(true);
    }
  }, [selectedPairingTopic]);

  useEffect(() => {
    if (isPairingSessionsModalVisible) {
      showPairingSessions();
    } else {
      setSelectedPairingTopic('');
      hideModal();
    }
  }, [isPairingSessionsModalVisible]);

  useEffect(() => {
    if (web3wallet) getv2Sessions();
    if (selectedPairingTopic !== '')
      getSessionsForAPairing(selectedPairingTopic);
    if (
      walletConnectState?.connectors?.length ===
      walletConnectState?.dAppInfo?.length
    ) {
      loading.current = false;
    }
  }, [walletConnectState]);

  if (isLoadingConnections) {
    return <LoadingStack />;
  }

  // const disconnectSession = async (topic: string) => {
  //   setLoading(true);
  //   try {
  //     setPairingSessionsModalVisible(false);
  //     await deleteTopic(topic);
  //     getv2Sessions();
  //     setSessionsForAPairing([]);
  //     setLoading(false);
  //   } catch (e) {
  //     getv2Sessions();
  //     setSessionsForAPairing([]);
  //     setLoading(false);
  //   }
  // };

  const deletePairing = async (pairingTopic: string, sessionTopic?: string) => {
    const [connector] = walletConnectState.dAppInfo.filter(
      connection => connection.topic === pairingTopic,
    );
    walletConnectDispatch({
      type: WalletConnectActions.DELETE_DAPP_INFO,
      value: { connector },
    });
    setPairingSessionsModalVisible(false);
    try {
      if (sessionTopic) await deleteTopic(sessionTopic);
      await deleteTopic(pairingTopic);
      getv2Sessions();
    } catch (e) {
      getv2Sessions();
    }
  };

  const renderSessionItem = session => {
    const { name, icons } = session.item.peer.metadata;
    const { expiry } = session.item;
    return (
      <CyDView>
        <CyDView className={'flex items-center'}>
          <CyDView className='mt-[12px] w-11/12 border-[1px] rounded-[8px] border-fadedGrey'>
            <CyDView className={'flex-row'}>
              <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
                <CyDFastImage
                  className={'h-[40px] w-[40px] rounded-[50px]'}
                  source={{ uri: icons[0] }}
                  resizeMode='contain'
                />
              </CyDView>
              <CyDView className={'flex flex-row'}>
                <CyDView className='flex flex-row justify-between items-center rounded-r-[20px] py-[15px] pr-[20px]'>
                  <CyDView className='ml-[10px]'>
                    <CyDView
                      className={'flex flex-row items-center align-center'}>
                      <CyDText className={'font-extrabold text-[16px]'}>
                        {name.length > 25
                          ? `${name.substring(0, 25)}....`
                          : name}
                      </CyDText>
                    </CyDView>
                    <CyDView
                      className={'flex flex-row items-center align-center'}>
                      <CyDText className={'text-[14px]'}>
                        {t<string>('EXPIRES_AT')}:{' '}
                        {moment.unix(expiry).format('LLL')}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>
              {/* <CyDView className={'flex-auto flex-row items-center justify-end mr-[10px]'}>
                  <CyDTouchView onPress ={() => { void disconnectSession(session.item.topic); }}>
                    <CyDImage source={AppImages.DISCONNECT} />
                  </CyDTouchView>
                </CyDView> */}
            </CyDView>
            <CyDView className={'flex flex-row justify-center'}>
              <Button
                onPress={() => {
                  // void disconnectSession(session.item.topic);
                  void deletePairing(selectedPairingTopic, session.item.topic);
                }}
                style={'w-[80%] py-[10px] mb-[8px]'}
                type={ButtonType.RED}
                title={t('DISCONNECT')}
                titleStyle='text-[14px] text-white'
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const RenderSessionsForAPairing = () => {
    return (
      <CyDView>
        <CyDView className={'flex flex-row justify-center'}>
          <CyDText className={'text-[22px] font-extrabold mt-[15px] mb-[10px]'}>
            {t<string>('MANAGE_CONNECTION')}
          </CyDText>
        </CyDView>
        {/* <CyDTouchView onPress={() => { setPairingSessionsModalVisible(false); }} className={'z-[50]'}>
          <CyDImage source={AppImages.CLOSE} className={' w-[18px] h-[18px] z-[50] absolute right-[20px] top-[-30px]'} />
         </CyDTouchView> */}
        {sessionsForAPairing.length === 0 && (
          <CyDView>
            <CyDView className={'flex flex-row justify-center'}>
              <CyDImage
                className={'h-[250px] w-[250px]'}
                source={AppImages.EMPTY_WALLET_CONNECT_SESSIONS}
                resizeMode='contain'
              />
            </CyDView>
            <CyDView className={'flex flex-row justify-center mb-[10px]'}>
              <CyDText className={'font-bold text-[18px]'}>
                No active sessions available
              </CyDText>
            </CyDView>
            <CyDView className={'flex flex-row justify-center'}>
              <Button
                onPress={() => {
                  void deletePairing(selectedPairingTopic);
                }}
                style={'w-[80%] p-[20px] my-[18px]'}
                type={ButtonType.RED}
                title={t('DELETE_CONNECTION')}
                titleStyle='text-[14px] text-white'
              />
            </CyDView>
          </CyDView>
        )}
        {sessionsForAPairing.length > 0 && (
          <CyDView className='mt-[10px]'>
            <FlatList
              data={sessionsForAPairing}
              renderItem={item => renderSessionItem(item)}
              style={{ width: '100%', maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
            />
          </CyDView>
        )}
        <CyDView className={'flex flex-row justify-center'}>
          {/* <Button onPress={() => {
            void deletePairing(selectedPairingTopic);
          }} style={'w-[80%] p-[20px] my-[18px]'} type={ButtonType.TERNARY} title={t('DELETE_CONNECTION')} titleStyle='text-[14px]'/> */}
        </CyDView>
      </CyDView>
    );
  };

  const RenderPairingOnlineStatus = ({ pairing }) => {
    const isOnline = getSessionsForAPairing(pairing.topic).length > 0;
    return (
      <CyDView>
        <CyDView
          className={clsx(
            'h-[10px] w-[10px] rounded-[60px] ml-[6px] mt-[3px]',
            { 'bg-green-600': isOnline, 'bg-red-600': !isOnline },
          )}
        />
      </CyDView>
    );
  };

  function showPairingSessions() {
    showModal('customLayout', {
      onSuccess: () => {
        setPairingSessionsModalVisible(false);
      },
      onFailure: () => {
        setPairingSessionsModalVisible(false);
      },
      customComponent: <RenderSessionsForAPairing />,
    });
  }

  const renderItem = item => {
    const element = item.item;
    const key = item.index;
    const isV2 = has(element, 'version') && element?.version === 'v2';
    return (
      <CyDTouchView
        disabled={!isV2}
        onPress={() => {
          setSelectedPairingTopic(element.topic);
        }}>
        <CyDView className={'flex items-center'}>
          <CyDView className='flex flex-row items-center mt-[6px] w-11/12 border-[1px] rounded-[8px] border-fadedGrey'>
            <CyDView className={'flex-row'}>
              <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
                <CyDFastImage
                  className={'h-[40px] w-[40px] rounded-[50px]'}
                  source={{ uri: !isV2 ? element.icons[0] : element.icon }}
                  resizeMode='contain'
                />
              </CyDView>
              {isV2 && (
                <CyDView className='rounded-[60px] h-[16px] p-[4px] absolute mt-[43px] ml-[22px] bg-appColor'>
                  <CyDText className={'font-extrabold text-[8px]'}>V2</CyDText>
                </CyDView>
              )}
              <CyDView className={'flex flex-row'}>
                <CyDView className='flex flex-row justify-between items-center rounded-r-[20px] py-[15px] pr-[20px]'>
                  <CyDView className='ml-[10px]'>
                    <CyDView
                      className={'flex flex-row items-center align-center'}>
                      <CyDText className={'font-extrabold text-[16px]'}>
                        {element.name.length > 25
                          ? `${element.name.substring(0, 25)}....`
                          : element.name}
                      </CyDText>
                      {isV2 && <RenderPairingOnlineStatus pairing={element} />}
                    </CyDView>
                    <CyDView
                      className={'flex flex-row items-center align-center'}>
                      <CyDText
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        className={'text-[14px] w-[200px]'}>
                        {element.url}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView
                className={
                  'flex-auto flex-row items-center justify-end mr-[10px]'
                }>
                {!isV2 && (
                  <CyDTouchView
                    onPress={() => {
                      void endSession(key);
                    }}>
                    <CyDImage source={AppImages.DISCONNECT} />
                  </CyDTouchView>
                )}
                {isV2 && (
                  <CyDTouchView
                    onPress={() => {
                      setSelectedPairingTopic(element.topic);
                    }}>
                    <CyDImage
                      className={'h-[16px] w-[16px]'}
                      source={AppImages.SETTINGS}
                    />
                  </CyDTouchView>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  };

  return (
    <CyDSafeAreaView className={'bg-white h-full w-full'}>
      <FlatList
        className='mb-[20px]'
        data={walletConnectState.dAppInfo}
        renderItem={renderItem}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <CyDView className='h-full w-full justify-center items-center'>
            <CyDFastImage
              className='h-[250px] w-[250px]'
              source={AppImages.WALLET_CONNECT_EMPTY}
              resizeMode='contain'
            />
            <CyDText className='mt-[30px] text-[20px] font-semibold w-[300px] text-center'>
              {t('NO_CONNECTIONS')}
            </CyDText>
          </CyDView>
        }
      />
    </CyDSafeAreaView>
  );
}
