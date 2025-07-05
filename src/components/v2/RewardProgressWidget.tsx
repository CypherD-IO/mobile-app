import React, { useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CydProgessCircle,
} from '../../styles/tailwindComponents';
import { Animated, Easing } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import WheelPicker from './WheelPicker';
import TaskWheelItem from './TaskWheelItem';
import { useOnboardingReward } from '../../contexts/OnboardingRewardContext';

interface RewardProgressWidgetProps {
  onTaskPress?: (task: any) => void;
}

const BottomInfoSection = ({ task }: { task: any }) => {
  const [progressAnimation] = useState(new Animated.Value(0));
  const [lastAnimatedTaskId, setLastAnimatedTaskId] = useState<string | null>(
    null,
  );

  // Animation for progress bar when task 3 is selected
  useEffect(() => {
    if (task.id === '3' && lastAnimatedTaskId !== '3') {
      // Reset animation value to start from 0
      progressAnimation.setValue(0);

      // Animate to current progress (8/200 = 0.04 = 4%)
      const targetProgress = 152 / 200; // $8 spent out of $200 target

      Animated.timing(progressAnimation, {
        toValue: targetProgress,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Mark this task as animated
      setLastAnimatedTaskId('3');
    } else if (task.id !== '3') {
      // Reset when moving away from task 3, so animation can run again when returning
      setLastAnimatedTaskId(null);
      progressAnimation.setValue(0);
    }
  }, [task.id, progressAnimation, lastAnimatedTaskId]);

  return (
    <CyDView className='flex-row items-center justify-between'>
      {(task.id === '1' || task.id === '2') && (
        <CyDText className='text-n200 text-[14px] text-center font-medium mb-2'>
          {task.description}
        </CyDText>
      )}
      {task.id === '3' && (
        <CyDView className='w-full'>
          <CyDView className='flex-row items-center mb-1'>
            <CyDText className='text-n200 text-[12px] font-medium'>
              {'Spend '}
            </CyDText>
            <CyDText className='text-[20px] font-bold mx-1'>{'$192'}</CyDText>
            <CyDText className='text-n200 text-[12px] font-medium'>
              {' more to claim'}
            </CyDText>
          </CyDView>

          {/* Animated Progress Bar */}
          <CyDView className='w-full mb-1'>
            {/* Progress Bar Container */}
            <CyDView className='w-full h-[10px] bg-n40 rounded-full overflow-hidden mb-1'>
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: '#FFD700', // Golden yellow color
                  borderRadius: 4,
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </CyDView>

            <CyDView className='flex-row justify-between items-center mb-1'>
              <CyDText className='text-n200 text-[10px] font-medium'>
                $152 spent
              </CyDText>
            </CyDView>

            <CyDText className='text-n200 text-[14px]'>
              {task.description}
            </CyDText>
          </CyDView>
        </CyDView>
      )}
      {task.id === '4' && (
        <CyDView className='w-full'>
          <CyDView className='items-center mb-3'>
            <CyDText className='text-n200 text-[12px] font-medium mb-1'>
              {task.title}
            </CyDText>
            <CyDText className='text-[14px] text-center'>
              {task.description}
            </CyDText>
          </CyDView>

          {/* Merchant Options */}
          <CyDView className='flex-row justify-between items-center mb-3'>
            {/* Amazon Option 1 */}
            <CyDView className='flex-1 bg-base200 rounded-full flex-row items-center p-2 mr-1'>
              <CyDView className='w-6 h-6 bg-white rounded-full items-center justify-center mr-1'></CyDView>
              <CyDText className='text-white text-[16px] font-medium'>
                Amazon
              </CyDText>
            </CyDView>

            {/* Amazon Option 2 */}
            <CyDView className='flex-1 bg-base200 rounded-full flex-row items-center p-2 mr-1'>
              <CyDView className='w-6 h-6 bg-white rounded-full items-center justify-center mr-1'></CyDView>
              <CyDText className='text-white text-[16px] font-medium'>
                Amazon
              </CyDText>
            </CyDView>

            {/* Amazon Option 3 */}
            <CyDView className='flex-1 bg-base200 rounded-full flex-row items-center p-2'>
              <CyDView className='w-6 h-6 bg-white rounded-full items-center justify-center mr-1'></CyDView>
              <CyDText className='text-white text-[16px] font-medium'>
                Amazon
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      )}
    </CyDView>
  );
};

const RewardProgressWidgetComponent: React.FC<RewardProgressWidgetProps> = ({
  onTaskPress,
}) => {
  const {
    statusWiseRewards,
    totalRewardsPossible,
    totalRewardsEarned,
    currentStage,
  } = useOnboardingReward();

  // Map backend milestone keys → widget index
  const stageToIndex: Record<string, number> = {
    KYC_PENDING: 0,
    FIRST_LOAD: 1,
    FIRST_SPEND: 2,
    COMPLETED: 3,
  };

  console.log('currentStage :', currentStage);
  const derivedIndex = stageToIndex[currentStage ?? 'KYC_PENDING'] ?? 0;
  console.log('derivedIndex :', derivedIndex);

  // Keep internal index state in sync with backend stage changes
  const [selectedIndex, setSelectedIndex] = useState(derivedIndex);

  // Sync whenever currentStage updates
  useEffect(() => {
    setSelectedIndex(derivedIndex);
  }, [derivedIndex]);

  // Convenience helpers to read milestone data safely
  const milestone = (key: string) => statusWiseRewards?.[key] ?? {};

  const tasks = [
    {
      id: '1',
      title: 'Sign up for your Cypher card',
      completed: Boolean(milestone('kycPending').earned),
      reward: milestone('kycPending').amount ?? 0,
      status: milestone('kycPending').earned ? 'completed' : 'pending',
      description: `🎉 Awesome! You just earned ${milestone('kycPending').amount} $CYPR for joining the cypher card platform!`,
    },
    {
      id: '2',
      title: 'Load your card',
      completed: Boolean(milestone('firstLoad').earned),
      reward: milestone('firstLoad').amount ?? 0,
      status: milestone('firstLoad').earned ? 'completed' : 'pending',
      description: `Load your card with a minimum of $200 and you'll get ${milestone('firstLoad').amount} $CYPR as bonus reward`,
    },
    {
      id: '3',
      title: 'Spend $200 in 15 days',
      completed: Boolean(milestone('firstSpend').earned),
      reward: milestone('firstSpend').amount ?? 0,
      status: milestone('firstSpend').earned ? 'completed' : 'pending',
      description: `Spend $200 in 15 days with any merchant and you'll get ${milestone('firstSpend').amount} $CYPR as bonus reward`,
    },
    {
      id: '4',
      title: 'Referral merchant reward',
      completed: false,
      reward: 200,
      status: 'pending',
      description:
        'You get 200 $CYPR as bonus reward when you spend at these merchants',
    },
  ];

  const rewardData = {
    totalBonus: totalRewardsEarned,
    maxBonus: totalRewardsPossible,
    timeLeft: '15d 14h', // TODO derive from backend once available
    progressPercentage: 0.65,
    tasks,
  };

  // Prepare data for WheelPicker
  const wheelData = rewardData.tasks.map(task => ({
    id: task.id,
    component: <TaskWheelItem task={task} />,
    value: task,
  }));

  const currentTask = rewardData.tasks[selectedIndex];

  useEffect(() => {
    console.log('selectedIndex :', selectedIndex);
    console.log('currentTask :', currentTask);
  }, [selectedIndex, currentTask]);

  const handleTaskPress = () => {
    if (onTaskPress && currentTask) {
      onTaskPress(currentTask);
    }
  };

  const handleWheelChange = (index: number, item: any) => {
    setSelectedIndex(index);
    if (onTaskPress && item.value) {
      onTaskPress(item.value);
    }
  };

  return (
    <CyDView className='bg-base40 mx-4 rounded-[12px] py-4'>
      {/* Header Section */}
      <CyDView className='flex-row justify-between items-start mb-4 px-4'>
        <CyDView className='flex-1'>
          <CyDText className='text-n200 text-[12px] font-medium mb-1'>
            Total Bonus earned
          </CyDText>
          <CyDView className='flex-row items-center mb-1'>
            <CyDView className='relative mr-2'>
              <CyDImage
                source={AppImages.CYPR_TOKEN}
                className='w-[30px] h-[30px]'
                resizeMode='contain'
              />
              <CyDView className='absolute -bottom-1 -right-1 w-4 h-4 rounded-full items-center justify-center'>
                <CyDImage
                  source={AppImages.BASE_LOGO}
                  className='w-4 h-4'
                  resizeMode='contain'
                />
              </CyDView>
            </CyDView>
            <CyDText className='text-[30px] font-medium'>
              {rewardData.totalBonus}
            </CyDText>
          </CyDView>
          <CyDText className='text-n200 text-[12px]'>
            You can earn up to{' '}
            <CyDText className='text-yellow-400 font-semibold'>
              {rewardData.maxBonus} $CYPR!
            </CyDText>
          </CyDText>
        </CyDView>

        {/* Timer Section - Circular Progress */}
        <CyDView className='items-center'>
          <CyDView className='relative'>
            <CydProgessCircle
              className='w-[60px] h-[60px]'
              progress={rewardData.progressPercentage}
              strokeWidth={6}
              cornerRadius={10}
              progressColor='#FF6B6B'
              backgroundColor='#E5E7EB'
            />
            <CyDView className='absolute top-[20px] left-[10px] items-center justify-center'>
              <CyDText className='text-[12px] font-bold text-n300'>
                {rewardData.timeLeft}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDText className='text-n200 text-[10px] text-center mt-2'>
            Time left
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n20' />

      {/* Custom Wheel Picker Section */}
      <CyDView>
        <WheelPicker
          key={`wheel-${derivedIndex}`}
          data={wheelData}
          selectedIndex={selectedIndex}
          onChange={handleWheelChange}
          itemHeight={60}
          visibleRest={1}
          containerStyle={{
            backgroundColor: 'transparent',
          }}
          selectedIndicatorStyle={{
            backgroundColor: 'transparent',
          }}
        />
      </CyDView>

      {/* Bottom Info Section */}
      <CyDView className='items-center pt-4 border-t border-n20 px-4'>
        <BottomInfoSection task={currentTask} />
      </CyDView>
    </CyDView>
  );
};

export default React.memo(RewardProgressWidgetComponent);
