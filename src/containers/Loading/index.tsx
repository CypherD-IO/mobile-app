/**
 * @format
 * @flow
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';
import {
  CyDSafeAreaView,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';

export default function Loading({ loadingText }: { loadingText?: string }) {
  const { t } = useTranslation();
  return (
    <CyDSafeAreaView className='h-full bg-n20'>
      <CyDView className='flex flex-1 flex-col h-full w-[70%] justify-center self-center'>
        <ActivityIndicator size='large' color={Colors.appColor} />
        <CyDText className='text-center  text-[14px] mt-[10px]'>
          {loadingText ?? t('LOADING_TEXT')}
        </CyDText>
      </CyDView>
    </CyDSafeAreaView>
  );
}
