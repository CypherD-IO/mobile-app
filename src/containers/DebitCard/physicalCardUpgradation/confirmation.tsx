import React, { useCallback } from 'react';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDImage,
  CyDFastImage,
  CyDScrollView,
} from '../../../styles/tailwindStyles';
import { StatusBar } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import {
  ButtonType,
  CardProviders,
  PhysicalCardType,
} from '../../../constants/enum';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'lodash';
import { getCountryNameFromISO2 } from '../../../core/locale';
import { screenTitle } from '../../../constants';
import Button from '../../../components/v2/button';
import { isIOS } from '../../../misc/checkers';
import clsx from 'clsx';
import { getCountryNameById } from '../../../core/util';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  preferredName: string;
  physicalCardType?: PhysicalCardType;
}

export default function ShippingConfirmation() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { t } = useTranslation();
  const {
    userData,
    shippingAddress,
    currentCardProvider,
    preferredName,
    physicalCardType,
  } = route.params;

  const RenderShippingAddress = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-subTextColor'>{t('DELIVERING_TO')}</CyDText>
        <CyDView className='flex flex-col gap-y-[6px] bg-n0 rounded-[12px] px-[16px] pb-[16px] pt-[6px] mt-[4px]'>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDView className='gap-x-[12px]'>
              <CyDText className='text-[16px] font-semibold'>
                {`${
                  physicalCardType === PhysicalCardType.METAL
                    ? t('METAL_CARD')
                    : t('PHYSICAL_CARD')
                } ****`}
              </CyDText>
              {/* <CyDText className='text-[16px] font-semibold mt-[12px]'>
                {t('SHIPPING_ADDRESS')}
              </CyDText> */}
            </CyDView>
          </CyDView>
          <CyDView>
            <CyDText className='text-[16px] font-medium'>
              {`${capitalize(userData?.firstName)} ${capitalize(userData?.lastName)}`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {shippingAddress?.line1}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {`${shippingAddress?.line2 ? `${shippingAddress.line2}, ` : ''}${shippingAddress?.city}`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {`${shippingAddress?.state}, ${String(getCountryNameById(shippingAddress?.country ?? ''))} ${
                shippingAddress?.postalCode
              }`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {shippingAddress?.phoneNumber}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [userData, shippingAddress]);

  return (
    <CyDSafeAreaView className='bg-n20 h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <CyDView className='flex flex-1 flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px] flex-1 pb-[92px]'>
          <CyDScrollView
            className='flex-1'
            showsVerticalScrollIndicator={false}>
            <CyDView className='flex flex-row justify-center items-center w-full mt-[80px]'>
              <CyDFastImage
                source={AppImages.CARD_SHIPMENT_ENVELOPE}
                className='w-[180px] h-[140px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDView className='mt-[24px]'>
              <CyDText className='text-[32px] font-bold'>
                {t('YOU_ARE_ALL_SET')}
              </CyDText>
              <CyDText className='text-[16px] text-subTextColor mt-[4px]'>
                {t('YOU_ARE_ALL_SET_SUB')}
              </CyDText>
            </CyDView>
            <CyDView className='mt-[24px]'>
              <RenderShippingAddress />
            </CyDView>
            <CyDView className='mt-[24px] mb-[22px]'>
              <CyDView className='flex flex-col gap-y-[6px] bg-n0 rounded-[12px] px-[16px] pb-[16px] pt-[6px] mt-[4px]'>
                <CyDText className='font-semibold'>
                  {t('DELIVERING_IN')}
                </CyDText>
                <CyDText className=''>{t('DELIVERING_IN_SUB1')}</CyDText>
                <CyDText className=''>{t('DELIVERING_IN_SUB2')}</CyDText>
              </CyDView>
            </CyDView>
          </CyDScrollView>
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
              navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
            }}
            type={ButtonType.PRIMARY}
            title={t('GO_TO_CARDS')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
