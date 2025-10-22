import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeModules, StyleSheet } from 'react-native';
import * as bip39 from 'bip39';
import Button from '../../components/v2/button';
import Loading from '../../components/v2/loading';
import CyDModalLayout from '../../components/v2/modal';
import ReadOnlySeedPhraseBlock from '../../components/v2/readOnlySeedPhraseBlock';
import { ButtonType, SECRET_TYPES, SeedPhraseType } from '../../constants/enum';
import {
  generateWalletFromMnemonic,
  IAccountDetailWithChain,
} from '../../core/Address';
import { saveCredentialsToKeychain } from '../../core/Keychain';
import { HdWalletContext } from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

interface RouteParams {
  seedPhraseType: SeedPhraseType;
}

function CreateSeedPhrase() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const { seedPhraseType = SeedPhraseType.TWELVE_WORDS } = route.params;
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [wallet, setWallet] = useState<{
    accounts: IAccountDetailWithChain[];
    mnemonic: string;
    privateKey: string;
  }>();
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
  const hdWalletContext = useContext<any>(HdWalletContext);

  const generateMnemonic = async () => {
    const generatedSeedPhrase =
      seedPhraseType === SeedPhraseType.TWELVE_WORDS
        ? bip39.generateMnemonic(128)
        : bip39.generateMnemonic(256);
    setSeedPhrase(generatedSeedPhrase);
  };

  const generateWallet = async (mnemonic: string, trkEvent: string) => {
    const generatedWallet = await generateWalletFromMnemonic(
      mnemonic,
      0, // when imported via seedphrase we generate with index 0 by default
    );
    setWallet(generatedWallet);
  };

  useEffect(() => {
    if (seedPhrase === '') {
      void generateMnemonic();
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }
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

  const proceedToPortfolio = async () => {
    if (wallet) {
      void saveCredentialsToKeychain(
        hdWalletContext,
        wallet,
        SECRET_TYPES.MENEMONIC,
      );
    }
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
          {t('CREATE_SEEDPHRASE_TITLE')}
        </CyDText>
        <CyDView />
      </CyDTouchView>
      <CyDModalLayout
        setModalVisible={() => {
          setTipsVisible(false);
        }}
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
          <CyDView className={'bg-n20 flex-col justify-between flex-1'}>
            <CyDView className='flex-1'>
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
                  <CyDView
                    className={'flex items-center justify-center px-[30px]'}>
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
                      <CyDView
                        className={'w-full flex flex-row justify-center'}>
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
                      <CyDView
                        className={'w-full flex flex-row justify-center'}>
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
            </CyDView>

            <Button
              title={t('CONFIRM')}
              onPress={() => {
                void proceedToPortfolio();
              }}
              type={ButtonType.PRIMARY}
              style='mt-[5px] w-[80%] h-[50px] mx-auto mb-[10px]'
            />
          </CyDView>
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
