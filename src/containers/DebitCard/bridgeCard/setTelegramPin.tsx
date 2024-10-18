import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
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
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import AppImages from '../../../../assets/images/appImages';
import { countBy } from 'lodash';
import { PinInput } from '../../../components/v2/pinInput';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: { cardId: string };
}

export default function SetTelegramPin() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const { keyboardHeight } = useKeyboard();
  const [showErrors, setShowErrors] = useState(false);

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
      triggerOTPParam: 'tg-set-pin',
      verifyOTPPayload: { pin: changePinFormik.values.pin.join('') },
    });
  };

  const ActivateCardHeader = () => {
    return (
      <CyDView className='px-[20px] mt-[32px]'>
        <CyDText className={'text-[14px] font-medium text-[#6B788E]'}>
          {t<string>('SET_TELEGRAM_PIN_DESCRIPTION')}
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

  const cardValidationSchemaRc = yup.object({
    pin: yup
      .array()
      .of(yup.string().matches(/^\d$/, 'Only digits accepted'))
      .length(6, 'Must be exactly 6 digits')
      .test(
        'two-consecutive-numbers',
        'Only two consecutive numbers accepted at most',
        value => {
          if (value) {
            const digits = value.map(Number);
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
          return value ? !/(\d)\1{2,}/.test(value.join('')) : false;
        },
      )
      .test(
        'no-more-than-two-repeated-digits',
        'No more than two repeated digits allowed',
        value => {
          if (value) {
            const digitCounts = countBy(value);
            return Object.values(digitCounts).every(
              (count: number) => count <= 2,
            );
          }
          return false;
        },
      ),
    confirmPin: yup
      .array()
      .of(yup.string().matches(/^\d$/, 'Only digits accepted'))
      .length(6, 'Must be exactly 6 digits')
      .test(
        'two-consecutive-numbers',
        'Only two consecutive numbers accepted at most',
        value => {
          if (value) {
            const digits = value.map(Number);
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
          return value ? !/(\d)\1{2,}/.test(value.join('')) : false;
        },
      )
      .test(
        'no-more-than-two-repeated-digits',
        'No more than two repeated digits allowed',
        value => {
          if (value) {
            const digitCounts = countBy(value);
            return Object.values(digitCounts).every(
              (count: number) => count <= 2,
            );
          }
          return false;
        },
      )
      .test('pins-match', 'Pins must match', function (value) {
        return JSON.stringify(this.parent.pin) === JSON.stringify(value);
      }),
  });

  const changePinFormik = useFormik({
    initialValues: {
      pin: ['', '', '', '', '', ''],
      confirmPin: ['', '', '', '', '', ''],
    },
    validationSchema: cardValidationSchemaRc,
    onSubmit: values => {
      const joinedPin = values.pin.join('');
      verifyWithOTP();
    },
    validate: values => {
      const errors: { pin?: string; confirmPin?: string } = {};
      const isValidPin = (pin: string[]) => {
        return pin.every(digit => /^\d$/.test(digit)) && pin.length === 6;
      };

      if (!isValidPin(values.pin)) {
        errors.pin = 'The pin must be 6 digits';
      }
      if (!isValidPin(values.confirmPin)) {
        errors.confirmPin = 'The pin must be 6 digits';
      }
      return errors;
    },
  });

  const handleConfirmPress = () => {
    setShowErrors(true);
    changePinFormik.setTouched({
      pin: true,
      confirmPin: true,
    });
    if (changePinFormik.isValid) {
      changePinFormik.handleSubmit();
    }
  };

  return (
    <CyDSafeAreaView style={{ flex: 1 }}>
      <CyDView className='flex-1 pb-[12px] bg-[#F1F0F5]'>
        <CyDView className='flex flex-row items-center mx-[20px]'>
          <CyDTouchView
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDImage
              source={AppImages.BACK_ARROW_GRAY}
              className='w-[32px] h-[32px]'
            />
          </CyDTouchView>
          <CyDText className='text-black ml-[12px] text-[18px]'>
            {t('SET_TELEGRAM_PIN')}
          </CyDText>
        </CyDView>
        <CyDKeyboardAwareScrollView
          contentContainerStyle={styles.contentContainerStyle}>
          <CyDView>
            <ActivateCardHeader />
            <CyDView className={' px-[24px] pt-[10px] mt-[14px]'}>
              <CyDView>
                <CyDText className={'text-[12px] text-[#6B788E]'}>
                  {t<string>('CARD_SET_PIN')}
                </CyDText>
                <CyDView className={'mt-[5px]'}>
                  <PinInput
                    value={changePinFormik.values.pin}
                    onChange={value =>
                      changePinFormik.setFieldValue('pin', value)
                    }
                    error={
                      showErrors &&
                      !!(
                        changePinFormik.errors.pin &&
                        changePinFormik.touched.pin
                      )
                    }
                    onBlur={() => changePinFormik.setFieldTouched('pin', true)}
                    length={6}
                  />
                </CyDView>
                {showErrors &&
                  !!(
                    changePinFormik.errors.pin && changePinFormik.touched.pin
                  ) && (
                    <CyDText className='text-redCyD'>
                      {changePinFormik.errors.pin}
                    </CyDText>
                  )}
              </CyDView>

              <CyDView>
                <CyDText className={'text-[12px] mt-[20px] text-[#6B788E]'}>
                  {t<string>('CARD_CONFIRM_PIN')}
                </CyDText>
                <CyDView className={'mt-[5px]'}>
                  <PinInput
                    value={changePinFormik.values.confirmPin}
                    onChange={value =>
                      changePinFormik.setFieldValue('confirmPin', value)
                    }
                    error={
                      showErrors &&
                      !!(
                        changePinFormik.errors.confirmPin &&
                        changePinFormik.touched.confirmPin
                      )
                    }
                    onBlur={() =>
                      changePinFormik.setFieldTouched('confirmPin', true)
                    }
                    length={6}
                  />
                </CyDView>
                {showErrors &&
                  !!(
                    changePinFormik.errors.confirmPin &&
                    changePinFormik.touched.confirmPin
                  ) && (
                    <CyDText className='text-redCyD'>
                      {changePinFormik.errors.confirmPin}
                    </CyDText>
                  )}
              </CyDView>

              <CyDView className='w-full mb-[4px] mt-[12px] items-center'>
                <CyDText className='text-[12px] mt-[16px] text-[#6B788E]'>
                  Only 6 digits accepted.{'\n'}
                  Only two consecutive numbers accepted at most (eg: 124758){' '}
                  {'\n'}
                  Only two repeated numbers in a row accepted at most
                  (eg:115337)
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDKeyboardAwareScrollView>
        <CyDView className='w-full mb-[4px] mt-[12px] px-[20px]'>
          <Button
            title={t('CONFIRM')}
            disabled={showErrors && !changePinFormik.isValid}
            onPress={handleConfirmPress}
            type={ButtonType.PRIMARY}
            loading={loading}
            style='h-[60px] w-full'
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
