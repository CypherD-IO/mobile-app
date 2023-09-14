import React, { memo } from "react";
import { CyDFastImage, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import AppImages from "../../../../assets/images/appImages";

interface FilterBarProps {
  setFilterModalVisible: React.Dispatch<React.SetStateAction<boolean>>
}

const FilterBar = ({ setFilterModalVisible }: FilterBarProps) => {

  return (
    <CyDView className="w-full items-end px-[10px] py-[5px] border-sepratorColor border-t-[0.5px]">
      <CyDTouchView onPress={() => {
        setFilterModalVisible(true);
      }}>
        <CyDFastImage className='w-[78px] h-[25px]' source={AppImages.ACTIVITY_FILTER} />
      </CyDTouchView>
    </CyDView>
  );
};

export default memo(FilterBar);
