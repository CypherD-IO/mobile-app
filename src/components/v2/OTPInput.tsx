import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { isAndroid } from '../../misc/checkers';
import { t } from 'i18next';
import {
  CyDImage,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { OTP_CALLBACK_TIMEOUT } from '../../constants/timeOuts';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { StyleSheet } from 'react-native';
interface InputProps {
  pinCount: number;
  getOtp: (code: string) => void;
  showButton?: boolean;
  buttonCTA?: string;
  showSecuredEntryToggle?: boolean;
  loader?: boolean;
  placeholder?: string;
}

function OtpInput({
  pinCount,
  getOtp,
  showButton = false,
  buttonCTA = t('SUBMIT'),
  showSecuredEntryToggle = false,
  loader = false,
  placeholder = t('ENTER_PIN_PLACEHOLDER'),
}: InputProps) {
  const [otp, setOTP] = useState<string>('');
  const [securedEntry, setSecuredEntry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!showButton) {
      if (otp?.length === pinCount) {
        setTimeout(() => {
          getOtp(otp);
        }, OTP_CALLBACK_TIMEOUT);
      }
    }
  }, [otp]);

  const toggleSecuredEntry = () => {
    const securedEntryStatus = securedEntry;
    setSecuredEntry(!securedEntryStatus);
  };

  return (
    <CyDView>
      <CyDView
        className={
          'flex flex-row justify-between items-center rounded-[5px] border-[1px] border-inputBorderColor'
        }
      >
        <CyDTextInput
          className={clsx('h-[55px] text-center w-[100%] tracking-[5px]', {
            'pl-[1px] pt-[2px]': isAndroid(),
            'tracking-[15px]': otp !== '',
            'w-[90%] pl-[35px]': showSecuredEntryToggle,
          })}
          keyboardType='numeric'
          placeholder={placeholder}
          placeholderTextColor={'#C5C5C5'}
          secureTextEntry={showSecuredEntryToggle && securedEntry}
          onChangeText={(num) => setOTP(num)}
          value={otp}
          maxLength={pinCount}
        />
        {showSecuredEntryToggle && (
          <CyDView className={'items-end'}>
            {securedEntry && (
              <CyDTouchView
                onPress={() => {
                  toggleSecuredEntry();
                }}
              >
                <CyDImage
                  source={AppImages.EYE_OPEN}
                  className={'w-[27px] h-[18px] mr-[12px]'}
                />
              </CyDTouchView>
            )}
            {!securedEntry && (
              <CyDTouchView
                onPress={() => {
                  toggleSecuredEntry();
                }}
              >
                <CyDImage
                  source={AppImages.EYE_CLOSE}
                  className={'w-[27px] h-[20px] mr-[12px]'}
                />
              </CyDTouchView>
            )}
          </CyDView>
        )}
      </CyDView>
      {showButton && (
        <CyDView>
          <Button
            disabled={otp?.length !== pinCount}
            onPress={() => {
              setIsLoading(loader);
              getOtp(otp);
            }}
            title={buttonCTA ?? ''}
            loading={isLoading}
            isLottie={false}
            style={
              'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] w-[70%] mx-auto mt-[60px]'
            }
            loaderStyle={styles.buttonLoader}
          />
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  buttonLoader: {
    height: 21,
  },
});

export default OtpInput;
