import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDText,
  CyDTouchView,
  CyDView,
  CyDTouchableWithoutFeedback,
  CyDSafeAreaView,
  CyDTextInput,
  CyDScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../styles/tailwindComponents';
import { BackHandler, Keyboard, NativeModules } from 'react-native';
import * as C from '../../constants/index';
import { HdWalletContext, isValidPrivateKey } from '../../core/util';
import { importWalletFromEvmPrivateKey } from '../../core/HdWallet';
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
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';
import { Colors } from '../../constants/theme';
import Button from '../../components/v2/button';
import { ConnectionTypes } from '../../constants/enum';
import { get } from 'lodash';

export default function Login() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
    navigation?.goBack();
    return true;
  };

  const onSuccess = async (e: any) => {
    const textValue = e.data;
    setPrivateKey(textValue);
  };

  const submitImportWallet = async (textValue = privateKey) => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const ethereumAddress = get(
      hdWalletContext,
      'state.wallet.ethereum.address',
      undefined,
    ) as string;
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
            `/v1/configuration/address/${ethereumAddress}/observer/${readOnlyWalletData?.observerId as string}`,
          );
        }
      }
      setTimeout(() => {
        void importWalletFromEvmPrivateKey(hdWalletContext, textValue);
        setLoading(false);
        setPrivateKey('');
        void setConnectionType(ConnectionTypes.PRIVATE_KEY);
        setCreateWalletLoading(true);
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

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CyDView className='flex flex-row items-center justify-between py-[16px] px-[16px] bg-n0'>
        <CyDTouchView
          className='flex flex-row items-center gap-x-[16px]'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDView className='pr-[16px]'>
            <CyDMaterialDesignIcons
              name='arrow-left'
              size={24}
              className='text-base400'
            />
          </CyDView>

          <CyDText className='text-[18px] font-medium tracking-[-0.8px] text-base400'>
            {t('IMPORT_PRIVATE_KEY')}
          </CyDText>
        </CyDTouchView>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(screenTitle.QR_CODE_SCANNER, {
              fromPage: QRScannerScreens.IMPORT,
              onSuccess,
            });
          }}>
          <CyDMaterialDesignIcons
            name='qrcode-scan'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>

      <CyDView className='flex-1 bg-n20'>
        <CyDScrollView className='flex-1 px-[20px]'>
          {createWalletLoading && <Loading />}
          <CyDTouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <CyDView>
              <CyDText className={'text-[16px] mt-[30px] text-center'}>
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
                    'border-[1px] border-base80 p-[10px] mt-[20px] h-[100px] text-[18px] w-[100%]',
                    { 'border-errorRed': badKeyError },
                  )}
                />
              </CyDView>
              {badKeyError && (
                <CyDText className='text-[16px] text-errorTextRed text-center'>
                  {t('BAD_PRIVATE_KEY')}
                </CyDText>
              )}
              <CyDView className={'flex flex-row justify-end w-full mt-[20px]'}>
                <CyDTouchView
                  className={'flex flex-row justify-end items-center'}
                  onPress={() => {
                    void fetchCopiedText();
                  }}>
                  <CyDIcons name={'copy'} size={24} className='text-base400' />
                  <CyDText className={'text-[14px] font-extrabold'}>
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
      </CyDView>
    </CyDSafeAreaView>
  );
}
