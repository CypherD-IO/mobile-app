import analytics from '@react-native-firebase/analytics';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import Web3Auth, {
  AuthUserInfo,
  LOGIN_PROVIDER,
  MFA_LEVELS,
} from '@web3auth/react-native-sdk';
import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import CyDModalLayout from '../../components/v2/modal';
import { screenTitle } from '../../constants';
import { ConnectionTypes, SeedPhraseType } from '../../constants/enum';
import { web3AuthEvm, web3AuthSolana } from '../../constants/web3Auth';
import { importWalletPrivateKey } from '../../core/HdWallet';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { setConnectionType } from '../../core/asyncStorage';
import {
  HdWalletContext,
  isValidPrivateKey,
  parseErrorMessage,
} from '../../core/util';
import useConnectionManager from '../../hooks/useConnectionManager';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

const enum ProviderType {
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
}

const enum SocialLoginMethod {
  EMAIL = 'email',
  GOOGLE = 'google',
}

export default function OnBoardOpotions() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { openWalletConnectModal } = useConnectionManager();
  const { showModal, hideModal } = useGlobalModalContext();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;

  const inset = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [
    isSelectSeedPhraseCountModalVisible,
    setIsSelectSeedPhraseCountModalVisible,
  ] = useState<boolean>(false);
  const [selectedSeedPhraseCount, setSelectedSeedPhraseCount] =
    useState<SeedPhraseType>(SeedPhraseType.TWELVE_WORDS);
  const [isProviderSelectionModalVisible, setIsProviderSelectionModalVisible] =
    useState<boolean>(false);
  const [providerType, setProviderType] = useState<ProviderType>(
    ProviderType.ETHEREUM,
  );
  const [socialLoginMethod, setSocialLoginMethod] = useState<SocialLoginMethod>(
    SocialLoginMethod.EMAIL,
  );
  const [isImportWalletModalVisible, setIsImportWalletModalVisible] =
    useState<boolean>(false);

  const handleSubmit = async () => {
    try {
      setIsProviderSelectionModalVisible(false);
      await handleSocialLogin();
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('UNEXPECTED_ERROR'),
        description: parseErrorMessage(error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const navigateToSeedPhraseGeneration = (type: string) => {
    setIsSelectSeedPhraseCountModalVisible(false);
    setTimeout(() => {
      navigation.navigate(screenTitle.CREATE_SEED_PHRASE, {
        seedPhraseType: type,
      });
    }, MODAL_HIDE_TIMEOUT_250);
  };

  const handleEmailLogin = async (
    provider: Web3Auth,
    providerType: ProviderType,
  ) => {
    console.log('Logging in');
    await provider.login({
      loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
      extraLoginOptions: {
        login_hint: email,
      },
      mfaLevel: MFA_LEVELS.MANDATORY,
    });
    if (provider.connected) {
      const connectionType =
        providerType === ProviderType.ETHEREUM
          ? ConnectionTypes.SOCIAL_LOGIN_EVM
          : ConnectionTypes.SOCIAL_LOGIN_SOLANA;
      const userInfo = provider.userInfo() as AuthUserInfo;
      hdWalletContext.dispatch({
        type: 'SET_SOCIAL_AUTH',
        value: {
          socialAuth: {
            connectionType,
            web3Auth: provider,
            userInfo,
          },
        },
      });

      let _privateKey = (await provider.provider?.request({
        method: 'eth_private_key',
      })) as string;

      if (!_privateKey) {
        return;
      }

      if (!_privateKey.startsWith('0x')) {
        _privateKey = '0x' + _privateKey;
      }

      if (_privateKey.length === 66 && isValidPrivateKey(_privateKey)) {
        await importWalletPrivateKey(hdWalletContext, _privateKey);
        void setConnectionType(connectionType);
      }
    }
  };

  const googleLogin = async (provider: Web3Auth) => {
    console.log('Logging in');

    await provider.login({
      loginProvider: LOGIN_PROVIDER.GOOGLE,
      mfaLevel: MFA_LEVELS.MANDATORY,
    });
    if (provider.connected) {
      const connectionType =
        providerType === ProviderType.ETHEREUM
          ? ConnectionTypes.SOCIAL_LOGIN_EVM
          : ConnectionTypes.SOCIAL_LOGIN_SOLANA;
      const userInfo = provider.userInfo() as AuthUserInfo;
      hdWalletContext.dispatch({
        type: 'SET_SOCIAL_AUTH',
        value: {
          socialAuth: {
            connectionType,
            web3Auth: provider,
            userInfo,
          },
        },
      });

      let _privateKey = (await provider.provider?.request({
        method: 'eth_private_key',
      })) as string;

      if (!_privateKey) {
        return;
      }

      if (!_privateKey.startsWith('0x')) {
        _privateKey = '0x' + _privateKey;
      }

      if (_privateKey.length === 66 && isValidPrivateKey(_privateKey)) {
        await importWalletPrivateKey(hdWalletContext, _privateKey);
        void setConnectionType(connectionType);
      }
    }
  };

  const handleSocialLogin = async () => {
    try {
      let provider;
      if (providerType === ProviderType.ETHEREUM) {
        provider = web3AuthEvm;
      } else {
        provider = web3AuthSolana;
      }
      await provider.init();
      if (!provider.ready) {
        console.log('Provider not ready');
        showModal('state', {
          type: 'error',
          title: t('UNEXPECTED_ERROR'),
          description: 'Unable to initialize Web3Auth',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      if (socialLoginMethod === SocialLoginMethod.EMAIL) {
        await handleEmailLogin(provider, providerType);
      } else if (socialLoginMethod === SocialLoginMethod.GOOGLE) {
        await googleLogin(provider);
      }
    } catch (error) {
      console.log('Error', error);
      showModal('state', {
        type: 'error',
        title: 'Unable to login',
        description: parseErrorMessage(error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  return (
    <>
      {/* select seedPhrase type */}
      <CyDModalLayout
        isModalVisible={isSelectSeedPhraseCountModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        setModalVisible={setIsSelectSeedPhraseCountModalVisible}>
        <CyDView className={'bg-n20 p-[16px] pb-[30px] rounded-t-[24px]'}>
          <CyDText className={'text-[20px] font-bold mt-[24px]'}>
            {'Create a Wallet '}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {
              'Choose a Mnemonic phrase of either 12 or 24 words \nthat you want to create!'
            }
          </CyDText>
          <CyDView className='mt-[24px] bg-n0 rounded-[8px] p-[16px]'>
            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setSelectedSeedPhraseCount(SeedPhraseType.TWELVE_WORDS);
              }}>
              <CyDText className='text-[16px] font-semibold'>
                {'12 Word Phrase'}
              </CyDText>
              <CyDView className='w-[24px] h-[24px] rounded-full'>
                {selectedSeedPhraseCount !== SeedPhraseType.TWELVE_WORDS ? (
                  <CyDView className='w-[20px] h-[20px] rounded-full bg-n30' />
                ) : (
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-[#ECAB00]'
                  />
                )}
              </CyDView>
            </CyDTouchView>

            <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setSelectedSeedPhraseCount(SeedPhraseType.TWENTY_FOUR_WORDS);
              }}>
              <CyDText className='text-[16px] font-semibold'>
                {'24 Word Phrase'}
              </CyDText>
              <CyDView className='w-[24px] h-[24px] rounded-full'>
                {selectedSeedPhraseCount !==
                SeedPhraseType.TWENTY_FOUR_WORDS ? (
                  <CyDView className='w-[20px] h-[20px] rounded-full bg-n30' />
                ) : (
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-[#ECAB00]'
                  />
                )}
              </CyDView>
            </CyDTouchView>
            <CyDView className='flex flex-row items-center gap-x-[4px] mt-[16px]'>
              <CyDMaterialDesignIcons
                name='lock'
                size={12}
                className='text-green400'
              />
              <CyDText className='text-[12px] font-medium text-green400'>
                {'Most secure '}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDTouchView
            className='flex flex-row items-center justify-center gap-x-[4px] mt-[16px] bg-p100 rounded-[30px] py-[14px]'
            onPress={() => {
              navigateToSeedPhraseGeneration(selectedSeedPhraseCount);
            }}>
            <CyDText className='text-[16px] font-bold text-black'>
              {'Continue'}
            </CyDText>
          </CyDTouchView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {'Cypher Passed security audit'}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {/* select provider type for social login */}
      <CyDModalLayout
        isModalVisible={isProviderSelectionModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        setModalVisible={setIsProviderSelectionModalVisible}>
        <CyDView className={'bg-n20 p-[16px] pb-[30px] rounded-t-[24px]'}>
          <CyDText className={'text-[20px] font-bold mt-[24px]'}>
            {'Select a Chain '}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {
              'You will be able to access the wallet based on the \nchain you pick below.'
            }
          </CyDText>
          <CyDView className='mt-[24px] bg-n0 rounded-[8px] p-[16px]'>
            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setProviderType(ProviderType.ETHEREUM);
              }}>
              <CyDView className='flex flex-row items-center gap-x-[4px]'>
                <CyDImage
                  source={AppImages.ETHEREUM}
                  className='w-[24px] h-[24px]'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {'Ethereum'}
                </CyDText>
              </CyDView>
              <CyDView className='w-[24px] h-[24px] rounded-full'>
                {providerType !== ProviderType.ETHEREUM ? (
                  <CyDView className='w-[20px] h-[20px] rounded-full bg-n30' />
                ) : (
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-[#ECAB00]'
                  />
                )}
              </CyDView>
            </CyDTouchView>

            <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setProviderType(ProviderType.SOLANA);
              }}>
              <CyDView className='flex flex-row items-center gap-x-[4px]'>
                <CyDImage
                  source={AppImages.SOLANA_LOGO}
                  className='w-[24px] h-[24px]'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {'Solana'}
                </CyDText>
              </CyDView>
              <CyDView className='w-[24px] h-[24px] rounded-full'>
                {providerType !== ProviderType.SOLANA ? (
                  <CyDView className='w-[20px] h-[20px] rounded-full bg-n30' />
                ) : (
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-[#ECAB00]'
                  />
                )}
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDTouchView
            className='flex flex-row items-center justify-center gap-x-[4px] mt-[16px] bg-p100 rounded-[30px] py-[14px]'
            onPress={() => {
              void handleSubmit();
            }}>
            <CyDText className='text-[16px] font-bold text-black'>
              {'Continue'}
            </CyDText>
          </CyDTouchView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {'Cypher Passed security audit'}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {/* select provider type for social login */}
      <CyDModalLayout
        isModalVisible={isImportWalletModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        setModalVisible={setIsImportWalletModalVisible}>
        <CyDView className={'bg-n20 p-[16px] pb-[30px] rounded-t-[24px]'}>
          <CyDText className={'text-[20px] font-bold mt-[24px]'}>
            {'Import Wallet Options '}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {
              'You can import your wallet using either a seed phrase \nor a private key.'
            }
          </CyDText>
          <CyDView className='mt-[24px] bg-n0 rounded-[8px] p-[16px]'>
            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setIsImportWalletModalVisible(false);
                navigation.navigate(screenTitle.ENTER_KEY);
              }}>
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDMaterialDesignIcons
                  name='seed'
                  size={24}
                  className='text-base400'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {'Import Seed Phrase'}
                </CyDText>
              </CyDView>
            </CyDTouchView>

            <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setIsImportWalletModalVisible(false);
                navigation.navigate(screenTitle.ENTER_PRIVATE_KEY);
              }}>
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDMaterialDesignIcons
                  name='key-variant'
                  size={24}
                  className='text-base400'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {'Import Private Key'}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {'Cypher Passed security audit'}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDView
        className='flex-1 bg-[#F74555]'
        style={{ paddingTop: inset.top }}>
        <CyDText className='mx-[36px] mt-[40px] mb-[50px] text-[32px] font-bold font-nord'>
          {"LET'S \nGET STARTED"}
        </CyDText>
        <CyDView className='flex-1 rounded-t-[30px] bg-n0 py-[24px] px-[22px] bg-n20'>
          <CyDText className='text-[18px] font-semibold text-center'>
            {'Log in or Sign up'}
          </CyDText>
          <CyDView className='mt-[24px]'>
            <CyDText className='text-[12px] font-medium text-n200'>
              {'Login with Email'}
            </CyDText>
            <CyDView className='mt-[6px] flex-row items-center border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0'>
              <TextInput
                className='flex-1 text-[14px] text-base400'
                placeholder='Enter your email address'
                placeholderClassName='text-n90 text-[14px]'
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
              />
              {email.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSocialLoginMethod(SocialLoginMethod.EMAIL);
                    setIsProviderSelectionModalVisible(true);
                  }}>
                  <CyDMaterialDesignIcons
                    name='arrow-right-circle'
                    size={17}
                    className='text-n200'
                  />
                </TouchableOpacity>
              )}
            </CyDView>
            <CyDTouchView
              className='mt-[12px] border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0 flex-row items-center justify-center gap-[4px]'
              onPress={() => {
                setSocialLoginMethod(SocialLoginMethod.GOOGLE);
                setIsProviderSelectionModalVisible(true);
              }}>
              <CyDImage
                source={AppImages.GOOGLE_LOGO}
                className='w-[17px] h-[17px]'
              />
              <CyDText className='text-[12px] font-medium text-base400'>
                {'Sign in with Google'}
              </CyDText>
            </CyDTouchView>

            <CyDView className='my-[16px] flex-row items-center justify-center gap-[4px]'>
              <CyDView className='flex-1 h-[1px] bg-n30' />
              <CyDText className='text-[12px] font-medium text-n200'>
                {'or'}
              </CyDText>
              <CyDView className='flex-1 h-[1px] bg-n30' />
            </CyDView>

            <CyDView className='bg-n30 p-[16px] rounded-[8px]'>
              {/* create wallet */}
              <CyDTouchView
                className='flex flex-row items-center justify-between'
                onPress={() => {
                  setIsSelectSeedPhraseCountModalVisible(true);
                }}>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDImage
                    source={AppImages.CREATE_WALLET}
                    className='w-[30px] h-[30px]'
                  />
                  <CyDText className='text-[16px] font-medium'>
                    {'Create New Wallet'}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-right'
                  size={24}
                  className='text-n200'
                />
              </CyDTouchView>
              <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

              {/* import wallet */}
              <CyDTouchView
                className='flex flex-row items-center justify-between'
                onPress={() => {
                  setIsImportWalletModalVisible(true);
                }}>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDImage
                    source={AppImages.IMPORT_WALLET}
                    className='w-[30px] h-[30px]'
                  />
                  <CyDText className='text-[16px] font-medium'>
                    {'Import Wallet'}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-right'
                  size={24}
                  className='text-n200'
                />
              </CyDTouchView>
              <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

              {/* connect wallet */}
              <CyDTouchView
                className='flex flex-row items-center justify-between'
                onPress={() => {
                  void openWalletConnectModal();
                  void analytics().logEvent('connect_using_wallet_connect', {});
                }}>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDImage
                    source={AppImages.CONNECT_WALLET}
                    className='w-[30px] h-[30px]'
                  />
                  <CyDText className='text-[16px] font-medium'>
                    {'Connect Wallet'}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-right'
                  size={24}
                  className='text-n200'
                />
              </CyDTouchView>
            </CyDView>

            <CyDView className='my-[16px] flex-row items-center justify-center gap-[4px]'>
              <CyDView className='flex-1 h-[1px] bg-n30' />
              <CyDText className='text-[12px] font-medium text-n200'>
                {'or'}
              </CyDText>
              <CyDView className='flex-1 h-[1px] bg-n30' />
            </CyDView>

            <CyDTouchView
              className='mt-[12px] border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0 flex-row items-center justify-center gap-[4px]'
              onPress={() => {
                navigation.navigate(screenTitle.TRACK_WALLET_SCREEN);
              }}>
              <CyDMaterialDesignIcons
                name='target'
                size={20}
                className='text-base400'
              />
              <CyDText className='text-[12px] font-medium text-base400'>
                {'Track Wallet'}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
