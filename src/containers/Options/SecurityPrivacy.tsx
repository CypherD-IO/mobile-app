import * as C from '../../constants';
import React, { useContext, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HdWalletContext, _NO_CYPHERD_CREDENTIAL_AVAILABLE_ } from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import { loadRecoveryPhraseFromKeyChain, isAuthenticatedForPrivateKey, isPinAuthenticated, decryptMnemonic } from '../../core/Keychain';
import { showToast } from '../../containers/utilities/toastUtility';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { CyDView, CyDTouchView, CyDText, CyDImage, CyDImageBackground, CyDFlatList } from '../../styles/tailwindStyles';
import { isAndroid } from '../../misc/checkers';

interface ISecurityPrivacyData {
  index: number
  title: string
  logo: any
}

export default function SecurityPrivacy (props) {
  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);
  let securityPrivacyData: ISecurityPrivacyData[] = [
    {
      index: 0,
      title: t('REVEAL_PRIVATE_KEY'),
      logo: AppImages.PRIVATE_KEY
    },
    {
      index: 1,
      title: t('REVEAL_SEED_PHARSE'),
      logo: AppImages.EYE_OPEN
    }
  ];
  if (hdWalletContext.state.pinValue) {
    securityPrivacyData = [...securityPrivacyData, {
      index: 2,
      title: 'Change Pin',
      logo: AppImages.CHANGE_PIN
    }];
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

  const loadSeedPhraseInMemory = () => {
    loadRecoveryPhraseFromKeyChain(false, hdWalletContext.state.pinValue).then((recoveryPhrase) => {
      if (recoveryPhrase && recoveryPhrase !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
        props.navigation.navigate(C.screenTitle.SEED_PHRASE, {
          seedPhrase: recoveryPhrase
        });
      } else {
        showToast(t('SEED_PHARSE_FETCH_FAILED'));
      }
    }).catch(_err => {
      showToast(t('SEED_PHARSE_FETCH_FAILED'));
    });
  };

  const renderSecurityPrivacyData = (item: ISecurityPrivacyData) => {
    return (
      <CyDView className={'mx-[24px]'} >
        <CyDTouchView className={'flex flex-row justify-between pl-[15px] py-[24px]'}
          onPress={() => {
            if (item.index === 0) {
              isAuthenticatedForPrivateKey().then((isAuthenticated: boolean) => {
                if (isAuthenticated) { props.navigation.navigate(C.screenTitle.PRIVATE_KEY); } else {
                  showToast(t('PVT_KEY_FETCH_FAILED'));
                }
              });
              sendFirebaseEvent(hdWalletContext, 'reveal_private_key');
            } else if (item.index === 1) {
              loadSeedPhraseInMemory();
              sendFirebaseEvent(hdWalletContext, 'reveal_seed_phrase');
            } else if (item.index === 2) {
              props.navigation.navigate(C.screenTitle.CHANGE_PIN);
            }
          }}
        >
          <CyDView className={'flex flex-row items-center'}>
            <CyDView className={'flex items-center justify-center bg-[#FFDE59] h-[27px] w-[27px] rounded-[7px] mr-[14px]'}>
              <CyDImage source={item.logo} className={'w-[17px] h-[17px]'} resizeMode={'contain'} />
            </CyDView>
            <CyDText className={'font-semibold text-[16px] text-[#434343]'}>{item.title}</CyDText>
          </CyDView>
          <CyDImage source={AppImages.OPTIONS_ARROW} className={'w-[11%] h-[15px]'} resizeMode={'contain'}/>
        </CyDTouchView>
        <CyDView className={'h-[01px] bg-portfolioBorderColor'}/>
      </CyDView>
    );
  };

  return (
    <CyDView className={'bg-white h-full'}>
      <CyDImageBackground className={'h-[50%] pt-[30px]'} source={AppImages.BG_SETTINGS} resizeMode={'cover'}>
        <CyDFlatList
          data={securityPrivacyData}
          renderItem={({ item }) => renderSecurityPrivacyData(item)}
          keyExtractor={(item) => item.index}
        />
      </CyDImageBackground>
    </CyDView>
  );
}
