/**
 * @format
 * @flow
 */
import Clipboard from '@react-native-clipboard/clipboard';
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { debounce, get } from 'lodash';
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Dimensions, Keyboard, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import ChooseWalletIndexComponent from '../../components/ChooseWalletIndexComponent';
import Button from '../../components/v2/button';
import Loading from '../../components/v2/loading';
import { bip32Words } from '../../constants/bip32Words';
import { ButtonType, ImagePosition } from '../../constants/enum';
import * as C from '../../constants/index';
import { screenTitle } from '../../constants/index';
import { QRScannerScreens } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { IMPORT_WALLET_TIMEOUT } from '../../constants/timeOuts';
import {
  generateEthAddressFromSeedPhrase,
  generateMultipleWalletAddressesFromSeedPhrase,
} from '../../core/Address';
import { getReadOnlyWalletData } from '../../core/asyncStorage';
import { importWallet } from '../../core/HdWallet';
import useAxios from '../../core/HttpRequest';
import { HdWalletContext, sleepFor } from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import {
  CyDFlatList,
  CyDIcons,
  CyDImage,
  CyDInputAccessoryView,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { mnemonicToAccount } from 'viem/accounts';

export default function Login(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [seedPhraseTextValue, onChangeseedPhraseTextValue] =
    useState<string>('');
  const [badKeyError, setBadKeyError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [createWalletLoading, setCreateWalletLoading] =
    useState<boolean>(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { deleteWithAuth } = useAxios();
  const [disableSubmit, setDisableSubmit] = useState(true);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef(null);
  const [firstIndexAddress, setFirstIndexAddress] = useState<string>();

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
    const seedPhrase = seedPhraseTextValue;
    const cleanedStr = seedPhrase.trim().replace(/\s+/g, ' ');
    const wordCount = cleanedStr ? cleanedStr.split(' ').length : 0;
    setDisableSubmit(!(wordCount === 12 || wordCount === 24));
  }, [seedPhraseTextValue]);

  const debouncedTextChange = useCallback(
    debounce(text => {
      if (text.length > 0) {
        const words = text.trim().split(' ');
        const lastWord = words[words.length - 1];

        // Only show suggestions if the last word is incomplete and has at least 2 characters
        if (lastWord.length >= 2 && !text.endsWith(' ')) {
          const filtered = bip32Words
            .filter(suggestion =>
              suggestion.toLowerCase().startsWith(lastWord.toLowerCase()),
            )
            .slice(0, 8); // Limit to 8 suggestions for better performance
          setFilteredSuggestions(filtered);
        } else {
          setFilteredSuggestions([]);
        }
      } else {
        setFilteredSuggestions([]);
      }
      setBadKeyError(false);
    }, 200), // Reduced debounce time for more responsive feel
    [],
  );

  const handleTextChange = text => {
    onChangeseedPhraseTextValue(text.toLowerCase());
    debouncedTextChange(text);
  };

  function isValidMnemonic(mnemonic: string): boolean {
    try {
      mnemonicToAccount(mnemonic);
      return true;
    } catch (error) {
      return false;
    }
  }

  useEffect(() => {
    if (hdWalletContext.state.choosenWalletIndex !== -1) {
      setTimeout(() => {
        const keyValue = seedPhraseTextValue.trim().split(/\s+/);
        const mnemonic = keyValue.join(' ');
        void importWallet(hdWalletContext, mnemonic);
        onChangeseedPhraseTextValue('');
        if (props && props.navigation) {
          const getCurrentRoute = props.navigation.getState().routes[0].name;
          if (getCurrentRoute === screenTitle.OPTIONS_SCREEN)
            props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
          else setCreateWalletLoading(true);
        } else {
          props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
        }
      }, IMPORT_WALLET_TIMEOUT);
    }
  }, [hdWalletContext.state.choosenWalletIndex]);

  const submitImportWallet = async (textValue = seedPhraseTextValue) => {
    setLoading(true);
    await sleepFor(500);

    const keyValue = textValue.trim().split(/\s+/);
    const { isReadOnlyWallet } = hdWalletContext.state;
    const ethereumAddress = get(
      hdWalletContext,
      'state.wallet.ethereum.address',
      undefined,
    );
    if (keyValue.length >= 12 && isValidMnemonic(keyValue.join(' '))) {
      if (isReadOnlyWallet) {
        const data = await getReadOnlyWalletData();
        if (data) {
          const readOnlyWalletData = JSON.parse(data);
          await deleteWithAuth(
            `/v1/configuration/address/${ethereumAddress ?? ''}/observer/${readOnlyWalletData.observerId}`,
          );
        }
      }
      const walletAddresses = await generateEthAddressFromSeedPhrase(
        keyValue.join(' '),
      );
      setFirstIndexAddress(walletAddresses);
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
            <CyDMaterialDesignIcons
              name='qrcode-scan'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        ),
      });
    }
  }, []);

  const handleSuggestionPress = suggestion => {
    const words = seedPhraseTextValue.trim().split(' ');
    words[words.length - 1] = suggestion;
    onChangeseedPhraseTextValue(words.join(' ') + ' ');

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleShowMoreWalletAddressPress = useCallback(async () => {
    const keyValue = seedPhraseTextValue.trim().split(/\s+/);
    const walletAddresses = await generateMultipleWalletAddressesFromSeedPhrase(
      keyValue.join(' '),
    );
    props.navigation?.navigate(screenTitle.CHOOSE_WALLET_INDEX, {
      walletAddresses,
    });
  }, [seedPhraseTextValue]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // InputAccessoryView for keyboard suggestions
  const inputAccessoryViewID = 'seedPhraseInputAccessory';

  // Get theme for styling
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  // Determine if we should use dark mode
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const renderInputAccessoryView = () => (
    <CyDInputAccessoryView nativeID={inputAccessoryViewID}>
      {filteredSuggestions.length > 0 && (
        <CyDView
          style={{
            backgroundColor: isDarkMode ? '#313131' : '#D1D5DB',
            borderTopColor: isDarkMode ? '#1C1C1E' : '#9CA3AF',
            borderTopWidth: 0.5,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
          <CyDView className='flex-row items-center mb-[4px]'>
            <CyDText
              style={{
                fontSize: 12,
                color: isDarkMode ? '#8E8E93' : '#6B7280',
                fontWeight: '500',
                marginRight: 8,
              }}>
              Word suggestions:
            </CyDText>
          </CyDView>
          <CyDFlatList
            data={filteredSuggestions}
            keyboardShouldPersistTaps='handled'
            horizontal={true}
            renderItem={({ item, index }) => (
              <CyDTouchView
                style={{
                  backgroundColor: isDarkMode ? '#505050' : '#FFFFFF',
                  marginRight: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: isDarkMode ? 0 : 1,
                  borderColor: isDarkMode ? 'transparent' : '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDarkMode ? 0.2 : 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
                onPress={() => handleSuggestionPress(item)}>
                <CyDText
                  style={{
                    fontWeight: '600',
                    fontSize: 14,
                    color: isDarkMode ? '#FFFFFF' : '#374151',
                  }}>
                  {item}
                </CyDText>
              </CyDTouchView>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          />
        </CyDView>
      )}
    </CyDInputAccessoryView>
  );

  return (
    <CyDView className='flex-1 bg-n20'>
      {renderInputAccessoryView()}
      {firstIndexAddress ? (
        <ChooseWalletIndexComponent
          walletAddresses={[{ address: firstIndexAddress, index: 0 }]}
          handleShowMoreWalletAddressPress={handleShowMoreWalletAddressPress}
        />
      ) : (
        <CyDKeyboardAwareScrollView
          className='flex-1'
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
          }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}>
          {createWalletLoading && <Loading />}

          {/* Main Content */}
          <CyDView className='flex-1 items-center mt-[44px] px-[16px]'>
            {/* Icon and Title Section */}
            <CyDView className='items-center mb-[20px]'>
              <CyDView className='w-[54px] h-[54px] bg-red-500 rounded-[8px] items-center justify-center mb-[16px]'>
                <CyDMaterialDesignIcons
                  name='file-document'
                  size={24}
                  className='text-white'
                />
              </CyDView>

              <CyDView className='items-center'>
                <CyDText className='text-primaryText text-[18px] font-bold mb-[6px]'>
                  {t('ENTER_RECOVERY_PHRASE')}
                </CyDText>
                <CyDText className='text-n200 text-[14px] font-bold text-center w-[256px]'>
                  Your recovery phrase will only be stored locally on your
                  device
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Text Input */}
            <CyDTouchView
              className='w-full bg-base40 rounded-[8px] mb-[20px]'
              onPress={() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              activeOpacity={1}>
              <CyDView className='h-[160px] p-[12px]'>
                <CyDTextInput
                  placeholder={t('ENTER_KEY_PLACEHOLDER')}
                  placeholderTextColor='#7A8699'
                  value={seedPhraseTextValue}
                  ref={inputRef}
                  onChangeText={text => {
                    handleTextChange(text);
                  }}
                  multiline={true}
                  textAlignVertical={'top'}
                  secureTextEntry={true}
                  scrollEnabled={true}
                  inputAccessoryViewID={inputAccessoryViewID}
                  className='text-primaryText text-[16px] flex-1 !bg-base40'
                  style={{
                    minHeight: '100%',
                    maxHeight: '100%',
                  }}
                />
              </CyDView>
              {badKeyError && (
                <CyDView className='flex flex-row items-center justify-center pb-[12px]'>
                  <CyDMaterialDesignIcons
                    name='cancel'
                    size={16}
                    className='text-red400'
                  />
                  <CyDText className='text-[12px] ml-[4px] text-errorTextRed text-center'>
                    {t('BAD_KEY_PHARSE')}
                  </CyDText>
                </CyDView>
              )}
            </CyDTouchView>

            {/* Paste and QR Buttons */}
            <CyDView className='flex-row'>
              <CyDTouchView
                onPress={() => {
                  void fetchCopiedText();
                }}
                className='flex-row items-center bg-n0 border border-n40 rounded-[6px] py-[9px] px-[24px] mr-[12px]'>
                <CyDMaterialDesignIcons
                  name='clipboard-text'
                  size={16}
                  className='text-base400 mr-[8px]'
                />
                <CyDText className='text-base400 text-[12px] font-bold'>
                  Paste
                </CyDText>
              </CyDTouchView>

              <CyDTouchView
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
                    fromPage: QRScannerScreens.IMPORT,
                    onSuccess,
                  });
                }}
                className='flex-row items-center bg-n0 border border-n40 rounded-[6px] py-[9px] px-[12px]'>
                <CyDMaterialDesignIcons
                  name='qrcode-scan'
                  size={16}
                  className='text-base400 mr-[8px]'
                />
                <CyDText className='text-base400 text-[12px] font-bold'>
                  Scan a QR
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>

          {/* Info Section */}
          <CyDView className='flex-row items-center bg-base40 rounded-[8px] p-[16px] mb-[22px] mx-[16px]'>
            <CyDMaterialDesignIcons
              name='school'
              size={24}
              className='text-n200 mr-[12px]'
            />
            <CyDText className='text-n200 text-[12px] flex-1'>
              To find your recovery phrase in another app, navigate to the
              settings or security section. Look for an option labeled 'Backup'
              or 'Recovery Phrase' to view or copy it.
            </CyDText>
          </CyDView>

          {/* Continue Button */}
          <CyDView className='mb-[22px] mx-[16px]'>
            <Button
              title='Continue'
              onPress={() => {
                void submitImportWallet();
              }}
              disabled={disableSubmit}
              loading={loading}
              loaderStyle={{
                width: 27,
                height: 27,
              }}
              type={ButtonType.PRIMARY}
              style='w-full rounded-[30px]'
              titleStyle='text-[20px] font-bold'
              paddingY={14}
            />
          </CyDView>

          {/* Security Audit */}
          <CyDView className='flex-row px-[11px] mb-[28px] w-full items-center justify-center'>
            <CyDMaterialDesignIcons
              name='shield-check'
              size={16}
              className='text-base400 mr-[6px]'
            />
            <CyDText className='text-primaryText text-[10px] font-bold text-center'>
              {t('CYPHER_AUDIT_TEXT')}
            </CyDText>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      )}
    </CyDView>
  );
}
