import React, { memo, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, StyleSheet } from "react-native";
import { CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import CheckBoxes from "../../../components/checkBoxes";
import RadioButtons from "../../../components/radioButtons";
import Button from "../../../components/v2/button";
import CyDModalLayout from "../../../components/v2/modal";
import { ButtonType } from "../../../constants/enum";

export const FILTERS = ['Type', 'Status'];
export const TRANSACTION_TYPES = ['send', 'receive', 'swap', 'others'];
export const STATUSES = ['completed', 'error'];

interface TxnFilterModalProps {
  navigation: any
  modalVisibilityState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  filterState: [{
    types: string[];
    statuses: string[];
  }, React.Dispatch<React.SetStateAction<{
    types: string[];
    statuses: string[];
  }>>]
}

const TxnFilterModal = ({ navigation, modalVisibilityState, filterState }: TxnFilterModalProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState<number>(0);
  const [filter, setFilter] = filterState;
  const [selectedTypes, setSelectedTypes] = useState<string[]>(filter.types === TRANSACTION_TYPES ? [] : filter.types);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filter.statuses === STATUSES ? [] : filter.statuses);
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
        <CyDTouchView onPress={() => {
          setSelectedStatuses(STATUSES);
          setSelectedTypes(TRANSACTION_TYPES);
        }}>
          <CyDText className='color-[#048A81] font-bold text-[16px]'>{t('RESET_ALL')}</CyDText>
        </CyDTouchView>
      )
    });
  }, [navigation]);

  function onApply() {
    const data = {
      types: selectedTypes.length === 0 ? TRANSACTION_TYPES : selectedTypes,
      statuses: selectedStatuses.length === 0 ? STATUSES : selectedStatuses
    };

    selectedTypes.length === 0 && setSelectedTypes([]);
    selectedStatuses.length === 0 && setSelectedStatuses([]);

    setFilter(data);
    setModalVisible(false);
  }

  const resetAndApply = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setFilter({ types: TRANSACTION_TYPES, statuses: STATUSES });
    setModalVisible(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      style={styles.modalLayout}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <CyDSafeAreaView className='bg-white flex-1'>
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
            onPress={resetAndApply}
            title={t('RESET_AND_APPLY')}
            style="h-[60px] w-full rounded-[0px]"
            titleStyle="text-[18px] font-bold"
            type={ButtonType.TERNARY}
          />
          <Button
            onPress={onApply}
            title={t('APPLY')}
            style="h-[60px] w-full rounded-[0px]"
            titleStyle="text-[18px] font-bold"
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
    justifyContent: 'flex-end'
  }
});