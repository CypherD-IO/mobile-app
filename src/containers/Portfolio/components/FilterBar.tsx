import React, { memo } from 'react';
import {
  CyDFastImage,
  CydMaterialDesignIcons,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';

interface FilterBarProps {
  setFilterModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const FilterBar = ({ setFilterModalVisible }: FilterBarProps) => {
  return (
    <CyDView className='w-full items-end px-[10px] py-[5px] border-n40 border-t-[0.5px]'>
      <CyDTouchView
        onPress={() => {
          setFilterModalVisible(true);
        }}>
        <CydMaterialDesignIcons
          name='filter-variant'
          size={24}
          className='text-base400'
        />
      </CyDTouchView>
    </CyDView>
  );
};

export default memo(FilterBar);
