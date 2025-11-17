import React, {
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { BackHandler, FlatList } from 'react-native';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { HdWalletContext, parseErrorMessage } from '../../core/util';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import { ConnectionTypes } from '../../constants/enum';
import { IconNames } from '../../customFonts';
import useConnectionManager from '../../hooks/useConnectionManager';
import { HDWallet, HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import PageHeader from '../../components/PageHeader';
import { screenTitle } from '../../constants';
import clsx from 'clsx';
import Toast from 'react-native-toast-message';
import useWeb3Auth from '../../hooks/useWeb3Auth';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';

interface IManageWalletData {
  index: number;
  title: string;
  logo: IconNames;
  firebaseEvent: string;
  callback?: () => void;
}

interface ISecurityPrivacyData {
  index: number;
  title: string;
  logo: IconNames;
}

interface IMfaData {
  index: number;
  title: string;
  logo: IconNames;
}
const renderSettingsData = (
  item: IManageWalletData,
  hdWalletContext: { state: HDWallet },
) => {
  return (
    <CyDView className={'mb-[8px]'}>
      <CyDTouchView
        className={
          'flex flex-row justify-between items-center bg-n0 rounded-[12px] px-[16px] py-[16px]'
        }
        onPress={() => {
          item.callback?.();
          sendFirebaseEvent(hdWalletContext, item.firebaseEvent);
        }}>
        <CyDView className={'flex flex-row items-center gap-x-[12px]'}>
          <CyDView
            className={
              'flex items-center justify-center h-[36px] w-[36px] rounded-[6px] bg-[#C03838]'
            }>
            <CyDIcons name={item.logo} size={24} className='text-white' />
          </CyDView>
          <CyDText className={'font-semibold text-[16px] '}>
            {item.title}
          </CyDText>
        </CyDView>
        <CyDIcons name='chevron-right' size={20} className='text-base400' />
      </CyDTouchView>
    </CyDView>
  );
};

const getManageWalletData = (
  connectionType: ConnectionTypes | undefined,
  deleteWallet: (params: {
    navigation: NavigationProp<ParamListBase>;
    importNewWallet?: boolean;
  }) => Promise<void>,
  navigation: NavigationProp<ParamListBase>,
): IManageWalletData[] => {
  if (!connectionType) {
    return [];
  }
  switch (connectionType) {
    case ConnectionTypes.WALLET_CONNECT:
      return [
        {
          index: 0,
          title: t('DISCONNECT_WALLET'),
          logo: 'delete' as const,
          callback: () => {
            void deleteWallet({ navigation });
          },
          firebaseEvent: 'delete_wallet',
        },
      ];
    case ConnectionTypes.SOCIAL_LOGIN_EVM:
    case ConnectionTypes.SOCIAL_LOGIN_SOLANA:
      return [
        {
          index: 0,
          title: t('SIGN_OUT'),
          logo: 'delete' as const,
          callback: () => {
            void deleteWallet({ navigation });
          },
          firebaseEvent: 'delete_wallet',
        },
      ];
    case ConnectionTypes.PRIVATE_KEY:
    case ConnectionTypes.SEED_PHRASE:
      return [
        {
          index: 0,
          title: t('DELTE_WALLET'),
          logo: 'delete' as const,
          callback: () => {
            void deleteWallet({ navigation });
          },
          firebaseEvent: 'delete_wallet',
        },
      ];
    default:
      return [];
  }
};

const renderSecurityPrivacyData = (
  item: ISecurityPrivacyData,
  isSecurityOptionDisabled: boolean,
  navigation: NavigationProp<ParamListBase>,
  hdWalletContext: HdWalletContextDef,
) => {
  return (
    <CyDView className={'mb-[8px]'}>
      <CyDTouchView
        className={clsx(
          'flex flex-row justify-between items-center bg-n0 rounded-[12px] px-[16px] py-[16px]',
          {
            'opacity-50': isSecurityOptionDisabled,
          },
        )}
        onPress={() => {
          if (isSecurityOptionDisabled) {
            Toast.show({
              type: 'info',
              text1: t('SECURITY_OPTION_DISABLED'),
              text2: t('SECURITY_OPTION_DISABLED_DESCRIPTION'),
            });
            return;
          }
          if (item.logo === 'seed') {
            navigation.navigate(screenTitle.SEED_PHRASE);
            sendFirebaseEvent(hdWalletContext, 'reveal_seed_phrase');
          } else if (item.logo === 'key') {
            navigation.navigate(screenTitle.PRIVATE_KEY);
            sendFirebaseEvent(hdWalletContext, 'reveal_private_key');
          } else if (item.logo === 'settings') {
            navigation.navigate(screenTitle.CHANGE_PIN);
            sendFirebaseEvent(hdWalletContext, 'change_pin');
          }
        }}>
        <CyDView className={'flex flex-row items-center gap-x-[12px]'}>
          <CyDView
            className={clsx(
              'flex items-center justify-center h-[36px] w-[36px] rounded-[6px]',
              {
                '!bg-[#DB9D00]': item.logo === 'seed',
                '!bg-[#310072]': item.logo === 'key',
                '!bg-[#30C9C9]': item.logo === 'settings',
              },
            )}>
            <CyDIcons name={item.logo} size={24} className='text-white' />
          </CyDView>
          <CyDText className={'font-semibold text-[16px] text-base400'}>
            {item.title}
          </CyDText>
        </CyDView>
        <CyDIcons name='chevron-right' size={20} className='text-base400' />
      </CyDTouchView>
    </CyDView>
  );
};

const renderMfaData = (item: IMfaData, asyncEnableMFA: () => Promise<void>) => {
  return (
    <CyDView className={'mb-[8px]'}>
      <CyDTouchView
        className={
          'flex flex-row justify-between items-center bg-n0 rounded-[12px] px-[16px] py-[16px]'
        }
        onPress={() => {
          void asyncEnableMFA();
        }}>
        <CyDView className={'flex flex-row items-center gap-x-[12px]'}>
          <CyDView
            className={
              'flex items-center justify-center h-[36px] w-[36px] rounded-[6px] bg-[#FA812F]'
            }>
            <CyDIcons name={item.logo} size={36} className='text-white' />
          </CyDView>
          <CyDText className={'font-semibold text-[16px] '}>
            {item.title}
          </CyDText>
        </CyDView>
        <CyDIcons name='chevron-right' size={20} className='text-base400' />
      </CyDTouchView>
    </CyDView>
  );
};

export default function ManageWallet() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { connectionType: storedConnectionType, deleteWallet } =
    useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] = useState<
    ConnectionTypes | undefined
  >(storedConnectionType ?? undefined);
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();
  const { showModal, hideModal } = useGlobalModalContext();

  const [isMfaEnabled, setIsMfaEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (storedConnectionType) {
      setConnectionTypeValue(storedConnectionType);
    }
  }, [storedConnectionType]);

  useEffect(() => {
    void checkMfaEnabled();
  }, []);

  const manageWalletData: IManageWalletData[] = getManageWalletData(
    connectionTypeValue,
    deleteWallet,
    navigation,
  );

  const checkMfaEnabled = async () => {
    const provider =
      connectionTypeValue === ConnectionTypes.SOCIAL_LOGIN_EVM
        ? web3AuthEvm
        : web3AuthSolana;
    const connected = provider.connected;

    if (!connected) {
      await provider.init();
    }
    const userInfo = provider.userInfo();
    setIsMfaEnabled(userInfo?.isMfaEnabled ?? false);
  };

  const isSecurityOptionDisabled =
    connectionTypeValue === ConnectionTypes.WALLET_CONNECT;

  /**
   * Builds the security privacy data array based on connection type and wallet state
   * Memoized to prevent unnecessary recalculations
   */
  const securityPrivacyData = useMemo((): ISecurityPrivacyData[] => {
    const baseData: ISecurityPrivacyData[] = [];

    // Add seed phrase option only for seed phrase connection type
    if (connectionTypeValue === ConnectionTypes.SEED_PHRASE) {
      baseData.push({
        index: 0,
        title: t('REVEAL_SEED_PHRASE'),
        logo: 'seed' as IconNames,
      });
    }

    // Always add private key option
    baseData.push({
      index: baseData.length,
      title: t('REVEAL_PRIVATE_KEY'),
      logo: 'key' as IconNames,
    });

    // Add change pin option if pin is set
    if (hdWalletContext.state.pinValue) {
      baseData.push({
        index: baseData.length,
        title: t('CHANGE_PIN'),
        logo: 'settings' as IconNames,
      });
    }

    return baseData;
  }, [connectionTypeValue, hdWalletContext.state.pinValue]);

  const mfaData = useMemo((): IMfaData[] => {
    return [
      {
        index: 0,
        title: t('ENABLE_MFA'),
        logo: 'shield' as IconNames,
      },
    ];
  }, []);

  /**
   * Handles hardware back button press
   * Memoized to prevent unnecessary re-renders
   */
  const handleBackButton = useCallback((): boolean => {
    navigation.goBack();
    return true;
  }, [navigation]);

  /**
   * Renders security privacy data item
   * Memoized to prevent unnecessary re-renders
   */
  const renderSecurityPrivacyItem = useCallback(
    ({ item }: { item: ISecurityPrivacyData }) =>
      renderSecurityPrivacyData(
        item,
        isSecurityOptionDisabled,
        navigation,
        hdWalletContext,
      ),
    [isSecurityOptionDisabled, navigation, hdWalletContext],
  );

  /**
   * Renders manage wallet data item
   * Memoized to prevent unnecessary re-renders
   */
  const renderManageWalletItem = useCallback(
    ({ item }: { item: IManageWalletData }) =>
      renderSettingsData(item, hdWalletContext),
    [hdWalletContext],
  );

  const renderMfaItem = useCallback(
    ({ item }: { item: IMfaData }) => renderMfaData(item, asyncEnableMFA),
    [],
  );

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const asyncEnableMFA = async () => {
    const provider =
      connectionTypeValue === ConnectionTypes.SOCIAL_LOGIN_EVM
        ? web3AuthEvm
        : web3AuthSolana;
    const connected = provider.connected;

    void web3AuthEvm;
    if (!connected) {
      await provider.init();
    }
    const userInfo = provider.userInfo();

    if (userInfo?.isMfaEnabled) {
      showModal('state', {
        type: 'success',
        title: 'MFA already enabled',
        description: 'MFA is already enabled',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }

    provider
      .enableMFA()
      .then((result: boolean) => {
        setIsMfaEnabled(true);
        showModal('state', {
          type: 'success',
          title: 'MFA enabled',
          description: 'MFA enabled successfully',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      })
      .catch(error => {
        showModal('state', {
          type: 'error',
          title: 'Error enabling MFA',
          description: parseErrorMessage(error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      });
  };

  return (
    <CyDSafeAreaView className={'bg-n0 h-full'}>
      <PageHeader title={'MANAGE_WALLET'} navigation={navigation} />
      <CyDView className={'bg-n20 h-full pt-[24px]'}>
        {/* Reveal Keys Section */}
        {securityPrivacyData.length > 0 && (
          <CyDView className={'px-[16px] mb-[16px]'}>
            <CyDText className={'text-n200 text-[12px] font-medium mb-[8px]'}>
              {t('REVEAL_KEYS')}
            </CyDText>
            <FlatList<ISecurityPrivacyData>
              data={securityPrivacyData}
              renderItem={renderSecurityPrivacyItem}
              keyExtractor={item => item.index.toString()}
              scrollEnabled={false}
            />
          </CyDView>
        )}

        {/* Wallet Options Section */}
        {manageWalletData.length > 0 && (
          <CyDView className={'px-[16px] mb-[16px]'}>
            <CyDText className={'text-n200 text-[12px] font-medium mb-[8px]'}>
              {t('WALLET_OPTIONS')}
            </CyDText>
            <FlatList<IManageWalletData>
              data={manageWalletData}
              renderItem={renderManageWalletItem}
              keyExtractor={item => item.index.toString()}
              scrollEnabled={false}
            />
          </CyDView>
        )}

        {manageWalletData.length > 0 &&
          !isMfaEnabled &&
          (connectionTypeValue === ConnectionTypes.SOCIAL_LOGIN_EVM ||
            connectionTypeValue === ConnectionTypes.SOCIAL_LOGIN_SOLANA) && (
            <CyDView className={'px-[16px]'}>
              <CyDText className={'text-n200 text-[12px] font-medium mb-[8px]'}>
                {t('MFA_SETTINGS')}
              </CyDText>
              <FlatList<IMfaData>
                data={mfaData}
                renderItem={renderMfaItem}
                keyExtractor={item => item.index.toString()}
                scrollEnabled={false}
              />
            </CyDView>
          )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
