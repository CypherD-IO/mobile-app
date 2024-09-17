import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDKeyboardAwareScrollView,
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
import * as yup from 'yup';
import { useFormik } from 'formik';

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
      verifyOTPPayload: { pin: changePinFormik.values.pin },
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

  const cardValidationSchema = yup.object({
    pin: yup
      .string()
      .required('Pin Required')
      .matches(/^[0-9]+$/, 'Must be only digits')
      .min(4, 'Must be exactly 4 digits')
      .max(4, 'Must be exactly 4 digits'),
    confirmPin: yup
      .string()
      .matches(/^[0-9]+$/, 'Must be only digits')
      .min(4, 'Must be exactly 4 digits')
      .max(4, 'Must be exactly 4 digits')
      .test('pins-match', 'Pins must match', function (value) {
        return this.parent.pin === value;
      }),
  });

  const cardValidationSchemaRc = yup.object({
    pin: yup
      .string()
      .matches(/^\d{4,12}$/, 'Only 4-12 digits accepted')
      .test(
        'two-consecutive-numbers',
        'Only two consecutive numbers accepted at most',
        value => {
          if (value) {
            const digits = value.split('').map(Number);
            let consecutiveCount = 0;
            for (let i = 1; i < digits.length; i++) {
              if (digits[i] === digits[i - 1] + 1) {
                consecutiveCount++;
              }
              if (consecutiveCount > 1) return false;
            }
            return true;
          }
          return false;
        },
      )
      .test(
        'two-repeated-numbers',
        'Only two repeated numbers in a row accepted at most',
        value => {
          return value ? !/(\d)\1{2,}/.test(value) : false;
        },
      )
      .test(
        'no-more-than-two-repeated-digits',
        'No more than two repeated digits allowed',
        value => {
          if (value) {
            const digitCounts = {};
            for (const digit of value) {
              digitCounts[digit] = (digitCounts[digit] || 0) + 1;
              if (digitCounts[digit] > 2) return false;
            }
            return true;
          }
          return false;
        },
      ),
    confirmPin: yup
      .string()
      .matches(/^\d{4,12}$/, 'Only 4-12 digits accepted')
      .test(
        'two-consecutive-numbers',
        'Only two consecutive numbers accepted at most',
        value => {
          if (value) {
            const digits = value.split('').map(Number);
            let consecutiveCount = 0;
            for (let i = 1; i < digits.length; i++) {
              if (digits[i] === digits[i - 1] + 1) {
                consecutiveCount++;
              }
              if (consecutiveCount > 1) return false;
            }
            return true;
          }
          return false;
        },
      )
      .test(
        'two-repeated-numbers',
        'Only two repeated numbers in a row accepted at most',
        value => {
          return value ? !/(\d)\1{2,}/.test(value) : false;
        },
      )
      .test(
        'no-more-than-two-repeated-digits',
        'No more than two repeated digits allowed',
        value => {
          if (value) {
            const digitCounts = {};
            for (const digit of value) {
              digitCounts[digit] = (digitCounts[digit] || 0) + 1;
              if (digitCounts[digit] > 2) return false;
            }
            return true;
          }
          return false;
        },
      )
      .test('pins-match', 'Pins must match', function (value) {
        return this.parent.pin === value;
      }),
  });

  const changePinFormik = useFormik({
    initialValues: {
      pin: '',
      confirmPin: '',
    },
    validationSchema: cardValidationSchemaRc,
    onSubmit: values => {
      verifyWithOTP();
    },
  });

  return (
    <CyDSafeAreaView style={{ height: keyboardHeight || '100%' }}>
      <CyDScrollView
        className=' bg-white pb-[12px]'
        contentContainerStyle={styles.contentContainerStyle}>
        <CyDKeyboardAwareScrollView>
          <CyDView>
            <ActivateCardHeader />
            <CyDView className={' px-[24px] pt-[10px] mt-[14px]'}>
              <CyDView>
                <CyDText className={'text-[18px] font-extrabold'}>
                  {t<string>('CARD_SET_PIN')}
                </CyDText>
                <CyDView className={'mt-[5px]'}>
                  <CyDTextInput
                    className={clsx(
                      'h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor',
                      {
                        'pl-[1px] pt-[2px]': isAndroid(),
                        'tracking-[15px]': changePinFormik.values.pin !== '',
                        'border-redCyD': !!(
                          changePinFormik.errors.pin &&
                          changePinFormik.touched.pin
                        ),
                      },
                    )}
                    keyboardType='numeric'
                    placeholder='Enter Pin'
                    placeholderTextColor={'#C5C5C5'}
                    onChangeText={changePinFormik.handleChange('pin')}
                    value={changePinFormik.values.pin}
                    secureTextEntry={true}
                  />
                </CyDView>
                {!!(
                  changePinFormik.errors.pin && changePinFormik.touched.pin
                ) && (
                  <CyDText className='text-redCyD'>
                    {changePinFormik.errors.pin}
                  </CyDText>
                )}
              </CyDView>

              <CyDView>
                <CyDText className={'text-[18px] font-extrabold mt-[20px]'}>
                  {t<string>('CARD_CONFIRM_PIN')}
                </CyDText>
                <CyDView className={'mt-[5px]'}>
                  <CyDTextInput
                    className={clsx(
                      'h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor',
                      {
                        'pl-[1px] pt-[2px]': isAndroid(),
                        'tracking-[15px]':
                          changePinFormik.values.confirmPin !== '',
                        'border-redCyD': !!(
                          changePinFormik.errors.confirmPin &&
                          changePinFormik.touched.confirmPin
                        ),
                      },
                    )}
                    keyboardType='numeric'
                    placeholder='Re-enter Pin'
                    placeholderTextColor={'#C5C5C5'}
                    onChangeText={changePinFormik.handleChange('confirmPin')}
                    value={changePinFormik.values.confirmPin}
                    secureTextEntry={true}
                  />
                  {!!(
                    changePinFormik.errors.confirmPin &&
                    changePinFormik.touched.confirmPin
                  ) && (
                    <CyDText className='text-redCyD'>
                      {changePinFormik.errors.confirmPin}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>

              <CyDView className='w-full mb-[4px] mt-[12px] items-center'>
                <CyDText className='text-[12px]'>
                  Only 4-12 digits accepted.{'\n'}
                  Only two consecutive numbers accepted at most (eg: 124758){' '}
                  {'\n'}
                  Only two repeated numbers in a row accepted at most
                  (eg:112331)
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='w-full mb-[4px] mt-[12px] items-center'>
            <Button
              title={t('CONFIRM')}
              disabled={
                changePinFormik.values.pin === '' ||
                changePinFormik.values.confirmPin === ''
              }
              onPress={changePinFormik.handleSubmit}
              type={ButtonType.PRIMARY}
              loading={loading}
              style='h-[60px] w-[90%]'
            />
          </CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
