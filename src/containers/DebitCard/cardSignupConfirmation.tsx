import React, { useState } from 'react';
import {
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import Button from '../../components/v2/button';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import { ICountry } from '../../models/cardApplication.model';
import { ButtonType } from '../../constants/enum';

export default function CardSignupConfirmation(props: {
  navigation: any;
  route: { params: { inviteCode: string; selectedCountry?: ICountry } };
}) {
  const { t } = useTranslation();
  const { navigation } = props;
  const { inviteCode, selectedCountry } = props.route.params;
  const [acknowledgement, setAcknowledgment] = useState<boolean>(false);

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CyDImageBackground
        className='flex h-full'
        resizeMode='cover'
        source={AppImages.DEBIT_CARD_BACKGROUND}>
        <CyDView>
          <CyDText className={'mt-[25px] mx-[25px] text-[20px] font-bold'}>
            {t<string>('CARD_SIGNUP_CONFIRMATION_CAPTION')}
          </CyDText>
        </CyDView>
        <CyDScrollView className='py-[12px]'>
          <CyDView
            className={
              'mx-[16px] p-[12px] my-[10px] bg-ternaryBackgroundColor'
            }>
            <CyDView>
              <CyDView className={'flex flex-row my-[4px]'}>
                <CyDImage
                  className={'mt-[6px]'}
                  source={AppImages.RIGHT_ARROW_BULLET}
                />
                <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
                  Name must match the one on the id proof that you will be
                  submitting for KYC
                </CyDText>
              </CyDView>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Name on Id: André Alexander Harrington
              </CyDText>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Acceptable: Andre Alexander Harrington
              </CyDText>
            </CyDView>
            <CyDView>
              <CyDView className={'flex flex-row my-[4px]'}>
                <CyDImage
                  className={'mt-[6px]'}
                  source={AppImages.RIGHT_ARROW_BULLET}
                />
                <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
                  Enter your first name, middle name (if applicable), and last
                  name as they appear in your KYC document separated by spaces
                </CyDText>
              </CyDView>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Actual name: Alexander Harrington Smith
              </CyDText>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Acceptable: Alexander Harrington Smith
              </CyDText>
            </CyDView>
            <CyDView>
              <CyDView className={'flex flex-row my-[4px]'}>
                <CyDImage
                  className={'mt-[6px]'}
                  source={AppImages.RIGHT_ARROW_BULLET}
                />
                <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
                  Name should not contain any accent
                </CyDText>
              </CyDView>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Not Acceptable: André Lévesque
              </CyDText>
              <CyDText className={'ml-[35px] leading-[25px]'}>
                Acceptable: Andre Levesque
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView
            className={'flex flex-row mt-[20px] px-[38px] justify-start'}>
            <CyDTouchView
              className={clsx(
                'rounded-[4px] border-[1px] border-black mt-[2px] h-[18px] w-[18px]',
                {
                  'bg-black': acknowledgement,
                  'bg-white': !acknowledgement,
                },
              )}
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
                className={'ml-[8px] text-[12px] font-semibold leading-[18px]'}>
                {t<string>('CARD_SIGNUP_CONSENT_TEXT') + ' '}
                <CyDText
                  className={'font-extrabold underline pl-[20px]'}
                  onPress={() => navigation.navigate(screenTitle.LEGAL_SCREEN)}>
                  {t<string>('TERMS_AND_CONDITIONS')}
                </CyDText>
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className={'flex h-[135px] items-center text-center'}>
            <Button
              disabled={!acknowledgement}
              title={t<string>('YES_GET_STARTED')}
              titleStyle='text-white'
              type={ButtonType.DARK}
              onPress={() => {
                navigation.navigate(screenTitle.CARD_SIGNUP_SCREEN, {
                  inviteCode,
                  selectedCountry,
                });
              }}
              style='h-[55px] mt-[20px] mx-auto justify-center items-center w-[86%]'
              isPrivateKeyDependent={false}
            />
          </CyDView>
        </CyDScrollView>
      </CyDImageBackground>
    </CyDSafeAreaView>
  );
}
