import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import Web3Auth, {
  LOGIN_PROVIDER,
  MFA_LEVELS,
} from '@web3auth/react-native-sdk';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Keyboard, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../assets/images/appImages';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import CyDModalLayout from '../../components/v2/modal';
import { screenTitle } from '../../constants';
import { ConnectionTypes, SeedPhraseType } from '../../constants/enum';
import {
  importWalletFromEvmPrivateKey,
  importWalletFromSolanaPrivateKey,
} from '../../core/HdWallet';
import { setConnectionType } from '../../core/asyncStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HdWalletContext,
  isValidPrivateKey,
  parseErrorMessage,
} from '../../core/util';
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
import useConnectionManager from '../../hooks/useConnectionManager';
import useAxios from '../../core/HttpRequest';
import Toast from 'react-native-toast-message';
import WalletConnectStatus from './WalletConnectStatus';

/**
 * AsyncStorage key for persisting WalletConnect flow state during app backgrounding
 * This ensures the WalletConnect status screen persists across redirects to external wallet apps
 */
const WALLET_CONNECT_FLOW_KEY = 'ONBOARDING_WALLET_CONNECT_FLOW_ACTIVE';

enum ProviderType {
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
}

enum SocialLoginMethod {
  EMAIL = 'email',
  GOOGLE = 'google',
  APPLE = 'apple',
}

// Skeleton Loader Component for reward amount
const SkeletonLoader: React.FC = () => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(prev => (prev === 1 ? 0.3 : 1));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <CyDView
      style={{ opacity }}
      className='bg-p200 rounded-[8px] w-[60px] h-[38px]'
    />
  );
};

// RewardCard Component
interface RewardCardProps {
  timeLeft: {
    minutes: number;
    seconds: number;
  };
  formatTime: (minutes: number, seconds: number) => string;
  rewardAmount: number;
  isLoadingReward?: boolean;
  containerStyle?: string;
}

const RewardCard: React.FC<RewardCardProps> = ({
  timeLeft,
  formatTime,
  rewardAmount,
  isLoadingReward = false,
  containerStyle = 'bg-p100 rounded-[12px] p-[16px] mb-[40px]',
}) => {
  const { t } = useTranslation();

  return (
    <CyDView className={containerStyle}>
      {/* Top Section */}
      <CyDView className='mb-[20px]'>
        <CyDText className='text-black text-[14px] font-bold mb-[4px]'>
          {t('SIGN_UP_CYPHER_CARD_AND_CLAIM')}
        </CyDText>
        <CyDView className='flex-row justify-between items-start'>
          <CyDView className='flex-row items-center pr-[4px]'>
            <CyDView className='mr-[8px] relative'>
              <CyDImage
                source={AppImages.CYPR_TOKEN}
                className='w-[28px] h-[28px]'
                resizeMode='contain'
              />
              <CyDImage
                source={AppImages.BASE_LOGO}
                className='absolute -bottom-[1px] -right-[3px] w-[14px] h-[14px]'
                resizeMode='contain'
              />
            </CyDView>
            {isLoadingReward ? (
              <SkeletonLoader />
            ) : (
              <CyDText className='text-black text-[28px] font-bold'>
                {rewardAmount}
              </CyDText>
            )}
          </CyDView>
          <CyDText className='text-black text-[28px] font-bold mb-[1px]'>
            🤑
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Divider */}
      <CyDView className='h-[1px] bg-p400 mb-[16px]' />

      {/* Bottom Section */}
      <CyDView className='flex-row justify-between items-center'>
        <CyDText className='text-black text-[14px] font-bold flex-1 mr-[8px]'>
          {t('SIGN_UP_NOW_AND_WIN_A_CHANCE_TO_UNLOCK')}
        </CyDText>
        {/* <CyDTouchView className='flex-row bg-p30 rounded-full py-[8px] px-[12px] items-center'>
          <CyDMaterialDesignIcons
            name='clock-outline'
            size={20}
            className='text-black mr-[3px]'
          />
          <CyDText className='text-black text-[14px] font-bold'>
            {formatTime(timeLeft.minutes, timeLeft.seconds)}
          </CyDText>
        </CyDTouchView> */}
      </CyDView>
    </CyDView>
  );
};

