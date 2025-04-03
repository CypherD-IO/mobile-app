import React, { useContext, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HdWalletContext } from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import {
  CyDView,
  CyDTouchView,
  CyDText,
  CyDFlatList,
  CyDImageBackground,
  CyDIcons,
} from '../../styles/tailwindComponents';

import { HDWallet } from '../../reducers/hdwallet_reducer';
import useConnectionManager from '../../hooks/useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';
import { IconNames } from '../../customFonts';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';

interface IManageWalletData {
  index: number;
  title: string;
  logo: IconNames;
  navigateTo: string;
  navigationProps: { [key: string]: boolean };
  firebaseEvent: string;
  callback?: () => void;
}

const renderSettingsData = (
  item: IManageWalletData,
  hdWalletContext: { state: HDWallet },
) => {
  return (
    <CyDView className={'mx-[24px]'}>
      <CyDTouchView
        className={'flex flex-row justify-between pl-[15px] py-[24px]'}
        onPress={() => {
          item.callback?.();
          sendFirebaseEvent(hdWalletContext, item.firebaseEvent);
        }}>
        <CyDView className={'flex flex-row items-center'}>
          <CyDView
            className={
              'flex items-center justify-center h-[27px] w-[27px] rounded-[7px] mr-[14px]'
            }>
            <CyDIcons name={item.logo} size={24} className='text-base400' />
          </CyDView>
          <CyDText className={'font-semibold text-[16px]'}>
            {item.title}
          </CyDText>
        </CyDView>
      </CyDTouchView>
      <CyDView className={'h-[01px] bg-n40'} />
    </CyDView>
  );
};

const getManageWalletData = (
  connectionType: ConnectionTypes | undefined,
  deleteWallet: any,
  navigation: any,
) => {
  if (!connectionType) {
    return [];
  }
  switch (connectionType) {
    case ConnectionTypes.WALLET_CONNECT:
      return [
        {
          index: 0,
          title: t('CONNECT_ANOTHER_WALLET'),
          logo: 'wallet' as const,
          callback: () => {
            void deleteWallet({ navigation });
          },
          firebaseEvent: 'import_another_wallet',
        },
        {
          index: 1,
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
          title: t('IMPORT_WALLET_MSG'),
          logo: 'wallet' as const,
          callback: () => {
            void deleteWallet({ navigation, importNewWallet: true });
          },
          firebaseEvent: 'import_another_wallet',
        },
        {
          index: 1,
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
export default function ManageWallet() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { connectionType: storedConnectionType, deleteWallet } =
    useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] = useState<
    ConnectionTypes | undefined
  >(storedConnectionType ?? undefined);

  useEffect(() => {
    if (storedConnectionType) {
      setConnectionTypeValue(storedConnectionType);
    }
  }, [storedConnectionType]);

  const manageWalletData: IManageWalletData[] = getManageWalletData(
    connectionTypeValue,
    deleteWallet,
    navigation,
  );

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  return (
    <CyDView className={'bg-n20 h-full '}>
      <CyDFlatList
        data={manageWalletData}
        renderItem={({ item }) => renderSettingsData(item, hdWalletContext)}
        keyExtractor={item => item.index}
      />
    </CyDView>
  );
}
