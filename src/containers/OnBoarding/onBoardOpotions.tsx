import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import Web3Auth, {
  LOGIN_PROVIDER,
  MFA_LEVELS,
} from '@web3auth/react-native-sdk';
import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import CyDModalLayout from '../../components/v2/modal';
import { screenTitle } from '../../constants';
import { ConnectionTypes, SeedPhraseType } from '../../constants/enum';
// import { web3AuthEvm, web3AuthSolana } from '../../constants/web3Auth';
import {
  importWalletFromEvmPrivateKey,
  importWalletFromSolanaPrivateKey,
} from '../../core/HdWallet';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { setConnectionType } from '../../core/asyncStorage';
import {
  HdWalletContext,
  isValidPrivateKey,
  parseErrorMessage,
} from '../../core/util';
import useConnectionManager from '../../hooks/useConnectionManager';
import {
  CyDIcons,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import bs58 from 'bs58';
import Loading from '../../components/v2/loading';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import useWeb3Auth from '../../hooks/useWeb3Auth';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

enum ProviderType {
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
}

const enum SocialLoginMethod {
  EMAIL = 'email',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export default function OnBoardOpotions() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { openWalletConnectModal } = useConnectionManager();
  const { showModal, hideModal } = useGlobalModalContext();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();

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
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setIsProviderSelectionModalVisible(false);
      try {
        logAnalyticsToFirebase(AnalyticEvent.INITIATE_SOCIAL_LOGIN, {
          provider: providerType === ProviderType.ETHEREUM ? 'evm' : 'solana',
          method: socialLoginMethod,
        });
        await handleSocialLogin();
      } finally {
        setLoading(false);
      }
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

  const generateWallet = async (provider: Web3Auth) => {
    if (provider.connected && provider.provider) {
      const connectionType =
        providerType === ProviderType.ETHEREUM
          ? ConnectionTypes.SOCIAL_LOGIN_EVM
          : ConnectionTypes.SOCIAL_LOGIN_SOLANA;

      let _privateKey = '';

      if (providerType === ProviderType.ETHEREUM) {
        _privateKey = (await provider.provider?.request({
          method: 'eth_private_key',
        })) as string;
        if (!_privateKey.startsWith('0x')) {
          _privateKey = '0x' + _privateKey;
        }
        if (_privateKey.length === 66 && isValidPrivateKey(_privateKey)) {
          await importWalletFromEvmPrivateKey(hdWalletContext, _privateKey);
        } else {
          throw new Error('Invalid Ethereum private key');
        }
        logAnalyticsToFirebase(AnalyticEvent.SOCIAL_LOGIN_EVM, {
          from: socialLoginMethod,
        });
      } else if (providerType === ProviderType.SOLANA) {
        _privateKey = (await provider.provider.request({
          method: 'solanaPrivateKey',
        })) as string;
        const base58privatekey = bs58.encode(Buffer.from(_privateKey, 'hex'));
        if (!_privateKey || _privateKey.length === 0) {
          throw new Error('Invalid Solana private key');
        }
        await importWalletFromSolanaPrivateKey(
          hdWalletContext,
          base58privatekey,
        );
        logAnalyticsToFirebase(AnalyticEvent.SOCIAL_LOGIN_SOLANA, {
          from: socialLoginMethod,
        });
      } else {
        return;
      }

      void setConnectionType(connectionType);
    }
  };

  const handleEmailLogin = async (provider: Web3Auth) => {
    await provider.login({
      loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
      extraLoginOptions: {
        login_hint: email,
      },
      mfaLevel: MFA_LEVELS.MANDATORY,
    });

    try {
      await generateWallet(provider);
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

  const googleLogin = async (provider: Web3Auth) => {
    await provider.login({
      loginProvider: LOGIN_PROVIDER.GOOGLE,
      mfaLevel: MFA_LEVELS.MANDATORY,
    });

    try {
      await generateWallet(provider);
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

  const appleLogin = async (provider: Web3Auth) => {
    await provider.login({
      loginProvider: LOGIN_PROVIDER.APPLE,
      mfaLevel: MFA_LEVELS.MANDATORY,
    });
    try {
      await generateWallet(provider);
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
        showModal('state', {
          type: 'error',
          title: t('UNEXPECTED_ERROR'),
          description: t('UNABLE_TO_INITIALIZE_WEB3AUTH'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      if (socialLoginMethod === SocialLoginMethod.EMAIL) {
        await handleEmailLogin(provider);
      } else if (socialLoginMethod === SocialLoginMethod.GOOGLE) {
        await googleLogin(provider);
      } else if (socialLoginMethod === SocialLoginMethod.APPLE) {
        await appleLogin(provider);
      }
    } catch (error) {
      let errorMessage = parseErrorMessage(error);
      if (errorMessage.includes('login flow failed with error type cancel')) {
        errorMessage = '';
      }
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_LOGIN'),
        description: errorMessage,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  if (loading) {
    return <Loading />;
  }

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
            {t('CREATE_A_WALLET')}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {t('CHOOSE_A_MNEMONIC_PHRASE')}
          </CyDText>
          <CyDView className='mt-[24px] bg-n0 rounded-[8px] p-[16px]'>
            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setSelectedSeedPhraseCount(SeedPhraseType.TWELVE_WORDS);
              }}>
              <CyDText className='text-[16px] font-semibold'>
                {t('TWELVE_WORD_PHRASE')}
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
                {t('TWENTY_FOUR_WORD_PHRASE')}
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
                {t('MOST_SECURE')}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDTouchView
            className='flex flex-row items-center justify-center gap-x-[4px] mt-[16px] bg-p100 rounded-[30px] py-[14px]'
            onPress={() => {
              navigateToSeedPhraseGeneration(selectedSeedPhraseCount);
            }}>
            <CyDText className='text-[16px] font-bold text-black'>
              {t('CONTINUE')}
            </CyDText>
          </CyDTouchView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {t('CYPHER_AUDIT_TEXT')}
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
            {t('SELECT_A_CHAIN')}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {t('YOU_WILL_BE_ABLE_TO_ACCESS_THE_WALLET')}
          </CyDText>
          <CyDView className='mt-[24px] bg-n0 rounded-[8px] p-[16px]'>
            <CyDView>
              <CyDTouchView
                className='flex flex-row items-center justify-between '
                onPress={() => {
                  setProviderType(ProviderType.ETHEREUM);
                }}>
                <CyDView className='flex flex-row items-center gap-x-[4px]'>
                  <CyDView className='w-[30px] h-[30px] rounded-[8px] bg-[#4575F7] flex items-center justify-center'>
                    <CyDImage
                      source={AppImages.ETHEREUM}
                      className='w-[30px] h-[30px]'
                    />
                  </CyDView>
                  <CyDText className='text-[16px] font-semibold'>
                    {t('ETHEREUM_EVM')}
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

              <CyDView>
                <CyDText className='text-[12px] font-normal text-base400 mt-[16px]'>
                  {t(
                    'YOU_CAN_CARD_LOAD_SEND_AND_RECEIVE_TOKENS_FROM_7_NETWORK',
                  )}
                </CyDText>
                <CyDView className='flex flex-row items-center gap-x-[6px] mt-[6px]'>
                  <CyDImage
                    source={AppImages.POLYGON}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.BASE_LOGO}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.ARBITRUM}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.OPTIMISM}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.BINANCE}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.AVALANCHE}
                    className='w-[24px] h-[24px]'
                  />
                  <CyDImage
                    source={AppImages.ZKSYNC_ERA_LOGO}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView className='h-[1px] bg-n40 w-full my-[16px]' />

            <CyDTouchView
              className='flex flex-row items-center justify-between '
              onPress={() => {
                setProviderType(ProviderType.SOLANA);
              }}>
              <CyDView className='flex flex-row items-center gap-x-[4px]'>
                <CyDView className='w-[30px] h-[30px] rounded-[8px] bg-base400 flex items-center justify-center'>
                  <CyDImage
                    source={AppImages.SOLANA_LOGO}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDText className='text-[16px] font-semibold'>
                  {t('SOLANA_CHAIN')}
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
              {t('CONTINUE')}
            </CyDText>
          </CyDTouchView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {t('CYPHER_AUDIT_TEXT')}
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
            {t('IMPORT_WALLET_OPTIONS')}
          </CyDText>
          <CyDText className='mt-[2px] text-n200 text-[12px]'>
            {t('YOU_CAN_IMPORT_YOUR_WALLET_USING_EITHER')}
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
                  {t('IMPORT_SEED_PHRASE')}
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
                  {t('IMPORT_PRIVATE_KEY')}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex flex-row items-center justify-center gap-x-[4px] mt-[24px]'>
            <CyDIcons name='shield-tick' size={20} className='text-base400' />
            <CyDText className='text-[12px] font-medium'>
              {t('CYPHER_AUDIT_TEXT')}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDView
        className='flex-1 bg-[#F74555]'
        style={{ paddingTop: inset.top }}>
        <CyDText className='mx-[36px] mt-[40px] mb-[50px] text-[32px] font-bold font-nord text-white'>
          {t('LETS_GET_STARTED')}
        </CyDText>
        <CyDKeyboardAwareScrollView className='flex-1 rounded-t-[30px] bg-n0 py-[24px] px-[22px] bg-n20'>
          <CyDText className='text-[18px] font-semibold text-center'>
            {t('LOGIN_SIGN_UP')}
          </CyDText>
          <CyDView className='mt-[12px] mb-[32px]'>
            <CyDText className='text-[14px] font-semibold'>
              {t('CREATE_OR_CONNECT_WALLET')}
            </CyDText>
            <CyDText className='text-[12px] text-n200 mb-[12px] font-medium'>
              {t('CREATE_OR_CONNECT_WALLET_DESCRIPTION')}
            </CyDText>
            <CyDView className='bg-n0 p-[16px] rounded-[8px]'>
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
                    {t('CREATE_NEW_WALLET')}
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
                    {t('IMPORT_WALLET')}
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
                  void logAnalyticsToFirebase(
                    AnalyticEvent.CONNECT_USING_WALLET_CONNECT,
                  );
                }}>
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  <CyDImage
                    source={AppImages.CONNECT_WALLET}
                    className='w-[30px] h-[30px]'
                  />
                  <CyDText className='text-[16px] font-medium'>
                    {t('CONNECT_WALLET')}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-right'
                  size={24}
                  className='text-n200'
                />
              </CyDTouchView>
            </CyDView>

            <CyDView className='mt-[24px] mb-[12px]'>
              <CyDText className='text-[14px] font-semibold'>
                {t('CONTINUE_WITH_EMAIL')}
              </CyDText>
              <CyDText className='text-[12px] text-n200 font-medium'>
                {t('CONTINUE_WITH_EMAIL_DESCRIPTION')}
              </CyDText>
            </CyDView>

            <CyDText className='text-[12px] font-medium text-n200'>
              {t('EMAIL')}
            </CyDText>
            <CyDView className='mt-[6px] flex-row items-center border border-n50 rounded-[8px] bg-n0'>
              <CyDTextInput
                className='flex-1 text-[18px] text-base400 py-[16px] pl-[12px] rounded-[8px] font-normal'
                placeholder={t('EMAIL_ADDRESS')}
                placeholderTextColor={'#8993A4'}
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
                returnKeyType='done'
                onSubmitEditing={() => {
                  setSocialLoginMethod(SocialLoginMethod.EMAIL);
                  setIsProviderSelectionModalVisible(true);
                  Keyboard.dismiss();
                }}
              />
              {email.length > 0 && (
                <TouchableOpacity
                  className='rounded-[5px] bg-n30 px-[12px] py-[9px] mx-[6px]'
                  onPress={() => {
                    setSocialLoginMethod(SocialLoginMethod.EMAIL);
                    setIsProviderSelectionModalVisible(true);
                  }}>
                  <CyDText className='text-[16px] font-normal'>
                    {t('NEXT')}
                  </CyDText>
                </TouchableOpacity>
              )}
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between w-full gap-x-[4px] flex-1'>
              <CyDTouchView
                className='mt-[12px] border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0 flex-row items-center justify-center gap-[4px] flex-1'
                onPress={() => {
                  setSocialLoginMethod(SocialLoginMethod.GOOGLE);
                  setIsProviderSelectionModalVisible(true);
                }}>
                <CyDText className='text-[12px] font-medium text-base400'>
                  {t('SIGN_IN_WITH')}
                </CyDText>
                <CyDImage
                  source={AppImages.GOOGLE_LOGO}
                  className='w-[17px] h-[17px]'
                />
              </CyDTouchView>
              {Platform.OS === 'ios' && (
                <CyDTouchView
                  className='mt-[12px] border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0 flex-row items-center justify-center gap-[4px] flex-1'
                  onPress={() => {
                    setSocialLoginMethod(SocialLoginMethod.APPLE);
                    setIsProviderSelectionModalVisible(true);
                  }}>
                  <CyDText className='text-[12px] font-medium text-base400'>
                    {t('SIGN_IN_WITH_APPLE')}
                  </CyDText>
                  <CyDImage
                    source={AppImages.APPLE_LOGO_GRAY}
                    className='w-[13px] h-[14px]'
                  />
                </CyDTouchView>
              )}
            </CyDView>

            <CyDView className='mt-[24px] mb-[12px]'>
              <CyDText className='text-[14px] font-semibold'>
                {t('WATCH_WALLET_READ_ONLY')}
              </CyDText>
              <CyDText className='text-[12px] text-n200 font-medium'>
                {t('WATCH_WALLET_READ_ONLY_DESCRIPTION')}
              </CyDText>
            </CyDView>

            <CyDTouchView
              className='mt-[12px] my-[24px] border border-n50 px-[12px] py-[16px] rounded-[8px] bg-n0 flex-row items-center justify-center gap-[4px]'
              onPress={() => {
                navigation.navigate(screenTitle.TRACK_WALLET_SCREEN);
              }}>
              <CyDMaterialDesignIcons
                name='target'
                size={20}
                className='text-base400'
              />
              <CyDText className='text-[12px] font-medium text-base400'>
                {t('TRACK_WALLET')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDKeyboardAwareScrollView>
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
