import React from 'react';
import {
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { Theme, useTheme } from '../../reducers/themeReducer';
import PageHeader from '../../components/PageHeader';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

export default function AppearanceSelector() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme, changeTheme } = useTheme();

  return (
    <CyDSafeAreaView className='bg-n0 flex-1' edges={['top']}>
      <PageHeader title={'THEME'} navigation={navigation} />
      <CyDView className='flex-1 bg-n20 pt-[24px]'>
        <CyDTouchView
          className='mx-6 p-6 border-b border-n40 flex-row items-center justify-between'
          onPress={() => changeTheme(Theme.SYSTEM)}>
          <CyDText className='font-semibold text-xl'>System Default</CyDText>
          {theme === Theme.SYSTEM && (
            <CyDView className='w-4 h-4 rounded-full bg-p150 flex-row items-center justify-center'>
              <CyDView className='w-2 h-2 rounded-full bg-base400' />
            </CyDView>
          )}
        </CyDTouchView>
        <CyDTouchView
          className='mx-6 p-6 border-b border-n40 flex-row items-center justify-between'
          onPress={() => changeTheme(Theme.LIGHT)}>
          <CyDText className='font-semibold text-xl'>Light</CyDText>
          {theme === Theme.LIGHT && (
            <CyDView className='w-4 h-4 rounded-full bg-p150 flex-row items-center justify-center'>
              <CyDView className='w-2 h-2 rounded-full bg-base400' />
            </CyDView>
          )}
        </CyDTouchView>
        <CyDTouchView
          className='mx-6 p-6 border-b border-n40 flex-row items-center justify-between'
          onPress={() => changeTheme(Theme.DARK)}>
          <CyDText className='font-semibold text-xl'>Dark</CyDText>
          {theme === Theme.DARK && (
            <CyDView className='w-4 h-4 rounded-full bg-p150 flex-row items-center justify-center'>
              <CyDView className='w-2 h-2 rounded-full bg-base400' />
            </CyDView>
          )}
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
