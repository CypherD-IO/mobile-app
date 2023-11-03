/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDImageBackground,
  CyDTouchView,
  CyDTextInput,
  CyDScrollView,
  CyDKeyboardAvoidingView,
  CyDSafeAreaView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import LottieView from 'lottie-react-native';
import { isAndroid } from '../../misc/checkers';
import { Colors } from '../../constants/theme';
import useAxios from '../../core/HttpRequest';

export default function CardSignupLandingScreen(props: {
  navigation: any;
  route: { params?: { selectedCountry?: {} } };
}) {
  const { t } = useTranslation();
  const [acknowledgement, setAcknowledgment] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const { navigation, route } = props;
  const { postWithAuth } = useAxios();
  const selectedCountry = route.params?.selectedCountry;
  const isInviteCodeOptional = false; // selectedCountry && selectedCountry.name === 'United States'

  const [loadersAndValidators, setLoadersAndValidators] = useState({
    inviteCodeVerified: false,
    isInviteCodeVerifying: false,
    isInvalidInviteCode: false,
  });

  const verifyInviteCode = async (code: string) => {
    setLoadersAndValidators({
      ...loadersAndValidators,
      isInvalidInviteCode: false,
      isInviteCodeVerifying: true,
    });
    try {
      const provider = inviteCode.slice(-2).toLowerCase();
      const response = await postWithAuth(
        `/v1/cards/${provider}/invite/verify`,
        {
          code: inviteCode,
        },
      );
      if (!response.isError && response.data) {
        setLoadersAndValidators({
          ...loadersAndValidators,
          inviteCodeVerified: true,
          isInviteCodeVerifying: false,
          isInvalidInviteCode: false,
        });
        if (isInviteCodeOptional && !loadersAndValidators.inviteCodeVerified) {
          navigation.navigate(screenTitle.CARD_SIGNUP_SCREEN, {
            selectedCountry,
          });
        } else {
          navigation.navigate(screenTitle.CARD_SIGNUP_SCREEN, {
            inviteCode,
            selectedCountry,
          });
        }
      } else {
        setLoadersAndValidators({
          ...loadersAndValidators,
          isInvalidInviteCode: true,
          isInviteCodeVerifying: false,
        });
      }
    } catch (e) {
      setLoadersAndValidators({
        ...loadersAndValidators,
        isInvalidInviteCode: true,
        isInviteCodeVerifying: false,
      });
      setInviteCode('');
    }
  };

  const isButtonEnabled = () => {
    return acknowledgement && (isInviteCodeOptional || inviteCode.length >= 6);
  };

  return (
    <CyDSafeAreaView className='h-full bg-appColor'>
      <CyDKeyboardAvoidingView
        behavior={isAndroid() ? 'height' : 'padding'}
        enabled
        className={'h-full flex grow-1'}>
        <CyDScrollView className='mb-[40px]'>
          <CyDImageBackground
            className={'h-[40%] pt-[30px]'}
            source={AppImages.CARD_SIGNUP_BACKGROUND}
            resizeMode={'cover'}>
            <CyDView className={'flex flex-row justify-center mt-[20px]'}>
              <CyDImage source={AppImages.VIRTUAL_SAMPLE_CARD}></CyDImage>
            </CyDView>
            <CyDView
              className={'mt-[20px] flex flex-row justify-center px-[20px]'}>
              <CyDText className={'text-[22px] font-extrabold leading-[32px]'}>
                {t<string>('CARD_SIGNUP_WELCOME_TEXT')}
              </CyDText>
            </CyDView>
            <CyDView
              className={
                'mt-[20px] flex flex-row justify-center px-[10%] mb-[10px]'
              }>
              <CyDText className={'text-[16px] font-semibold text-center'}>
                {t<string>('CARD_SIGNUP_INVITE_VERIFICATION_TEXT')}
              </CyDText>
            </CyDView>
            <CyDView
              className={'h-[55px] flex flex-row justify-center items-center'}>
              <CyDView
                className={
                  'bg-white w-[75%] mt-[2px] border rounded-[5px] py-[10px]'
                }>
                {!loadersAndValidators.isInviteCodeVerifying &&
                  !loadersAndValidators.inviteCodeVerified && (
                    <CyDTextInput
                      onChangeText={async value => {
                        setInviteCode(value);
                      }}
                      placeholder={
                        isInviteCodeOptional ? t('OPTIONAL') : t('INVITE_CODE')
                      }
                      placeholderTextColor={Colors.subTextColor}
                      className={'text-[18px] text-center'}
                    />
                  )}
                {loadersAndValidators.isInviteCodeVerifying && (
                  <CyDView className={'flex items-center justify-between'}>
                    <LottieView
                      source={AppImages.LOADER_TRANSPARENT}
                      autoPlay
                      loop
                      style={{ height: 25 }}
                    />
                  </CyDView>
                )}
                {loadersAndValidators.inviteCodeVerified && (
                  <>
                    <CyDView
                      className={'flex flex-row items-center justify-center'}>
                      <CyDText className={'text-[18px] font-extrabold'}>
                        {t<string>('CODE_VERFIED')}
                      </CyDText>
                      <CyDImage
                        className={'h-[22px] w-[22px] ml-[10px]'}
                        source={AppImages.DARK_GREEN_BACKGROUND_TICK}
                      />
                    </CyDView>
                  </>
                )}
              </CyDView>
            </CyDView>
            {loadersAndValidators.isInvalidInviteCode && (
              <CyDText className={'text-center text-red-600 font-bold'}>
                {t<string>('INVALID_CODE')}
              </CyDText>
            )}
            <CyDView
              className={'flex flex-row mt-[20px] px-[38px] justify-start'}>
              <CyDTouchView
                className={clsx('rounded-[4px] mt-[2px] h-[18px] w-[18px]', {
                  'bg-black': acknowledgement,
                  'bg-white': !acknowledgement,
                })}
                onPress={() => {
                  setAcknowledgment(!acknowledgement);
                }}>
                {acknowledgement && (
                  <CyDImage
                    className={'w-[10px] h-[10px] mt-[3px] ml-[3px]'}
                    source={AppImages.CORRECT}
                  />
                )}
              </CyDTouchView>
              <CyDView className={'flex flex-row flex-wrap'}>
                <CyDText
                  className={
                    'ml-[8px] text-[12px] font-semibold leading-[18px]'
                  }>
                  {t<string>('CARD_SIGNUP_CONSENT_TEXT')}{' '}
                  <CyDText
                    className={'font-extrabold underline'}
                    onPress={() =>
                      navigation.navigate(screenTitle.LEGAL_SCREEN)
                    }>
                    {t<string>('TERMS_AND_CONDITIONS')}
                  </CyDText>
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDTouchView
              disabled={!isButtonEnabled()}
              onPress={() => {
                void verifyInviteCode(inviteCode);
              }}
              className={clsx(
                'py-[16px] mt-[22px] flex flex-row items-center rounded-[12px] justify-around w-[80%] mx-auto mb-[25px] text-white',
                {
                  'bg-[#FFE370]': !isButtonEnabled(),
                  'bg-black': isButtonEnabled(),
                },
              )}>
              <CyDText
                className={clsx('text-center font-black', {
                  'text-darkYellow': !isButtonEnabled(),
                  'text-white': isButtonEnabled(),
                })}>
                {t<string>('YES_GET_STARTED')}
              </CyDText>
            </CyDTouchView>
          </CyDImageBackground>
        </CyDScrollView>
      </CyDKeyboardAvoidingView>
    </CyDSafeAreaView>
  );
}
