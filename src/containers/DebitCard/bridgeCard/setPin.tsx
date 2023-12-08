import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { ButtonType, CardProviders } from '../../../constants/enum';
import clsx from 'clsx';
import { isAndroid } from '../../../misc/checkers';
import Button from '../../../components/v2/button';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { screenTitle } from '../../../constants';
import { useKeyboard } from '../../../hooks/useKeyboard';

export default function SetPin(props: {
  navigation: any;
  route: {
    params: {
      currentCardProvider: CardProviders;
      card: { cardId: string };
    };
  };
}) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const { navigation, route } = props;
  const { currentCardProvider, card } = route.params;
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { keyboardHeight } = useKeyboard();

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
    showModal('state', {
      type: 'success',
      title: t('CARD_PIN_SET_HEADER'),
      description: t('CARD_PIN_SET_DESCRIPTION'),
      onSuccess: () => onModalHide('success'),
      onFailure: () => onModalHide('success'),
    });
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, {
      onSuccess: (data: any, cardProvider: CardProviders) => {
        void onPinSet();
      },
      currentCardProvider,
      card,
      triggerOTPParam: 'set-pin',
      verifyOTPPayload: { pin },
    });
  };

  const ActivateCardHeader = () => {
    return (
      <CyDView className='px-[20px]'>
        <CyDText className={'text-[25px] font-extrabold'}>
          {t<string>('CARD_SET_NEW_PIN')}
        </CyDText>
        <CyDText className={'text-[15px] font-bold mt-[3px]'}>
          {t<string>('CARD_SET_PIN_TO_USE_CARD')}
        </CyDText>
      </CyDView>
    );
  };

  const styles = StyleSheet.create({
    contentContainerStyle: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...(!keyboardHeight && { flex: 1 }),
    },
  });

  return (
    <CyDSafeAreaView style={{ height: keyboardHeight || '100%' }}>
      <CyDScrollView
        className=' bg-white pb-[12px]'
        contentContainerStyle={styles.contentContainerStyle}>
        <CyDView>
          <ActivateCardHeader />
          <CyDView className={' px-[24px] pt-[10px] mt-[14px]'}>
            <CyDView>
              <CyDText className={'text-[18px] font-extrabold'}>
                {t<string>('CARD_SET_PIN')}
              </CyDText>
              <CyDView className={'mt-[5px] mb-[20px]'}>
                <CyDTextInput
                  className={clsx(
                    'h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor',
                    {
                      'pl-[1px] pt-[2px]': isAndroid(),
                      'tracking-[15px]': pin !== '',
                      'border-redCyD': pin !== '' && pin.length !== 4,
                    },
                  )}
                  keyboardType='numeric'
                  placeholder='Enter Pin'
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={(num: string) => setPin(num)}
                  value={pin}
                  maxLength={4}
                  secureTextEntry={true}
                />
              </CyDView>
            </CyDView>

            <CyDView>
              <CyDText className={'text-[18px] font-extrabold'}>
                {t<string>('CARD_CONFIRM_PIN')}
              </CyDText>
              <CyDView className={'mt-[5px]'}>
                <CyDTextInput
                  className={clsx(
                    'h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor',
                    {
                      'pl-[1px] pt-[2px]': isAndroid(),
                      'tracking-[15px]': confirmPin !== '',
                      'border-redCyD':
                        confirmPin !== '' &&
                        confirmPin.length !== 4 &&
                        pin !== confirmPin,
                    },
                  )}
                  keyboardType='numeric'
                  placeholder='Re-enter Pin'
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={(num: string) => setConfirmPin(num)}
                  value={confirmPin}
                  maxLength={4}
                  secureTextEntry={true}
                />
                <CyDText className='text-redCyD mt-[5px]'>
                  {confirmPin !== '' && confirmPin !== pin
                    ? "Pin doesn't match"
                    : ''}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='w-full mb-[4px] mt-[12px] items-center'>
          <Button
            title={t('CONFIRM')}
            disabled={
              !confirmPin ||
              !pin ||
              confirmPin.length !== 4 ||
              pin.length !== 4 ||
              confirmPin !== pin
            }
            onPress={() => {
              verifyWithOTP();
            }}
            type={ButtonType.PRIMARY}
            loading={loading}
            style='h-[60px] w-[90%]'
          />
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
