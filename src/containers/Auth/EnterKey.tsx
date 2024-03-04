/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDText,
  CyDTouchView,
  CyDView,
  CyDImage,
  CyDTouchableWithoutFeedback,
  CyDSafeAreaView,
  CyDTextInput,
  CyDScrollView,
} from '../../styles/tailwindStyles';
import { BackHandler, Keyboard, NativeModules } from 'react-native';
import * as C from '../../constants/index';
import {
  ActivityContext,
  HdWalletContext,
  PortfolioContext,
} from '../../core/util';
import { importWallet } from '../../core/HdWallet';
import { PORTFOLIO_LOADING } from '../../reducers/portfolio_reducer';
import AppImages from '../../../assets/images/appImages';
import Clipboard from '@react-native-clipboard/clipboard';
import { QRScannerScreens } from '../../constants/server';
import { ActivityContextDef } from '../../reducers/activity_reducer';
import { screenTitle } from '../../constants/index';
import Loading from '../../components/v2/loading';
import { isValidMnemonic } from 'ethers/lib/utils';
import {
  getReadOnlyWalletData,
  setConnectionType,
} from '../../core/asyncStorage';
import useAxios from '../../core/HttpRequest';
import clsx from 'clsx';
import { fetchTokenData } from '../../core/Portfolio';
import { IMPORT_WALLET_TIMEOUT } from '../../constants/timeOuts';
import { useIsFocused } from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';
import { Colors } from '../../constants/theme';
import Button from '../../components/v2/button';
import { ConnectionTypes } from '../../constants/enum';
import { generateMultipleWalletAddressesFromSeedPhrase } from '../../core/Address';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

export default function Login(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [seedPhraseTextValue, onChangeseedPhraseTextValue] =
    useState<string>('');
  const [badKeyError, setBadKeyError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [createWalletLoading, setCreateWalletLoading] =
    useState<boolean>(false);

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const portfolioState = useContext(PortfolioContext);
  const { deleteWithAuth } = useAxios();

  const fetchCopiedText = async () => {
    const text = await Clipboard.getString();
    onChangeseedPhraseTextValue(text);
  };

  const handleBackButton = () => {
    props?.navigation?.goBack();
    return true;
  };

  const onSuccess = async e => {
    const textValue = e.data;
    onChangeseedPhraseTextValue(textValue);
  };

  useEffect(() => {
    if (hdWalletContext.state.choosenWalletIndex !== -1) {
      setTimeout(() => {
        void importWallet(hdWalletContext, portfolioState, seedPhraseTextValue);
        portfolioState.dispatchPortfolio({
          value: { portfolioState: PORTFOLIO_LOADING },
        });
        onChangeseedPhraseTextValue('');
        void setConnectionType(ConnectionTypes.SEED_PHRASE);
        if (props && props.navigation) {
          const getCurrentRoute = props.navigation.getState().routes[0].name;
          if (getCurrentRoute === screenTitle.OPTIONS_SCREEN)
            props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
          else setCreateWalletLoading(true);
        } else {
          void fetchTokenData(hdWalletContext, portfolioState);
        }
      }, IMPORT_WALLET_TIMEOUT);
    }
  }, [hdWalletContext]);

  const submitImportWallet = async (textValue = seedPhraseTextValue) => {
    const keyValue = textValue.split(/\s+/);
    const { isReadOnlyWallet } = hdWalletContext.state;
    const { ethereum } = hdWalletContext.state.wallet;
    if (keyValue.length >= 12 && isValidMnemonic(textValue)) {
      if (isReadOnlyWallet) {
        const data = await getReadOnlyWalletData();
        if (data) {
          const readOnlyWalletData = JSON.parse(data);
          await deleteWithAuth(
            `/v1/configuration/address/${ethereum.address}/observer/${readOnlyWalletData.observerId}`,
          );
        }
      }
      const walletAddresses =
        generateMultipleWalletAddressesFromSeedPhrase(textValue);
      props?.navigation?.navigate(screenTitle.CHOOSE_WALLET_INDEX, {
        walletAddresses,
      });
      setLoading(false);
    } else {
      setLoading(false);
      setBadKeyError(true);
    }
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isFocused]);

  useLayoutEffect(() => {
    if (props && props.navigation) {
      props.navigation.setOptions({
        headerRight: () => (
          <CyDTouchView
            onPress={() => {
              props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
                fromPage: QRScannerScreens.IMPORT,
                onSuccess,
              });
            }}>
            <CyDImage
              source={AppImages.QR_CODE_SCANNER_BLACK}
              className='h-[22px] w-[22px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        ),
      });
    }
  }, []);

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CyDScrollView className='flex-1 px-[20px]'>
        {createWalletLoading && <Loading />}
        <CyDTouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <CyDView>
            <CyDText
              className={'text-[#434343] text-[16px] mt-[30px] text-center'}>
              {t('IMPORT_WALLET_SUB_MSG')}
            </CyDText>
            <CyDView className={'flex flex-row justify-center'}>
              <CyDTextInput
                placeholder={t('ENTER_KEY_PLACEHOLDER')}
                placeholderTextColor={Colors.placeHolderColor}
                value={seedPhraseTextValue}
                onChangeText={text => {
                  onChangeseedPhraseTextValue(text.toLowerCase());
                  setBadKeyError(false);
                }}
                multiline={true}
                textAlignVertical={'top'}
                secureTextEntry={true}
                className={clsx(
                  'border-[1px] border-inputBorderColor p-[10px] mt-[20px] h-[200px] text-[18px] w-[100%]',
                  { 'border-errorRed': badKeyError },
                )}
              />
            </CyDView>
            {badKeyError && (
              <CyDText className='text-[16px] text-errorTextRed text-center'>
                {t('BAD_KEY_PHARSE')}
              </CyDText>
            )}
            <CyDView className={'flex flex-row justify-end w-full mt-[20px]'}>
              <CyDTouchView
                className={'flex flex-row justify-end'}
                onPress={() => {
                  void fetchCopiedText();
                }}>
                <CyDImage
                  source={AppImages.COPY}
                  className={'w-[16px] h-[18px] mr-[10px]'}
                />
                <CyDText
                  className={'text-[#434343] text-[14px] font-extrabold'}>
                  {t('PASTE_CLIPBOARD')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
            <Button
              title={t('SUBMIT')}
              onPress={() => {
                setLoading(true);
                void submitImportWallet();
              }}
              style={'h-[60px] mt-[40px]'}
              loading={loading}
            />
          </CyDView>
        </CyDTouchableWithoutFeedback>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
