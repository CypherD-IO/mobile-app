import React, { Dispatch, SetStateAction } from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { StyleSheet, Modal } from 'react-native';
import Button from './button';
import Slider from './slider';
import { round } from 'lodash';
import { SpendLimitType } from '../../constants/enum';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface EditLimitModalProps {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  type: SpendLimitType;
  currentLimit: number;
  maxLimit: number;
  onChangeLimit: (limit: number) => void;
  onRequestHigherLimit: () => void;
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // modalLayout: {
  //   margin: 0,
  //   justifyContent: 'flex-end',
  // },
});

export default function EditLimitModal({
  isModalVisible,
  setIsModalVisible,
  currentLimit,
  maxLimit,
  onChangeLimit,
  type,
  onRequestHigherLimit,
}: EditLimitModalProps) {
  const [limitValue, setLimitValue] = React.useState(currentLimit);

  React.useEffect(() => {
    setLimitValue(currentLimit);
  }, [currentLimit, isModalVisible]);

  const handleRequestHigherLimit = () => {
    setIsModalVisible(false);
    onRequestHigherLimit();
  };

  const handleModalClose = () => {
    setLimitValue(currentLimit);
    setIsModalVisible(false);
  };

  return (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={handleModalClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CyDView style={styles.modalBackground}>
          <CyDView className='bg-n20 rounded-t-[16px] p-[16px]'>
            <CyDTouchView
              className='absolute top-[16px] right-[16px]'
              onPress={handleModalClose}>
              <CyDMaterialDesignIcons
                name='close'
                size={24}
                className='text-n200'
              />
            </CyDTouchView>
            <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mb-[16px] rounded-full' />
            <CyDText className='text-[20px] font-bold'>
              {type === SpendLimitType.DAILY ? 'Daily Limit' : 'Monthly Limit'}
            </CyDText>

            <CyDText className='text-[12px] text-n200 mt-[2px]'>
              {type === SpendLimitType.DAILY
                ? 'Total daily usage limit for all transactions made with this card'
                : 'Total monthly usage limit for all transactions made with this card'}
            </CyDText>

            <CyDView className='bg-n0 rounded-[10px] px-[16px] pt-[24px] pb-[48px] mt-[24px]'>
              <CyDTextInput
                className='text-[44px] font-bold text-base400 mx-auto font-manrope'
                placeholder='$0'
                keyboardType='numeric'
                returnKeyType='done'
                onChangeText={text => {
                  const numericText = text.replace(/[^0-9]/g, '');
                  const parsedValue = parseInt(numericText, 10);
                  setLimitValue(isNaN(parsedValue) ? 0 : round(parsedValue));
                }}
                value={`$${limitValue}`}
              />

              <CyDText className='text-[14px] text-n200 text-center'>
                {type === SpendLimitType.DAILY
                  ? 'Daily Usage Limit'
                  : 'Monthly Usage Limit'}
              </CyDText>

              <CyDView className='mt-[38px]'>
                <Slider
                  minValue={0}
                  maxValue={maxLimit}
                  steps={4}
                  onValueChange={value => {
                    setLimitValue(value);
                  }}
                  value={limitValue}
                  showValues={true}
                />
              </CyDView>
            </CyDView>

            <CyDView className='flex flex-row items-start bg-n20 mt-[24px]'>
              <CyDMaterialDesignIcons
                name='information'
                size={16}
                className='text-n200 mt-[2px]'
              />
              <CyDText className='text-[12px] text-n200 ml-[8px] flex-1'>
                Planning to make a large purchase? Consider requesting higher
                limits
              </CyDText>
            </CyDView>

            <CyDTouchView
              className='bg-n0 rounded-[15px] ml-[16px] px-[12px] py-[8px] mt-[12px] self-start'
              onPress={handleRequestHigherLimit}>
              <CyDText className='text-[12px] text-blue300'>
                Request higher spending limit
              </CyDText>
            </CyDTouchView>

            <CyDView className='mt-[54px] mb-[32px]'>
              <Button
                title={'Update Limit'}
                disabled={limitValue === currentLimit}
                onPress={() => {
                  onChangeLimit(limitValue);
                  setIsModalVisible(false);
                }}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </GestureHandlerRootView>
    </Modal>
  );
}
