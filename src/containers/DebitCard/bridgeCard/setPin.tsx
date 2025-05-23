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
import React, { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as yup from 'yup';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { ButtonType, CardProviders } from '../../../constants/enum';
import {
  CyDIcons,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { Card } from '../../../models/card.model';
import { Animated, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: Card;
  isCardActivation?: boolean;
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

  const { currentCardProvider, card, isCardActivation } = route.params;
  const [pinSetSuccess, setPinSetSuccess] = useState<boolean>(false);

  const [pinValidationState, setPinValidationState] =
    useState<PinValidationState>({
      consecutiveNumbers: false,
      repeatedNumbers: false,
      repeatedDigits: false,
      validLength: false,
    });

  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const setLimitsPromptsRef = useRef<View>(null);
  const setLimitsButtonRef = useRef<View>(null);
  useEffect(() => {
    if (pinSetSuccess) {
      setTimeout(() => {
        if (setLimitsPromptsRef.current && scrollViewRef.current) {
          setLimitsPromptsRef.current.measure(
            (x, y, width, height, pageX, pageY) => {
              scrollViewRef.current?.scrollToPosition(0, pageY - 60, true);
            },
          );
          if (setLimitsButtonRef.current) {
            setLimitsButtonRef.current.setNativeProps({
              style: {
                display: 'flex',
                opacity: 0,
              },
            });
            // Animate fade in
            Animated.timing(new Animated.Value(0), {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                setLimitsButtonRef.current?.setNativeProps({
                  style: { opacity: 1 },
                });
              }
            });
          }
        }
      }, 2000);
    }
  }, [setLimitsPromptsRef.current, scrollViewRef.current, pinSetSuccess]);

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.CARD_REVEAL_AUTH_SCREEN, {
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
      .matches(/^\d{4,6}$/, 'Only 4-6 digits accepted')
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
    <CyDView className='bg-n20 flex-1' style={{ paddingTop: insets.top + 16 }}>
      <CyDView>
        <CyDTouchView
          className='flex-row items-center px-[16px]'
          onPress={() => navigation.goBack()}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
          <CyDText className='ml-[12px] text-[18px] font-normal'>
            {capitalize(card.type)} {'card **'}
            {card.last4}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDKeyboardAwareScrollView
        className='flex-1 mt-[24px] px-[16px]'
        ref={scrollViewRef}>
        {!pinSetSuccess && (
          <CyDView>
            <CyDMaterialDesignIcons
              name='credit-card-lock-outline'
              size={36}
              className='text-base400'
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
            <CyDView>
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

              <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px] mt-[16px] flex-row items-center'>
                <CyDMaterialDesignIcons
                  name='information-outline'
                  size={24}
                  className='text-base400 flex-shrink-0'
                />
                <CyDText className='text-[12px] ml-[8px] w-[80%]'>
                  {t('KEEP_PIN_SAFE')}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        )}
      </CyDKeyboardAwareScrollView>

      {!pinSetSuccess && (
        <CyDView className='w-full px-[16px] pb-[24px] pt-[20px] rounded-t-[16px] bg-n0 '>
          <Button
            title={t('CONTINUE')}
            disabled={
              !pinSetSuccess &&
              (!changePinFormik.isValid || !changePinFormik.dirty)
            }
            onPress={changePinFormik.handleSubmit}
            type={ButtonType.PRIMARY}
            style='h-[60px] w-full'
          />
        </CyDView>
      )}
      {pinSetSuccess && isCardActivation && (
        <CyDView
          className='w-full px-[16px] pb-[24px] pt-[20px] rounded-t-[16px] bg-n0 hidden'
          ref={setLimitsButtonRef}>
          <Button
            title={t('SETUP_NOW')}
            onPress={() => {
              setPinSetSuccess(false);
              navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
                currentCardProvider,
                cardId: card.cardId,
              });
            }}
            type={ButtonType.PRIMARY}
            style='h-[60px] w-full'
          />
          <Button
            title={t('MAYBE_LATER')}
            onPress={() => {
              setPinSetSuccess(false);
              navigation.goBack();
            }}
            type={ButtonType.SECONDARY}
            style='h-[60px] w-full mt-[12px]'
          />
        </CyDView>
      )}
    </CyDView>
  );
}
