import React, { useCallback, useContext, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDImage,
} from '../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';
import useAxios from '../../../../../core/HttpRequest';
import {
  CardApplicationStatus,
  CardProviders,
} from '../../../../../constants/enum';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import { CardProfile } from '../../../../../models/cardProfile.model';
import Loading from '../../../../../components/v2/loading';
import useCardUtilities from '../../../../../hooks/useCardUtilities';
import { get } from 'lodash';

const KYCVerificationIntro = () => {
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
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void checkKYCStatus();
    }, []),
  );

  const handleStart = () => {
    navigation.navigate(screenTitle.KYC_WEBVIEW);
  };

  // Navigate based on KYC status
  React.useEffect(() => {
    if (kycStatus) {
      switch (kycStatus) {
        case CardApplicationStatus.KYC_PENDING:
          navigation.navigate(screenTitle.KYC_VERIFICATION_IN_PROGRESS);
          break;
        case CardApplicationStatus.KYC_SUCCESSFUL:
        case CardApplicationStatus.COMPLETED:
          navigation.navigate(screenTitle.VERIFICATION_COMPLETED);
          break;
        case CardApplicationStatus.KYC_FAILED:
          navigation.navigate(screenTitle.VERIFICATION_FAILED);
          break;
        case CardApplicationStatus.COMPLETION_PENDING:
          navigation.navigate(screenTitle.ADDITIONAL_DOCUMENT_REQUIRED);
          break;
      }
    }
  }, [kycStatus, navigation]);

  if (loading) {
    return <Loading />;
  }

  // Only show intro screen if KYC is initiated
  if (kycStatus !== CardApplicationStatus.KYC_INITIATED) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CardApplicationHeader />

      <CyDView className='flex-1 px-5'>
        {/* Flex container for image */}
        <CyDView className='flex-1 items-center justify-center'>
          <CyDImage
            source={AppImages.CARD_APP_FACE_RECOGNITION_FRAME}
            className='w-[146px] h-[170px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Text content container - positioned 75px from bottom */}
        <CyDView className='mb-[75px]'>
          {/* Title Section */}
          <CyDText className='text-n200 text-sm font-medium'>Step-II</CyDText>
          <CyDText className='text-[32px] mt-3'>KYC Verification</CyDText>

          {/* Description */}
          <CyDText className='text-n200 font-normal text-[14px] mt-[6px]'>
            To set up your account, please bring your ID. Ensure the selected
            country matches your documents. We will conduct a dynamic facial
            recognition check for enhanced security.
          </CyDText>

          {/* Warning Text */}
          <CyDText className='text-p300 text-[14px] mt-3'>
            Please ensure to look directly at the camera during facial dynamic
            recognition authentication.
          </CyDText>
        </CyDView>
      </CyDView>

      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={40}
        buttonConfig={{
          title: 'Start',
          onPress: handleStart,
        }}
      />
    </CyDSafeAreaView>
  );
};

export default KYCVerificationIntro;
