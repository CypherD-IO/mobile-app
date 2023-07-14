import React, { useContext, useEffect, useState } from 'react';
import { CyDSafeAreaView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import OtpInput from '../../../components/v2/OTPInput';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import LottieView from 'lottie-react-native';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { ButtonType, CardProviders, GlobalContextType } from '../../../constants/enum';
import clsx from 'clsx';
import { isAndroid } from '../../../misc/checkers';
import Button from '../../../components/v2/button';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { getWalletProfile } from '../../../core/card';
import { GlobalContext } from '../../../core/globalContext';
import { screenTitle } from '../../../constants';

export default function SetPin (props: {navigation: any, route: {params: {onSuccess: (data: any, provider: CardProviders) => {}, currentCardProvider: CardProviders, card: {cardId: string}}}}) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const { navigation, route } = props;
  const { currentCardProvider, card } = route.params;
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const onModalHide = (type = '') => {
    hideModal();
    setLoading(false);
    if (type === 'success') {
      setTimeout(() => {
        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      }, MODAL_HIDE_TIMEOUT);
    }
  };

  const onPinSet = () => {
    showModal('state', { type: 'success', title: t('CARD_PIN_SET_HEADER'), description: t('CARD_PIN_SET_DESCRIPTION'), onSuccess: () => onModalHide('success'), onFailure: () => onModalHide('success') });
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, { onSuccess: (data: any, cardProvider: CardProviders) => { void onPinSet(); }, currentCardProvider, card, triggerOTPParam: 'set-pin', verifyOTPPayload: { pin } });
  };

  const ActivateCardHeader = () => {
    return (
      <CyDView className='px-[20px]'>
        <CyDText className={'text-[25px] font-extrabold'}>{t<string>('CARD_SET_NEW_PIN')}</CyDText>
        <CyDText className={'text-[15px] font-bold mt-[3px]'}>{t<string>('CARD_SET_PIN_TO_USE_CARD')}</CyDText>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView className='h-full bg-white px-[20px]'>
      <ActivateCardHeader/>
      <CyDView className={' px-[20px] pt-[10px] mt-[20px]'}>
        <CyDView>
          <CyDText className={'text-[18px] font-extrabold'}>{t<string>('CARD_SET_PIN')}</CyDText>
          <CyDView className={'mt-[5px] mb-[20px]'}>
            {/* <OtpInput pinCount={4} getOtp={(otp) => { void verifyOTP(Number(otp)); }}></OtpInput> */}
            <CyDTextInput
              className={clsx('h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor', { 'pl-[1px] pt-[2px]': isAndroid(), 'tracking-[15px]': pin !== '', 'border-redCyD': pin !== '' && pin.length !== 4 })}
              keyboardType="numeric"
              placeholder='Enter Pin'
              placeholderTextColor={'#C5C5C5'}
              onChangeText={(num: string) => setPin(num)}
              value={pin}
              maxLength={4}
              secureTextEntry={true}
            />
          </CyDView>
          {/* { showSecuredEntryToggle && <CyDView className={'items-end'}>
                { securedEntry && <CyDTouchView onPress={() => { toggleSecuredEntry(); }}><CyDImage source={AppImages.EYE_OPEN} className={'w-[27px] h-[18px] mr-[12px]'} /></CyDTouchView> }
              </CyDView> } */}
        </CyDView>

        <CyDView>
          <CyDText className={'text-[18px] font-extrabold'}>{t<string>('CARD_CONFIRM_PIN')}</CyDText>
          <CyDView className={'mt-[5px]'}>
            {/* <OtpInput pinCount={4} getOtp={(otp) => { void verifyOTP(Number(otp)); }}></OtpInput> */}
            <CyDTextInput
              className={clsx('h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor', { 'pl-[1px] pt-[2px]': isAndroid(), 'tracking-[15px]': confirmPin !== '', 'border-redCyD': confirmPin !== '' && confirmPin.length !== 4 && pin !== confirmPin })}
              keyboardType="numeric"
              placeholder='Re-enter Pin'
              placeholderTextColor={'#C5C5C5'}
              onChangeText={(num: string) => setConfirmPin(num)}
              value={confirmPin}
              maxLength={4}
              secureTextEntry={true}
            />
            <CyDText className='text-redCyD mt-[5px]'>{confirmPin !== '' && confirmPin !== pin ? 'Pin doesn\'t match' : ''}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView className='w-full absolute bottom-0 mb-[10px] items-center'>
          <Button title={t('CONFIRM')} disabled={!confirmPin || !pin || (confirmPin.length !== 4 || pin.length !== 4) || (confirmPin !== pin)} onPress={() => { verifyWithOTP(); }} type={ButtonType.PRIMARY} loading={loading} style=' h-[60px] w-[90%]'/>
      </CyDView>
    </CyDSafeAreaView>
  );
}
