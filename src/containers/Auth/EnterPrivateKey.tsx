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
import { HdWalletContext, isValidPrivateKey } from '../../core/util';
import { importWalletPrivateKey } from '../../core/HdWallet';
import AppImages from '../../../assets/images/appImages';
import Clipboard from '@react-native-clipboard/clipboard';
import { QRScannerScreens } from '../../constants/server';
import { screenTitle } from '../../constants/index';
import Loading from '../../components/v2/loading';
import {
  getReadOnlyWalletData,
  setConnectionType,
} from '../../core/asyncStorage';
import useAxios from '../../core/HttpRequest';
import clsx from 'clsx';
import { IMPORT_WALLET_TIMEOUT } from '../../constants/timeOuts';
import { useIsFocused } from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';
import { Colors } from '../../constants/theme';
import Button from '../../components/v2/button';
import { ConnectionTypes } from '../../constants/enum';

export default function Login(props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [privateKey, setPrivateKey] = useState<string>('');
  const [badKeyError, setBadKeyError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [createWalletLoading, setCreateWalletLoading] =
    useState<boolean>(false);

  const hdWalletContext = useContext<any>(HdWalletContext);
  const { deleteWithAuth } = useAxios();

  const fetchCopiedText = async () => {
    const text = await Clipboard.getString();
    setPrivateKey(text);
  };

  const handleBackButton = () => {
    props?.navigation?.goBack();
    return true;
  };

  const onSuccess = async e => {
    const textValue = e.data;
    setPrivateKey(textValue);
  };

  const submitImportWallet = async (textValue = privateKey) => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const { ethereum } = hdWalletContext.state.wallet;
    if (!textValue.startsWith('0x')) {
      textValue = '0x' + textValue;
    }
    if (textValue.length === 66 && isValidPrivateKey(textValue)) {
      setLoading(true);
      if (isReadOnlyWallet) {
        const data = await getReadOnlyWalletData();
        if (data) {
          const readOnlyWalletData = JSON.parse(data);
          await deleteWithAuth(
            `/v1/configuration/address/${ethereum.address}/observer/${readOnlyWalletData.observerId}`,
          );
        }
      }
      setTimeout(() => {
        void importWalletPrivateKey(hdWalletContext, textValue);
        setLoading(false);
        setPrivateKey('');
        void setConnectionType(ConnectionTypes.PRIVATE_KEY);
        if (props && props.navigation) {
          const getCurrentRoute = props.navigation.getState().routes[0].name;
          if (getCurrentRoute === screenTitle.OPTIONS_SCREEN) {
            props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
          } else setCreateWalletLoading(true);
        } else {
          props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
        }
      }, IMPORT_WALLET_TIMEOUT);
    } else {
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
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CyDScrollView className='flex-1 px-[20px]'>
        {createWalletLoading && <Loading />}
        <CyDTouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <CyDView>
            <CyDText
              className={'text-[#434343] text-[16px] mt-[30px] text-center'}>
              {t('PRIVATE_KEY_IMPORT_SUB_MSG')}
            </CyDText>
            <CyDView className={'flex flex-row justify-center'}>
              <CyDTextInput
                placeholder={t('ENTER_PRIVATE_KEY_PLACEHOLDER')}
                placeholderTextColor={Colors.placeHolderColor}
                value={privateKey}
                onChangeText={text => {
                  setPrivateKey(text.toLowerCase());
                  setBadKeyError(false);
                }}
                multiline={true}
                textAlignVertical={'top'}
                secureTextEntry={true}
                className={clsx(
                  'border-[1px] border-inputBorderColor p-[10px] mt-[20px] h-[100px] text-[18px] w-[100%]',
                  { 'border-errorRed': badKeyError },
                )}
              />
            </CyDView>
            {badKeyError && (
              <CyDText className='text-[16px] text-errorTextRed text-center'>
                {t('BAD_PRIVATE_KEY_PHARSE')}
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
