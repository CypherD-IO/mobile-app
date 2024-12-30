import React from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDImage,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import {
  ButtonType,
  CardProviders,
  PhysicalCardType,
} from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { isIOS } from '../../../misc/checkers';
import clsx from 'clsx';

interface RouteParams {
  currentCardProvider: CardProviders;
  physicalCardType?: PhysicalCardType;
}

export default function OrderSteps() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { physicalCardType, currentCardProvider } = route.params;
  const { t } = useTranslation();
  const steps = [
    {
      icon: AppImages.HOMEICON,
      title: 'Verify your delivery address',
    },
    {
      icon: AppImages.MANAGE_CARD,
      title: 'Name on card',
    },
    {
      icon: AppImages.CASH_OUTLINE_ICON,
      title: 'Checkout',
    },
  ];
  return (
    <CyDSafeAreaView className='flex flex-1 bg-n20 h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <CyDView className='flex flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px]'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[36px] h-[36px]'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='my-[12px]'>
            <CyDText className='text-[26px] font-bold'>
              {physicalCardType === PhysicalCardType.METAL
                ? t('ORDER_YOUR_METAL_CARD')
                : t('ORDER_YOUR_PHYSICAL_CARD')}
            </CyDText>
            <CyDText className='text-[18px] text-subTextColor'>
              {t('HERE_IS_WHAT_YOU_NEED_TO_DO_NEXT')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-col gap-y-[16px] bg-n0 rounded-[12px] px-[16px] pb-[16px] mt-[12px]'>
            {steps.map((step, index) => (
              <CyDView
                key={index}
                className='flex flex-row gap-x-[16px] items-center'>
                <CyDImage
                  source={step.icon}
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className='text-[16px] font-medium'>
                  {step.title}
                </CyDText>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>
        <CyDView
          className={clsx(
            'absolute w-full bottom-[0px] bg-n0 py-[32px] px-[16px]',
            {
              'bottom-[-32px]': isIOS(),
            },
          )}>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.VERIFY_SHIPPING_ADDRESS_SCREEN, {
                currentCardProvider,
                ...(physicalCardType && { physicalCardType }),
              });
            }}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
