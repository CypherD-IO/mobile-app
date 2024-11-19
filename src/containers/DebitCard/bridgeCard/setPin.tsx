import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import clsx from 'clsx';
import { useFormik } from 'formik';
import { t } from 'i18next';
import { capitalize, countBy } from 'lodash';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as yup from 'yup';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { ButtonType, CardProviders } from '../../../constants/enum';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { Card } from '../../../models/card.model';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: Card;
}

interface PinValidationState {
  consecutiveNumbers: boolean;
  repeatedNumbers: boolean;
  repeatedDigits: boolean;
  validLength: boolean;
}

export default function SetPin() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();

  const { currentCardProvider, card } = route.params;
  const [pinSetSuccess, setPinSetSuccess] = useState<boolean>(false);

  const [pinValidationState, setPinValidationState] =
    useState<PinValidationState>({
      consecutiveNumbers: false,
      repeatedNumbers: false,
      repeatedDigits: false,
      validLength: false,
    });

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, {
      onSuccess: () => {
        setPinSetSuccess(true);
      },
      currentCardProvider,
      card,
      triggerOTPParam: 'set-pin',
      verifyOTPPayload: { pin: changePinFormik.values.pin },
    });
  };

  const cardValidationSchemaRc = yup.object({
    pin: yup
      .string()
      .matches(/^\d{4,12}$/, 'Only 4-6 digits accepted')
      .test('valid-length', 'PIN must be between 4 and 6 digits', value => {
        const isValid = value ? value.length >= 4 && value.length <= 6 : false;
        setPinValidationState(prev => ({
          ...prev,
          validLength: isValid,
        }));
        return isValid;
      })
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
            }
            const isValid = consecutiveCount <= 1;
            setPinValidationState(prev => ({
              ...prev,
              consecutiveNumbers: isValid,
            }));
            return isValid;
          }
          return false;
        },
      )
      .test(
        'two-repeated-numbers',
        'Only two repeated numbers in a row accepted at most',
        value => {
          const isValid = value ? !/(\d)\1{2,}/.test(value) : false;
          setPinValidationState(prev => ({
            ...prev,
            repeatedNumbers: isValid,
          }));
          return isValid;
        },
      )
      .test(
        'no-more-than-two-repeated-digits',
        'No more than two repeated digits allowed',
        value => {
          if (value) {
            const digitCounts = countBy(value);
            const isValid = Object.values(digitCounts).every(
              (count: number) => count <= 2,
            );
            setPinValidationState(prev => ({
              ...prev,
              repeatedDigits: isValid,
            }));
            return isValid;
          }
          return false;
        },
      ),
    confirmPin: yup
      .string()
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
    <CyDView className='bg-n30 flex-1' style={{ paddingTop: insets.top + 16 }}>
      <CyDView>
        <CyDTouchView
          className='flex-row items-center px-[16px]'
          onPress={() => navigation.goBack()}>
          <CyDImage
            source={AppImages.BACK_ARROW_GRAY}
            className='w-[32px] h-[32px]'
            resizeMode='contain'
          />
          <CyDText className='ml-[12px] text-[18px] font-normal'>
            {capitalize(card.type)} {'card **'}
            {card.last4}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDKeyboardAwareScrollView className='flex-1 mt-[24px] px-[16px]'>
        {!pinSetSuccess && (
          <CyDView>
            <CyDImage
              source={AppImages.CARD_SECURE}
              className='w-[52px] h-[36px]'
              resizeMode='contain'
            />

            <CyDText className='text-[28px] font-bold mt-[6px]'>
              {t<string>('SET_CARD_PIN')}
            </CyDText>
            <CyDText className='text-[14px] text-n200 mt-[6px]'>
              {t<string>('CARD_SET_PIN_TO_USE_CARD')}
            </CyDText>

            <CyDText className='text-[12px] font-normal text-n200 mt-[20px]'>
              {t<string>('NEW_PIN')}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'h-[64px] w-full rounded-[8px] border-n50 border-[1px] bg-n0 p-[16px] mt-[6px] text-[14px] font-bold',
                {
                  'tracking-[10px] text-[22px]':
                    changePinFormik.values.pin !== '',
                  'border-redCyD text-redCyD': !!(
                    changePinFormik.errors.pin && changePinFormik.touched.pin
                  ),
                },
              )}
              keyboardType='numeric'
              placeholder={t<string>('ENTER_PIN_PLACEHOLDER')}
              placeholderTextColor={'#C5C5C5'}
              onChangeText={changePinFormik.handleChange('pin')}
              value={changePinFormik.values.pin}
              secureTextEntry={true}
            />

            <CyDView className='mt-[20px]'>
              <CyDView className='flex-row items-center'>
                <CyDImage
                  source={
                    !changePinFormik.touched.pin
                      ? AppImages.SUCCESS_TICK_GRAY_BG_ROUNDED
                      : pinValidationState.validLength
                        ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                        : AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED
                  }
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className='ml-[4px] text-[12px] text-n200'>
                  PIN must be between 4 and 6 digits
                </CyDText>
              </CyDView>

              <CyDView className='flex-row mt-[12px]'>
                <CyDImage
                  source={
                    !changePinFormik.touched.pin
                      ? AppImages.SUCCESS_TICK_GRAY_BG_ROUNDED
                      : pinValidationState.consecutiveNumbers
                        ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                        : AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED
                  }
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className='ml-[4px] text-[12px] text-n200'>
                  Only two consecutive numbers accepted at most (eg: 124758)
                </CyDText>
              </CyDView>

              <CyDView className='flex-row mt-[12px]'>
                <CyDImage
                  source={
                    !changePinFormik.touched.pin
                      ? AppImages.SUCCESS_TICK_GRAY_BG_ROUNDED
                      : pinValidationState.repeatedNumbers
                        ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                        : AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED
                  }
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className='ml-[4px] text-[12px] text-n200'>
                  Only two repeated numbers in a row accepted at most
                  (eg:112331)
                </CyDText>
              </CyDView>

              <CyDView className='flex-row items-center mt-[12px]'>
                <CyDImage
                  source={
                    !changePinFormik.touched.pin
                      ? AppImages.SUCCESS_TICK_GRAY_BG_ROUNDED
                      : pinValidationState.repeatedDigits
                        ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                        : AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED
                  }
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className='ml-[4px] text-[12px] text-n200'>
                  No more than two repeated digits allowed
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDText className='text-[12px] font-normal text-n200 mt-[20px]'>
              {t<string>('CARD_CONFIRM_PIN')}
            </CyDText>
            <CyDTextInput
              className={clsx(
                'h-[64px] w-full rounded-[8px] border-n50 border-[1px] bg-n0 p-[16px] mt-[6px] text-[14px] font-bold',
                {
                  'tracking-[10px] text-[22px]':
                    changePinFormik.values.confirmPin !== '',
                  'border-redCyD text-redCyD': !!(
                    changePinFormik.errors.confirmPin &&
                    changePinFormik.touched.confirmPin
                  ),
                },
              )}
              keyboardType='numeric'
              placeholder={t<string>('RE_ENTER_PIN_PLACEHOLDER')}
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
        )}
        {pinSetSuccess && (
          <CyDView className=''>
            <CyDImage
              source={AppImages.SUCCESS_TICK_GREEN_BG}
              className='w-[85px] h-[85px] mt-[44px]'
              resizeMode='contain'
            />

            <CyDText className='mt-[24px] text-[44px] font-extrabold'>
              {t('CREATE_PIN_SUCCESSFUL')}
            </CyDText>
            <CyDText className='mt-[6px] text-[14px]'>
              {t('CREATE_PIN_SUCCESSFUL_DESCRIPTION')}
            </CyDText>

            <CyDView className='bg-n0 rounded-[12px] border border-[#E9EBF8] p-[12px] mt-[16px] flex-row items-center'>
              <CyDImage
                source={AppImages.INFO_CIRCLE}
                className='w-[24px] h-[24px] flex-shrink-0'
                resizeMode='contain'
              />
              <CyDText className='text-[12px] ml-[8px] w-[80%]'>
                {t('KEEP_PIN_SAFE')}
              </CyDText>
            </CyDView>
          </CyDView>
        )}
      </CyDKeyboardAwareScrollView>

      <CyDView className='w-full px-[16px] pb-[24px] pt-[20px] rounded-t-[16px] bg-n0 '>
        <Button
          title={t('CONTINUE')}
          disabled={
            !pinSetSuccess &&
            (!changePinFormik.isValid || !changePinFormik.dirty)
          }
          onPress={
            pinSetSuccess
              ? () => {
                  setPinSetSuccess(false);
                  navigation.goBack();
                }
              : changePinFormik.handleSubmit
          }
          type={ButtonType.PRIMARY}
          style='h-[60px] w-full'
        />
      </CyDView>
    </CyDView>
  );
}
