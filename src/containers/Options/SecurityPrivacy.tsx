import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import * as C from '../../constants';
import { ConnectionTypes } from '../../constants/enum';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { HdWalletContext } from '../../core/util';
import useConnectionManager from '../../hooks/useConnectionManager';
import {
  CyDFlatList,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import PageHeader from '../../components/PageHeader';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

interface ISecurityPrivacyData {
  index: number;
  title: string;
  logo: any;
}

export default function SecurityPrivacy() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { connectionType } = useConnectionManager();
  const { isReadOnlyWallet } = hdWalletContext.state;

  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);

  useEffect(() => {
    setConnectionTypeValue(connectionType);
  }, [connectionType]);

  const isSecurityOptionDisabled =
    isReadOnlyWallet || connectionTypeValue === ConnectionTypes.WALLET_CONNECT;
  let securityPrivacyData: ISecurityPrivacyData[] = [
    {
      index: 0,
      title: t('REVEAL_PRIVATE_KEY'),
      logo: 'key-variant',
    },
  ];
  if (connectionTypeValue === ConnectionTypes.SEED_PHRASE) {
    securityPrivacyData = [
      ...securityPrivacyData,
      {
        index: 1,
        title: t('REVEAL_SEED_PHRASE'),
        logo: 'eye',
      },
    ];
  }
  if (hdWalletContext.state.pinValue) {
    securityPrivacyData = [
      ...securityPrivacyData,
      {
        index: 2,
        title: 'Change Pin',
        logo: 'key-change',
      },
    ];
  }

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

  const renderSecurityPrivacyData = (item: ISecurityPrivacyData) => {
    return (
      <CyDView className={'mx-[24px]'}>
        <CyDTouchView
          disabled={isSecurityOptionDisabled}
          className={'flex flex-row justify-between pl-[15px] py-[24px]'}
          onPress={() => {
            if (item.index === 0) {
              navigation.navigate(C.screenTitle.PRIVATE_KEY);
              sendFirebaseEvent(hdWalletContext, 'reveal_private_key');
            } else if (item.index === 1) {
              navigation.navigate(C.screenTitle.SEED_PHRASE);
              sendFirebaseEvent(hdWalletContext, 'reveal_seed_phrase');
            } else if (item.index === 2) {
              navigation.navigate(C.screenTitle.CHANGE_PIN);
            }
          }}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDView
              className={
                'flex items-center justify-center h-[27px] w-[27px] rounded-[7px] mr-[14px]'
              }>
              <CyDMaterialDesignIcons
                name={isSecurityOptionDisabled ? 'shield-lock' : item.logo}
                size={24}
                className='text-base400'
              />
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

  return (
    <CyDSafeAreaView className={'bg-n0 h-full'}>
      <PageHeader title={'SECURITY_PRIVACY'} navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
        <CyDFlatList
          data={securityPrivacyData}
          renderItem={({ item }) => renderSecurityPrivacyData(item)}
          keyExtractor={item => item.index}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
