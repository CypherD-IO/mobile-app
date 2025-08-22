import React from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import Intercom from '@intercom/intercom-react-native';
import { logAnalyticsToFirebase } from '../../../../../core/analytics';
import { screenTitle } from '../../../../../constants';
import useAxios from '../../../../../core/HttpRequest';
import {
  CardApplicationStatus,
  CardProviders,
} from '../../../../../constants/enum';
import { get } from 'lodash';

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
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();

  // Get country information from navigation parameters
  const { countryName = 'your country', countryFlag = '🌍' } =
    route.params ?? {};

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

  // On focus: refresh profile and if applicationStatus is CREATED navigate to Email Verification
  React.useEffect(() => {
    const checkAndNavigate = async () => {
      try {
        const profileResponse = await getWithAuth('/v1/authentication/profile');

        if (!profileResponse.isError) {
          const status = get(profileResponse.data, [
            CardProviders.REAP_CARD,
            'applicationStatus',
          ]);
          if (status === CardApplicationStatus.CREATED) {
            navigation.navigate(screenTitle.EMAIL_VERIFICATION);
          }
        }
      } catch {
        // Silently ignore; screen will remain as-is if profile fetch fails
      }
    };

    if (isFocused) {
      void checkAndNavigate();
    }
  }, [isFocused]);

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <CardApplicationHeader />

      {/* Background overlay */}
      <CyDView className='absolute inset-0 bg-white/50 pointer-events-none' />

      {/* Main Content */}
      <CyDView className='flex-1 justify-center items-center px-6 z-10'>
        {/* Circular Flag Container */}
        <CyDView className='mb-8'>
          <CyDView className='w-32 h-32 rounded-full bg-n10 items-center justify-center shadow-lg'>
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
        <CyDView className='bg-n20 rounded-xl px-4 py-3 flex-row items-start mb-12 w-full max-w-md shadow-sm'>
          <CyDMaterialDesignIcons
            name='information'
            size={20}
            className='text-n800 mt-[2px] mr-2'
          />
          <CyDView className='flex-1'>
            <CyDText className='text-n800 font-semibold mb-1'>
              {t('Card services temporarily unavailable')}
            </CyDText>
            <CyDText className='text-n400 text-sm leading-relaxed'>
              {t(
                "We'll notify you once we support your country, you can then continue the application from where you left.",
              )}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Support link */}
        <CyDView className='flex-row justify-center items-center'>
          <CyDText className='text-n400 text-center text-base'>
            {t('Have questions?')}{' '}
          </CyDText>
          <CyDTouchView
            onPress={handleContactSupport}
            accessibilityRole='button'>
            <CyDText className='text-blue300 underline'>
              {t('Contact support')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
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
