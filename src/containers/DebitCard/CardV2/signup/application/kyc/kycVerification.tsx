import React, { useCallback, useContext, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {
  CyDView,
  CyDSafeAreaView,
} from '../../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../../constants';
import useAxios from '../../../../../../core/HttpRequest';
import {
  CardApplicationStatus,
  CardProviders,
} from '../../../../../../constants/enum';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../../core/globalContext';
import { CardProfile } from '../../../../../../models/cardProfile.model';
import Loading from '../../../../../../components/v2/loading';
import useCardUtilities from '../../../../../../hooks/useCardUtilities';
import { get } from 'lodash';
import KYCInProgressComponent from './KYCInProgressComponent';
import KYCCompletedComponent from './KYCCompletedComponent';
import KYCFailedComponent from './KYCFailedComponent';
import AdditionalDocumentRequiredComponent from './AdditionalDocumentRequiredComponent';
import AdditionalReviewComponent from './AdditionalReviewComponent';
import KYCIntroComponent from './KYCIntroComponent';

// Import components
const KYCVerification = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth } = useAxios();
  const { cardProfileModal } = useCardUtilities();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<CardApplicationStatus | null>(
    null,
  );
  const [isRainDeclined, setIsRainDeclined] = useState(false);

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
        );
        setKycStatus(applicationStatus);
        setIsRainDeclined(
          get(tempProfile, [provider, 'isRainDeclined'], false),
        );
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    void checkKYCStatus();
  };

  const handleNext = () => {
    if (
      kycStatus === CardApplicationStatus.KYC_SUCCESSFUL ||
      kycStatus === CardApplicationStatus.COMPLETED
    ) {
      navigation.navigate(screenTitle.NAME_ON_CARD);
    } else if (kycStatus === CardApplicationStatus.KYC_INITIATED) {
      navigation.navigate(screenTitle.KYC_WEBVIEW);
    }
  };

  // Set up polling
  useFocusEffect(
    useCallback(() => {
      void checkKYCStatus();
      const interval = setInterval(() => {
        void checkKYCStatus();
      }, 3000);
      return () => clearInterval(interval);
    }, []),
  );

  const getProgress = () => {
    switch (kycStatus) {
      case CardApplicationStatus.KYC_INITIATED:
        if (isRainDeclined) {
          return 60;
        }
        return 40;
      case CardApplicationStatus.KYC_PENDING:
      case CardApplicationStatus.COMPLETION_PENDING:
        return 60;
      case CardApplicationStatus.KYC_SUCCESSFUL:
      case CardApplicationStatus.COMPLETED:
        return 100;
      case CardApplicationStatus.KYC_FAILED:
        return 100;
      default:
        return 40;
    }
  };

  const getButtonTitle = () => {
    if (kycStatus === CardApplicationStatus.KYC_INITIATED && !isRainDeclined) {
      return 'Start';
    }
    return 'Next';
  };

  const getButtonConfig = () => {
    const isNextEnabled =
      kycStatus === CardApplicationStatus.KYC_SUCCESSFUL ||
      kycStatus === CardApplicationStatus.COMPLETED ||
      (kycStatus === CardApplicationStatus.KYC_INITIATED && !isRainDeclined);

    return {
      title: getButtonTitle(),
      onPress: handleNext,
      disabled: !isNextEnabled,
    };
  };

  const renderContent = () => {
    if (loading) {
      return <Loading />;
    }

    switch (kycStatus) {
      case CardApplicationStatus.KYC_INITIATED:
        if (isRainDeclined) {
          return (
            <AdditionalDocumentRequiredComponent
              onSubmitDocuments={handleNext}
            />
          );
        }
        return <KYCIntroComponent />;
      case CardApplicationStatus.KYC_PENDING:
        return <KYCInProgressComponent onRefresh={handleRefresh} />;
      case CardApplicationStatus.KYC_SUCCESSFUL:
      case CardApplicationStatus.COMPLETED:
        return <KYCCompletedComponent />;
      case CardApplicationStatus.KYC_FAILED:
        return <KYCFailedComponent />;
      case CardApplicationStatus.COMPLETION_PENDING:
        return <AdditionalReviewComponent />;
      default:
        return <KYCIntroComponent />;
    }
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CardApplicationHeader
        onBackPress={() => navigation.navigate(screenTitle.PORTFOLIO)}
      />
      {renderContent()}
      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={getProgress()}
        buttonConfig={getButtonConfig()}
      />
    </CyDSafeAreaView>
  );
};

export default KYCVerification;
