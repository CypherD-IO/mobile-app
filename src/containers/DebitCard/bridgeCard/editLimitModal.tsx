import React, { useEffect, useState } from 'react';
import CyDModalLayout from '../../../components/v2/modal';
import {
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { StyleSheet } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { number } from 'yup';

export default function EditLimitModal({
  isModalVisible,
  setShowModal,
  title,
  currentLimit,
  onChangeLimit,
  maxLimit,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  title: string;
  currentLimit: number;
  onChangeLimit: (arg1: number) => void;
  maxLimit: number;
}) {
  const [limit, setLimit] = useState<number>(currentLimit);
  const [isError, setIsError] = useState<boolean>(false);
  useEffect(() => {
    if (isModalVisible) {
      setLimit(currentLimit);
    }
  }, [currentLimit, isModalVisible]);

  return (
    <>
      <CyDModalLayout
        isModalVisible={isModalVisible}
        setModalVisible={setShowModal}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming={300}
        animationOutTiming={300}
        style={styles.modalLayout}>
        <CyDView className='bg-cardBgTo px-[12px] py-[24px] m-[2px] mb-[6px] rounded-[16px]'>
          <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
            <CyDView className='flex-1 justify-center items-center'>
              <CyDText className='text-[22px] font-semibold ml-[24px]'>
                Card Options
              </CyDText>
            </CyDView>
            <CyDTouchView onPress={() => setShowModal(false)}>
              <CyDImage
                source={AppImages.CLOSE_CIRCLE}
                className='h-[28px] w-[28px]'
                resizeMode='contain'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='flex flex-col w-full mt-4'>
            <CyDText className='text-[14px] text-secondaryTextColor pl-2'>
              New Limit
            </CyDText>
            <CyDTextInput
              onChangeText={text => {
                setLimit(text);
              }}
              keyboardType={'numeric'}
              value={limit.toString()}
              placeholder='Enter Desired Limit'
              className={
                'border-[1px] border-n200 rounded-[8px] p-[10px] text-[14px] w-[100%]  '
              }
              onFocus={() => setIsError(false)}
            />
            {isError && (
              <CyDText className='mt-[4px] text-red-600 text-[14px]'>
                {`** Max Limit allowed for your current plan is $${maxLimit}`}
              </CyDText>
            )}
            <CyDView className='mt-[24px]'>
              <Button
                title={'Set Limit'}
                onPress={() => {
                  if (limit > maxLimit) {
                    setIsError(true);
                    setLimit(maxLimit);
                  } else {
                    onChangeLimit(Number(limit));
                  }
                }}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDModalLayout>
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    marginTop: '80%',
    justifyContent: 'flex-start',
  },
});
