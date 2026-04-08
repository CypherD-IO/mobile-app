import React, { useCallback } from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CardProviders, CardType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import CardAddressForm, {
  CardAddressFormOutputInterface,
} from '../../../components/v2/CardAddressForm';

interface RouteParams {
  currentCardProvider: CardProviders;
  userData: IKycPersonDetail;
  cardType?: CardType;
}

export default function AddDeliveryAddress() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { t } = useTranslation();
  const { currentCardProvider, userData, cardType } = route.params;

  const handleSubmit = useCallback(
    async (values: CardAddressFormOutputInterface) => {
      const formattedValues = {
        country: values.country?.Iso2,
        line1: values.addressLine1,
        line2: values.addressLine2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        phoneNumber: `${values.dialCode?.dialCode ?? ''}${values.phoneNumber}`,
        ...(values.taxId &&
          values.country?.Iso2 === 'MX' && {
            taxId: values.taxId,
          }),
      };

      navigation.navigate(screenTitle.NAME_ON_CARD_SCREEN, {
        userData,
        shippingAddress: formattedValues,
        currentCardProvider,
        cardType,
      });
    },
    [cardType, currentCardProvider, navigation, userData],
  );

  return (
    <CyDSafeAreaView className='flex flex-1 bg-n0 h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#FFFFFF'} />
      <CyDView className='flex flex-col justify-between h-full bg-n0'>
        <CyDView className='h-full'>
          <CyDView className='flex-row items-center justify-between px-4'>
            <CyDTouchView
              onPress={() => navigation.goBack()}
              className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center'>
              <CyDMaterialDesignIcons
                name='arrow-left'
                size={20}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className='text-[32px] px-4 mt-6 mb-6'>
            {t('ADD_DELIVERY_ADDRESS')}
          </CyDText>
          <CyDKeyboardAwareScrollView
            className='flex-1 px-4'
            enableOnAndroid={true}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}>
            <CardAddressForm
              variant='delivery'
              layoutVariant='shipping'
              addressSectionLabel={t('DELIVERY_ADDRESS')}
              initialValues={{
                addressLine1: '',
                addressLine2: '',
                city: '',
                state: '',
                postalCode: '',
                phoneNumber: '',
                taxId: '',
              }}
              includeTaxId={true}
              phoneCountrySyncMode='always'
              submitButtonTitle={t('CONTINUE')}
              submitButtonContainerClassName='w-full pt-[16px] pb-[32px]'
              submitButtonStyle='h-[60px] w-full py-[10px]'
              onSubmit={handleSubmit}
            />
          </CyDKeyboardAwareScrollView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
