/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CyDText, CyDTouchView, CyDView, CyDImage, CyDTouchableWithoutFeedback } from '../../styles/tailwindStyles';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ActivityContext, HdWalletContext, PortfolioContext } from '../../core/util';
import { importWallet } from '../../core/HdWallet';
import { DynamicTouchView } from '../../styles/viewStyle';
import { PORTFOLIO_LOADING, PORTFOLIO_NEW_LOAD } from '../../reducers/portfolio_reducer';
import { DynamicImage } from '../../styles/imageStyle';
import AppImages from '../../../assets/images/appImages';
import Clipboard from '@react-native-clipboard/clipboard';
import { QRScannerScreens } from '../../constants/server';
import LottieView from 'lottie-react-native';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import { screenTitle } from '../../constants/index';
import Loading from '../../components/v2/loading';
import { isValidMnemonic } from 'ethers/lib/utils';
const {
  CText,
  SafeAreaView,
  Input
} = require('../../styles');

export default function Login (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const [seedPhraseTextValue, onChangeseedPhraseTextValue] = useState<string>('');
  const [badKeyError, setBadKeyError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [createWalletLoading, setCreateWalletLoading] = useState<boolean>(false);

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const activityContext = useContext<any>(ActivityContext);

  const fetchCopiedText = async () => {
    const text = await Clipboard.getString();
    onChangeseedPhraseTextValue(text);
  };

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const onSuccess = async (e) => {
    const textValue = e.data;
    onChangeseedPhraseTextValue(textValue);
  };

  const submitImportWallet = (textValue = seedPhraseTextValue) => {
    const keyValue = textValue.split(/\s+/);
    if (keyValue.length >= 12 && isValidMnemonic(textValue)) {
      setLoading(true);
      setTimeout(() => {
        importWallet(hdWalletContext, portfolioState, textValue);
        portfolioState.dispatchPortfolio({
          value: { portfolioState: PORTFOLIO_LOADING }
        });
        hdWalletContext.dispatch({ type: 'RESET_WALLET' });
        activityContext.dispatch({ type: ActivityReducerAction.RESET });
        setLoading(false);
        onChangeseedPhraseTextValue('');
        const getCurrentRoute = props.navigation.getState().routes[0].name;
        if (getCurrentRoute === screenTitle.OPTIONS_SCREEN) props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
        else setCreateWalletLoading(true);
      }, 50);
    } else {
      setBadKeyError(true);
    }
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useLayoutEffect(() => {
    props.navigation.setOptions({
      headerRight: () => (
        <DynamicTouchView dynamic fD={'row'} jC='flex-end' mH={10}
          onPress={() => {
            props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
              fromPage: QRScannerScreens.IMPORT,
              onSuccess
            });
          }}
        >
          <DynamicImage dynamic height={20} width={20} resizemode="contain" source={AppImages.QR_CODE} />
        </DynamicTouchView>
      )
    });
  }, []);

  return (
    <SafeAreaView dynamic>
      {createWalletLoading && <Loading/>}
      <CyDTouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          <CyDText className={'text-[#434343] text-[16px] mt-[30] text-center px-[20]'}>{t('IMPORT_WALLET_SUB_MSG')}</CyDText>
          <CyDView className={'flex items-center justify-center w-full'}>
              <Input dynamicBorderColor borderColor={badKeyError ? Colors.pink : Colors.inputBorderColor} mT={40}
                style={{
                  width: '90%', height: 200, textAlignVertical: 'top', paddingTop: 20, paddingLeft: 30, paddingRight: 30, color: '#1F1F1F', fontSize: 18, lineHeight: 24
                }}
                placeholder={t('ENTER_KEY_PLACEHOLDER')} value={seedPhraseTextValue}
                onChangeText={(text) => {
                  onChangeseedPhraseTextValue(text.toLowerCase());
                  setBadKeyError(false);
                }}
                multiline={true}
                secureTextEntry={true}
              />
            {badKeyError && <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={18} mT={5} color={Colors.pink}>{t('BAD_KEY_PHARSE')}</CText>}
          </CyDView>
          <CyDView className={'flex flex-row justify-end w-full mt-[20px] pr-[20px]'}>
            <CyDTouchView className={'flex flex-row justify-end'} onPress={async () => await fetchCopiedText()}>
              <CyDImage source={AppImages.COPY} className={'w-[16px] h-[18px] mr-[10px]'} />
              <CyDText className={'text-[#434343] text-[14px] font-extrabold'}>{t('PASTE_CLIPBOARD')}</CyDText>
            </CyDTouchView>
          </CyDView>
          <CyDTouchView sentry-label='import-wallet-button'
            className={
              'bg-[#FFDE59] flex flex-row items-center justify-center mt-[40px] h-[60px] w-11/12 rounded-[12px] mb-[50] mx-auto'
            }
            onPress={() => submitImportWallet()}
          >
            {(loading) && <CyDView className={'flex items-center justify-between'}>
              <LottieView
                source={AppImages.LOADING_SPINNER}
                autoPlay
                loop
                style={{ height: 40 }}
              />
            </CyDView>}
            {(!loading) && <CyDText className={'text-[#434343] text-[16px] font-extrabold'}>{t('SUBMIT')}</CyDText>}
        </CyDTouchView>
        </KeyboardAvoidingView>
      </CyDTouchableWithoutFeedback>
    </SafeAreaView>
  );
}
