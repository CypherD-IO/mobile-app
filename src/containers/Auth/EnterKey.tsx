/**
 * @format
 * @flow
 */
import Clipboard from '@react-native-clipboard/clipboard';
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { debounce } from 'lodash';
import {
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
import {
  CyDFlatList,
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
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
        const filtered = bip32Words.filter(suggestion =>
          suggestion.toLowerCase().startsWith(lastWord.toLowerCase()),
        );
        setFilteredSuggestions(filtered);
      } else {
        setFilteredSuggestions([]);
      }
      setBadKeyError(false);
    }, 300),
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
    const { ethereum } = hdWalletContext.state.wallet;
    if (keyValue.length >= 12 && isValidMnemonic(keyValue.join(' '))) {
      if (isReadOnlyWallet) {
        const data = await getReadOnlyWalletData();
        if (data) {
          const readOnlyWalletData = JSON.parse(data);
          await deleteWithAuth(
            `/v1/configuration/address/${ethereum.address}/observer/${readOnlyWalletData.observerId}`,
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

  return (
    <CyDView className='flex-1 bg-n20' style={{ paddingTop: insets.top }}>
      {firstIndexAddress ? (
        <ChooseWalletIndexComponent
          walletAddresses={[{ address: firstIndexAddress, index: 0 }]}
          handleShowMoreWalletAddressPress={handleShowMoreWalletAddressPress}
        />
      ) : (
        <CyDKeyboardAwareScrollView
          className='flex-1 h-full'
          keyboardShouldPersistTaps='handled'>
          {createWalletLoading && <Loading />}
          <CyDView>
            <CyDView className='flex flex-col h-full justify-between'>
              <CyDView className=' pb-[16px]'>
                <CyDView className='flex flex-row justify-around -mx-[20px]'>
                  <CyDTouchView
                    onPress={() => {
                      props.navigation.goBack();
                    }}>
                    <CyDIcons
                      name='arrow-left'
                      size={24}
                      className='text-base400'
                    />
                  </CyDTouchView>
                  <CyDText className='font-semibold text-[20px]'>
                    {t('IMPORT_WALLET_MSG')}
                  </CyDText>
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
                </CyDView>
                <CyDView className='mt-[24px] px-[26px]'>
                  <CyDText className='font-semibold text-[20px]'>
                    {t('ENTER_RECOVERY_PHRASE')}
                  </CyDText>
                  <CyDTextInput
                    placeholder={t('ENTER_KEY_PLACEHOLDER')}
                    placeholderTextColor={Colors.placeHolderColor}
                    value={seedPhraseTextValue}
                    ref={inputRef}
                    onChangeText={text => {
                      handleTextChange(text);
                    }}
                    multiline={true}
                    textAlignVertical={'top'}
                    secureTextEntry={true}
                    className={clsx(
                      'border-[1px] border-base80 bg-n0 rounded-[8px] p-[10px] mt-[12px] h-[160px] text-[16px] w-[100%]',
                      { 'border-errorRed': badKeyError },
                      { 'h-[110px]': height < 700 },
                    )}
                  />
                  {badKeyError && (
                    <CyDView className='flex flex-row items-center justify-center mt-[12px]'>
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
                </CyDView>
                <Button
                  type={ButtonType.GREY}
                  title={t('PASTE_CLIPBOARD')}
                  onPress={() => {
                    void fetchCopiedText();
                  }}
                  titleStyle={'text-[14px] ml-[4px] font-medium text-n900'}
                  paddingY={6}
                  icon={
                    <CyDMaterialDesignIcons
                      name='clipboard-text'
                      size={14}
                      className='text-n900'
                    />
                  }
                  imagePosition={ImagePosition.LEFT}
                  style='px-[6px] py-[6px] w-[174px] mt-[12px] ml-[26px]'
                />
              </CyDView>
              <CyDView>
                <Button
                  type={ButtonType.PRIMARY}
                  title={t('SUBMIT_FIRST_LETTER_CAPS')}
                  onPress={() => {
                    void submitImportWallet();
                  }}
                  paddingY={12}
                  style='mx-[26px] rounded-[12px]'
                  titleStyle='text-[18px]'
                  disabled={disableSubmit}
                  loading={loading}
                  loaderStyle={{ height: 25, width: 25 }}
                />
                <CyDView className='flex flex-row mt-[8px] justify-center'>
                  <CyDMaterialDesignIcons
                    name='shield-lock'
                    size={16}
                    className='text-base400'
                  />
                  <CyDText className='text-[10px] font-medium ml-[6px]'>
                    {t('CYPHER_AUDIT_TEXT')}
                  </CyDText>
                </CyDView>
                {filteredSuggestions.length > 0 && isKeyboardVisible && (
                  <CyDView className='h-[46px] mt-[10px] bg-n0 p-2'>
                    <CyDFlatList
                      data={filteredSuggestions}
                      keyboardShouldPersistTaps='handled'
                      horizontal={true}
                      renderItem={({ item }) => (
                        <CyDTouchView
                          className='p-[6px] bg-n20 ml-[8px] rounded-[4px]'
                          onPressIn={() => handleSuggestionPress(item)}>
                          <CyDText className='font-bold text-[12px] text-[#0061A7]'>
                            {item}
                          </CyDText>
                        </CyDTouchView>
                      )}
                      // style={styles.suggestionList}
                      showsHorizontalScrollIndicator={false}
                    />
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      )}
    </CyDView>
  );
}

const { height } = Dimensions.get('window');

// const styles = StyleSheet.create({
//   suggestionList: {
//     backgroundColor: '#EBEDF0',
//     paddingVertical: 12,
//     height: 56,
//   },
// });
