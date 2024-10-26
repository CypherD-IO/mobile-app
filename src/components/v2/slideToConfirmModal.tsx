import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CyDImage, CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';

const SlideToConfirm = () => {
  const [confirmed, setConfirmed] = useState(false);
  // Add new state for tracking touch
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    console.log('isSwiping', isSwiping);
  }, [isSwiping]);

  const renderLeftActions = () => (
    <CyDView className='justify-center items-center w-[240px] h-full bg-[#333] rounded-l-[25px]'>
      <Text className='text-white ml-[60px]'>Confirmed 🎉</Text>
    </CyDView>
  );

  return (
    <CyDView className='w-[300px] bg-[#333] h-[60px] rounded-[25px] overflow-hidden'>
      <Swipeable
        renderLeftActions={renderLeftActions}
        onSwipeableLeftOpen={() => setConfirmed(true)}
        onActivated={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}>
        <CyDView className='w-[300px] h-[60px] bg-[#333] justify-center flex-row items-center px-[5px]'>
          <CyDView
            className={clsx(
              'w-[50px] h-[50px] bg-[#f0a500] rounded-full justify-center items-center',
              confirmed && 'bg-green-500',
            )}>
            <CyDImage
              source={AppImages.RIGHT_ARROW}
              className='w-[20px] h-[20px]'
            />
          </CyDView>
          <Text
            className={clsx(
              'text-white flex-1 text-center',
              isSwiping && 'text-transparent',
            )}>
            {'Swipe to confirm'}
          </Text>
        </CyDView>
      </Swipeable>
    </CyDView>
  );
};

export default SlideToConfirm;
