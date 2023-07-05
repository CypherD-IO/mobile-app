/**
 * @format
 * @flow
 */
import React, { useLayoutEffect, useState } from 'react';
import CheckBoxes from '../../components/checkBoxes';
import RadioButtons from '../../components/radioButtons';
import * as C from '../../constants/index';
import { CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { BackHandler } from 'react-native';

export const FILTERS = ['Type', 'Time', 'Status'];
export const ACTIVITY_TYPES = ['Bridge', 'Swap', 'Debit Card', 'Sent', 'IBC', 'Browser', 'Wallet Connect', 'Sardine Pay', 'Onmeta'];
export const TIME_GAPS = ['All', 'Today', 'This Week', 'This Month'];
export const STATUSES = ['PENDING', 'FAILED', 'SUCCESS', 'IN PROCESS', 'DELAYED'];

export default function ActivitesFilter (props: any) {
  const { navigation } = props;
  const [index, setIndex] = useState<number>(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTimeGap, setSelectedTimeGap] = useState<string>(TIME_GAPS[0]);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CyDTouchView onPress={() => {
          setSelectedStatuses(STATUSES);
          setSelectedTypes(ACTIVITY_TYPES);
          setSelectedTimeGap(TIME_GAPS[0]);
        }}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>Reset all</CyDText>
        </CyDTouchView>
      )
    });
  }, [props.navigation]);

  function onApply () {
    const data = {
      time: selectedTimeGap,
      types: selectedTypes.length === 0 ? ACTIVITY_TYPES : selectedTypes,
      statuses: selectedStatuses.length === 0 ? STATUSES : [selectedStatuses]
    };

    selectedTypes.length === 0 && setSelectedTypes(ACTIVITY_TYPES);
    selectedStatuses.length === 0 && setSelectedStatuses(STATUSES);

    navigation.navigate(C.screenTitle.ACTIVITIES, {
      filter: data
    });
  }

  return (<>
    <CyDSafeAreaView className='h-full'>
      <CyDView className={'bg-white h-[92%] flex flex-row'}>
        <CyDView className={'border-r border-activityFilterBorderLine h-full w-[30%]'}>
          {FILTERS.map((filter, idx) => (
            <CyDTouchView key={idx}
              onPress={() => setIndex(idx)}
              className={`${index === idx ? 'bg-appColor' : 'bg-whiteflex'} justify-center h-[8.5%]`}>
              <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                {filter + (idx === 0 ? ` (${selectedTypes.length})` : '')}
              </CyDText>
            </CyDTouchView>
          ))}
        </CyDView>
        <CyDView className={'bg-white w-[70%]'}>
          {index === 0 &&
            <CheckBoxes
              radioButtonsData={ACTIVITY_TYPES}
              onPressRadioButton={setSelectedTypes}
              initialValues={selectedTypes}
              height='50%'
            />}
          {index === 1 &&
            <RadioButtons
              radioButtonsData={TIME_GAPS}
              onPressRadioButton={setSelectedTimeGap}
              initialValue={selectedTimeGap}
              height='200px'
            />}
          {index === 2 &&
            <RadioButtons
              radioButtonsData={STATUSES}
              onPressRadioButton={setSelectedStatuses}
              initialValues={selectedStatuses}
              height='200px'
            />}
        </CyDView>
      </CyDView>
      <CyDTouchView onPress={onApply}
        className='bg-white bg-appColor h-[8%] flex justify-center items-center'>
        <CyDText className={'text-[19px] font-bold'}>Apply</CyDText>
      </CyDTouchView>
    </CyDSafeAreaView>
  </>);
}
