import React from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';

export default function CardSignupConfirmation() {
  const { t } = useTranslation();

  const signUpInstructions = [
    'Instantly swap crypto to USD',
    'Receive free lifetime access',
    'Spend crypto from 17 different chains - more coming soon!',
    'Use your card anywhere in the world',
  ];

  return (
    <CyDView className='flex-1 bg-white mt-[32px]'>
      <CyDScrollView className='bg-white py-[12px]'>
        <CyDView className={'w-screen'}>
          <CyDText
            className={'text-center font-bold text-[22px] mt-[20px] mb-[10px]'}>
            {t<string>('SIGNUP_CARD_WAITLIST_TITLE')}
          </CyDText>
          {/* <CyDText className={'text-center font-bold text-[14px] mt-[-6px] mb-[6px]'}>{`(${t('AVAILABLE_ONLY_IN_USA')})`}</CyDText> */}
          <CyDView>
            <CyDView className={'flex items-center text-center z-50'}>
              <CyDImage source={AppImages.DEBIT_SHOW_CARD} />
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView>
          <CyDText className={'mt-[25px] mx-[25px] text-[20px] font-bold'}>
            {t<string>('CARD_SIGNUP_CONFIRMATION_CAPTION')}
          </CyDText>
        </CyDView>
        <CyDView className={'mx-[25px] my-[10px]'}>
          {/* {signUpInstructions.map(item => {
            return (
              <CyDView className={'flex flex-row my-[4px]'} key={item}>
                <CyDImage
                  className={'mt-[6px]'}
                  source={AppImages.RIGHT_ARROW_BULLET}
                />
                <CyDText className={'ml-[10px] leading-[25px]'}>{item}</CyDText>
              </CyDView>
            );
          })} */}
          <CyDView className={'flex flex-row my-[4px]'}>
            <CyDImage
              className={'mt-[6px]'}
              source={AppImages.RIGHT_ARROW_BULLET}
            />
            <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
              First name + Last name should not exceed 22 characters
            </CyDText>
          </CyDView>
          <CyDView>
            <CyDView className={'flex flex-row my-[4px]'}>
              <CyDImage
                className={'mt-[6px]'}
                source={AppImages.RIGHT_ARROW_BULLET}
              />
              <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
                If the combined first and last name exceeds 22 characters, trim
                the last name
              </CyDText>
            </CyDView>
            <CyDText className={'ml-[35px] leading-[25px]'}>
              Actual name: Alexander Harrington Smith
            </CyDText>
            <CyDText className={'ml-[35px] leading-[25px]'}>
              Trimmed name: Alexander Harrington Smi
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
          <CyDView>
            <CyDView className={'flex flex-row my-[4px]'}>
              <CyDImage
                className={'mt-[6px]'}
                source={AppImages.RIGHT_ARROW_BULLET}
              />
              <CyDText className={'ml-[10px] font-bold leading-[25px]'}>
                Name must match the one on the id that you will be submitting
                for KYC
              </CyDText>
            </CyDView>
            <CyDText className={'ml-[35px] leading-[25px]'}>
              Name on Id: André Alexander Harrington
            </CyDText>
            <CyDText className={'ml-[35px] leading-[25px]'}>
              Acceptable: Andre Alexander Harringt
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className={'flex items-center text-center'}>
          <CyDImage
            source={AppImages.DOTS_ILLUSTRATION}
            className={'w-[200px] h-[90px]'}
          />
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}
