import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
} from '../../styles/tailwindStyles';
import { BackHandler, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import QRCode from 'react-native-qrcode-svg';
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
      <CyDText className={'text-[17px] text-center text-[#434343]  ml-[5px]'}>
        {text}
      </CyDText>
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

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    !isFetchingSeedPhrase && (
      <CyDScrollView className={'bg-white h-full w-full relative '}>
        <CyDView className={'flex justify-center items-center'}>
          <CyDView
            className={
              'bg-[#F8F8F8] rounded-[18px] mt-[20px] mx-[20px] px-[20px] py-[15px]'
            }>
            <CyDText className={'text-[15px] text-center text-[#434343] '}>
              {t('SEED_PHRASE_SUBTITLE')}
            </CyDText>
          </CyDView>
          <CyDView className={'flex justify-center items-center my-[20px]'}>
            <QRCode
              value={seedPhrase}
              logo={AppImages.QR_LOGO}
              logoSize={40}
              size={200}
              logoBorderRadius={5}
              logoBackgroundColor='transparent'
              logoMargin={3}
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
                <CyDImage
                  source={AppImages.EYE_OPEN}
                  className={'w-[27px] h-[18px] ml-[7px]'}
                />
              </CyDView>
            ) : (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[#434343] text-[15px] font-semibold'}>
                  {'\u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24'}
                </CyDText>
                <CyDImage
                  source={AppImages.EYE_CLOSE}
                  className={'w-[27px] h-[22px] ml-[7px] mt-[5px]'}
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
            <CyDImage
              source={AppImages.COPY}
              className={'absolute left-[20] w-[16px] h-[18px]'}
            />
            <CyDText className={'text-[#434343] text-[16px] font-extrabold'}>
              {t('COPY_TO_CLIPBOARD')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>
    )
  );
}