export default function OnBoardingOptions() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { showModal, hideModal } = useGlobalModalContext();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();
  const { openWalletConnectModal } = useConnectionManager();
  const { getWithoutAuth } = useAxios();
  const inset = useSafeAreaInsets();

  const [loading, setLoading] = useState<boolean>(false);
  const [showEmailScreen, setShowEmailScreen] = useState(false);
  const [showWalletScreen, setShowWalletScreen] = useState(false);
  const [showWalletConnectStatus, setShowWalletConnectStatus] =
    useState<boolean>(false);
  // Loading state to prevent flash of wrong screen while checking AsyncStorage
  const [isCheckingWalletConnectFlow, setIsCheckingWalletConnectFlow] =
    useState<boolean>(true);
  const [email, setEmail] = useState('');
  const [isProviderSelectionModalVisible, setIsProviderSelectionModalVisible] =
    useState<boolean>(false);
  const [
    isSelectSeedPhraseCountModalVisible,
    setIsSelectSeedPhraseCountModalVisible,
  ] = useState<boolean>(false);
  const [isImportWalletModalVisible, setIsImportWalletModalVisible] =
    useState<boolean>(false);
  const [selectedSeedPhraseCount, setSelectedSeedPhraseCount] =
    useState<SeedPhraseType>(SeedPhraseType.TWELVE_WORDS);
  const [providerType, setProviderType] = useState<ProviderType>(
    ProviderType.ETHEREUM,
  );
  const [socialLoginMethod, setSocialLoginMethod] = useState<SocialLoginMethod>(
    SocialLoginMethod.EMAIL,
  );

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    minutes: 59,
    seconds: 32,
  });

  // Holds the total possible rewards fetched from public onboarding rewards API
  const [totalPossibleRewards, setTotalPossibleRewards] = useState<number>(0);
  // Loading state for rewards API call
  const [isLoadingRewards, setIsLoadingRewards] = useState<boolean>(true);

  /**
   * Check and restore WalletConnect flow state on initial mount
   * This ensures the correct screen shows immediately without flashing the wrong screen
   */
  useEffect(() => {
    const checkWalletConnectFlow = async () => {
      try {
        const flowActive = await AsyncStorage.getItem(WALLET_CONNECT_FLOW_KEY);
        if (flowActive === 'true') {
          setShowWalletScreen(true);
          setShowWalletConnectStatus(true);
        }
      } catch (error) {
        console.error(
          '[OnboardingOptions] Failed to check WalletConnect flow state:',
          error,
        );
      } finally {
        // Always set loading to false after check completes
        setIsCheckingWalletConnectFlow(false);
      }
    };

    void checkWalletConnectFlow();
  }, []);

  /**
   * Restore WalletConnect flow state when screen comes into focus (after initial mount)
   * This ensures the WalletConnect status screen is shown after app returns from background
   * (e.g., after redirecting to external wallet app for connection/signing)
   */
  useFocusEffect(
    useCallback(() => {
      // Skip the first mount since useEffect handles it
      if (isCheckingWalletConnectFlow) {
        return;
      }

      const restoreWalletConnectFlow = async () => {
        try {
          const flowActive = await AsyncStorage.getItem(
            WALLET_CONNECT_FLOW_KEY,
          );
          if (flowActive === 'true') {
            setShowWalletScreen(true);
            setShowWalletConnectStatus(true);
          }
        } catch (error) {
          console.error(
            '[OnboardingOptions] Failed to restore WalletConnect flow state:',
            error,
          );
        }
      };

      void restoreWalletConnectFlow();
    }, [isCheckingWalletConnectFlow]),
  );

  // Fetch onboarding rewards info on component mount
  useEffect(() => {
    const fetchRewardsInfo = async () => {
      try {
        setIsLoadingRewards(true);
        const res = await getWithoutAuth('/v1/cards/onboarding-rewards/info');
        const { data, isError, error } = res;
        if (!isError && data?.totalPossibleRewards !== undefined) {
          setTotalPossibleRewards(data.totalPossibleRewards);
        }
        if (isError) {
          throw error;
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text2: parseErrorMessage(error),
        });
      } finally {
        setIsLoadingRewards(false);
      }
    };

    void fetchRewardsInfo();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        const { minutes, seconds } = prevTime;

        if (minutes === 0 && seconds === 0) {
          return { minutes: 0, seconds: 0 };
        }

        if (seconds === 0) {
          return { minutes: minutes - 1, seconds: 59 };
        } else {
          return { minutes, seconds: seconds - 1 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time for display
  const formatTime = (minutes: number, seconds: number) => {
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    return `${formattedMinutes}M : ${formattedSeconds}S`;
  };

  const handleContinueWithEmail = () => {
    setShowEmailScreen(true);
  };

  const handleContinueWithWallets = () => {
    setShowWalletScreen(true);
  };

  const handleTrackAddress = () => {
    navigation.navigate(screenTitle.TRACK_WALLET_SCREEN);
  };

  const handleBackFromEmail = () => {
    setShowEmailScreen(false);
  };

  const handleBackFromWallet = () => {
    setShowWalletScreen(false);
    setShowWalletConnectStatus(false);
  };

  const navigateToSeedPhraseGeneration = (type: string) => {
    setIsSelectSeedPhraseCountModalVisible(false);
    setLoading(true);
    setTimeout(() => {
      navigation.navigate(screenTitle.CREATE_SEED_PHRASE, {
        seedPhraseType: type,
      });
      setLoading(false);
    }, 250);
  };

  const handleCreateNewWallet = () => {
    setIsSelectSeedPhraseCountModalVisible(true);
  };

  const handleImportWallet = () => {
    setIsImportWalletModalVisible(true);
  };

  /**
   * Initiates WalletConnect flow and persists flow state to survive app backgrounding
   * This ensures the status screen persists when app redirects to external wallet
   */
  const handleConnectWallet = async () => {
    try {
      // Persist WalletConnect flow state before showing the status screen
      // This will survive app backgrounding during redirects to external wallet apps
      await AsyncStorage.setItem(WALLET_CONNECT_FLOW_KEY, 'true');

      // Navigate into the WalletConnect status view, which will in turn
      // trigger the WalletConnect mobile flow and show connection progress.
      setShowWalletConnectStatus(true);
    } catch (error) {
      console.error(
        '[OnboardingOptions] Failed to persist WalletConnect flow state:',
        error,
      );
      // Still show the screen even if persistence fails
      setShowWalletConnectStatus(true);
    }
  };

  const handleEmailContinue = () => {
    if (email.trim()) {
      setSocialLoginMethod(SocialLoginMethod.EMAIL);
      setIsProviderSelectionModalVisible(true);
    }
  };

  const handleGoogleLogin = () => {
    setSocialLoginMethod(SocialLoginMethod.GOOGLE);
    setIsProviderSelectionModalVisible(true);
  };

  /**
   * Initiates the Apple social login flow
   * Sets the social login method to Apple and shows the provider selection modal
   */
  const handleAppleLogin = () => {
    setSocialLoginMethod(SocialLoginMethod.APPLE);
    setIsProviderSelectionModalVisible(true);
  };

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
          throw new Error(
            t('INVALID_ETHEREUM_PRIVATE_KEY', 'Invalid Ethereum private key'),
          );
        }
        logAnalyticsToFirebase(AnalyticEvent.SOCIAL_LOGIN_EVM, {
          from:
            socialLoginMethod === SocialLoginMethod.EMAIL
              ? 'email'
              : socialLoginMethod === SocialLoginMethod.GOOGLE
                ? 'google'
                : 'apple',
        });
      } else if (providerType === ProviderType.SOLANA) {
        _privateKey = (await provider.provider.request({
          method: 'solanaPrivateKey',
        })) as string;
        const base58privatekey = bs58.encode(Buffer.from(_privateKey, 'hex'));
        if (!_privateKey || _privateKey.length === 0) {
          throw new Error(
            t('INVALID_SOLANA_PRIVATE_KEY', 'Invalid Solana private key'),
          );
        }
        await importWalletFromSolanaPrivateKey(
          hdWalletContext,
          base58privatekey,
        );
        logAnalyticsToFirebase(AnalyticEvent.SOCIAL_LOGIN_SOLANA, {
          from:
            socialLoginMethod === SocialLoginMethod.EMAIL
              ? 'email'
              : socialLoginMethod === SocialLoginMethod.GOOGLE
                ? 'google'
                : 'apple',
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
      mfaLevel: MFA_LEVELS.NONE,
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
      mfaLevel: MFA_LEVELS.NONE,
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
      mfaLevel: MFA_LEVELS.NONE,
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
          description: t(
            'UNABLE_TO_INITIALIZE_WEB3AUTH',
            'Unable to initialize Web3Auth',
          ),
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
        title: t('UNABLE_TO_LOGIN', 'Unable to login'),
        description: errorMessage,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  // Show loading while checking if WalletConnect flow is active to prevent flash of wrong screen
  if (loading || isCheckingWalletConnectFlow) {
    return <Loading />;
  }

  // Render email screen if showEmailScreen is true
  if (showEmailScreen) {
    return (
      <>
        {/* Provider Selection Modal */}
        <CyDModalLayout
          isModalVisible={isProviderSelectionModalVisible}
          style={styles.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
          setModalVisible={setIsProviderSelectionModalVisible}>
          <CyDView className={'bg-base40 p-[16px] pb-[30px] rounded-t-[24px]'}>
            <CyDText className={'text-[20px] font-bold mt-[24px]'}>
              {'Select a Chain '}
            </CyDText>
            <CyDText className='mt-[2px] text-n200 text-[12px]'>
              {
                'You will be able to access the wallet based on the \nnetwork you pick below.'
              }
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
                      {'Ethereum (EVM)'}
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
                      'You can card load, send and receive tokens from 7 Network',
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
                    {t('SOLANA', 'Solana')}
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
                {t('CONTINUE', 'Continue')}
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

        <CyDView className='flex-1 bg-p300' style={{ paddingTop: inset.top }}>
          <CyDKeyboardAwareScrollView className='flex-1 bg-base40'>
            {/* Header Section */}
            <CyDView className='bg-p300 px-[24px] pt-[224px] pb-[24px] mt-[-200px]'>
              {/* Title */}
              <CyDText className='text-white text-[16px] font-bold mb-[20px]'>
                Exclusive offer Just for you
              </CyDText>

              {/* Reward Card */}
              <RewardCard
                timeLeft={timeLeft}
                formatTime={formatTime}
                rewardAmount={totalPossibleRewards}
                isLoadingReward={isLoadingRewards}
              />
            </CyDView>

            <CyDView className='bg-base40 rounded-t-[32px] px-[16px] py-[24px] mt-[-24px]'>
              {/* Email Form Section */}
              <CyDView className='flex flex-col mb-[48px]'>
                {/* Header */}
                <CyDTouchView
                  onPress={handleBackFromEmail}
                  className='bg-n0 flex-row items-center mb-[8px] rounded-full py-[6px] px-[8px] self-start'>
                  <CyDMaterialDesignIcons
                    name='chevron-left'
                    size={24}
                    className='text-base400 ml-[-6px]'
                  />
                  <CyDText className='text-base400 text-[16px] font-medium'>
                    Back
                  </CyDText>
                </CyDTouchView>

                <CyDText className='text-base400 text-[28px] font-bold mb-[4px]'>
                  {t('CONTINUE_WITH_EMAIL')}
                </CyDText>
                <CyDText className='text-n200 text-[14px] mb-[32px]'>
                  {t(
                    'WE_WILL_USE_THIS_TO_SIGN_YOU_IN_OR_CREATE_AN_ACCOUNT',
                    t('ONBOARDING_WE_USE_THIS_TO_SIGN_IN'),
                  )}
                </CyDText>

                {/* Email Input */}
                <CyDText className='text-n200 text-[12px] font-medium mb-[6px]'>
                  {t('EMAIL')}
                </CyDText>
                <CyDView className='bg-n20 rounded-[8px] mb-[12px]'>
                  <CyDTextInput
                    className='text-primaryText bg-n20 text-[18px] py-[16px] px-[16px] rounded-[8px]'
                    placeholder={t('ONBOARDING_EMAIL_PLACEHOLDER')}
                    placeholderTextColor='#8993A4'
                    value={email}
                    onChangeText={setEmail}
                    keyboardType='email-address'
                    autoCapitalize='none'
                    returnKeyType='done'
                    onSubmitEditing={() => {
                      handleEmailContinue();
                      Keyboard.dismiss();
                    }}
                  />
                </CyDView>

                {/* Continue Button */}
                <CyDTouchView
                  onPress={handleEmailContinue}
                  className={`rounded-full py-[16px] px-[24px] mb-[24px] bg-n0`}>
                  <CyDText
                    className={`text-[18px] font-bold text-center ${
                      email.trim() ? 'text-primaryText' : 'text-n90'
                    }`}>
                    {t('CONTINUE')}
                  </CyDText>
                </CyDTouchView>

                {/* OR Divider */}
                <CyDView className='flex-row items-center mb-[24px]'>
                  <CyDView className='flex-1 h-[1px] bg-n40' />
                  <CyDText className='text-n90 text-[14px] font-bold mx-[16px]'>
                    OR
                  </CyDText>
                  <CyDView className='flex-1 h-[1px] bg-n40' />
                </CyDView>

                {/* Google Button */}
                <CyDTouchView
                  onPress={handleGoogleLogin}
                  className='flex-row items-center justify-center bg-blue-600 rounded-full py-[16px] px-[24px] mb-[16px]'>
                  <CyDView className='bg-white rounded-full p-[1px] mr-[8px]'>
                    <CyDImage
                      source={AppImages.GOOGLE_LOGO}
                      className='w-[20px] h-[20px]'
                      resizeMode='contain'
                    />
                  </CyDView>
                  <CyDText className='text-white text-[18px] font-bold'>
                    Continue with Google
                  </CyDText>
                </CyDTouchView>

                {/* Apple Button - iOS Only */}
                {Platform.OS === 'ios' && (
                  <CyDTouchView
                    onPress={handleAppleLogin}
                    className='flex-row items-center justify-center bg-black rounded-full py-[16px] px-[24px] mb-[40px]'>
                    <CyDImage
                      source={AppImages.APPLE_LOGO_GRAY}
                      className='w-[20px] h-[20px] mr-[8px]'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white text-[18px] font-bold'>
                      Continue with Apple
                    </CyDText>
                  </CyDTouchView>
                )}

                {/* Adjust bottom margin if not iOS */}
                {Platform.OS !== 'ios' && <CyDView className='mb-[24px]' />}

                {/* Security Audit */}
                <CyDView className='flex-row items-center justify-center'>
                  <CyDIcons
                    name='shield-tick'
                    size={16}
                    className='text-base400 mr-[6px]'
                  />
                  <CyDText className='text-base400 text-[12px] font-bold text-center'>
                    {t('CYPHER_AUDIT_TEXT')}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDKeyboardAwareScrollView>
        </CyDView>
      </>
    );
  }

  // Render wallet screen if showWalletScreen is true
  if (showWalletScreen) {
    if (showWalletConnectStatus) {
      return (
        <WalletConnectStatus
          onBack={async () => {
            try {
              // Clear persisted WalletConnect flow state when navigating back
              await AsyncStorage.removeItem(WALLET_CONNECT_FLOW_KEY);
            } catch (error) {
              console.error(
                '[OnboardingOptions] Failed to clear WalletConnect flow state:',
                error,
              );
            }
            // Reset states to show main onboarding options
            setShowWalletConnectStatus(false);
            setShowWalletScreen(false);
          }}
        />
      );
    }

    return (
      <>
        {/* Select SeedPhrase Count Modal */}
        <CyDModalLayout
          isModalVisible={isSelectSeedPhraseCountModalVisible}
          style={styles.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
          setModalVisible={setIsSelectSeedPhraseCountModalVisible}>
          <CyDView className={'bg-base40 p-[16px] pb-[30px] rounded-t-[24px]'}>
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
                      className='text-p100'
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
                      className='text-p100'
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
                {t('CONTINUE', 'Continue')}
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

        {/* Import Wallet Modal */}
        <CyDModalLayout
          isModalVisible={isImportWalletModalVisible}
          style={styles.modalLayout}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
          setModalVisible={setIsImportWalletModalVisible}>
          <CyDView className={'bg-base40 p-[16px] pb-[30px] rounded-t-[24px]'}>
            <CyDText className={'text-[20px] font-bold mt-[24px]'}>
              {'Import Wallet Options'}
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
                {t('CYPHER_AUDIT_TEXT')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDModalLayout>

        <CyDView className='flex-1 bg-p300' style={{ paddingTop: inset.top }}>
          <CyDKeyboardAwareScrollView className='flex-1 bg-base40'>
            {/* Header Section */}
            <CyDView className='bg-p300 px-[24px] pt-[224px] pb-[24px] mt-[-200px]'>
              {/* Title */}
              <CyDText className='text-white text-[16px] font-bold mb-[20px]'>
                Exclusive offer Just for you
              </CyDText>

              {/* Reward Card */}
              <RewardCard
                timeLeft={timeLeft}
                formatTime={formatTime}
                rewardAmount={totalPossibleRewards}
                isLoadingReward={isLoadingRewards}
              />
            </CyDView>

            {/* Wallet Options Section */}
            <CyDView className='bg-base40 rounded-t-[32px] px-[16px] py-[24px] mt-[-24px]'>
              <CyDView className='flex flex-col mb-[48px]'>
                {/* Back Button */}
                <CyDTouchView
                  onPress={handleBackFromWallet}
                  className='bg-n0 flex-row items-center mb-[8px] rounded-full py-[6px] px-[8px] self-start'>
                  <CyDMaterialDesignIcons
                    name='chevron-left'
                    size={24}
                    className='text-base400 ml-[-6px]'
                  />
                  <CyDText className='text-base400 text-[16px] font-medium'>
                    Back
                  </CyDText>
                </CyDTouchView>

                {/* Header */}
                <CyDText className='text-primaryText text-[28px] font-bold mb-[8px]'>
                  Create or{'\n'}Connect Wallet
                </CyDText>
                <CyDText className='text-n200 text-[14px] mb-[32px]'>
                  {t('ONBOARDING_IF_YOU_DONT_HAVE_WALLET')}
                </CyDText>

                {/* Create New Wallet Button */}
                <CyDTouchView
                  onPress={handleCreateNewWallet}
                  className='flex-row items-center bg-n0 rounded-full p-[16px] mb-[16px]'>
                  <CyDImage
                    source={AppImages.CREATE_WALLET}
                    className='w-[24px] h-[24px] mr-[12px]'
                    resizeMode='contain'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-primaryText text-[18px] font-medium'>
                      Create New Wallet
                    </CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={24}
                    className='text-n200'
                  />
                </CyDTouchView>

                {/* OR Divider */}
                <CyDView className='flex-row items-center mb-[16px]'>
                  <CyDView className='flex-1 h-[1px] bg-n40' />
                  <CyDText className='text-n90 text-[10px] font-bold mx-[16px]'>
                    OR
                  </CyDText>
                  <CyDView className='flex-1 h-[1px] bg-n40' />
                </CyDView>

                <CyDText className='text-n200 text-[14px] mb-[16px]'>
                  {t('ONBOARDING_IF_YOUVE_GOT_WALLET')}
                </CyDText>

                {/* Import existing wallet Button */}
                <CyDTouchView
                  onPress={handleImportWallet}
                  className='flex-row items-center bg-n0 rounded-full p-[16px] mb-[16px]'>
                  <CyDImage
                    source={AppImages.IMPORT_WALLET}
                    className='w-[24px] h-[24px] mr-[12px]'
                    resizeMode='contain'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-primaryText text-[18px] font-medium'>
                      Import Existing Wallet
                    </CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={24}
                    className='text-n200'
                  />
                </CyDTouchView>

                {/* Wallet Connect Button */}
                <CyDTouchView
                  onPress={() => {
                    void handleConnectWallet();
                  }}
                  className='flex-row items-center bg-n0 rounded-full p-[16px] mb-[40px]'>
                  <CyDImage
                    source={AppImages.WALLET_CONNECT_ICON}
                    className='w-[24px] h-[24px] mr-[12px]'
                    resizeMode='contain'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-primaryText text-[18px] font-medium'>
                      Wallet Connect
                    </CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={24}
                    className='text-n200'
                  />
                </CyDTouchView>

                {/* Security Audit */}
                <CyDView className='flex-row items-center justify-center'>
                  <CyDIcons
                    name='shield-tick'
                    size={16}
                    className='text-base400 mr-[6px]'
                  />
                  <CyDText className='text-base400 text-[12px] font-bold text-center'>
                    {t('CYPHER_AUDIT_TEXT')}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDKeyboardAwareScrollView>
        </CyDView>
      </>
    );
  }

  return (
    <>
      <CyDView className='flex-1 bg-p300' style={{ paddingTop: inset.top }}>
        <CyDKeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          className='bg-base40'>
          <CyDView className='bg-p300 px-[24px] pb-[24px] pt-[200px] mt-[-200px]'>
            {/* Main Title */}
            <CyDText className='text-white text-[32px] font-bold font-nord mb-[24px] mt-[40px]'>
              {"LET'S\nGET STARTED"}
            </CyDText>

            {/* Reward Card */}
            <RewardCard
              timeLeft={timeLeft}
              formatTime={formatTime}
              rewardAmount={totalPossibleRewards}
              isLoadingReward={isLoadingRewards}
            />
          </CyDView>

          <CyDView className='bg-base40 rounded-t-[32px] px-[16px] py-[24px] mt-[-24px]'>
            {/* Header Text */}
            <CyDView className='flex flex-col mb-[48px]'>
              <CyDView className='mb-[32px]'>
                <CyDText className='text-base400 text-[28px] font-bold mb-[3px]'>
                  Sign in or create{'\n'}an account
                </CyDText>
                <CyDText className='text-n200 text-[14px] font-bold'>
                  Dive into the world of crypto spending and score some awesome
                  rewards with Cypher!
                </CyDText>
              </CyDView>

              {/* Continue with Email Button */}
              <CyDTouchView
                onPress={handleContinueWithEmail}
                className='flex-row items-center bg-n0 border border-n40 rounded-full p-[16px] mb-[16px]'>
                <CyDView className='flex-1 flex-row items-center'>
                  <CyDMaterialDesignIcons
                    name='email-outline'
                    size={24}
                    className='text-base400 mr-[6px]'
                  />
                  <CyDText className='text-base400 text-[18px] font-medium flex-1'>
                    Continue with Email
                  </CyDText>
                </CyDView>
                <CyDMaterialDesignIcons
                  name='arrow-right'
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>

              {/* Continue with Wallets Button */}
              <CyDTouchView
                onPress={handleContinueWithWallets}
                className='flex-row items-center bg-p40 border border-n40 rounded-full p-[16px] mb-[24px]'>
                <CyDView className='flex-1 flex-row items-center mr-[12px]'>
                  <CyDMaterialDesignIcons
                    name='wallet-outline'
                    size={24}
                    className='text-black mr-[6px]'
                  />
                  <CyDText className='text-black text-[18px] font-medium flex-1'>
                    Continue with Wallets
                  </CyDText>
                </CyDView>
                <CyDMaterialDesignIcons
                  name='arrow-right'
                  size={24}
                  className='text-black'
                />
              </CyDTouchView>

              {/* OR Divider */}
              {/* <CyDView className='flex-row items-center mb-[24px]'>
                <CyDView className='flex-1 h-[1px] bg-n40 mr-[7px]' />
                <CyDText className='text-n90 text-[10px] font-bold mx-[8px]'>
                  OR
                </CyDText>
                <CyDView className='flex-1 h-[1px] bg-n40' />
              </CyDView> */}

              {/* Track Address Section */}
              {/* <CyDView className='mb-[24px]'>
                <CyDText className='text-n200 text-[12px] font-medium mb-[7px]'>
                  Track Address
                </CyDText>
                <CyDTouchView
                  onPress={handleTrackAddress}
                  className='bg-n40 rounded-[8px] py-[14px] px-[12px]'>
                  <CyDText className='text-n90 text-[18px]'>
                    Enter the wallet address
                  </CyDText>
                </CyDTouchView>
              </CyDView> */}

              {/* Security Audit */}
              <CyDView className='flex-row items-center justify-center px-[11px]'>
                <CyDIcons
                  name='shield-tick'
                  size={16}
                  className='text-base400 mr-[6px]'
                />
                <CyDText className='text-base400 text-[10px] font-bold text-center'>
                  {t('CYPHER_AUDIT_TEXT')}
                </CyDText>
              </CyDView>
            </CyDView>
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
