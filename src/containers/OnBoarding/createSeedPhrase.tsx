import * as React from 'react';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useContext } from 'react';
import bip39 from 'react-native-bip39';
import ReadOnlySeedPhraseBlock from '../../components/v2/readOnlySeedPhraseBlock';
import CyDModalLayout from '../../components/v2/modal';
import { BackHandler, NativeModules, StyleSheet } from 'react-native';
import { generateWalletFromMnemonic } from '../../core/Address';
import Loading from '../../components/v2/loading';
import { useIsFocused } from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';
import { HdWalletContext, shuffleSeedPhrase } from '../../core/util';
import Toast from 'react-native-toast-message';
import { INFO_WAITING_TIMEOUT } from '../../core/Http';
import { saveCredentialsToKeychain } from '../../core/Keychain';
import * as C from '../../constants';
import { Colors } from '../../constants/theme';
import Button from '../../components/v2/button';
import { ButtonType, SECRET_TYPES, SeedPhraseType } from '../../constants/enum';
import { setSkipSeedConfirmation } from '../../core/asyncStorage';

function CreateSeedPhrase({ route, navigation }) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { seedPhraseType } = route.params;
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [wallet, setWallet] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [isTipsVisible, setTipsVisible] = useState<boolean>(false);
  const waysToSecureSeedPhrase = [
    t('WRITE_DOWN_SEED_PHRASE'),
    t('USE_STEEL_BACKUPS'),
    t('USE_PASSWORD_MANAGER'),
    t('NEVER_STORE_ON_INTERNET_DEVICES'),
  ];
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);
  const maskedSeedPhrase =
    seedPhraseType === SeedPhraseType.TWELVE_WORDS
      ? new Array(12).fill('******')
      : new Array(24).fill('******');
  const [index, setIndex] = useState<number>(0);

  const [confirmableSeedPhrase, setConfirmableSeedPhrase] = useState<string[]>(
    [],
  );
  const [randomisedSeedPhrase, setRandomisedSeedPhrase] = useState<string>('');
  const [jumbledSeedPhrase, setJumbledSeedPhrase] = useState<string[]>([]);
  const [maximumRetryCount, setMaximumRetryCount] = useState<number>(5);
  const [origSeedPhrase, setOrigSeedPhrase] = useState<string>('');
  const [randomPositions, setRandomPositions] = useState<number[]>([]);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const noOfRandomPositionsToPrompt = 6;

  const generateMnemonic = async () => {
    const generatedSeedPhrase =
      seedPhraseType === SeedPhraseType.TWELVE_WORDS
        ? await bip39.generateMnemonic()
        : await bip39.generateMnemonic(256);
    setSeedPhrase(generatedSeedPhrase);
    setOrigSeedPhrase(generatedSeedPhrase);
  };

  const generateWallet = async (mnemonic: string, trkEvent: string) => {
    const generatedWallet = await generateWalletFromMnemonic(
      mnemonic,
      trkEvent,
      hdWalletContext.state.choosenWalletIndex,
    );
    setWallet(generatedWallet);
  };

  useEffect(() => {
    if (seedPhrase === '') {
      void generateMnemonic();
    }
  }, []);

  const handleBackButton = () => {
    if (index === 0) {
      navigation.goBack();
    } else {
      setIndex(0);
    }
    return true;
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

  useEffect(() => {
    if (seedPhrase) {
      void generateWallet(seedPhrase, 'create_wallet');
      setLoading(false);
    }
  }, [seedPhrase]);

  const toggleSeedPhraseVisibility = () => {
    setShowSeedPhrase(!showSeedPhrase);
  };

  useEffect(() => {
    initializeUserConfirmation();
  }, [origSeedPhrase]);

  const RenderCreateSeedphrase = () => {
    return (
      <CyDView className={'bg-n20 flex-col justify-between flex-1'}>
        <CyDScrollView>
          <CyDView>
            <CyDView
              className={
                'flex items-center justify-center py-[20px] px-[30px]'
              }>
              <CyDText className={'text-[16px] text-center'}>
                {t('CREATE_SEED_PHRASE_INFO')}
              </CyDText>
            </CyDView>
            <CyDView className={'flex items-center justify-center px-[30px]'}>
              <CyDText className={'text-[14px] font-bold text-center'}>
                {t('CREATE_SEED_PHRASE_WARNING')}
              </CyDText>
            </CyDView>
          </CyDView>
          {seedPhrase.length > 0 && (
            <>
              <CyDView
                className={'flex flex-row justify-end mt-[4px] h-[18px]'}>
                {showSeedPhrase && (
                  <CyDTouchView
                    onPress={() => {
                      toggleSeedPhraseVisibility();
                    }}>
                    <CyDMaterialDesignIcons
                      name={'eye-outline'}
                      size={20}
                      className='text-base400 mr-[12px]'
                    />
                  </CyDTouchView>
                )}
                {!showSeedPhrase && (
                  <CyDTouchView
                    onPress={() => {
                      toggleSeedPhraseVisibility();
                    }}>
                    <CyDMaterialDesignIcons
                      name={'eye-off-outline'}
                      size={20}
                      className='text-base400 mr-[12px]'
                    />
                  </CyDTouchView>
                )}
              </CyDView>
              {showSeedPhrase && (
                <CyDView className={'w-full flex flex-row justify-center'}>
                  <CyDView
                    className={
                      'flex flex-row flex-wrap justify-center items-center text-center mt-[5%] py-[6px]'
                    }>
                    {seedPhrase.split(' ').map((word, index) => {
                      return (
                        <ReadOnlySeedPhraseBlock
                          key={index}
                          content={word}
                          index={++index}
                          onBlockTouch={undefined}
                          clickEvent={undefined}
                        />
                      );
                    })}
                  </CyDView>
                </CyDView>
              )}
              {!showSeedPhrase && (
                <CyDView className={'w-full flex flex-row justify-center'}>
                  <CyDView
                    className={
                      'flex flex-row flex-wrap justify-center items-center text-center mt-[5%] py-[6px]'
                    }>
                    {maskedSeedPhrase.map((word, index) => {
                      return (
                        <ReadOnlySeedPhraseBlock
                          key={index}
                          content={word}
                          index={++index}
                          onBlockTouch={undefined}
                          clickEvent={undefined}
                        />
                      );
                    })}
                  </CyDView>
                </CyDView>
              )}
            </>
          )}
          <CyDTouchView
            onPress={() => {
              setTipsVisible(true);
            }}
            className={'m-[22px] flex flex-row justify-end'}>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={16}
              className='text-base400 mr-[6px] mt[2px]'
            />
            <CyDText className={'text-[14px] font-bold'}>
              {t('HOW_TO_SECURE_SEED_PHRASE')}
            </CyDText>
          </CyDTouchView>
        </CyDScrollView>
        <Button
          title={t('CONFIRM')}
          onPress={() => {
            setIndex(1);
          }}
          type={ButtonType.PRIMARY}
          style='mt-[5px] w-[80%] h-[50px] mx-auto mb-[10px]'
        />
      </CyDView>
    );
  };

  const generateRange = (range: number, pMin: number, pMax: number) => {
    const min = pMin < pMax ? pMin : pMax;
    const max = pMax > pMin ? pMax : pMin;
    const resultArr: number[] = [];
    let randNumber: number;
    while (range > 0) {
      randNumber = Math.round(min + Math.random() * (max - min));
      if (!resultArr.includes(randNumber)) {
        resultArr.push(randNumber);
        range--;
      }
    }
    return resultArr;
  };

  // confirm seed phrase logic

  const initializeUserConfirmation = () => {
    const initConfirmableArray = [];
    const randomisedJumbledSeedPhrase = [];
    const generatedRandomPostions = generateRange(
      noOfRandomPositionsToPrompt,
      1,
      seedPhraseType === SeedPhraseType.TWELVE_WORDS ? 12 : 24,
    );
    for (let i = 0; i < noOfRandomPositionsToPrompt; i++) {
      initConfirmableArray.push('');
      randomisedJumbledSeedPhrase.push(
        origSeedPhrase.split(' ')[generatedRandomPostions[i] - 1],
      );
    }
    setRandomPositions(generatedRandomPostions);
    setRandomisedSeedPhrase(randomisedJumbledSeedPhrase.join(' '));
    setConfirmableSeedPhrase(initConfirmableArray);
    setJumbledSeedPhrase(shuffleSeedPhrase(origSeedPhrase.split(' ')));
    setMaximumRetryCount(5);
  };

  const pushToConfirmableSeedPhrase = (jumbledSelectedIndex: number) => {
    const firstEmptyOccurence = (element: string) => element === '';
    const index = confirmableSeedPhrase.findIndex(firstEmptyOccurence);
    const tempConfirmableSeedPhrase = [...confirmableSeedPhrase];
    const tempJumbledSeedPhrase = [...jumbledSeedPhrase];
    if (
      origSeedPhrase.split(' ')[randomPositions[index] - 1] ===
      tempJumbledSeedPhrase[jumbledSelectedIndex]
    ) {
      tempConfirmableSeedPhrase[index] =
        tempJumbledSeedPhrase[jumbledSelectedIndex];
      setConfirmableSeedPhrase(tempConfirmableSeedPhrase);
      tempJumbledSeedPhrase[+jumbledSelectedIndex] = '';
      setJumbledSeedPhrase(tempJumbledSeedPhrase);
      if (randomisedSeedPhrase === tempConfirmableSeedPhrase.join(' ')) {
        Toast.show({
          type: t('TOAST_TYPE_SUCCESS'),
          text1: t('SEED_PHRASE_MATCH'),
          position: 'bottom',
        });
        setTimeout(() => {
          void proceedToPortfolio();
        }, INFO_WAITING_TIMEOUT);
      }
    } else {
      if (jumbledSeedPhrase[jumbledSelectedIndex] !== '') {
        if (maximumRetryCount > 1) {
          let retriesLeft = maximumRetryCount;
          setMaximumRetryCount(--retriesLeft);
          Toast.show({
            type: t('TOAST_TYPE_ERROR'),
            text1: t('SEED_PHRASE_INDEX_MISMATCH'),
            position: 'bottom',
          });
        } else {
          initializeUserConfirmation();
        }
      }
    }
  };

  const onBlockInvoked = (jumbledSelectedIndex: number) => {
    pushToConfirmableSeedPhrase(jumbledSelectedIndex);
  };

  const proceedToPortfolio = async () => {
    void saveCredentialsToKeychain(
      hdWalletContext,
      wallet,
      SECRET_TYPES.MENEMONIC,
    );
  };

  const skipConfirmation = async () => {
    await setSkipSeedConfirmation(true);
    void proceedToPortfolio();
  };

  const RenderConfirmSeedphrase = () => {
    return (
      <CyDSafeAreaView className={'bg-n20 h-full flex-col justify-between'}>
        <CyDScrollView>
          <CyDView
            className={'flex items-center justify-center py-[20px] px-[30px]'}>
            <CyDText className={'text-[16px] text-center'}>
              {t('CONFIRM_SEED_PHRASE_INFO')}
            </CyDText>
          </CyDView>
          <CyDView>
            <CyDView className={'w-full flex flex-row justify-center'}>
              <CyDView
                className={
                  'flex flex-row flex-wrap justify-center items-center text-center py-[20px]'
                }>
                {confirmableSeedPhrase.map((word, index) => {
                  return (
                    <ReadOnlySeedPhraseBlock
                      key={index}
                      content={word}
                      index={randomPositions[index]}
                      disabled={true}
                      backgroundColor={word === '' ? 'n0' : 'p50'}
                      onBlockTouch={undefined}
                      clickEvent={undefined}
                    />
                  );
                })}
              </CyDView>
            </CyDView>
            {maximumRetryCount < 3 && (
              <CyDView
                className={
                  'mb-[-12px] z-10 shadow-lg absolute bottom-[-8px] left-[31%] py-[7px] rounded-full bg-n20 text-center'
                }>
                <CyDText
                  className={'font-semibold text-center text-[15px] px-[20px]'}>
                  {maximumRetryCount} {t('ATTEMPTS_LEFT')}
                </CyDText>
              </CyDView>
            )}
          </CyDView>
          <CyDView className={'w-full flex flex-row justify-center'}>
            <CyDView
              className={
                'flex flex-row flex-wrap justify-center items-center text-center w-[94%] mt-[4%] p-[10px]'
              }>
              {jumbledSeedPhrase.map((word, index) => {
                return (
                  <ReadOnlySeedPhraseBlock
                    key={index}
                    content={word}
                    index={0}
                    disabled={false}
                    backgroundColor={word === '' ? 'white' : 'appColor'}
                    onBlockTouch={onBlockInvoked}
                    clickEvent={index}
                  />
                );
              })}
            </CyDView>
          </CyDView>
        </CyDScrollView>
        <Button
          title={t('SKIP_FOR_NOW')}
          onPress={() => {
            void skipConfirmation();
          }}
          type={ButtonType.TERNARY}
          style='mt-[5px] w-[80%] h-[50px] mx-auto mb-[10px]'
        />
      </CyDSafeAreaView>
    );
  };

  return (
    <CyDSafeAreaView className='bg-n20 flex-1'>
      <CyDTouchView
        className='flex flex-row px-[16px] py-[13px] items-center justify-between'
        onPress={() => {
          navigation.goBack();
        }}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
        <CyDText className='font-bold text-[24px]'>
          {index === 0
            ? t('CREATE_SEEDPHRASE_TITLE')
            : t('CONFIRM_SEEDPHRASE_TITLE')}
        </CyDText>
        <CyDView />
      </CyDTouchView>
      <CyDModalLayout
        setModalVisible={() => {}}
        isModalVisible={isTipsVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-n20 p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => {
              setTipsVisible(false);
            }}
            className={'z-[50] self-end'}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t('HOW_TO_SECURE')}
          </CyDText>
          <CyDView className={'mx-[20px] my-[10px]'}>
            {waysToSecureSeedPhrase.map(item => {
              return (
                <CyDView
                  className={'flex flex-row items-center my-[4px]'}
                  key={item}>
                  <CyDView className='w-2 h-2 bg-p150 rounded-full mr-3' />
                  <CyDText className={'leading-[25px] font-semibold'}>
                    {item}
                  </CyDText>
                </CyDView>
              );
            })}
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {loading ? (
        <Loading />
      ) : (
        <CyDView className='flex-1'>
          {index === 0 && <RenderCreateSeedphrase />}
          {index === 1 && <RenderConfirmSeedphrase />}
        </CyDView>
      )}
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default CreateSeedPhrase;
