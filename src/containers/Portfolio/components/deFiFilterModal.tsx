import React, { Dispatch, SetStateAction, memo, useEffect, useState } from "react";
import { CyDFastImage, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import { DeFiFilter, DeFiPositionTypes, protocolOptionType } from "../../../models/defi.interface";
import CyDModalLayout from "../../../components/v2/modal";
import { BackHandler, StyleSheet } from "react-native";
import AppImages from "../../../../assets/images/appImages";
import { t } from "i18next";
import CheckBoxes from "../../../components/checkBoxes";
import DeFiCheckBox from "../../../components/deFiCheckBox";
import { deFiPositionTypes } from "../../../constants/server";
import { sortProtocols } from "../../../core/defi";
import RadioButtons from "../../../components/radioButtons";

interface DeFiFilterModalInterface {
    filters: DeFiFilter;
    setFilters: Dispatch<SetStateAction<DeFiFilter>>;
    protocols: protocolOptionType[];
    visible: boolean;
    setVisible: Dispatch<SetStateAction<boolean>>;
    navigation:any;
}
const FILTERS = ['Protocols','Positions', 'OnlyActive Positions'];
const STATUSES = ['Yes','No'];
const DeFiFilterModal = (props: DeFiFilterModalInterface) => {
  const [index, setIndex] = useState<number>(0);
  const onReset = () => {
    props.setFilters(prev=>({...prev,positionTypes:[],protocols:[],activePositionsOnly:'No'}));
  };

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);
  return(
  <CyDModalLayout
    isModalVisible={props.visible}
    setModalVisible={props.setVisible}
    style={styles.modalLayout}
    animationIn="slideInUp"
    animationOut="slideOutDown"   
  >
    <CyDSafeAreaView className='bg-white flex-1'>
      <CyDView className="flex flex-row justify-between items-center px-[20px] py-[10px] border-b border-sepratorColor">
        <CyDTouchView onPress={() => {
          props.setVisible(false);
        }} className="p-[5px]">
          <CyDFastImage className="h-[16px] w-[16px]" source={AppImages.CLOSE} resizeMode="cover" />
        </CyDTouchView>
        <CyDText className="text-[20px] font-bold">{t('TRANSACTIONS_FILTER')}</CyDText>
        <CyDTouchView onPress={onReset}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>{t('RESET_ALL')}</CyDText>
        </CyDTouchView>
      </CyDView>
      <CyDView className="h-full flex flex-row"  >
        <CyDView className={'border-r border-activityFilterBorderLine w-[30%]'}>
          {FILTERS.map((filter,idx) =>(
            <CyDTouchView key={(idx)}
            onPress={()=> setIndex(idx)}
            className={`${index === idx ? 'bg-appColor' : 'bg-whiteflex'} justify-center py-[20px]`}
            >
              <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                  {idx === 0 ? `${filter} (${props.filters.protocols.length})`: idx === 1?`${filter} (${props.filters.positionTypes.length})`:filter  }
                </CyDText>
            </CyDTouchView>
          ))}
        </CyDView>
        <CyDView className="bg-white w-[70%]" >
          {index === 0 &&
          <DeFiCheckBox
            radioButtonsData={props.protocols}
            onPressRadioButton={(state:string[])=>{props.setFilters(prev =>({...prev,protocols:state}));}}
            initialValues={props.filters.protocols}
          />}
          {index === 1 && 
          <DeFiCheckBox
            radioButtonsData={deFiPositionTypes}
            onPressRadioButton={(state:DeFiPositionTypes[])=>{props.setFilters(prev =>({...prev,positionTypes:state}));}}
            initialValues={props.filters.positionTypes}
          />}
          {index === 2 && 
          <RadioButtons
          radioButtonsData={STATUSES}
          onPressRadioButton={(value:string)=>{props.setFilters(prev =>({...prev,activePositionsOnly:value})); }}
          initialValue={props.filters.activePositionsOnly}
        />
          }
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  </CyDModalLayout>
            );
};
const styles = StyleSheet.create({
    modalLayout: {
      margin: 0,
      justifyContent: 'flex-end'
    }
  });
export default memo(DeFiFilterModal);