import React, { useEffect, useState, useContext, useRef } from 'react';
import { ActivityIndicator, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppImages from '../../../assets/images/appImages';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import useWalletConnectMobile from '../../hooks/useWalletConnectMobile';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import { Colors } from '../../constants/theme';
import { useSignMessage } from 'wagmi';
import { useWalletInfo } from '@reown/appkit-react-native';
import useAxios from '../../core/HttpRequest';
import axios from '../../core/Http';
import { hostWorker } from '../../global';
import { HdWalletContext } from '../../core/util';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { ConnectionTypes, GlobalContextType } from '../../constants/enum';
import {
  setAuthToken,
  setRefreshToken,
  setConnectionType,
} from '../../core/asyncStorage';
import useCardUtilities from '../../hooks/useCardUtilities';
import Intercom from '@intercom/intercom-react-native';
import DeviceInfo from 'react-native-device-info';
import type { AxiosError } from 'axios';
import { retryOnNetworkError } from '../../utils/walletConnectModalUtils';

/**
 * AsyncStorage key for persisting WalletConnect flow state during app backgrounding
 * Must match the key used in OnBoardingOptions
 */
const WALLET_CONNECT_FLOW_KEY = 'ONBOARDING_WALLET_CONNECT_FLOW_ACTIVE';

interface WalletConnectStatusProps {
  /**
   * Callback fired when the user taps the back button.
   * The parent is responsible for handling navigation away from this screen.
   */
  onBack: () => void;
}

const formatAddressPreview = (address?: string): string => {
  if (!address || address.length < 10) {
    return 'your wallet';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const WalletConnectStatus: React.FC<WalletConnectStatusProps> = ({
  onBack,
}: WalletConnectStatusProps): React.ReactElement => {
  const { t } = useTranslation();
  const hdWalletContext = useContext(HdWalletContext);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const {
    openWalletConnectModal,
    disconnectWalletConnect,
    isConnected,
    isConnecting,
    address,
  } = useWalletConnectMobile();
  const { walletInfo } = useWalletInfo();
  const { getWithoutAuth } = useAxios();
  const { getWalletProfile } = useCardUtilities();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [hasOpenedModal, setHasOpenedModal] = useState<boolean>(false);
  const [hasTriggeredSigning, setHasTriggeredSigning] =
    useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signatureRejected, setSignatureRejected] = useState<boolean>(false);
  const [signatureSuccess, setSignatureSuccess] = useState<boolean>(false);
  const [verificationFailed, setVerificationFailed] = useState<boolean>(false);
  const [verificationErrorMessage, setVerificationErrorMessage] =
    useState<string>('');
  const blinkOpacity = useRef(new Animated.Value(1)).current;

  /**
   * Load HD wallet from WalletConnect address
   * This creates the wallet structure in the app context
   */
  const loadHdWallet = async (): Promise<void> => {
    try {
      if (!address) {
        console.error(
          '[WalletConnectStatus] Missing wallet address while loading HD wallet',
        );
        return;
      }
      void setConnectionType(ConnectionTypes.WALLET_CONNECT);
      hdWalletContext?.dispatch({
        type: 'LOAD_WALLET',
        value: {
          address: String(address).toLowerCase(),
          chain: 'ethereum',
          publicKey: '',
          algo: '',
        },
      });
    } catch (error) {
      console.error('[WalletConnectStatus] Error loading HD wallet:', error);
    }
  };

  /**
   * Dispatch profile data after successful authentication
   * Retrieves and stores card profile information
   */
  const dispatchProfileData = async (authToken: string): Promise<void> => {
    try {
      const profileData = await getWalletProfile(authToken);
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: profileData,
      });
    } catch (error) {
      console.error(
        '[WalletConnectStatus] Error dispatching profile data:',
        error,
      );
    }
  };

  /**
   * Register user with Intercom for support
   * Includes device and wallet information
   */
  const registerIntercomUser = (): void => {
    try {
      if (!address) {
        return;
      }
      const walletAddress = String(address).toLowerCase();

      Intercom.loginUserWithUserAttributes({
        userId: walletAddress,
      }).catch(() => {
        // throws error if user is already registered
      });
      Intercom.updateUser({
        userId: walletAddress,
        customAttributes: {
          version: DeviceInfo.getVersion(),
        },
      }).catch(() => {
        // throws error if user is already registered
      });
    } catch (error) {
      console.error(
        '[WalletConnectStatus] Error registering Intercom user:',
        error,
      );
    }
  };

  // Sign message hook with success and error callbacks
  const { signMessageAsync } = useSignMessage({
    mutation: {
      async onSuccess(signature: string) {
        try {
          setVerificationFailed(false);
          setVerificationErrorMessage('');
          const verifyUrl = `${ARCH_HOST}/v1/authentication/verify-message/${String(
            address,
          ).toLowerCase()}?format=ERC-4361`;
          const verifyMessageResponse = await retryOnNetworkError(
            async () => await axios.post(verifyUrl, { signature }),
          );

          if (verifyMessageResponse?.data?.token) {
            const { token, refreshToken } = verifyMessageResponse.data;

            // Mark signature as successful
            setSignatureSuccess(true);
            setSignatureRejected(false);

            // Update global state with auth token
            globalContext.globalDispatch({
              type: GlobalContextType.SIGN_IN,
              sessionToken: token,
            });

            // Store auth tokens - AWAIT these to ensure persistence before navigation
            await setAuthToken(token);
            await setRefreshToken(refreshToken);

            // Set connection type
            await setConnectionType(ConnectionTypes.WALLET_CONNECT);

            // Clear the WalletConnect flow state immediately after successful auth persistence
            // This ensures that if the app restarts, we don't try to resume the onboarding flow
            await AsyncStorage.removeItem(WALLET_CONNECT_FLOW_KEY);

            // Dispatch profile data
            await dispatchProfileData(String(token));

            // Register Intercom user
            registerIntercomUser();

            // Load HD wallet - this will trigger InitializeAppProvider to navigate to portfolio
            // This must be the last step as it triggers navigation/unmount
            await loadHdWallet();
          } else {
            console.error(
              '[WalletConnectStatus] Verification failed, no token received',
            );
            setVerificationFailed(true);
            setVerificationErrorMessage('Verification failed (no token).');
          }
        } catch (error) {
          console.error(
            '[WalletConnectStatus] Error during signature verification:',
            error,
          );
          const axiosErr = error as AxiosError | undefined;
          if (axiosErr && typeof (axiosErr as any).isAxiosError === 'boolean') {
            // A "Network Error" here means we couldn't reach the backend at all
            // (no HTTP response). This is not a signature rejection.
            if (!(axiosErr as any).response) {
              setVerificationFailed(true);
              setVerificationErrorMessage(
                'Network error while verifying signature. Please check connectivity/VPN and try again.',
              );
              return;
            }
          }
          setVerificationFailed(true);
          setVerificationErrorMessage(
            (error as Error)?.message ?? 'Verification error',
          );
        }
      },
      onError(error: Error) {
        console.error(
          '[WalletConnectStatus] Signature rejected or failed:',
          error,
        );

        // Mark signature as rejected
        setSignatureRejected(true);
        setSignatureSuccess(false);
        setVerificationFailed(false);
        setVerificationErrorMessage('');

        // Log analytics for rejection
        void logAnalyticsToFirebase(
          AnalyticEvent.WALLET_CONNECT_SIGNATURE_REJECTED,
          {
            from: walletInfo?.name ?? 'unknown',
            error: error.message,
          },
        );
      },
    },
  });

  // Kick off the WalletConnect mobile connect flow as soon as this screen mounts.
  useEffect(() => {
    if (!hasOpenedModal) {
      setHasOpenedModal(true);
      void logAnalyticsToFirebase(AnalyticEvent.CONNECT_USING_WALLET_CONNECT);
      void openWalletConnectModal();
    }
  }, [hasOpenedModal, openWalletConnectModal]);

  /**
   * Trigger signing flow when connection is established
   * This requests a signature from the connected wallet for authentication
   */
  useEffect(() => {
    const triggerSigningFlow = async () => {
      // Only trigger signing once when connection is established
      if (!isConnected || !address || hasTriggeredSigning || isSigning) {
        return;
      }

      try {
        setHasTriggeredSigning(true);
        setIsSigning(true);

        // Get the message to sign from the API
        const response = await getWithoutAuth(
          `/v1/authentication/sign-message/${String(address)}`,
          { format: 'ERC-4361' },
        );

        if (!response.isError && response?.data?.message) {
          const message = response.data.message;

          // Request signature from the connected wallet
          await signMessageAsync({ message });

          // Log analytics
          void logAnalyticsToFirebase(AnalyticEvent.SIGN_WALLET_CONNECT_MSG, {
            from: walletInfo?.name ?? 'unknown',
          });
        } else {
          console.error(
            '[WalletConnectStatus] Failed to get sign message from API:',
            response,
          );
        }
      } catch (error) {
        console.error(
          '[WalletConnectStatus] Error during signing flow:',
          error,
        );
      } finally {
        setIsSigning(false);
      }
    };

    void triggerSigningFlow();
  }, [
    isConnected,
    address,
    hasTriggeredSigning,
    isSigning,
    getWithoutAuth,
    signMessageAsync,
    walletInfo,
  ]);

  /**
   * Smooth blink animation effect for the wallet redirection message
   * Fades in and out smoothly to draw user attention
   * Shows during stage 1 (connecting) and stage 2 (signing) only; not during stage 3 (loading)
   */
  useEffect(() => {
    const isStage1 = hasOpenedModal && !isConnected;
    const isStage2 = hasTriggeredSigning && isSigning;
    const shouldShowMessage = (isStage1 || isStage2) && !signatureSuccess;

    if (!shouldShowMessage) {
      return;
    }

    // Create smooth fade in/out animation
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkOpacity, {
          toValue: 0.3,
          duration: 1000, // 1 second to fade out
          useNativeDriver: true,
        }),
        Animated.timing(blinkOpacity, {
          toValue: 1,
          duration: 1000, // 1 second to fade in
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
      // Reset opacity when hiding
      blinkOpacity.setValue(1);
    };
  }, [
    hasOpenedModal,
    isConnected,
    hasTriggeredSigning,
    isSigning,
    signatureSuccess,
    blinkOpacity,
  ]);

  /**
   * Retry the signing flow after rejection or failure
   * Resets error states and triggers signature request again
   */
  const handleRetrySignature = async (): Promise<void> => {
    try {
      if (!address) {
        return;
      }

      // Reset error states
      setSignatureRejected(false);
      setSignatureSuccess(false);
      setVerificationFailed(false);
      setVerificationErrorMessage('');
      setIsSigning(true);

      // Log retry analytics
      void logAnalyticsToFirebase(
        AnalyticEvent.WALLET_CONNECT_RETRY_SIGNATURE,
        {
          from: walletInfo?.name ?? 'unknown',
        },
      );

      // Get the message to sign from the API
      const response = await getWithoutAuth(
        `/v1/authentication/sign-message/${String(address)}`,
        { format: 'ERC-4361' },
      );

      if (!response.isError && response?.data?.message) {
        const message = response.data.message;

        // Request signature from the connected wallet
        await signMessageAsync({ message });
      } else {
        console.error(
          '[WalletConnectStatus] Failed to get sign message from API on retry:',
          response,
        );
        setSignatureRejected(true);
      }
    } catch (error) {
      console.error(
        '[WalletConnectStatus] Error during retry signing flow:',
        error,
      );
      setSignatureRejected(true);
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * Handles back button press: disconnects WalletConnect session,
   * clears persisted flow state, and navigates back
   */
  const handleBackPress = async (): Promise<void> => {
    try {
      // Clear the persisted state so the status screen doesn't show on next focus
      await AsyncStorage.removeItem(WALLET_CONNECT_FLOW_KEY);
      // Disconnect any active WalletConnect session
      await disconnectWalletConnect();
    } catch (error) {
      console.error(
        '[WalletConnectStatus] Error during back press cleanup:',
        error,
      );
    } finally {
      // Always navigate back even if cleanup fails
      onBack();
    }
  };

  const connectionStepCompleted: boolean = isConnected;
  const signStepCompleted: boolean = signatureSuccess;
  const signStepFailed: boolean = signatureRejected || verificationFailed;
  const addressPreview: string = formatAddressPreview(address);

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Header */}
      <CyDView className='flex-row items-center px-[16px] pb-[12px]'>
        <CyDTouchView
          className='w-[36px] h-[36px] rounded-full items-center justify-center'
          onPress={() => {
            void handleBackPress();
          }}>
          <CyDMaterialDesignIcons
            name='chevron-left'
            size={28}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>

      {/* Content */}
      <CyDView className='flex flex-col flex-1 px-[24px] justify-center'>
        {/* Title & description */}
        <CyDText className='text-center text-[20px] font-extrabold text-base400 mt-[8px]'>
          {t('WALLET_CONNECT_SMALL', 'Wallet Connect')}
        </CyDText>

        {/* Error message when signature is rejected OR verification fails */}
        {signStepFailed && !isSigning && (
          <CyDView className='mt-[16px] bg-red50 border border-red200 rounded-[12px] p-[16px]'>
            <CyDView className='flex-row items-center mb-[8px]'>
              <CyDMaterialDesignIcons
                name='alert-circle'
                size={20}
                className='text-red400'
              />
              <CyDText className='ml-[8px] text-[15px] font-bold text-red400'>
                {verificationFailed
                  ? t(
                      'WALLET_CONNECT_VERIFICATION_FAILED',
                      'Verification Failed',
                    )
                  : t(
                      'WALLET_CONNECT_SIGNATURE_REJECTED',
                      'Signature Rejected',
                    )}
              </CyDText>
            </CyDView>
            <CyDText className='text-[13px] text-red300 mb-[12px]'>
              {verificationFailed
                ? verificationErrorMessage ||
                  t(
                    'WALLET_CONNECT_VERIFICATION_FAILED_DESC',
                    'We could not verify your signature with the backend. Please try again.',
                  )
                : t(
                    'WALLET_CONNECT_SIGNATURE_REJECTED_DESC',
                    'You rejected the signature request in {{walletName}}. Please try again to complete the authentication.',
                    { walletName: walletInfo?.name ?? 'your wallet' },
                  )}
            </CyDText>
            <CyDTouchView
              className='bg-red400 rounded-[8px] py-[10px] px-[16px] items-center'
              onPress={() => {
                void handleRetrySignature();
              }}>
              <CyDText className='text-[14px] font-bold text-n0'>
                {t('WALLET_CONNECT_RETRY_SIGNATURE', 'Retry Signature')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}

        {/* Stage 1: Connecting – redirect to wallet for connection (current text) */}
        {hasOpenedModal && !isConnected && !signatureSuccess && (
          <Animated.Text
            className='text-center text-[13px] text-base400 mt-[16px] font-medium'
            style={{ opacity: blinkOpacity }}>
            {t(
              'WALLET_CONNECT_AUTO_REDIRECT_MESSAGE',
              'Automatic redirection to the {{walletName}} should happen. \nIf not please navigate to the {{walletName}}',
              { walletName: walletInfo?.name ?? 'wallet' },
            )}
          </Animated.Text>
        )}

        {/* Stage 2: Signing – redirect + sign message hint + retrigger button */}
        {isConnected &&
          hasTriggeredSigning &&
          isSigning &&
          !signatureSuccess &&
          !signStepFailed && (
            <CyDView className='mt-[16px]'>
              <Animated.Text
                className='text-center text-[13px] text-base400 font-medium'
                style={{ opacity: blinkOpacity }}>
                {t(
                  'WALLET_CONNECT_SIGN_PHASE_MESSAGE',
                  "You'll be redirected to {{walletName}}. A sign message will be shown — sign that message to proceed.",
                  { walletName: walletInfo?.name ?? 'wallet' },
                )}
              </Animated.Text>
              <CyDText className='mt-[14px] text-[12px] text-n200 text-center'>
                {t(
                  'WALLET_CONNECT_SIGN_PHASE_MESSAGE_DESCRIPTION',
                  "Don't see the sign request?",
                )}
              </CyDText>
              <CyDTouchView
                className='mt-[8px] bg-n0 border border-base400 rounded-[8px] py-[10px] px-[16px] items-center self-center'
                onPress={() => {
                  void handleRetrySignature();
                }}>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  {t(
                    'WALLET_CONNECT_SHOW_SIGN_AGAIN',
                    'Retrigger Sign Request',
                  )}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          )}

        {/* Stage 3: Signed – brief wait while wallet loads; show fun message (no redirect) */}
        {signatureSuccess && (
          <CyDText className='text-center text-[15px] text-base400 mt-[16px] font-semibold'>
            {t(
              'WALLET_CONNECT_LOADING_WALLET_FUN',
              "Setting up your wallet... You're almost in!",
            )}
          </CyDText>
        )}

        {/* Hero image */}
        <CyDView className='mt-[32px] mb-[32px] items-center'>
          <CyDImage
            source={AppImages.WALLET_CONNECT_MOBILE}
            className='h-full w-[265px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Status card */}
        <CyDView className='mt-auto mb-[54px]'>
          <CyDView className='bg-n40 rounded-[20px] p-[24px]'>
            {/* Step 1: Wallet connection */}
            <CyDView className='flex-row items-center mb-[12px]'>
              {connectionStepCompleted ? (
                <CyDMaterialDesignIcons
                  name='check-circle'
                  size={20}
                  className='text-green400'
                />
              ) : (
                <ActivityIndicator
                  size='small'
                  color={Colors.base400}
                  animating={isConnecting || !isConnected}
                />
              )}
              <CyDText className='ml-[8px] text-[15px] font-semibold text-base400'>
                {connectionStepCompleted
                  ? t('WALLET_CONNECTED_LABEL', 'Wallet connected')
                  : t(
                      'WALLET_CONNECTING_LABEL',
                      'Connecting to your wallet...',
                    )}
              </CyDText>
            </CyDView>

            {/* Step 2: Sign message */}
            <CyDView className='flex-row items-center'>
              {signStepCompleted ? (
                <CyDMaterialDesignIcons
                  name='check-circle'
                  size={20}
                  className='text-green400'
                />
              ) : signStepFailed ? (
                <CyDMaterialDesignIcons
                  name='close-circle'
                  size={20}
                  className='text-red400'
                />
              ) : isSigning ? (
                <ActivityIndicator size='small' color={Colors.base400} />
              ) : (
                <CyDView className='w-[20px] h-[20px] rounded-full bg-n20' />
              )}
              <CyDText
                className={`ml-[8px] text-[15px] ${
                  signStepFailed ? 'text-red400' : 'text-base400'
                }`}>
                {signStepCompleted
                  ? t(
                      'WALLET_CONNECT_SIGN_COMPLETED',
                      'Sign request completed for "{{address}}"',
                      { address: addressPreview },
                    )
                  : signStepFailed
                  ? t(
                      'WALLET_CONNECT_SIGN_FAILED',
                      'Sign request rejected for "{{address}}"',
                      { address: addressPreview },
                    )
                  : isSigning
                  ? t(
                      'WALLET_CONNECT_SIGNING',
                      'Awaiting signature from "{{address}}"',
                      { address: addressPreview },
                    )
                  : t(
                      'WALLET_CONNECT_SIGN_MESSAGE_STATUS',
                      'Creating sign request for "{{address}}"',
                      {
                        address: addressPreview,
                      },
                    )}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
};

export default WalletConnectStatus;
