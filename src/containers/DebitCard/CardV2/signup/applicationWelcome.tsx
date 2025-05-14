import React from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import AppImages from '../../../../../assets/images/appImages';
import CardApplicationHeader from '../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../components/v2/CardApplicationFooter';

interface StepData {
  id: number;
  title: string;
  description: string;
  icon: AppImages;
}

interface StepItemProps {
  step: StepData;
  isLast: boolean;
}

const StepItem = ({ step, isLast }: StepItemProps) => {
  return (
    <CyDView>
      <CyDView className='flex-row'>
        <CyDView className='mr-4'>
          <CyDText className='text-[20px] font-semibold'>{step.id}</CyDText>
        </CyDView>

        <CyDView className='flex-1 pr-2'>
          <CyDText className='text-[20px] font-[500] mb-1'>
            {step.title}
          </CyDText>
          <CyDText className='text-[14px] text-base text-n400'>
            {step.description}
          </CyDText>
        </CyDView>

        <CyDView className='w-[82px] h-[82px] justify-center items-center'>
          <CyDImage source={step.icon} className='w-[82px] h-[82px]' />
        </CyDView>
      </CyDView>
      {!isLast && (
        <CyDView className='my-6 relative'>
          <CyDView className='h-[1px] bg-n40 absolute left-[-16px] right-[-16px]' />
        </CyDView>
      )}
    </CyDView>
  );
};

const ApplicationWelcome = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const steps: StepData[] = [
    {
      id: 1,
      title: t('INTRODUCE_YOURSELF'),
      description: t('INTRODUCE_YOURSELF_DESCRIPTION'),
      icon: AppImages.CARD_APP_INTRO_ICON,
    },
    {
      id: 2,
      title: t('VERIFY_YOUR_IDENTITY'),
      description: t('VERIFY_YOUR_IDENTITY_DESCRIPTION'),
      icon: AppImages.CARD_APP_ID_VERIFICATION_ICON,
    },
    {
      id: 3,
      title: t('GET_YOUR_CARD_AND_ACTIVATE'),
      description: t('GET_YOUR_CARD_AND_ACTIVATE_DESCRIPTION'),
      icon: AppImages.CARD_APP_ACTIVATE_CARD_ICON,
    },
  ];

  const handleNext = () => {
    navigation.navigate(screenTitle.ENTER_REFERRAL_CODE);
  };

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <CardApplicationHeader />

      {/* Content */}
      <CyDScrollView className='flex-1 px-4'>
        <CyDView className='py-6'>
          <CyDText className='text-[32px]'>{t('GET_YOUR_CYPHER_CARD')}</CyDText>
          <CyDText className='text-[32px] mb-4'>
            {t('IN_UNDER_5_MINUTES')}
          </CyDText>
        </CyDView>

        {/* Steps */}
        <CyDView className='mb-6'>
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </CyDView>
      </CyDScrollView>

      {/* Footer */}
      <CardApplicationFooter
        currentStep={1}
        totalSteps={3}
        currentSectionProgress={20}
        buttonConfig={{
          title: t('NEXT'),
          onPress: handleNext,
        }}
      />
    </CyDView>
  );
};

export default ApplicationWelcome;
