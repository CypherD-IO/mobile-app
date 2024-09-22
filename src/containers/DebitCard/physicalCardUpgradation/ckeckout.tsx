import React, { useEffect, useState } from 'react';
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
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { ButtonType, CardProviders } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import useAxios from '../../../core/HttpRequest';
import { capitalize, get } from 'lodash';
import PreferredNameModal from './preferredNameModal';
import { CardProfile } from '../../../models/cardProfile.model';
import CyDSkeleton from '../../../components/v2/skeleton';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  preferredName: string;
}
export default function ShippingCheckout() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { userData, shippingAddress, currentCardProvider, preferredName } =
    route.params;
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [profile, setProfile] = useState<CardProfile>();

  useEffect(() => {
    void fetchProfileAndBalance();
  }, []);

  const fetchProfileAndBalance = async () => {
    setBalanceLoading(true);
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = response.data;
      setProfile(tempProfile);
      const cardId = get(tempProfile, [
        currentCardProvider,
        'cards',
        0,
        'cardId',
      ]);
      if (currentCardProvider && cardId) {
        const balanceData = await getWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/balance`,
        );
        if (!balanceData.isError) {
          const tempBalance = get(balanceData, ['data', 'balance']);
          setBalance(tempBalance);
        }
      }
    }
    setBalanceLoading(false);
  };

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
              {t('PHYSICAL_CARD_CONFIRMATION')}
            </CyDText>
            <CyDText className='text-[14px] '>
              {t('PHYSICAL_CARD_CONFIRMATION_SUB')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-col bg-white rounded-[12px]'>
            <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-inputBorderColor'>
              <CyDView className='flex flex-row gap-x-[12px] items-center'>
                <CyDImage
                  source={AppImages.MANAGE_CARD}
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText>{t('PHYSICAL_CARD')}</CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-center'>
                <CyDText>{'$0'}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-inputBorderColor'>
              <CyDView className='flex flex-row gap-x-[12px] items-center'>
                <CyDImage
                  source={AppImages.ENVELOPE}
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText>{t('SHIPPING_CHARGES')}</CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-center'>
                <CyDSkeleton height={24} width={64} rounded={4} value={balance}>
                  <CyDText>{'$0'}</CyDText>
                </CyDSkeleton>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView className='bg-white py-[32px] px-[16px]'>
          <Button
            onPress={() => {}}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
