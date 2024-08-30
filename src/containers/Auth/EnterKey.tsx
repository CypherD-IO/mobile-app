/**
 * @format
 * @flow
 */
import Clipboard from '@react-native-clipboard/clipboard';
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { Mnemonic } from 'ethers';
import { debounce } from 'lodash';
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Dimensions,
  FlatList,
  NativeModules,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
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
import { fetchTokenData } from '../../core/Portfolio';
import { HdWalletContext, PortfolioContext, sleepFor } from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { PORTFOLIO_LOADING } from '../../reducers/portfolio_reducer';
import {
  CyDImage,
  CyDKeyboardAvoidingView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';

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
  const [disableSubmit, setDisableSubmit] = useState(true);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef(null);
  const [firstIndexAddress, setFirstIndexAddress] = useState();

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

  useEffect(() => {
    if (hdWalletContext.state.choosenWalletIndex !== -1) {
      setTimeout(() => {
        const keyValue = seedPhraseTextValue.trim().split(/\s+/);
        const mnemonic = keyValue.join(' ');
        void importWallet(hdWalletContext, portfolioState, mnemonic);
        portfolioState.dispatchPortfolio({
          value: { portfolioState: PORTFOLIO_LOADING },
        });
        onChangeseedPhraseTextValue('');
        if (props && props.navigation) {
          const getCurrentRoute = props.navigation.getState().routes[0].name;
          if (getCurrentRoute === screenTitle.OPTIONS_SCREEN)
            props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
          else setCreateWalletLoading(true);
        } else {
          void fetchTokenData(hdWalletContext, portfolioState, true);
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
    if (keyValue.length >= 12 && Mnemonic.isValidMnemonic(keyValue.join(' '))) {
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

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      {firstIndexAddress ? (
        <SafeAreaView className='flex-1 bg-cardBg h-full'>
          <ChooseWalletIndexComponent
            walletAddresses={[{ address: firstIndexAddress, index: 0 }]}
            handleShowMoreWalletAddressPress={handleShowMoreWalletAddressPress}
          />
        </SafeAreaView>
      ) : (
        <SafeAreaView className='flex-1 bg-cardBg h-full'>
          <CyDView
            className='flex-1 h-full'
            keyboardShouldPersistTaps='handled'>
            {createWalletLoading && <Loading />}
            <CyDKeyboardAvoidingView
              keyboardVerticalOffset={56}
              behavior={isAndroid() ? 'height' : 'padding'}>
              <CyDView className='flex flex-col h-full justify-between'>
                <CyDView className='bg-cardBg pb-[16px]'>
                  <CyDView className='flex flex-row justify-around -mx-[20px]'>
                    <CyDTouchView
                      onPress={() => {
                        props.navigation.goBack();
                      }}>
                      <CyDImage
                        source={AppImages.BACK_ARROW_GRAY}
                        className='w-[32px] h-[32px]'
                      />
                    </CyDTouchView>
                    <CyDText className='font-semibold text-black text-[20px]'>
                      {t('IMPORT_WALLET_MSG')}
                    </CyDText>
                    <CyDTouchView
                      onPress={() => {
                        props.navigation.navigate(
                          C.screenTitle.QR_CODE_SCANNER,
                          {
                            fromPage: QRScannerScreens.IMPORT,
                            onSuccess,
                          },
                        );
                      }}>
                      <CyDImage
                        source={AppImages.QR_CODE_V2}
                        className='w-[24px] h-[24px]'
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
                        'border-[1px] border-inputBorderColor bg-white rounded-[8px] p-[10px] mt-[12px] h-[160px] text-[16px] w-[100%]',
                        { 'border-errorRed': badKeyError },
                        { 'h-[110px]': height < 700 },
                      )}
                    />
                    {badKeyError && (
                      <CyDView className='flex flex-row items-center justify-center mt-[12px]'>
                        <CyDImage
                          source={AppImages.CANCEL_ICON}
                          className='h-[16px] w-[16px]'
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
                    image={AppImages.PASTE_FILL}
                    imageStyle={'h-[14px] w-[14px]'}
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
                    <CyDImage
                      className='h-[16px] w-[16px]'
                      source={AppImages.AUDIT_ICON}
                    />
                    <CyDText className='text-[10px] font-medium ml-[6px]'>
                      {t('CYPHER_AUDIT_TEXT')}
                    </CyDText>
                  </CyDView>
                  {filteredSuggestions.length > 0 && (
                    <CyDView className='h-[56px] mt-[10px]'>
                      <FlatList
                        data={filteredSuggestions}
                        // keyExtractor={item => item}
                        keyboardShouldPersistTaps='handled'
                        horizontal={true}
                        renderItem={({ item }) => (
                          <CyDTouchView
                            className='p-[6px] bg-[#D4E7F4] ml-[8px] rounded-[4px]'
                            onPressIn={() => handleSuggestionPress(item)}>
                            <CyDText className='font-bold text-[12px] text-[#0061A7]'>
                              {item}
                            </CyDText>
                          </CyDTouchView>
                        )}
                        style={styles.suggestionList}
                        showsHorizontalScrollIndicator={false}
                      />
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
            </CyDKeyboardAvoidingView>
          </CyDView>
        </SafeAreaView>
      )}
    </>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: '#EBEDF0',
  },
  suggestionList: {
    backgroundColor: '#EBEDF0',
    paddingVertical: 12,
    height: 56,
  },
});
