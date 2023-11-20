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
  CyDSafeAreaView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import LottieView from 'lottie-react-native';
import { isAndroid } from '../../misc/checkers';
import { Colors } from '../../constants/theme';
import useAxios from '../../core/HttpRequest';
import { StatusBar } from 'react-native';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import { ICountry } from '../../models/cardApplication.model';

export default function CardSignupLandingScreen(props: {
  navigation: any;
  route: { params?: { selectedCountry?: ICountry } };
}) {
  const { t } = useTranslation();
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
          navigation.navigate(screenTitle.CARD_SIGNUP_CONFIRMATION, {
            inviteCode,
            selectedCountry,
          });
        } else {
          navigation.navigate(screenTitle.CARD_SIGNUP_CONFIRMATION, {
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
    return isInviteCodeOptional || inviteCode.length >= 6;
  };

  return (
    <CyDView className='flex-1 bg-appColor'>
      {/* <StatusBar backgroundColor={Colors.appColor} barStyle='light-content' /> */}
      <CyDScrollView>
        <CyDImageBackground
          className={'h-[70%] pt-[10px]'}
          source={AppImages.CARD_SIGNUP_BACKGROUND}
          resizeMode={'cover'}>
          <CyDView className={'flex flex-row justify-center'}>
            <CyDImage
              className='h-[180px] w-[90%]'
              source={AppImages.VIRTUAL_SAMPLE_CARD}
              resizeMode='contain'
            />
          </CyDView>
          <CyDView className={' flex flex-row justify-center mt-[45px]'}>
            <CyDText
              className={'text-[22px] text-center px-[32px] font-extrabold'}>
              {t<string>('CARD_SIGNUP_WELCOME_TEXT')}
            </CyDText>
          </CyDView>
          <CyDView className='bg-white w-[75%] mt-[16px] self-center border rounded-[6px] h-[55px] justify-center items-center'>
            {!loadersAndValidators.isInviteCodeVerifying &&
              !loadersAndValidators.inviteCodeVerified && (
                <CyDTextInput
                  onChangeText={async value => {
                    if (loadersAndValidators.isInvalidInviteCode) {
                      setLoadersAndValidators({
                        ...loadersAndValidators,
                        isInvalidInviteCode: false,
                      });
                    }
                    setInviteCode(value);
                  }}
                  value={inviteCode}
                  placeholder={
                    isInviteCodeOptional ? t('OPTIONAL') : t('INVITE_CODE')
                  }
                  placeholderTextColor={Colors.subTextColor}
                  className={'text-[18px] text-center p-[0px]'}
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
          {loadersAndValidators.isInvalidInviteCode && (
            <CyDText className={'text-center text-red-600 font-bold'}>
              {t<string>('INVALID_CODE')}
            </CyDText>
          )}
          <Button
            title={t<string>('NEXT')}
            style='mt-[24px] w-[72%] self-center border-[1px]'
            titleStyle={isButtonEnabled() ? 'text-white' : ''}
            type={ButtonType.DARK}
            disabled={!isButtonEnabled()}
            onPress={() => {
              void verifyInviteCode(inviteCode);
            }}
          />
        </CyDImageBackground>
      </CyDScrollView>
    </CyDView>
  );
}
