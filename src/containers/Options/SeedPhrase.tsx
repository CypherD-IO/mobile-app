import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { BackHandler, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { AppImagesMap } from '../../../assets/images/appImages';
import { QRCode } from 'react-native-custom-qr-codes';
import { showToast } from '../../containers/utilities/toastUtility';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { isAndroid } from '../../misc/checkers';
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { loadRecoveryPhraseFromKeyChain } from '../../core/Keychain';
import Loading from '../../components/v2/loading';

const renderSeedPhrase = (text: string, index: number) => {
  return (
    <CyDView
      key={index}
      className={
        'flex flex-row items-center h-[50px] w-[31%] border-[1px] border-[#CCCCCC] rounded-[3px] px-[10px] mt-[10px]'
      }>
      <CyDText className={'text-[17px] text-center text-[#929292] '}>
        {++index}
      </CyDText>
      <CyDText className={'text-[17px] text-center ml-[5px]'}>{text}</CyDText>
    </CyDView>
  );
};

export default function SeedPhrase() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const hdWalletContext = useContext<any>(HdWalletContext);
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);
  const [isFetchingSeedPhrase, setFetchingSeedPhrase] = useState<boolean>(true);

  const onPressSeedPharse = () => {
    copyToClipboard(seedPhrase);
    showToast(t('SEED_PHARSE_COPY'));
    sendFirebaseEvent(hdWalletContext, 'copy_seed_phrase');
  };

  const toggleSeedPharse = () => {
    setShowSeedPhrase(!showSeedPhrase);
  };

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    if (seedPhrase !== '') setFetchingSeedPhrase(false);
  }, [seedPhrase]);

  const loadSeedPhraseInMemory = () => {
    loadRecoveryPhraseFromKeyChain(false, hdWalletContext.state.pinValue)
      .then(mnenmonic => {
        if (mnenmonic && mnenmonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          setSeedPhrase(mnenmonic);
        } else {
          showToast(t('SEED_PHARSE_FETCH_FAILED'));
          navigation.goBack();
        }
      })
      .catch(_err => {
        showToast(t('SEED_PHARSE_FETCH_FAILED'));
        navigation.goBack();
      });
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    if (isFocused) {
      loadSeedPhraseInMemory();
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isFocused]);

  if (isFetchingSeedPhrase) return <Loading />;
  return (
    !isFetchingSeedPhrase && (
      <CyDScrollView className={'bg-n20 h-full w-full relative '}>
        <CyDView className={'flex justify-center items-center'}>
          <CyDView
            className={
              'bg-n0 rounded-[18px] mt-[20px] mx-[20px] px-[20px] py-[15px]'
            }>
            <CyDText className={'text-[15px] text-center'}>
              {t('SEED_PHRASE_SUBTITLE')}
            </CyDText>
          </CyDView>
          <CyDView className={'flex justify-center items-center my-[20px]'}>
            <QRCode
              content={seedPhrase}
              codeStyle='dot'
              logo={AppImagesMap.common.QR_LOGO}
              logoSize={60}
            />
          </CyDView>
          <CyDTouchView
            className={'mt-[20px] mb-[30px]'}
            onPress={() => toggleSeedPharse()}>
            {showSeedPhrase ? (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[#1F1F1F] text-[22px] font-semibold'}>
                  {t('HIDE_SEED_PHRASE')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name={'eye-outline'}
                  size={27}
                  className='text-base400 ml-[7px]'
                />
              </CyDView>
            ) : (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[15px] font-semibold'}>
                  {'\u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24'}
                </CyDText>
                <CyDMaterialDesignIcons
                  name={'eye-off-outline'}
                  size={27}
                  className='text-base400 ml-[7px] mt-[5px]'
                />
              </CyDView>
            )}
            {!showSeedPhrase && (
              <CyDText
                className={
                  'text-[#1F1F1F] text-[16px] font-semibold mt-[20px]'
                }>
                {t('TAP_REVEAL_SEED_PHRASE')}
              </CyDText>
            )}
          </CyDTouchView>
          {showSeedPhrase && (
            <CyDView
              className={
                'flex flex-row flex-wrap justify-evenly content-center w-11/12'
              }>
              {seedPhrase && seedPhrase.split(/\s+/).map(renderSeedPhrase)}
              <CyDText
                className={
                  'text-[#1F1F1F] text-[16px] font-semibold mt-[40px]'
                }>
                {t('SEED_PHRASE_MESSAGE')}
              </CyDText>
            </CyDView>
          )}
          <CyDTouchView
            className={
              'flex flex-row items-center justify-center mt-[40px] h-[60px] w-3/4 border-[1px] border-[#8E8E8E] rounded-[12px] mb-[50px]'
            }
            onPress={() => onPressSeedPharse()}>
            <CyDMaterialDesignIcons
              name={'content-copy'}
              size={20}
              className='text-base400 absolute left-[20]'
            />
            <CyDText className={'text-[16px] font-extrabold'}>
              {t('COPY_TO_CLIPBOARD')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>
    )
  );
}
