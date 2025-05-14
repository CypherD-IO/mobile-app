import React, { useEffect, useState, useRef, useContext } from 'react';
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
import AppImages from '../../../../../../assets/images/appImages';
import { Share, StyleSheet } from 'react-native';
import Button from '../../../../../components/v2/button';
import { ButtonType, GlobalContextType } from '../../../../../constants/enum';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import useCardUtilities from '../../../../../hooks/useCardUtilities';

interface RouteParams {
  name: string;
}

const CardCreation = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isLoading, setIsLoading] = useState(true);
  const name = route.params?.name || '';
  const viewRef = useRef<any>(null);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { getWalletProfile } = useCardUtilities();

  useEffect(() => {
    // Show loading state for 8 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
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
        title: 'My Cypher Card',
        message:
          "🚀 Revolutionize your crypto spending with Cypher Card! I'm loving it, and here's why:\n\n" +
          '    💳 Google Pay & Apple Pay support\n' +
          '    💰 Lowest ever 0% Forex Markup\n' +
          '    💲 0% Loading Fee for USDC\n' +
          '    🌍 Use your crypto anywhere, just like a regular card',
        url: `data:image/jpeg;base64,${uri}`,
      };

      // Share the image
      await Share.share(shareImage);
    } catch (error: any) {
      // Only show error if it's not user cancellation
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Share failed',
          text2: 'Unable to share card details',
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
        text1: 'Error loading card details',
        text2: 'Please try again. If the problem persists, contact support.',
      });
    } finally {
      setIsButtonLoading(false);
    }
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Back button */}
      <CardApplicationHeader />

      {/* Main content */}
      <ViewShot ref={viewRef} style={styles.container}>
        <CyDView className='flex-1 justify-between p-4 bg-n0'>
          {/* Card image container */}
          <CyDView className='flex-1 items-center justify-center'>
            <CyDImageBackground
              source={AppImages.CYPHER_VIRTUAL_CARD}
              className='w-full aspect-[380/239] rounded-[12px]'
              resizeMode='contain'>
              <CyDView className='flex-1 p-5'>
                <CyDView className='mt-auto'>
                  <CyDText className='text-white font-semibold text-[16px]'>
                    {name}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDImageBackground>
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
                <CyDText className='text-[20px] font-[500] ml-2'>
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
                <CyDText className='font-[500] text-[20px]'>
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
                <CyDText className='text-[18px] text-white'>Share</CyDText>
              </CyDTouchView>

              <Button
                title='Start Using'
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
});

export default CardCreation;
