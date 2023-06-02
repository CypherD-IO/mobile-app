import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { isAndroid } from '../../misc/checkers';
import { t } from 'i18next';
import { CyDImage, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { OTP_CALLBACK_TIMEOUT } from '../../constants/timeOuts';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
interface InputProps {
  pinCount: number
  getOtp: (code: string) => void
  showButton?: boolean
  buttonCTA?: string
  showSecuredEntryToggle?: boolean
  loader?: boolean
}

function OtpInput ({ pinCount, getOtp, showButton = false, buttonCTA = t('SUBMIT'), showSecuredEntryToggle = false, loader = false }: InputProps) {
  const [otp, setOTP] = useState<string[]>(Array(pinCount).fill(''));
  const otpTextInput: string | any[] = [];
  const inputs: Number[] = Array(pinCount).fill(0);
  const [securedEntry, setSecuredEntry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (otp.length < pinCount) {
      otpTextInput[otp.length].focus();
    }
    if (!showButton) {
      if (otp.join('').length === pinCount) {
        setTimeout(() => {
          getOtp(otp.join(''));
        }, OTP_CALLBACK_TIMEOUT);
      }
    }
  }, [otp]);

  const focusPrevious = (key: string, index: number) => {
    if (key === 'Backspace' && index !== 0) {
      const tempOTP = otp.slice(0, index - 1);
      setOTP([...tempOTP]);
    }
  };

  const focusNext = (index: number, value: string) => {
    if (value.length === 1) {
      if (index < otpTextInput.length - 1 && value) {
        otpTextInput[index + 1].focus();
      }
      if (index === 0 || index === otpTextInput.length - 1) {
        otpTextInput[index].blur();
      }
      const tempOTP: string[] = otp;
      tempOTP[index] = value;
      setOTP([...tempOTP]);
    } else {
      if (value.length > pinCount) {
        value = value.substring(0, pinCount);
      }
      const tempOTP: string[] = value.split('');
      setOTP([...tempOTP]);
      if (value.length < pinCount) {
        otpTextInput[value.length].focus();
      }
    }
  };

  const toggleSecuredEntry = () => {
    const securedEntryStatus = securedEntry;
    setSecuredEntry(!securedEntryStatus);
  };

  return (
        <CyDView>
          <CyDView className={'flex flex-row flex-wrap justify-center items-center'}>
            {inputs.map(
              (i, j) => {
                return (<CyDView className={'m-[10px]'} key={j}>
                  <CyDTextInput
                    className={clsx('h-[45px] w-[45px] border-[1px] text-center rounded-[5px] border-inputBorderColor', { 'pl-[1px] pt-[2px]': isAndroid() })}
                    keyboardType="numeric"
                    secureTextEntry={showSecuredEntryToggle && securedEntry}
                    onChangeText={v => focusNext(j, v)}
                    value={otp[j]}
                    onKeyPress={e => focusPrevious(e.nativeEvent.key, j)}
                    ref={(ref) => { otpTextInput[j] = ref; }}
                    autoFocus={j === 0}
                    maxLength={1}
                  />
                </CyDView>);
              })}
              { showSecuredEntryToggle && <CyDView className={'ml-[5px]'}>
                { securedEntry && <CyDTouchView onPress={() => { toggleSecuredEntry(); }}><CyDImage source={AppImages.EYE_OPEN} className={'w-[27px] h-[18px] mr-[12px]'} /></CyDTouchView> }
                { !securedEntry && <CyDTouchView onPress={() => { toggleSecuredEntry(); }}><CyDImage source={AppImages.EYE_CLOSE} className={'w-[27px] h-[20px] mr-[12px]'} /></CyDTouchView> }
              </CyDView> }
          </CyDView>
          {showButton && <CyDView>
            <Button
              disabled={otp.join('').length !== pinCount}
              onPress={() => { setIsLoading(loader); getOtp(otp.join('')); }}
              title={buttonCTA ?? ''}
              loading={isLoading}
              isLottie={false}
              style={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] w-[70%] mx-auto mt-[60px]'}
              loaderStyle={{ height: 21 }}
            />
          </CyDView>}
        </CyDView>
  );
}

export default OtpInput;
