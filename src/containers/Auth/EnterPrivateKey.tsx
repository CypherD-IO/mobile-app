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
import { HdWalletContext, isValidPrivateKey } from '../../core/util';
import {
  importWalletFromEvmPrivateKey,
  importWalletFromSolanaPrivateKey,
} from '../../core/HdWallet';
import bs58 from 'bs58';
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
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

export default function Login() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [privateKey, setPrivateKey] = useState<string>('');
  const [badKeyError, setBadKeyError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [createWalletLoading, setCreateWalletLoading] =
    useState<boolean>(false);

  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { deleteWithAuth } = useAxios();

  const fetchCopiedText = async (): Promise<void> => {
    const text = await Clipboard.getString();
    setPrivateKey(text);
  };

  const handleBackButton = (): boolean => {
    navigation?.goBack();
    return true;
  };

  const onSuccess = async (e: { data: string }): Promise<void> => {
    const textValue = e.data;
    setPrivateKey(textValue);
  };

  const submitImportWallet = async (textValue = privateKey): Promise<void> => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const ethereumAddress: string | undefined = get(
      hdWalletContext,
      'state.wallet.ethereum.address',
      undefined,
    );

    // Normalize input without altering case (important for base58 Solana keys)
    const input = String(textValue ?? '').trim();

    // Detect EVM hex private key: 64 hex chars with optional 0x prefix
    const isHex64 = /^(0x)?[0-9a-fA-F]{64}$/.test(input);

    // Helper to cleanup read-only observer for EVM address if available
    const cleanupReadOnlyObserver = async () => {
      try {
        if (isReadOnlyWallet && ethereumAddress) {
          const data = await getReadOnlyWalletData();
          if (data) {
            const readOnlyWalletData = JSON.parse(data);
            await deleteWithAuth(
              `/v1/configuration/address/${ethereumAddress}/observer/${readOnlyWalletData?.observerId as string}`,
            );
          }
        }
      } catch {
        // Intentionally swallow observer cleanup errors to not block import
      }
    };

    if (isHex64) {
      // EVM flow
      const evmKey = input.startsWith('0x') ? input : `0x${input}`;
      if (isValidPrivateKey(evmKey)) {
        setLoading(true);
        await cleanupReadOnlyObserver();
        try {
          await importWalletFromEvmPrivateKey(hdWalletContext, evmKey);
          setPrivateKey('');
          await setConnectionType(ConnectionTypes.PRIVATE_KEY);
          setCreateWalletLoading(true);
        } catch {
          setBadKeyError(true);
        } finally {
          setLoading(false);
        }
        return;
      }
      setBadKeyError(true);
      return;
    }

    // Try Solana flow: expect a base58-encoded 64-byte secret key
    try {
      const decoded = bs58.decode(input);
      if (decoded && decoded.length === 64) {
        setLoading(true);
        await cleanupReadOnlyObserver();
        try {
          await importWalletFromSolanaPrivateKey(hdWalletContext, input);
          setPrivateKey('');
          await setConnectionType(ConnectionTypes.PRIVATE_KEY);
          setCreateWalletLoading(true);
        } catch {
          setBadKeyError(true);
        } finally {
          setLoading(false);
        }
        return;
      }
    } catch {
      // fallthrough to error state
    }

    setBadKeyError(true);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      subscription.remove();
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
                    // Preserve exact casing for Solana base58 keys; do not force lowercase
                    setPrivateKey(text);
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
