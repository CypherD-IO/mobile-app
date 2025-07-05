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
  console.log('isSelected from TaskWheelItem : ', isSelected);
  return (
    <CyDView
      className={`flex-row items-center px-4 py-2 overflow-hidden
        ${isSelected ? 'bg-n20' : 'bg-transparent'}
      `}>
      <CyDView className='flex-row items-center flex-1'>
        {/* Task Status Icon */}
        <CyDView
          className={`w-7 h-7 rounded-full mr-3 items-center justify-center ${
            task.completed
              ? isSelected
                ? 'bg-green-500'
                : 'bg-[#878787]'
              : 'bg-n400'
          }`}>
          {task.completed ? (
            <CyDMaterialDesignIcons
              name='check'
              size={14}
              className='text-white'
            />
          ) : isSelected ? (
            <CyDView className='w-7 h-7 rounded-full border-[1.5px] border-dashed border-[#505050] bg-n0' />
          ) : (
            <CyDView className='w-7 h-7 rounded-full bg-n0' />
          )}
        </CyDView>

        {/* Task Title & optional description */}
        <CyDView className='flex-1 pr-2'>
          <CyDText
            className={`font-semibold ${
              isSelected ? 'text-[16px]' : 'text-base300 text-[14px]'
            }`}
            numberOfLines={1}>
            {task.title}
          </CyDText>
          {/* {task.description && isSelected && (
            <CyDText className='text-base300 text-[12px]' numberOfLines={1}>
              {task.description}
            </CyDText>
          )} */}
        </CyDView>
      </CyDView>

      {isSelected && (
        <>
          {/* Reward Amount */}
          <CyDView className='items-end'>
            <CyDText
              className={`text-[10px] mb-1 ${
                isSelected ? 'text-base300' : 'text-n200'
              }`}>
              {task.completed ? "You've Earned" : 'You get'}
            </CyDText>
            <CyDView className='bg-[rgba(255,185,0,0.07)] px-1 py-[2px] rounded-[4px]'>
              <CyDText
                className={`font-bold opacity-100 ${
                  isSelected
                    ? 'text-yellow-400 text-[16px]'
                    : 'text-p300 text-[14px]'
                }`}>
                {task.reward} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Up/Down chevrons */}
          <CyDView className='flex flex-col items-center justify-center ml-2'>
            <CyDMaterialDesignIcons
              name='chevron-up'
              size={20}
              className='text-base300 opacity-60'
            />
            <CyDMaterialDesignIcons
              name='chevron-down'
              size={20}
              className='text-base300 opacity-60'
            />
          </CyDView>
        </>
      )}
    </CyDView>
  );
};

export default TaskWheelItem;
