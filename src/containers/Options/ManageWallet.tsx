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
} from '../../styles/tailwindStyles';

import { HDWallet } from '../../reducers/hdwallet_reducer';
import useConnectionManager from '../../hooks/useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';
import { IconNames } from '../../customFonts';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

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
  navigation: any,
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
          <CyDText className={'font-semibold text-[16px] text-[#434343]'}>
            {item.title}
          </CyDText>
        </CyDView>
      </CyDTouchView>
      <CyDView className={'h-[01px] bg-n40'} />
    </CyDView>
  );
};

export default function ManageWallet() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { connectionType, deleteWallet } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);

  useEffect(() => {
    setConnectionTypeValue(connectionType);
  }, [connectionType]);

  const manageWalletData: IManageWalletData[] =
    connectionTypeValue === ConnectionTypes.WALLET_CONNECT
      ? [
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
        ]
      : [
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
      <CyDImageBackground
        className={'h-[50%] pt-[30px]'}
        source={AppImages.BG_SETTINGS}
        resizeMode={'cover'}>
        <CyDFlatList
          data={manageWalletData}
          renderItem={({ item }) =>
            renderSettingsData(item, navigation, hdWalletContext)
          }
          keyExtractor={item => item.index}
        />
      </CyDImageBackground>
    </CyDView>
  );
}
