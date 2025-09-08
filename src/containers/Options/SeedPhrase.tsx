import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDScrollView,
  CyDSafeAreaView,
  CyDIcons,
} from '../../styles/tailwindComponents';
import { Alert, BackHandler, NativeModules } from 'react-native';
import { BlurView } from '@react-native-community/blur';
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
import PageHeader from '../../components/PageHeader';
import { Theme, useTheme } from '../../reducers/themeReducer';

const renderSeedPhrase = (text: string, index: number, isBlurred: boolean) => {
  return (
    <CyDView key={index} className='w-1/3 py-[12px] px-[16px]'>
      <CyDText className='text-[14px] font-medium text-left text-base400'>
        {index + 1}. {isBlurred ? '*****' : text}
      </CyDText>
    </CyDView>
  );
};

const blurOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 12,
};

export default function SeedPhrase() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { theme } = useTheme();

  const hdWalletContext = useContext<any>(HdWalletContext);
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [isFetchingSeedPhrase, setFetchingSeedPhrase] = useState<boolean>(true);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [isBlurred, setIsBlurred] = useState<boolean>(true);

  const onPressSeedPharse = () => {
    copyToClipboard(seedPhrase);
    showToast(t('SEED_PHARSE_COPY'));
    sendFirebaseEvent(hdWalletContext, 'copy_seed_phrase');
  };

  const toggleQR = () => {
    if (!showQR) {
      Alert.alert(t('SEED_QR_REVEAL_TITLE'), t('SEED_QR_REVEAL_DESC'), [
        { text: t('CANCEL') ?? 'Cancel', style: 'cancel' },
        {
          text: t('PROCEED') ?? 'Proceed',
          style: 'destructive',
          onPress: () => setShowQR(true),
        },
      ]);
      return;
    }
    setShowQR(false);
  };

  const toggleBlur = () => {
    if (isBlurred) {
      Alert.alert(t('SEED_REVEAL_TITLE'), t('NO_ONE_IS_WATCHING_YOU'), [
        { text: t('CANCEL') ?? 'Cancel', style: 'cancel' },
        {
          text: t('PROCEED') ?? 'Proceed',
          style: 'destructive',
          onPress: () => setIsBlurred(false),
        },
      ]);
      return;
    }
    setIsBlurred(true);
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

  const seedWords = seedPhrase ? seedPhrase.trim().split(/\s+/) : [];

  return (
    <CyDSafeAreaView className='bg-n0 flex-1'>
      {/* Header */}
      <PageHeader title={'REVEAL_SEED_PHRASE'} navigation={navigation} />

      <CyDScrollView
        className='flex-1 bg-n0'
        showsVerticalScrollIndicator={false}>
        <CyDView className='flex-1 px-6 py-6'>
          <CyDView className='items-center mb-8'>
            <CyDView className='w-[54px] h-[54px] bg-[#DB9D00] rounded-[6px] items-center justify-center mb-6'>
              <CyDIcons name='seed' size={36} className='text-white' />
            </CyDView>
            <CyDText className='text-[16px] text-center font-medium text-base400 leading-[140%] tracking-[-0.8px] px-4'>
              These words unlock your wallet,{'\n'}Keep them safe.
            </CyDText>
          </CyDView>

          {/* Words Container or QR Code */}
          {!showQR ? (
            <CyDView className='bg-n20 rounded-[8px] p-6 mb-6 relative'>
              <CyDTouchView onPress={toggleBlur} className='relative'>
                {/* Words Grid */}
                <CyDView className='flex-row flex-wrap'>
                  {seedWords.map((word, index) =>
                    renderSeedPhrase(word, index, isBlurred),
                  )}
                </CyDView>

                {/* Blur Overlay */}
                {isBlurred && (
                  <CyDView className='absolute top-0 left-0 right-0 bottom-0 bg-n20 rounded-xl items-center justify-center'>
                    <BlurView
                      style={blurOverlayStyle}
                      blurType={theme === Theme.DARK ? 'light' : 'dark'}
                      blurAmount={4}
                    />
                    <CyDView className='items-center justify-center z-10'>
                      <CyDView className='w-16 h-16 mb-4'>
                        <CyDIcons
                          name='shield'
                          size={64}
                          className={'text-n0'}
                        />
                      </CyDView>
                      <CyDText className='text-base font-semibold text-n0 text-center'>
                        Click to show Seed Phrase
                      </CyDText>
                    </CyDView>
                  </CyDView>
                )}
              </CyDTouchView>
            </CyDView>
          ) : (
            <CyDView className='bg-n20 rounded-xl p-6 mb-6 items-center'>
              <CyDView className='bg-n0 p-6 rounded-xl shadow-lg'>
                <QRCode
                  content={seedPhrase}
                  codeStyle='dot'
                  logo={AppImagesMap.common.QR_LOGO}
                  logoSize={60}
                />
              </CyDView>
            </CyDView>
          )}

          {/* Recommendation Message */}
          <CyDView className='bg-n20 rounded-xl p-5 mb-8 flex-row items-start'>
            <CyDIcons
              name='information'
              size={20}
              className='text-base400 mr-3'
            />
            <CyDText className='flex-1 text-[12px] font-medium text-n200 text-base400 leading-[150%]'>
              We recommend writing down this seed on paper and storing it
              securely in a place only you can access.
            </CyDText>
          </CyDView>

          {/* Action Buttons */}
          <CyDView className='flex-row justify-between mb-8 gap-x-[8px]'>
            <CyDTouchView
              onPress={toggleQR}
              className='flex-1 bg-n20 rounded-full p-[8px] flex-row items-center justify-center w-[156px]'>
              <CyDIcons
                name='qr-code'
                size={20}
                className='text-base400 mr-3'
              />
              <CyDText className='text-base font-semibold text-base400'>
                {showQR ? 'Show Words' : 'Show QR'}
              </CyDText>
            </CyDTouchView>

            <CyDTouchView
              onPress={onPressSeedPharse}
              className='flex-1 bg-n20 rounded-full p-[8px] flex-row items-center justify-center w-[156px]'>
              <CyDIcons name='copy' size={20} className='text-base400 mr-3' />
              <CyDText className='text-base font-semibold text-base400'>
                Copy Seed
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
