import { t } from 'i18next';
import { get } from 'lodash';
import React, { Dispatch, SetStateAction, memo, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import DeFiCheckBox from '../../../components/deFiCheckBox';
import RadioButtons from '../../../components/radioButtons';
import CyDModalLayout from '../../../components/v2/modal';
import { DEFI_FILTER_STATUSES } from '../../../constants/data';
import { deFiPositionTypes } from '../../../constants/server';
import {
  DeFiFilter,
  DeFiPositionTypes,
  protocolOptionType,
} from '../../../models/defi.interface';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';

interface DeFiFilterModalInterface {
  filters: DeFiFilter;
  setFilters: Dispatch<SetStateAction<DeFiFilter>>;
  protocols: protocolOptionType[];
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  navigation: any;
}
const FILTERS = ['Protocols', 'Positions', 'Only Active Positions'];

const DeFiFilterModal = (props: DeFiFilterModalInterface) => {
  const [index, setIndex] = useState<number>(0);
  const [currentActivePositionsOnlyValue, setCurrentActivePositionsOnlyValue] =
    useState<string | number>(props.filters.activePositionsOnly);
  const onReset = () => {
    props.setFilters(prev => ({
      ...prev,
      positionTypes: [],
      protocols: [],
      activePositionsOnly: 'No',
    }));
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
  return (
    <CyDModalLayout
      isModalVisible={props.visible}
      setModalVisible={props.setVisible}
      style={styles.modalLayout}
      animationIn='slideInUp'
      animationOut='slideOutDown'>
      <CyDSafeAreaView className='bg-n0 flex-1'>
        <CyDView className='flex flex-row justify-between items-center px-[20px] py-[10px] border-b border-n40'>
          <CyDTouchView
            onPress={() => {
              props.setVisible(false);
            }}
            className='p-[5px]'>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDText className='text-[20px] font-bold'>
            {t('DEFI_FILTER')}
          </CyDText>
          <CyDTouchView onPress={onReset}>
            <CyDText className='color-[#048A81] font-bold text-[16px]'>
              {t('RESET_ALL')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
        <CyDView className='h-full flex flex-row'>
          <CyDView className={'border-r border-n40 w-[30%]'}>
            {FILTERS.map((filter, idx) => (
              <CyDTouchView
                key={idx}
                onPress={() => setIndex(idx)}
                className={`${
                  index === idx ? 'bg-p100' : 'bg-n0flex'
                } justify-center py-[20px]`}>
                <CyDText
                  className={'text-left pl-[12px] text-[16px] font-bold'}>
                  {idx === 0
                    ? `${filter} (${props.filters.protocols.length})`
                    : idx === 1
                      ? `${filter} (${props.filters.positionTypes.length})`
                      : filter}
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>
          <CyDView className='bg-n0 w-[70%]'>
            {index === 0 && (
              <DeFiCheckBox
                radioButtonsData={props.protocols}
                onPressRadioButton={(state: string[]) => {
                  props.setFilters(prev => ({ ...prev, protocols: state }));
                }}
                initialValues={props.filters.protocols}
              />
            )}
            {index === 1 && (
              <DeFiCheckBox
                radioButtonsData={deFiPositionTypes}
                onPressRadioButton={(state: DeFiPositionTypes[]) => {
                  props.setFilters(prev => ({
                    ...prev,
                    positionTypes: state,
                  }));
                }}
                initialValues={props.filters.positionTypes}
              />
            )}
            {index === 2 && (
              <RadioButtons
                radioButtonsData={DEFI_FILTER_STATUSES}
                onPressRadioButton={(value: number | string) => {
                  setCurrentActivePositionsOnlyValue(value);
                  props.setFilters(prev => ({
                    ...prev,
                    activePositionsOnly: get(DEFI_FILTER_STATUSES, [
                      value,
                      'value',
                    ]),
                  }));
                }}
                currentValue={currentActivePositionsOnlyValue}
              />
            )}
          </CyDView>
        </CyDView>
      </CyDSafeAreaView>
    </CyDModalLayout>
  );
};
const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
export default memo(DeFiFilterModal);
