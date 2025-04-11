import React, { Dispatch, SetStateAction } from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import Button from './button';

interface RequestHigherLimitModalProps {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  onSubmit: (dailyLimit: number, monthlyLimit: number, reason: string) => void;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function RequestHigherLimitModal({
  isModalVisible,
  setIsModalVisible,
  onSubmit,
}: RequestHigherLimitModalProps) {
  const [dailyLimit, setDailyLimit] = React.useState('');
  const [monthlyLimit, setMonthlyLimit] = React.useState('');
  const [reason, setReason] = React.useState('');
  const MAX_REASON_LENGTH = 200;

  const formatNumber = (value: string) => {
    // Remove any non-digits
    const numericValue = value.replace(/[^0-9]/g, '');
    // Convert to number and format with locale string
    return numericValue ? parseInt(numericValue, 10).toLocaleString() : '';
  };

  const handleDailyLimitChange = (text: string) => {
    setDailyLimit(formatNumber(text));
  };

  const handleMonthlyLimitChange = (text: string) => {
    setMonthlyLimit(formatNumber(text));
  };

  const handleReasonChange = (text: string) => {
    if (text.length <= MAX_REASON_LENGTH) {
      setReason(text);
    }
  };

  const handleSubmit = () => {
    // Convert formatted strings back to numbers for submission
    const dailyValue = parseInt(dailyLimit.replace(/[^0-9]/g, ''), 10);
    const monthlyValue = parseInt(monthlyLimit.replace(/[^0-9]/g, ''), 10);
    onSubmit(dailyValue, monthlyValue, reason);
    setIsModalVisible(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      swipeDirection={['down']}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          setIsModalVisible(false);
        }
      }}
      propagateSwipe={true}
      setModalVisible={setIsModalVisible}>
      <CyDView className='bg-n20 rounded-t-[16px] p-[16px]'>
        <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mb-[16px] rounded-full' />

        <CyDText className='text-[24px] font-bold'>
          Request higher spending limit
        </CyDText>

        <CyDText className='text-[14px] text-n200 mt-[8px]'>
          by requesting the higher spending limit, our agent will verify the
          request and enable it for you
        </CyDText>

        <CyDView className='mt-[24px]'>
          <CyDText className='text-[16px] text-n200 mb-[8px]'>
            Expected Daily limit
          </CyDText>
          <CyDView className='bg-n0 rounded-[8px] px-[16px] py-[12px] flex-row items-center'>
            <CyDText className='text-[16px] text-n200'>$</CyDText>
            <CyDTextInput
              className='flex-1 text-[16px] ml-[4px]'
              keyboardType='numeric'
              value={dailyLimit}
              onChangeText={handleDailyLimitChange}
              placeholder='1,00,000'
            />
          </CyDView>
        </CyDView>

        <CyDView className='mt-[16px]'>
          <CyDText className='text-[16px] text-n200 mb-[8px]'>
            Expected Monthly limit
          </CyDText>
          <CyDView className='bg-n0 rounded-[8px] px-[16px] py-[12px] flex-row items-center'>
            <CyDText className='text-[16px] text-n200'>$</CyDText>
            <CyDTextInput
              className='flex-1 text-[16px] ml-[4px]'
              keyboardType='numeric'
              value={monthlyLimit}
              onChangeText={handleMonthlyLimitChange}
              placeholder='10,00,000'
            />
          </CyDView>
        </CyDView>

        <CyDView className='mt-[16px]'>
          <CyDText className='text-[16px] text-n200 mb-[8px]'>
            Reason for increase
          </CyDText>
          <CyDTextInput
            className='rounded-[8px] p-[12px] text-[16px] h-[100px] text-left bg-n0'
            value={reason}
            onChangeText={handleReasonChange}
            placeholder='Please provide a reason for the limit increase'
            multiline={true}
            textAlignVertical='top'
            maxLength={MAX_REASON_LENGTH}
            numberOfLines={4}
            scrollEnabled={true}
            style={{ textAlignVertical: 'top' }}
          />
          <CyDText className='text-[12px] text-n200 mt-[4px] text-right'>
            {reason.length}/{MAX_REASON_LENGTH}
          </CyDText>
        </CyDView>

        <CyDView className='mt-[24px] mb-[32px]'>
          <Button
            title='Submit'
            onPress={handleSubmit}
            disabled={!dailyLimit || !monthlyLimit || !reason}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
