import React, { useEffect, useState } from 'react';
import { StatusBar, useWindowDimensions } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDImage,
  CydMaterialDesignIcons,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import {
  ButtonType,
  CardProviders,
  PhysicalCardType,
} from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import useAxios from '../../../core/HttpRequest';
import { capitalize } from 'lodash';
import CyDSkeleton from '../../../components/v2/skeleton';
import { getCountryNameById } from '../../../core/util';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  currentCardProvider: CardProviders;
  physicalCardType?: PhysicalCardType;
}

export default function VerifyShippingAddress() {
  const insets = useSafeAreaInsets();
  const [shippingAddress, setShippingAddress] = useState<IShippingAddress>({
    city: '',
    country: '',
    line1: '',
    line2: '',
    phoneNumber: '',
    postalCode: '',
    state: '',
  });
  const [shippingAddressLoading, setShippingAddressLoading] =
    useState<boolean>(true);
  const [userData, setUserData] = useState<IKycPersonDetail>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { currentCardProvider, physicalCardType } = route.params;
  const { getWithAuth } = useAxios();
  const { t } = useTranslation();

  useEffect(() => {
    void getUserData();
  }, []);

  const getUserData = async () => {
    setShippingAddressLoading(true);
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/user-data`,
    );
    if (!response.isError) {
      if (response.data.shippingAddress) {
        setShippingAddress(response.data.shippingAddress);
      } else {
        setShippingAddress({
          city: response.data.city,
          country: response.data.country,
          line1: response.data.line1,
          line2: response.data.line2,
          phoneNumber: response.data.phone,
          postalCode: response.data.postalCode,
          state: response.data.state,
        });
      }
      setUserData(response.data);
      setShippingAddressLoading(false);
    }
  };

  return (
    <CyDView
      className='flex flex-1 bg-n20 h-full'
      style={{ paddingTop: insets.top }}>
      {/* <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} /> */}
      <CyDView className='flex flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px]'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CydMaterialDesignIcons
                name={'arrow-left-thin'}
                size={32}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='my-[12px]'>
            <CyDText className='text-[26px] font-bold'>
              {t('VERIFY_SHIPPING_ADDRESS')}
            </CyDText>
          </CyDView>
          <CyDText className='text-[16px]'>
            {physicalCardType === PhysicalCardType.METAL
              ? t('VERIFY_SHIPPING_ADDRESS_SUB_METAL')
              : t('VERIFY_SHIPPING_ADDRESS_SUB_PHYSICAL')}
          </CyDText>
          <CyDView className='flex flex-col gap-y-[16px] bg-n0 rounded-[12px] px-[16px] py-[16px] mt-[12px]'>
            <CyDView className='flex flex-row items-center justify-between'>
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CydMaterialDesignIcons
                  name='wallet-bifold-outline'
                  size={28}
                  className='text-base400'
                />
                <CyDText className='text-[16px] font-medium'>
                  {t('SHIPPING_ADDRESS')}
                </CyDText>
              </CyDView>
              <CyDView>
                <CyDSkeleton
                  height={12}
                  width={80}
                  value={!shippingAddressLoading}>
                  <CyDText className='text-[16px] font-medium'>3 Weeks</CyDText>
                </CyDSkeleton>
              </CyDView>
            </CyDView>
            <CyDView>
              <CyDSkeleton
                height={12}
                width={200}
                value={!shippingAddressLoading}>
                <CyDText className='text-[16px] font-medium'>
                  {`${capitalize(userData?.firstName)} ${capitalize(userData?.lastName)}`}
                </CyDText>
              </CyDSkeleton>
              <CyDSkeleton
                height={12}
                width={160}
                value={!shippingAddressLoading}
                className='my-[2px]'>
                <CyDText className='text-[14px]'>
                  {shippingAddress?.line1}
                </CyDText>
              </CyDSkeleton>
              <CyDSkeleton
                height={12}
                width={120}
                value={!shippingAddressLoading}
                className='my-[2px]'>
                <CyDText className='text-[14px] my-[2px]'>
                  {`${shippingAddress?.line2 ? `${shippingAddress.line2}, ` : ''}${shippingAddress?.city}`}
                </CyDText>
              </CyDSkeleton>
              <CyDSkeleton
                height={12}
                width={80}
                value={!shippingAddressLoading}
                className='my-[2px]'>
                <CyDText className='text-[14px] my-[2px]'>
                  {`${shippingAddress?.state}, ${String(getCountryNameById(shippingAddress?.country ?? ''))} ${
                    shippingAddress?.postalCode
                  }`}
                </CyDText>
              </CyDSkeleton>
              <CyDSkeleton
                height={12}
                width={120}
                value={!shippingAddressLoading}
                className='my-[2px]'>
                <CyDText className='text-[14px] my-[2px]'>
                  {shippingAddress?.phoneNumber}
                </CyDText>
              </CyDSkeleton>
            </CyDView>
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDText className='text-subTextColor'>
              {t('SHIP_TO_DIFFERENT_ADDRESS')}
            </CyDText>
            <CyDTouchView
              className='flex flex-row justify-between bg-n0 rounded-[12px] p-[16px] mt-[4px]'
              onPress={() => {
                navigation.navigate(screenTitle.ADD_DELIVERY_ADDRESS_SCREEN, {
                  currentCardProvider,
                  userData,
                  ...(physicalCardType && { physicalCardType }),
                });
              }}>
              <CyDText className='text-[16px]'>
                {t('ENTER_NEW_DELIVERY_ADDRESS')}
              </CyDText>
              <CydMaterialDesignIcons
                name={'arrow-right-thin'}
                size={16}
                className=''
              />
            </CyDTouchView>
          </CyDView>
        </CyDView>
        <CyDView className={clsx('py-[32px] px-[16px] bg-n0')}>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.NAME_ON_CARD_SCREEN, {
                userData,
                shippingAddress,
                currentCardProvider,
                ...(physicalCardType && { physicalCardType }),
              });
            }}
            disabled={shippingAddressLoading}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
