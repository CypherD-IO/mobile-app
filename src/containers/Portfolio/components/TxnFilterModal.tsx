import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import CyDModalLayout from '../../../components/v2/modal';
import { TXN_FILTER_STATUSES } from '../../../constants/data';

export const TRANSACTION_TYPES = ['send', 'receive', 'swap', 'others'];

interface TxnFilterModalProps {
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
  showSpamState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}

const TxnFilterModal = ({
  modalVisibilityState,
  filterState,
  showSpamState,
}: TxnFilterModalProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = filterState;
  const [, setShowSpam] = showSpamState;
  const [selectedShowSpam, setSelectedShowSpam] = useState(showSpamState[0]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    filter.types === TRANSACTION_TYPES ? [] : filter.types,
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    filter.status ?? TXN_FILTER_STATUSES[2].id,
  );

  const [isModalVisible, setModalVisible] = modalVisibilityState;

  function onApply() {
    const data = {
      types: selectedTypes.length === 0 ? TRANSACTION_TYPES : selectedTypes,
      status: selectedStatus,
    };
    selectedTypes.length === 0 && setSelectedTypes([]);
    setFilter(data);
    setShowSpam(selectedShowSpam);
    setModalVisible(false);
  }

  const onReset = () => {
    setSelectedTypes([]);
    setSelectedStatus(TXN_FILTER_STATUSES[2].id);
    setSelectedShowSpam(false);
    setFilter({ types: TRANSACTION_TYPES, status: TXN_FILTER_STATUSES[2].id });
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      style={styles.modalLayout}
      animationIn='slideInUp'
      animationOut='slideOutDown'>
      <CyDView className='bg-n20 pb-[30px] rounded-t-[20px]'>
        {/* Header */}
        <CyDView className='flex flex-row justify-between items-center px-[20px] mt-[24px] mb-[16px]'>
          <CyDText className='text-[20px] font-extrabold text-activityFontColor'>
            {t('TRANSACTIONS_FILTER')}
          </CyDText>
          <CyDTouchView onPress={onReset}>
            <CyDText className='text-subTextColor font-bold text-[14px]'>
              {t('RESET_ALL')}
            </CyDText>
          </CyDTouchView>
        </CyDView>

        <CyDView className='px-[20px]'>
          {/* Type section */}
          <CyDView className='bg-n0 rounded-[12px] mb-[12px]'>
            <CyDText className='text-[12px] text-subTextColor px-[16px] pt-[14px] pb-[8px]'>
              Type
            </CyDText>
            {TRANSACTION_TYPES.map((type, idx) => (
              <CyDTouchView
                key={type}
                className={`flex flex-row items-center px-[16px] py-[12px] ${idx < TRANSACTION_TYPES.length - 1 ? 'border-b-[1px] border-n40' : ''}`}
                onPress={() => toggleType(type)}>
                <CyDMaterialDesignIcons
                  name={
                    selectedTypes.length === 0 || selectedTypes.includes(type)
                      ? 'checkbox-marked'
                      : 'checkbox-blank-outline'
                  }
                  size={22}
                  className={
                    selectedTypes.length === 0 || selectedTypes.includes(type)
                      ? 'text-appColor'
                      : 'text-base400'
                  }
                />
                <CyDText className='ml-[10px] text-[15px] font-bold text-activityFontColor capitalize'>
                  {type}
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>

          {/* Status section */}
          <CyDView className='bg-n0 rounded-[12px] mb-[12px]'>
            <CyDText className='text-[12px] text-subTextColor px-[16px] pt-[14px] pb-[8px]'>
              Status
            </CyDText>
            {TXN_FILTER_STATUSES.map((status, idx) => (
              <CyDTouchView
                key={status.id}
                className={`flex flex-row items-center px-[16px] py-[12px] ${idx < TXN_FILTER_STATUSES.length - 1 ? 'border-b-[1px] border-n40' : ''}`}
                onPress={() => setSelectedStatus(status.id)}>
                <CyDView className='h-[22px] w-[22px] rounded-full border-[1.5px] border-base100 justify-center items-center'>
                  {selectedStatus === status.id && (
                    <CyDView className='h-[10px] w-[10px] rounded-full bg-appColor' />
                  )}
                </CyDView>
                <CyDText className='ml-[10px] text-[15px] font-bold text-activityFontColor'>
                  {status.label}
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>

          {/* Show spam toggle */}
          <CyDTouchView
            className='flex flex-row items-center bg-n0 rounded-[12px] px-[16px] py-[14px] mb-[16px]'
            onPress={() => setSelectedShowSpam(!selectedShowSpam)}>
            <CyDMaterialDesignIcons
              name={selectedShowSpam ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              className={selectedShowSpam ? 'text-appColor' : 'text-base400'}
            />
            <CyDText className='ml-[10px] text-[15px] font-bold text-activityFontColor'>
              Show spam
            </CyDText>
          </CyDTouchView>

          {/* Apply button */}
          <CyDTouchView
            className='bg-appColor rounded-[12px] py-[16px] items-center'
            onPress={onApply}>
            <CyDText className='text-black text-[16px] font-bold'>
              {t('APPLY')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
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
