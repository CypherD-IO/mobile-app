import React from 'react';
import { CyDImage, CyDText, CyDView } from '../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../assets/images/appImages';
import Button from '../../../../components/v2/button';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { screenTitle } from '../../../../constants';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GetYourCardInfo() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  return (
    <CyDView style={{ paddingTop: insets.top + 50 }}>
      <CyDView className='bg-[#F1F0F5] flex flex-col justify-between h-full'>
        <CyDView className='px-[16px]'>
          <CyDText className='font-bold text-[28px]'>
            {t('GET_YOUR_CARD')}
          </CyDText>
          <CyDText className='font-semibold text-[14px] text-base100 mt-[8px]'>
            {t('GET_YOUR_CARD_SUB')}
          </CyDText>

          <CyDView className='mt-[24px]'>
            <CyDView className='flex flex-row items-center '>
              <CyDImage
                source={AppImages.COUNTRIES_ICON}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDView>
                <CyDText className='font-semibold text-[16px] text-black'>
                  {t('CHECK_COUNTRY_SUPPORTED')}
                </CyDText>
                <CyDText className='font-medium text-[12px] text-base150'>
                  {t('Please check the list and proceed with onboarding. ')}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.PROFILE_ICON}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('ENTER_BASIC_DETAILS')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.DOMESTIC_ICON}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('ENTER_DELIVERY_ADDRESS')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.AT_ICON}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('EMAIL_VERIFICATION')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.TELEGRAM_ICON_BLACK}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('TELEGRAM_SETUP')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-start mt-[24px]'>
              <CyDImage
                source={AppImages.CARD_CONTROLS}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDView>
                <CyDText className='font-semibold text-[16px] text-black'>
                  {t('UPDATE_INDENTITY')}
                </CyDText>
                <CyDText className='font-medium text-[12px] text-base150'>
                  {t('UPDATE_INDENTITY_SUB')}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.MANAGE_CARD}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('GET_NEW_CARD')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[24px]'>
              <CyDImage
                source={AppImages.FOREX_FEE}
                className='w-[24px] h-[24px] mr-[8px]'
              />
              <CyDText className='font-semibold text-[16px] text-black'>
                {t('FIRST_CARD_LOAD')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-white px-[16px] w-full pt-[16px] pb-[40px] '>
          <Button
            title={t('CONTINUE')}
            onPress={() => {
              navigation.navigate(screenTitle.CARD_APPLICATION_V2);
            }}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
