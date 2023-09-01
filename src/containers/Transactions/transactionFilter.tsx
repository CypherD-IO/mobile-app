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
import Button from '../../components/v2/button';
import { useTranslation } from 'react-i18next';

export const FILTERS = ['Type', 'Status'];
export const TRANSACTION_TYPES = ['send', 'receive', 'swap', 'others'];
export const STATUSES = ['completed', 'error'];

export default function TransactionFilter(props: any) {
  const { navigation } = props;
  const { t } = useTranslation();
  const [index, setIndex] = useState<number>(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

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
          setSelectedTypes(TRANSACTION_TYPES);
        }}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>{t('RESET_ALL')}</CyDText>
        </CyDTouchView>
      )
    });
  }, [props.navigation]);

  function onApply() {
    const data = {
      types: selectedTypes.length === 0 ? TRANSACTION_TYPES : selectedTypes,
      statuses: selectedStatuses.length === 0 ? STATUSES : [selectedStatuses]
    };

    selectedTypes.length === 0 && setSelectedTypes(TRANSACTION_TYPES);
    selectedStatuses.length === 0 && setSelectedStatuses(STATUSES);

    navigation.navigate(C.screenTitle.TRANSACTIONS_SCREEN, {
      filter: data
    });
  }

  return (
    <CyDSafeAreaView className='bg-white flex-1'>
      <CyDView className='h-full'>
        <CyDView className={'h-full flex flex-row'}>
          <CyDView className={'border-r border-activityFilterBorderLine w-[30%]'}>
            {FILTERS.map((filter, idx) => (
              <CyDTouchView key={idx}
                onPress={() => setIndex(idx)}
                className={`${index === idx ? 'bg-appColor' : 'bg-whiteflex'} justify-center py-[20px]`}>
                <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                  {filter + (idx === 0 ? ` (${selectedTypes.length})` : '')}
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>
          <CyDView className={'bg-white w-[70%]'}>
            {index === 0 &&
              <CheckBoxes
                radioButtonsData={TRANSACTION_TYPES}
                onPressRadioButton={setSelectedTypes}
                initialValues={selectedTypes}
              />}
            {index === 1 &&
              <RadioButtons
                radioButtonsData={STATUSES}
                onPressRadioButton={setSelectedStatuses}
                initialValues={selectedStatuses}
              />}
          </CyDView>
        </CyDView>
        <CyDView className='w-full absolute bottom-0'>
          <Button
            onPress={onApply}
            title="Apply"
            style="h-[70px] w-full rounded-[0px]"
            titleStyle="text-[18px] font-bold"
            type="primary"
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
