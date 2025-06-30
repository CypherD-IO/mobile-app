import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDIcons,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';

interface TaskWheelItemProps {
  task: {
    id: string;
    title: string;
    completed: boolean;
    reward: number;
    status: string;
    description?: string;
    icon?: any;
  };
  isSelected?: boolean;
  index?: number;
}

const TaskWheelItem: React.FC<TaskWheelItemProps> = ({
  task,
  isSelected = false,
}) => {
  return (
    <CyDView
      className={`flex-row items-center justify-between px-4
        ${isSelected ? 'bg-base250' : 'bg-transparent'}
        `}>
      <CyDView className='flex-row items-center flex-1'>
        {/* Task Status Icon */}
        <CyDView
          className={`w-6 h-6 rounded-full mr-3 items-center justify-center ${
            task.completed
              ? isSelected
                ? 'bg-green-500'
                : 'bg-[#878787]'
              : 'bg-n400'
          }`}>
          {task.completed ? (
            <CyDMaterialDesignIcons
              name='check'
              size={12}
              className='text-white'
            />
          ) : isSelected ? (
            <CyDView className='w-6 h-6 rounded-full border-[1.5px] border-dashed border-[#505050] bg-n0' />
          ) : (
            <CyDView className='w-6 h-6 rounded-full bg-n0' />
          )}
        </CyDView>

        {/* Task Title */}
        <CyDText
          className={`text-[14px] font-medium flex-1 ${
            isSelected ? 'text-base400' : 'text-n300'
          }`}
          numberOfLines={1}>
          {task.title}
        </CyDText>
      </CyDView>

      {isSelected && (
        <>
          {/* Reward Amount */}
          <CyDView className='items-end'>
            <CyDText
              className={`text-[10px] mb-1 ${
                isSelected ? 'text-base400' : 'text-n200'
              }`}>
              {task.completed ? "You've Earned" : 'You get'}
            </CyDText>
            <CyDView className='bg-[rgba(255,185,0,0.07)] px-1 py-[2px]'>
              <CyDText
                className={`text-[14px] font-bold opacity-100 ${
                  isSelected ? 'text-yellow-400' : 'text-p300'
                }`}>
                {task.reward} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className='flex flex-col items-center justify-center'>
            <CyDMaterialDesignIcons
              name='chevron-up'
              size={24}
              className='text-base400 opacity-50'
            />
            <CyDMaterialDesignIcons
              name='chevron-down'
              size={24}
              className='text-base400 opacity-50'
            />
          </CyDView>
        </>
      )}
    </CyDView>
  );
};

export default TaskWheelItem;
