import React, { useState } from 'react';
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
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { ButtonType, CardProviders, CardType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import PreferredNameModal from './preferredNameModal';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  cardType?: CardType;
}
export default function NameOnCard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const MAX_NAME_LENGTH = 27;
  const { userData, shippingAddress, currentCardProvider, cardType } =
    route.params;
  const [selectedName, setSelectedName] = useState<string>('');
  const [isPreferredNameModalVisible, setIsPreferredNameModalVisible] =
    useState<boolean>(false);
  const firstName = userData.firstName ?? '';
  const lastName = userData.lastName ?? '';

  const possibleNameCombinations = [
    `${firstName} ${lastName}`.slice(0, MAX_NAME_LENGTH),
    firstName?.slice(0, MAX_NAME_LENGTH),
    lastName?.slice(0, MAX_NAME_LENGTH),
    `${lastName} ${firstName}`.slice(0, MAX_NAME_LENGTH),
  ].filter(name => name.trim() !== '');

  const { t } = useTranslation();

  return (
    <CyDView
      className='flex flex-1 bg-n20 h-full'
      style={{ paddingTop: insets.top }}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <PreferredNameModal
        isModalVisible={isPreferredNameModalVisible}
        setShowModal={setIsPreferredNameModalVisible}
        onSetPreferredName={(name: string) => {
          setIsPreferredNameModalVisible(false);
          navigation.navigate(screenTitle.SHIPPING_CHECKOUT_SCREEN, {
            userData,
            shippingAddress,
            preferredName: name,
            currentCardProvider,
            cardType,
          });
        }}
      />
      <CyDView className='flex flex-col justify-between h-full bg-transparent'>
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
              {t('NAME_ON_CARD')}
            </CyDText>
            <CyDText className='text-[14px] '>
              {t('CUSTOMISE_NAME_ON_CARD')}
            </CyDText>
          </CyDView>
          <CyDView className='mt-[12px]'>
            {possibleNameCombinations.map((name, index) => (
              <CyDTouchView
                key={index}
                onPress={() => {
                  setSelectedName(name);
                }}
                className='flex flex-row items-center justify-between bg-n0 rounded-[12px] p-[16px] mb-[12px]'>
                <CyDText className='text-[16px] font-semibold'>{name}</CyDText>
                <CyDView className='w-[20px] h-[20px] border-[2px] border-base80 rounded-full flex items-center justify-center'>
                  {selectedName === name && (
                    <CyDView className='w-[12px] h-[12px] bg-p50 rounded-full' />
                  )}
                </CyDView>
              </CyDTouchView>
            ))}
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDText className='text-subTextColor'>
              {t('WANT_DIFFERENT_NAME_ON_CARD')}
            </CyDText>
            <CyDTouchView
              className='flex flex-row justify-between items-center bg-n0 rounded-[12px] p-[16px] mt-[4px]'
              onPress={() => {
                setIsPreferredNameModalVisible(true);
              }}>
              <CyDText className='text-[16px]'>{t('PREFERRED_NAME')}</CyDText>
              <CyDMaterialDesignIcons
                name={'chevron-right'}
                size={20}
                className=''
              />
            </CyDTouchView>
          </CyDView>
        </CyDView>
        <CyDView className={clsx('bg-n0 pt-[16px] pb-[32px] px-[16px]')}>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.SHIPPING_CHECKOUT_SCREEN, {
                userData,
                shippingAddress,
                preferredName: selectedName,
                currentCardProvider,
                cardType,
              });
            }}
            disabled={selectedName === ''}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
