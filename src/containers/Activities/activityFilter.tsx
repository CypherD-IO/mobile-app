/**
 * @format
 * @flow
 */
import React, { useLayoutEffect, useState } from 'react';
import CheckBoxes from '../../components/checkBoxes';
import RadioButtons from '../../components/radioButtons';
import * as C from '../../constants/index';
import {
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { BackHandler } from 'react-native';
import Button from '../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { TIME_GAPS } from '../../constants/data';

export const FILTERS = ['Type', 'Time', 'Status'];
export const ACTIVITY_TYPES = [
  'Bridge',
  'Swap',
  'Debit Card',
  'Sent',
  'IBC',
  'Browser',
  'Wallet Connect',
  'Onmeta',
];
export const STATUSES = [
  'PENDING',
  'FAILED',
  'SUCCESS',
  'IN PROCESS',
  'DELAYED',
];

export default function ActivitesFilter(props: any) {
  const { t } = useTranslation();
  const { navigation } = props;
  const [index, setIndex] = useState<number>(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTimeGap, setSelectedTimeGap] = useState<number>(
    TIME_GAPS[0].id,
  );

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
        <CyDTouchView
          onPress={() => {
            setSelectedStatuses(STATUSES);
            setSelectedTypes(ACTIVITY_TYPES);
            setSelectedTimeGap(TIME_GAPS[0].id);
          }}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>
            {t('RESET_ALL')}
          </CyDText>
        </CyDTouchView>
      ),
    });
  }, [props.navigation]);

  function onApply() {
    const data = {
      time: TIME_GAPS[selectedTimeGap].value,
      types: selectedTypes.length === 0 ? ACTIVITY_TYPES : selectedTypes,
      statuses: selectedStatuses.length === 0 ? STATUSES : selectedStatuses,
    };

    selectedTypes.length === 0 && setSelectedTypes(ACTIVITY_TYPES);
    selectedStatuses.length === 0 && setSelectedStatuses(STATUSES);

    navigation.navigate(C.screenTitle.ACTIVITIES, {
      filter: data,
    });
  }

  return (
    <>
      <CyDSafeAreaView className='flex-1 bg-white'>
        <CyDView className='h-full'>
          <CyDView className={'h-full flex flex-row'}>
            <CyDView
              className={
                'border-r border-activityFilterBorderLine h-full w-[30%]'
              }>
              {FILTERS.map((filter, idx) => (
                <CyDTouchView
                  key={idx}
                  onPress={() => setIndex(idx)}
                  className={`${
                    index === idx ? 'bg-appColor' : 'bg-whiteflex'
                  } justify-center py-[20px]`}>
                  <CyDText
                    className={'text-left pl-[12px] text-[16px] font-bold'}>
                    {filter + (idx === 0 ? ` (${selectedTypes.length})` : '')}
                  </CyDText>
                </CyDTouchView>
              ))}
            </CyDView>
            <CyDView className={'bg-white w-[70%]'}>
              {index === 0 && (
                <CheckBoxes
                  radioButtonsData={ACTIVITY_TYPES}
                  onPressRadioButton={setSelectedTypes}
                  initialValues={selectedTypes}
                  height='50%'
                />
              )}
              {index === 1 && (
                <RadioButtons
                  radioButtonsData={TIME_GAPS}
                  onPressRadioButton={value => setSelectedTimeGap(value)}
                  currentValue={selectedTimeGap}
                  height='200px'
                />
              )}
              {index === 2 && (
                <CheckBoxes
                  radioButtonsData={STATUSES}
                  onPressRadioButton={setSelectedStatuses}
                  initialValues={selectedStatuses}
                  height='50%'
                />
              )}
            </CyDView>
          </CyDView>
          <CyDView className='w-full absolute bottom-0'>
            <Button
              onPress={onApply}
              title='Apply'
              style='h-[70px] w-full rounded-[0px]'
              titleStyle='text-[18px] font-bold'
              type='primary'
            />
          </CyDView>
        </CyDView>
      </CyDSafeAreaView>
    </>
  );
}
