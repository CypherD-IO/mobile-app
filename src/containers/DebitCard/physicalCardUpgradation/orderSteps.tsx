import React from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../../styles/tailwindComponents';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { ButtonType, CardProviders, CardType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  currentCardProvider: CardProviders;
  cardType?: CardType;
}

export default function OrderSteps() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { cardType, currentCardProvider } = route.params;
  const { t } = useTranslation();
  const steps = [
    {
      icon: 'home-outline' as const,
      title: 'Verify your delivery address',
    },
    {
      icon: 'card-account-details-outline' as const,
      title: 'Name on card',
    },
    {
      icon: 'cash-multiple' as const,
      title: 'Checkout',
    },
  ];
  return (
    <CyDView
      className='flex flex-1 bg-n20 h-full'
      style={{ paddingTop: insets.top }}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <CyDView className='flex-1 flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px]'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => navigation.goBack()}
              className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center'>
              <CyDMaterialDesignIcons
                name='arrow-left'
                size={20}
                className='text-base400 '
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='my-[12px]'>
            <CyDText className='text-[26px] font-bold'>
              {cardType === CardType.METAL
                ? t('ORDER_YOUR_METAL_CARD')
                : t('ORDER_YOUR_PHYSICAL_CARD')}
            </CyDText>
            <CyDText className='text-[18px] text-subTextColor'>
              {t('HERE_IS_WHAT_YOU_NEED_TO_DO_NEXT')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-col gap-y-[16px] bg-n0 rounded-[12px] px-[16px] py-[16px] mt-[12px]'>
            {steps.map((step, index) => (
              <CyDView
                key={index}
                className='flex flex-row gap-x-[16px] items-center'>
                <CyDMaterialDesignIcons
                  name={step.icon}
                  size={28}
                  className='text-base400'
                />
                <CyDText className='text-[16px] font-medium'>
                  {step.title}
                </CyDText>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>
        <CyDView className={clsx('w-full bg-n0 pt-[16px] pb-[32px] px-[16px]')}>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.VERIFY_SHIPPING_ADDRESS_SCREEN, {
                currentCardProvider,
                cardType,
              });
            }}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
