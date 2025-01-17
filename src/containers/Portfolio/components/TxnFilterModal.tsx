import React, { memo, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet } from 'react-native';
import {
  CydMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import CheckBoxes from '../../../components/checkBoxes';
import RadioButtons from '../../../components/radioButtons';
import Button from '../../../components/v2/button';
import CyDModalLayout from '../../../components/v2/modal';
import { ButtonType } from '../../../constants/enum';
import { TXN_FILTER_STATUSES } from '../../../constants/data';

export const FILTERS = ['Type', 'Status'];
export const TRANSACTION_TYPES = ['send', 'receive', 'swap', 'others'];

interface TxnFilterModalProps {
  navigation: any;
  modalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
  filterState: [
    {
      types: string[];
      status: string;
    },
    React.Dispatch<
      React.SetStateAction<{
        types: string[];
        status: string;
      }>
    >,
  ];
}

const TxnFilterModal = ({
  navigation,
  modalVisibilityState,
  filterState,
}: TxnFilterModalProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState<number>(0);
  const [filter, setFilter] = filterState;
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    filter.types === TRANSACTION_TYPES ? [] : filter.types,
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    filter.status ?? TXN_FILTER_STATUSES[2].id,
  );

  const [isModalVisible, setModalVisible] = modalVisibilityState;

  const handleBackButton = () => {
    navigation.goBack();
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
            setSelectedStatus(TXN_FILTER_STATUSES[2].id);
            setSelectedTypes(TRANSACTION_TYPES);
          }}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>
            {t('RESET_ALL')}
          </CyDText>
        </CyDTouchView>
      ),
    });
  }, [navigation]);

  function onApply() {
    const data = {
      types: selectedTypes.length === 0 ? TRANSACTION_TYPES : selectedTypes,
      status: selectedStatus,
    };

    selectedTypes.length === 0 && setSelectedTypes([]);

    setFilter(data);
    setModalVisible(false);
  }

  const onReset = () => {
    setSelectedTypes([]);
    setSelectedStatus(TXN_FILTER_STATUSES[2].id);
    setFilter({ types: TRANSACTION_TYPES, status: TXN_FILTER_STATUSES[2].id });
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      style={styles.modalLayout}
      animationIn='slideInUp'
      animationOut='slideOutDown'>
      <CyDSafeAreaView className='bg-n20 flex-1'>
        <CyDView className='flex flex-row justify-between items-center px-[20px] py-[10px] border-b border-n40'>
          <CyDTouchView
            onPress={() => {
              setModalVisible(false);
            }}
            className='p-[5px]'>
            <CydMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDText className='text-[20px] font-bold'>
            {t('TRANSACTIONS_FILTER')}
          </CyDText>
          <CyDTouchView onPress={onReset}>
            <CyDText className='color-[#048A81] font-bold text-[16px]'>
              {t('RESET_ALL')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
        <CyDView className={'h-full flex flex-row'}>
          <CyDView
            className={'border-r border-activityFilterBorderLine w-[30%]'}>
            {FILTERS.map((filter, idx) => (
              <CyDTouchView
                key={idx}
                onPress={() => setIndex(idx)}
                className={`${
                  index === idx ? 'bg-appColor' : 'bg-n20 flex'
                } justify-center py-[20px]`}>
                <CyDText
                  className={'text-left pl-[12px] text-[16px] font-bold'}>
                  {filter + (idx === 0 ? ` (${selectedTypes.length})` : '')}
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>
          <CyDView className={'w-[70%]'}>
            {index === 0 && (
              <CheckBoxes
                radioButtonsData={TRANSACTION_TYPES}
                onPressRadioButton={setSelectedTypes}
                initialValues={selectedTypes}
              />
            )}
            {index === 1 && (
              <RadioButtons
                radioButtonsData={TXN_FILTER_STATUSES}
                onPressRadioButton={value => setSelectedStatus(value)}
                currentValue={selectedStatus}
              />
            )}
          </CyDView>
        </CyDView>
        <CyDView className='w-full absolute bottom-0'>
          <Button
            onPress={onApply}
            title={t('APPLY')}
            style='h-[60px] w-full rounded-[0px]'
            titleStyle='text-[18px] font-bold'
            type={ButtonType.PRIMARY}
          />
        </CyDView>
      </CyDSafeAreaView>
    </CyDModalLayout>
  );
};

export default memo(TxnFilterModal);

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
