import React, { useContext, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
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
  CardProviders,
  GlobalContextType,
} from '../../../../../constants/enum';
import useAxios from '../../../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../../../components/v2/GlobalModal';
import { t } from 'i18next';
import { screenTitle } from '../../../../../constants';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import useCardUtilities from '../../../../../hooks/useCardUtilities';

interface RouteParams {
  fromScreen?: string;
}

const KYCWebView = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext.globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;
  const { getWalletProfile } = useCardUtilities();

  const [kycUrl, setKycUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    void getKycUrl();
  }, []);

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

        navigation.navigate(screenTitle.KYC_VERIFICATION_INTRO);
      } catch (error) {
        console.error('Error during navigation:', error);
        navigation.navigate(screenTitle.KYC_VERIFICATION_INTRO);
      }
    }
  };

  // if (isLoading || !kycUrl) {
  //   return <Loading />;
  // }

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
        <WebView
          source={{ uri: kycUrl }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          renderLoading={() => {
            return <Loading />;
          }}
          onNavigationStateChange={handleNavigationStateChange}
          // mediaPlaybackRequiresUserAction={true}
          // javaScriptEnabled={true}
          // domStorageEnabled={true}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
};

export default KYCWebView;
