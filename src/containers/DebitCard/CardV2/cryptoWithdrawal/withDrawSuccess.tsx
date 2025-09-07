import React from 'react';
import {
  CyDFastImage,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import Button from '../../../../components/v2/button';
import { t } from 'i18next';
import AppImages from '../../../../../assets/images/appImages';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { screenTitle } from '../../../../constants';
import { Card } from '../../../../models/card.model';

interface RouteParams {
  amount: string;
  card: Card;
  currentCardProvider: string;
}

export default function WithDrawSuccess() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { amount } = route.params ?? {};

  return (
    <CyDView className='bg-n30 flex flex-col justify-between h-full'>
      <CyDView className='flex-1 px-[16px] justify-center items-center'>
        <CyDFastImage
          source={AppImages.WITHDRAW_CRYPTO_SUCCESS}
          className='h-[160px] w-[186px] ml-[52px]'
        />
        <CyDText className='mt-[8px] font-extrabold text-[40px] text-base400'>
          {'You’re All Set !'}
        </CyDText>
        <CyDText className='mt-[8px] font-semibold text-[14px] text-n400 text-center'>
          {'Your crypto withdrawal request for '}
          <CyDText className='font-bold text-[14px] text-base400'>
            {`$${amount}`}
          </CyDText>
          {' has been successfully submitted!'}
        </CyDText>
        <CyDText className='mt-[8px] text-[14px] text-n400 font-semibold'>
          {'It will reflect in your wallet with in 24 hours '}
        </CyDText>
      </CyDView>
      <CyDView className='bg-n0 px-[16px] pb-[32px] pt-[24px] rounded-t-[16px]'>
        <Button
          title={t('DONE')}
          onPress={() => {
            navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
          }}
        />
      </CyDView>
    </CyDView>
  );
}
