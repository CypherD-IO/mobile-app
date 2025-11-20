import React, { useEffect, useState, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDSafeAreaView,
  CyDMaterialDesignIcons,
  CyDLottieView,
  CyDImage,
  CyDImageBackground,
} from '../../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../../constants';
import AppImages, {
  AppImagesMap,
} from '../../../../../../assets/images/appImages';
import { Share, StyleSheet, Vibration, NativeModules } from 'react-native';
import Video from 'react-native-video';
import Button from '../../../../../components/v2/button';
import { ButtonType, GlobalContextType } from '../../../../../constants/enum';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import useCardUtilities from '../../../../../hooks/useCardUtilities';
import LottieView from 'lottie-react-native';

interface RouteParams {
  name: string;
}

const CardCreation = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isLoading, setIsLoading] = useState(true);
  const name = route.params?.name || '';
  const viewRef = useRef<any>(null);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { getWalletProfile } = useCardUtilities();

  // Confetti animation refs and play tracking
  const [showConfetti, setShowConfetti] = useState(false);

  const triggerHaptic = () => {
    const hapticAvailable = !!NativeModules.RNReactNativeHapticFeedback;
    if (hapticAvailable) {
      // Dynamically require to avoid unused import if module absent
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } else {
      Vibration.vibrate(30);
    }
  };

  const handleConfettiFinish = () => {
    // Hide confetti overlay after first play
    setShowConfetti(false);
  };

  useEffect(() => {
    // Show loading state for 4 seconds
    setTimeout(() => {
      setIsLoading(false);
      setShowConfetti(true); // Show confetti once loading completes
      triggerHaptic();
    }, 4000);
  }, []);

  const refreshProfile = async () => {
    try {
      const data = await getWalletProfile(globalContext.globalState.token);
      if (data) {
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return null;
    }
  };

  const handleShare = async () => {
    try {
      // Wait a moment to ensure UI is properly rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the screen
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'base64',
      });

      // Prepare the share message
      const shareImage = {
        title: t('MY_CYPHER_CARD_SHARE_TITLE', 'My Cypher Card'),
        message: t(
          'REVOLUTIONIZE_CRYPTO_SPENDING_MESSAGE',
          "🚀 Revolutionize your crypto spending with Cypher Card! I'm loving it, and here's why:\n\n    Earn $CYPR on every spend\n    💳 Google Pay & Apple Pay support\n    💰 Lowest ever 0.75% Forex Markup\n    💲 0% Loading Fee for USDC",
        ),
        url: `data:image/jpeg;base64,${uri}`,
      };

      // Share the image
      await Share.share(shareImage);
    } catch (error: any) {
      // Only show error if it's not user cancellation
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: t('SHARE_FAILED_TITLE', 'Share failed'),
          text2: t(
            'UNABLE_TO_SHARE_CARD_DETAILS_TITLE',
            'Unable to share card details',
          ),
        });
      }
    }
  };

  const handleStartUsing = async () => {
    try {
      setIsButtonLoading(true);

      // Refresh the profile data before navigating
      await refreshProfile();

      // Navigate to debit card screen
      navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t(
          'ERROR_LOADING_CARD_DETAILS_TITLE',
          'Error loading card details',
        ),
        text2: t(
          'ERROR_LOADING_CARD_DETAILS_MESSAGE',
          'Please try again. If the problem persists, contact support.',
        ),
      });
    } finally {
      setIsButtonLoading(false);
    }
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-black'>
      {/* Main content */}
      <ViewShot ref={viewRef} style={styles.container}>
        <CyDView className='flex-1 justify-between p-4 bg-black'>
          {/* Card video container */}
          <CyDView className='flex-1 items-center justify-center'>
            <CyDView className='w-full aspect-[380/262] rounded-[12px] overflow-hidden relative'>
              {/* Background Video */}
              <Video
                source={{
                  uri: AppImagesMap.common.VIRTUAL_CARD_HORIZONTAL_SPIN.uri,
                }}
                style={styles.cardVideo}
                resizeMode='cover'
                repeat={true}
                paused={false}
                muted={true}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
              />
            </CyDView>
          </CyDView>

          {/* Status section - always visible but content changes */}
          <CyDView className='flex-row justify-center items-center mb-4'>
            {isLoading ? (
              <>
                <CyDLottieView
                  source={AppImages.LOADING_SPINNER}
                  autoPlay
                  loop
                  style={styles.loader}
                />
                <CyDText className='text-[20px] font-[500] ml-2 text-white'>
                  Creating card
                </CyDText>
              </>
            ) : (
              <>
                <CyDImage
                  source={AppImages.CHECK_MARK_GREEN_CURLY_BG}
                  className='w-[28px] h-[28px] rounded-full items-center justify-center mr-2'
                  resizeMode='contain'
                />
                <CyDText className='font-[500] text-[20px] text-white'>
                  Card Created
                </CyDText>
              </>
            )}
          </CyDView>

          {/* Buttons section - always in layout but opacity changes */}
          <CyDView
            className='items-center mb-4'
            style={isLoading ? styles.hiddenButtons : styles.visibleButtons}>
            <CyDView className='w-full px-4'>
              <CyDTouchView
                onPress={() => {
                  handleShare().catch(err => {
                    console.error('Error sharing card:', err);
                  });
                }}
                disabled={isLoading}
                className='bg-base200 rounded-full py-[14px] mb-4 flex-row justify-center items-center'>
                <CyDMaterialDesignIcons
                  name={'share-variant'}
                  size={16}
                  className='text-base400 text-white mr-[6px]'
                />
                <CyDText className='text-[18px] text-white'>
                  {t('CARD_SHARE')}
                </CyDText>
              </CyDTouchView>

              <Button
                title={t('START_USING_TITLE', 'Start Using')}
                onPress={() => {
                  void handleStartUsing();
                }}
                disabled={isLoading || isButtonLoading}
                loading={isButtonLoading}
                type={ButtonType.PRIMARY}
                style='rounded-full'
                paddingY={14}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </ViewShot>

      {/* Confetti overlay after card is created */}
      {showConfetti && (
        <CyDView pointerEvents='none' style={styles.confetti}>
          <LottieView
            source={AppImagesMap.common.CONFETTI_ANIMATION}
            autoPlay
            loop={false}
            onAnimationFinish={handleConfettiFinish}
            style={StyleSheet.absoluteFill}
          />
        </CyDView>
      )}
    </CyDSafeAreaView>
  );
};

const styles = StyleSheet.create({
  loader: {
    width: 28,
    height: 28,
  },
  hiddenButtons: {
    opacity: 0,
    pointerEvents: 'none',
  },
  visibleButtons: {
    opacity: 1,
  },
  container: {
    flex: 1,
  },
  cardVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

export default CardCreation;
