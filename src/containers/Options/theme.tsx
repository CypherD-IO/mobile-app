import React from 'react';
import { CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { Theme, useTheme } from '../../reducers/themeReducer';

export default function AppearanceSelector() {
  const { theme, changeTheme } = useTheme();

  return (
    <CyDView className='bg-n20 flex-1'>
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
  );
}
