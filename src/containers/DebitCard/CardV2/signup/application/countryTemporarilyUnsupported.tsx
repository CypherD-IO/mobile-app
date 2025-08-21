import React from 'react';
import { ImageBackground, Platform } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import { BlurView } from '@react-native-community/blur';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import Intercom from '@intercom/intercom-react-native';
import { logAnalyticsToFirebase } from '../../../../../core/analytics';
import { screenTitle } from '../../../../../constants';

// Style constants to avoid inline styles
const styles = {
  fullFlex: { flex: 1 },
  circularContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  infoBox: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Interface for navigation route parameters
interface CountryUnsupportedRouteParams {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  countryFlagUrl: string;
}

/**
 * CountryTemporarilyUnsupported Screen Component
 *
 * This screen is displayed when a user's country is temporarily not supported
 * for the card application. It shows:
 * - A blurred background with the country flag
 * - A circular container with the country flag and a red X icon
 * - Informative text about the temporary unavailability
 *
 * The country information is retrieved from navigation parameters passed
 * from the calling screen (additionalDetails.tsx or index.tsx).
 */
const CountryTemporarilyUnsupported = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: CountryUnsupportedRouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Get country information from navigation parameters
  const {
    countryName = 'your country',
    countryFlag = '🌍',
    countryFlagUrl = '',
  } = route.params ?? {};

  /**
   * Handle back navigation to previous screen
   */
  const handleBackPress = () => {
    navigation.navigate(screenTitle.PORTFOLIO);
  };

  /**
   * Handle opening Intercom support chat
   */
  const handleContactSupport = () => {
    // Track support interaction for analytics
    void logAnalyticsToFirebase('country_unsupported_contact_support', {
      country: countryName,
      screen: 'country_temporarily_unsupported',
    });

    // Open Intercom support chat
    void Intercom.present();
  };

  console.log('countryFlagUrl :: ', countryFlagUrl);

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <CardApplicationHeader />

      {/* Optional blurred vignette for subtle focus */}
      <CyDView className='absolute inset-0 pointer-events-none'>
        <CyDView className='flex-1 bg-white/50' />
      </CyDView>

      {/* Main Content */}
      <CyDView className='flex-1 justify-center items-center px-6 z-10'>
        {/* Circular Flag Container */}
        <CyDView className='relative mb-8'>
          {/* Main circular container with subtle shadow */}
          <CyDView
            className='w-32 h-32 rounded-full bg-n10 items-center justify-center'
            style={styles.circularContainer}>
            {/* Country Flag */}
            <CyDText className='text-6xl mt-[14px]'>{countryFlag}</CyDText>
          </CyDView>
        </CyDView>

        {/* Title Text */}
        <CyDText className='text-n800 text-center text-[32px] font-bold mb-2 leading-tight'>
          {t(`We are coming soon in ${countryName}`)}
        </CyDText>

        {/* Subtitle */}
        <CyDText className='text-n400 text-center text-base mb-8'>
          {t('Thank you for your interest in Cypher Card.')}
        </CyDText>

        {/* Info Box */}
        <CyDView
          className='bg-n20 rounded-[12px] px-4 py-3 flex-row items-start mb-12 w-full max-w-md'
          style={styles.infoBox}>
          <CyDMaterialDesignIcons
            name='information'
            size={20}
            className='text-n800 mt-[2px] mr-2'
          />
          <CyDView className='flex-1'>
            <CyDText className='text-n800 font-semibold mb-1'>
              {t('Card services temporarily unavailable')}
            </CyDText>
            <CyDText className='text-n400 text-[14px] leading-relaxed'>
              {t(
                "We'll notify you once we support your country, you can then continue the application from where you left.",
              )}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Support link */}
        <CyDText className='text-n400 text-center text-base'>
          {t('Have questions?')}{' '}
          <CyDTouchView onPress={handleContactSupport}>
            <CyDText className='text-blue300 underline'>
              {t('Contact support')}
            </CyDText>
          </CyDTouchView>
        </CyDText>
      </CyDView>
      {/* Footer */}
      <CardApplicationFooter
        currentStep={1}
        totalSteps={3}
        currentSectionProgress={100}
        buttonConfig={{
          title: t('CLOSE'),
          onPress: () => handleBackPress(),
          loading: false,
          disabled: false,
        }}
      />
    </CyDView>
  );
};

export default CountryTemporarilyUnsupported;
