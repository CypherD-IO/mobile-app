import React, { Dispatch, SetStateAction } from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDView,
  CyDScrollView,
  CyDKeyboardAvoidingView,
} from '../../styles/tailwindComponents';
import { StyleSheet, Platform } from 'react-native';
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
  const [error, setError] = React.useState<string>('');
  const MAX_REASON_LENGTH = 200;

  const formatNumber = (value: string) => {
    // Remove any non-digits
    const numericValue = value.replace(/[^0-9]/g, '');
    // Convert to number and format with locale string
    return numericValue
      ? parseInt(numericValue, 10).toLocaleString('en-US')
      : '';
  };

  const handleDailyLimitChange = (text: string) => {
    setDailyLimit(formatNumber(text));
    setError(''); // Clear any previous errors when user makes changes
  };

  const handleMonthlyLimitChange = (text: string) => {
    setMonthlyLimit(formatNumber(text));
    setError(''); // Clear any previous errors when user makes changes
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

    if (monthlyValue < dailyValue) {
      setError('Monthly limit cannot be less than daily limit');
      return;
    }

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
      <CyDKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <CyDView className='bg-n20 rounded-t-[16px]'>
          <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mt-[16px] mb-[16px] rounded-full' />

          <CyDScrollView
            className='px-[16px]'
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps='handled'>
            <CyDText className='text-[24px] font-bold'>
              Request higher spending limit
            </CyDText>

            <CyDText className='text-[14px] text-n200 mt-[8px]'>
              Our agent will verify the request and enable it for you
            </CyDText>

            <CyDView className='mt-[24px]'>
              <CyDText className='text-[16px] text-n200 mb-[8px]'>
                Expected Daily Limit
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
                Expected Monthly Limit
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
              {error && (
                <CyDText className='text-[12px] text-red-500 mt-[4px]'>
                  {error}
                </CyDText>
              )}
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
          </CyDScrollView>
        </CyDView>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
}
