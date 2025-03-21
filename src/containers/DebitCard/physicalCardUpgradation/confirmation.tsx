import React, { useCallback } from 'react';
import {
  CyDView,
  CyDText,
  CyDFastImage,
  CyDScrollView,
  CyDIcons,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import { StatusBar } from 'react-native';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { ButtonType, CardProviders, CardType } from '../../../constants/enum';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'lodash';
import { screenTitle } from '../../../constants';
import Button from '../../../components/v2/button';
import clsx from 'clsx';
import { getCountryNameById } from '../../../core/util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  preferredName: string;
  cardType: CardType;
  preferredDesignId: string;
}

const getCardImage = (type: CardType, designId: string) => {
  const cardImage = `${CYPHER_CARD_IMAGES}/${type}-${designId}.png`;
  return {
    uri: cardImage,
  };
};

export default function ShippingConfirmation() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { t } = useTranslation();
  const { userData, shippingAddress, cardType, preferredDesignId } =
    route.params;

  const RenderShippingAddress = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-n100 text-[12px] font-medium'>
          {t('DELIVERING_TO')}
        </CyDText>
        <CyDView className='flex flex-col bg-n0 rounded-[12px] p-[16px] mt-[4px]'>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDView className='gap-x-[12px]'>
              <CyDText className='text-[14px] font-bold'>
                {`${
                  cardType === CardType.METAL
                    ? t('METAL_CARD')
                    : t('PHYSICAL_CARD')
                } ****`}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView>
            <CyDText className='text-[12px] font-medium'>
              {`${capitalize(userData?.firstName)} ${capitalize(userData?.lastName)}`}
            </CyDText>
            <CyDText className='text-[12px] font-medium mt-[2px]'>
              {shippingAddress?.line1}
            </CyDText>
            <CyDText className='text-[12px] font-medium'>
              {`${shippingAddress?.line2 ? `${shippingAddress.line2}, ` : ''}${shippingAddress?.city}`}
            </CyDText>
            <CyDText className='text-[12px] font-medium'>
              {`${shippingAddress?.state}, ${String(getCountryNameById(shippingAddress?.country ?? ''))} ${
                shippingAddress?.postalCode
              }`}
            </CyDText>
            <CyDText className='text-[12px] font-medium'>
              {shippingAddress?.phoneNumber}
            </CyDText>
            <CyDText className='text-[12px] font-medium'>
              {shippingAddress?.taxId}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [userData, shippingAddress]);

  return (
    <CyDView className='bg-n20 flex-1' style={{ paddingTop: insets.top }}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <CyDView className='flex flex-1 flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px] flex-1'>
          <CyDScrollView
            className='flex-1'
            showsVerticalScrollIndicator={false}>
            {cardType !== CardType.VIRTUAL ? (
              <>
                <CyDView className='flex flex-row justify-center items-center w-full mt-[80px]'>
                  <CyDFastImage
                    source={AppImages.CARD_SHIPMENT_ENVELOPE}
                    className='w-[180px] h-[140px]'
                    resizeMode='contain'
                  />
                </CyDView>
                <CyDView className='mt-[24px]'>
                  <CyDText className='text-[44px] font-extrabold'>
                    {t('YOU_ARE_ALL_SET')}
                  </CyDText>
                  <CyDText className='text-[14px] font-semibold text-n400 mt-[4px]'>
                    {t('YOU_ARE_ALL_SET_SUB')}
                  </CyDText>
                </CyDView>
                <CyDView className='mt-[24px]'>
                  <RenderShippingAddress />
                </CyDView>
                <CyDView className='mt-[24px] mb-[22px]'>
                  <CyDView className='flex flex-col gap-y-[6px] bg-n0 rounded-[12px] p-[16px] mt-[4px]'>
                    <CyDText className='font-bold text-[14px]'>
                      {t('DELIVERING_IN')}
                    </CyDText>
                    <CyDText className='text-[12px] font-medium'>
                      {t('DELIVERING_IN_SUB1')}
                    </CyDText>
                    <CyDText className='text-[12px] font-medium mt-[4px]'>
                      {t('DELIVERING_IN_SUB2')}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </>
            ) : (
              <>
                <CyDScrollView className=' mt-[40px]'>
                  <CyDFastImage
                    source={getCardImage(cardType, preferredDesignId)}
                    className='w-full h-[240px]'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[44px] font-extrabold mt-[24px]'>
                    {t('YOU_ARE_ALL_SET')}
                  </CyDText>
                  <CyDText className='text-[14px] font-semibold text-n400 mt-[4px]'>
                    {t('VIRTUAL_CARD_ISSUED')}
                  </CyDText>
                  <CyDView className='mt-[16px] '>
                    <CyDText className='text-[14px] font-bold mb-[8px]'>
                      {'Features'}
                    </CyDText>
                    <CyDView className='bg-n0 rounded-t-xl p-[24px]'>
                      {/* apple and google pay */}
                      <CyDView className='flex flex-row gap-x-[4px]'>
                        <CyDIcons
                          name='apple-google-icon'
                          size={24}
                          className='text-base400'
                        />
                        <CyDView className='flex-1'>
                          <CyDText className='text-[14px] font-semibold text-base400'>
                            {t('APPLE_GOOGLE_PAY')}
                          </CyDText>
                          <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                            {t('APPLE_GOOGLE_PAY_DESCRIPTION')}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      {/* atm withdraw */}
                      <CyDView className='flex flex-row  gap-x-[4px] mt-[16px]'>
                        <CyDIcons
                          name='atm-cash'
                          size={24}
                          className='text-base400'
                        />
                        <CyDView className='flex-1'>
                          <CyDText className='text-[14px] font-semibold text-base400'>
                            {t('ATM_WITHDRAWALS')}
                          </CyDText>
                          <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                            {t('ATM_WITHDRAWALS_DESCRIPTION')}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      {/* multiple countries */}
                      <CyDView className='flex flex-row gap-x-[4px] mt-[16px]'>
                        <CyDMaterialDesignIcons
                          name='earth'
                          size={24}
                          className='text-base400'
                        />
                        <CyDView className='flex-1'>
                          <CyDText className='text-[14px] font-semibold text-base400'>
                            {t('MULTIPLE_COUNTRIES')}
                          </CyDText>
                          <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                            {t('MULTIPLE_COUNTRIES_DESCRIPTION')}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      {/* multiple countries */}
                      <CyDView className='flex flex-row  gap-x-[4px] mt-[16px]'>
                        <CyDIcons
                          name='paypal-icon'
                          size={24}
                          className='text-base400'
                        />
                        <CyDView className='flex-1'>
                          <CyDText className='text-[14px] font-semibold text-base400'>
                            {t('PAY_PAL_VISA_DIRECT')}
                          </CyDText>
                          <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                            {t('PAY_PAL_VISA_DIRECT_DESCRIPTION')}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                </CyDScrollView>
              </>
            )}
          </CyDScrollView>
        </CyDView>
        <CyDView className={clsx('bg-n0 pt-[16px] pb-[32px] px-[16px]')}>
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
    </CyDView>
  );
}
