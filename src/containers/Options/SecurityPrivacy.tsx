import * as C from '../../constants';
import React, { useContext, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import { isAuthenticatedForPrivateKey } from '../../core/Keychain';
import { showToast } from '../../containers/utilities/toastUtility';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import {
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDImageBackground,
  CyDFlatList,
} from '../../styles/tailwindStyles';
import useConnectionManager from '../../hooks/useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';

interface ISecurityPrivacyData {
  index: number;
  title: string;
  logo: any;
}

export default function SecurityPrivacy(props) {
  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { connectionType } = useConnectionManager();
  const isSecurityOptionDisabled =
    isReadOnlyWallet || connectionType === ConnectionTypes.WALLET_CONNECT;
  let securityPrivacyData: ISecurityPrivacyData[] = [
    {
      index: 0,
      title: t('REVEAL_PRIVATE_KEY'),
      logo: AppImages.PRIVATE_KEY,
    },
    {
      index: 1,
      title: t('REVEAL_SEED_PHARSE'),
      logo: AppImages.EYE_OPEN,
    },
  ];
  if (hdWalletContext.state.pinValue) {
    securityPrivacyData = [
      ...securityPrivacyData,
      {
        index: 2,
        title: 'Change Pin',
        logo: AppImages.CHANGE_PIN,
      },
    ];
  }

  const handleBackButton = () => {
    props.navigation.goBack();
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
              isAuthenticatedForPrivateKey().then(
                (isAuthenticated: boolean) => {
                  if (isAuthenticated) {
                    props.navigation.navigate(C.screenTitle.PRIVATE_KEY);
                  } else {
                    showToast(t('PVT_KEY_FETCH_FAILED'));
                  }
                },
              );
              sendFirebaseEvent(hdWalletContext, 'reveal_private_key');
            } else if (item.index === 1) {
              props.navigation.navigate(C.screenTitle.SEED_PHRASE);
              sendFirebaseEvent(hdWalletContext, 'reveal_seed_phrase');
            } else if (item.index === 2) {
              props.navigation.navigate(C.screenTitle.CHANGE_PIN);
            }
          }}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDView
              className={
                'flex items-center justify-center h-[27px] w-[27px] rounded-[7px] mr-[14px]'
              }>
              <CyDImage
                source={
                  isSecurityOptionDisabled ? AppImages.CYPHER_LOCK : item.logo
                }
                className={'w-[17px] h-[17px]'}
                resizeMode={'contain'}
              />
            </CyDView>
            <CyDText className={'font-semibold text-[16px] text-[#434343]'}>
              {item.title}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <CyDView className={'h-[01px] bg-portfolioBorderColor'} />
      </CyDView>
    );
  };

  return (
    <CyDView className={'bg-white h-full'}>
      <CyDImageBackground
        className={'h-[50%] pt-[30px]'}
        source={AppImages.BG_SETTINGS}
        resizeMode={'cover'}>
        <CyDFlatList
          data={securityPrivacyData}
          renderItem={({ item }) => renderSecurityPrivacyData(item)}
          keyExtractor={item => item.index}
        />
      </CyDImageBackground>
    </CyDView>
  );
}
