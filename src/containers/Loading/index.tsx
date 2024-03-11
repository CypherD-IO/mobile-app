/**
 * @format
 * @flow
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';
import { CyDSafeAreaView, CyDText, CyDView } from '../../styles/tailwindStyles';

export default function Loading({ loadingText }: { loadingText?: string }) {
  const { t } = useTranslation();
  return (
    <CyDSafeAreaView>
      <CyDView className='flex-1 h-full w-full justify-center'>
        <ActivityIndicator size='large' color={Colors.appColor} />
        <CyDText className='text-center font-nunito text-[14px] mt-[10px]'>
          {loadingText ?? t('LOADING_TEXT')}
        </CyDText>
      </CyDView>
    </CyDSafeAreaView>
  );
}
