import React, { useCallback, useContext, useState, useRef } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {
  CyDView,
  CyDSafeAreaView,
} from '../../../../../styles/tailwindComponents';
import WebView from 'react-native-webview';
import Loading from '../../../../../components/v2/loading';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import { CardProfile } from '../../../../../models/cardProfile.model';
import {
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
} from '../../../../../constants/enum';
import useAxios from '../../../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../../../components/v2/GlobalModal';
import { t } from 'i18next';
import { screenTitle } from '../../../../../constants';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import useCardUtilities from '../../../../../hooks/useCardUtilities';
import { get } from 'lodash';

const KYCWebView = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext.globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;
  const { getWalletProfile, cardProfileModal } = useCardUtilities();

  const [kycUrl, setKycUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    void getKycUrl();
  }, []);

  // Set up polling for KYC status
  useFocusEffect(
    useCallback(() => {
      void checkKYCStatus();
      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        void checkKYCStatus();
      }, 3000);

      // Clean up interval on screen unfocus
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, []),
  );

  const checkKYCStatus = async () => {
    try {
      const response = await getWithAuth('/v1/authentication/profile');
      if (!response.isError) {
        const tempProfile = await cardProfileModal(response.data);
        const tempProvider = get(tempProfile, 'provider');
        if (!tempProvider) {
          throw new Error('Provider not found');
        }

        const applicationStatus = get(
          tempProfile,
          [tempProvider, 'applicationStatus'],
          '',
        ) as CardApplicationStatus;

        // Navigate based on KYC status
        if (
          applicationStatus === CardApplicationStatus.KYC_SUCCESSFUL ||
          applicationStatus === CardApplicationStatus.KYC_FAILED ||
          applicationStatus === CardApplicationStatus.COMPLETED ||
          applicationStatus === CardApplicationStatus.COMPLETION_PENDING
        ) {
          // Update global context with latest profile data
          await refreshProfile();

          // Clear polling interval before navigation
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Navigate to the NAME_ON_CARD screen
          navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
        }
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    }
  };

  const getKycUrl = async () => {
    setIsLoading(true);
    try {
      const { isError, data, error } = await getWithAuth(
        `/v1/cards/${provider}/application/kyc`,
      );

      if (isError) {
        showModal('state', {
          type: 'error',
          title: '',
          description:
            'message' in error ? error.message : t('UNEXPECTED_ERROR'),
          onSuccess: () => {
            hideModal();
            navigation.goBack();
          },
          onFailure: () => {
            hideModal();
            navigation.goBack();
          },
        });
      } else {
        setKycUrl(data.url);
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNEXPECTED_ERROR'),
        onSuccess: () => {
          hideModal();
          navigation.goBack();
        },
        onFailure: () => {
          hideModal();
          navigation.goBack();
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleNavigationStateChange = async (navState: any) => {
    // Here we can handle navigation state changes
    // For example, detect completion or specific URLs to navigate back
    if (navState.url.includes('app.cypherhq.io')) {
      try {
        // Refresh the profile data before navigating
        await refreshProfile();

        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      } catch (error) {
        console.error('Error during navigation:', error);
        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      }
    }
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CyDView className='flex-1'>
        <CardApplicationHeader />

        {/* {isLoading ? (
          <Loading />
        ) : (
          <WebView
            source={{ uri: kycUrl }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            mediaPlaybackRequiresUserAction={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )} */}
        {isLoading && <Loading />}
        {!!kycUrl && (
          <WebView
            source={{ uri: kycUrl }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            renderLoading={() => {
              return <Loading />;
            }}
            onNavigationStateChange={handleNavigationStateChange}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            allowsFullscreenVideo={false}
            // mediaPlaybackRequiresUserAction={true}
            // javaScriptEnabled={true}
            // domStorageEnabled={true}
          />
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
};

export default KYCWebView;
