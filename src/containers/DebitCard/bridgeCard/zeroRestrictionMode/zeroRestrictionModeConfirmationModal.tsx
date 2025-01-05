import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../../../assets/images/appImages';
import ZrmIntro from './zrmIntro';
import Loading from '../../../Loading';
import {
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import Button from '../../../../components/v2/button';
import CyDModalLayout from '../../../../components/v2/modal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CyDPicker from '../../../../components/picker';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function ZeroRestrictionModeConfirmationModal(props: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  onPressProceed: (godmExpiryInMinutes: number) => void;
  setLoader: Dispatch<SetStateAction<boolean>>;
}) {
  const { isModalVisible, setIsModalVisible, setLoader, onPressProceed } =
    props;
  const insets = useSafeAreaInsets();

  const [isChecked, setIsChecked] = useState(false);
  const [isFirstZrmEnable, setIsFirstZrmEnable] = useState<boolean | null>(
    null,
  );
  const [pageLoader, setPageLoader] = useState(false);
  const [duration, setDuration] = useState(720);

  const handleProceedClick = async () => {
    await onPressProceed(duration);
  };

  useEffect(() => {
    const checkFirstZrmEnable = async () => {
      setPageLoader(true);
      const firstTime = await AsyncStorage.getItem('isFirstZrmEnable');
      if (firstTime === null) {
        await AsyncStorage.setItem('isFirstZrmEnable', 'true');
        setIsFirstZrmEnable(true);
      } else {
        setIsFirstZrmEnable(false);
      }
      setPageLoader(false);
    };

    void checkFirstZrmEnable();
    setIsChecked(false);
  }, [isModalVisible]);

  if (pageLoader) return <Loading />;
  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      useNativeDriver={true}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      {isFirstZrmEnable && (
        <CyDView className='h-full'>
          <ZrmIntro setIsFirstZrmEnable={setIsFirstZrmEnable} />
        </CyDView>
      )}
      {!isFirstZrmEnable && (
        <GestureHandlerRootView>
          <CyDView className='h-[100%] mx-[2px] bg-n20 flex flex-col justify-between'>
            <CyDView>
              <CyDView
                className='bg-n0 flex flex-row justify-between p-[16px]'
                style={{ paddingTop: insets.top }}>
                <CyDText className='font-semibold text-[16px]'>
                  {'Zero Restriction'}
                </CyDText>
                <CyDTouchView
                  onPress={() => {
                    setLoader(false);
                    setIsModalVisible(false);
                  }}>
                  <CydMaterialDesignIcons
                    name={'close'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>

              <CyDView className='bg-n20 p-[16px]'>
                <CyDText className='text-[16px] font-normal'>
                  {
                    'This mode temporarily removes all limits, enabling international transactions worldwide for'
                  }
                </CyDText>

                <CyDView className='bg-n0 rounded-[10px] p-[16px] mt-[16px]'>
                  <CyDText className='text-[14px] font-normal text-center'>
                    {'Zero restriction will be active for '}
                  </CyDText>
                  <CyDView className='mt-[4px]'>
                    <GestureHandlerRootView>
                      <CyDPicker
                        value={[
                          { label: '30 mins', value: 30 },
                          { label: '1 hour', value: 60 },
                          { label: '12 hours', value: 720 },
                          { label: '1 day', value: 1440 },
                          { label: '1 week', value: 10080 },
                        ]}
                        onChange={selected => {
                          setDuration(selected.value as number);
                        }}
                        initialValue={duration}
                      />
                    </GestureHandlerRootView>
                  </CyDView>
                </CyDView>

                <CyDView className='mt-[24px]'>
                  <CyDText className='font-bold text-[12px] text-base400'>
                    {'Use with caution:'}
                  </CyDText>
                  <CyDText className='font-normal text-[12px] text-n200'>
                    {
                      "Only activate if you're unsure why a transaction failed or which country to enable."
                    }
                  </CyDText>
                </CyDView>

                <CyDView className='mt-[16px]'>
                  <CyDText className='font-bold text-[12px] text-base400'>
                    {'Stay alert:'}
                  </CyDText>
                  <CyDText className='font-normal text-[12px] text-n200'>
                    {
                      'Fraud risk is higher while this mode is active. \nLimited protection: Fraud protection won’t apply during this time.'
                    }
                  </CyDText>
                </CyDView>

                <CyDView className='mt-[16px]'>
                  <CyDText className='font-bold text-[12px] text-base400'>
                    {'Monitor closely:'}
                  </CyDText>
                  <CyDText className='font-normal text-[12px] text-n200'>
                    {
                      'Review your transactions immediately after use to ensure everything is in order.'
                    }
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='bg-n0 pb-[28px] px-[16px] pt-[16px]'>
              <CyDView className='flex flex-row mb-[16px] items-center'>
                <CyDTouchView
                  onPress={() => {
                    setIsChecked(!isChecked);
                  }}
                  className='mr-[6px] w-[24px] h-[24px] p-[3px]'>
                  <CyDView
                    className={`${isChecked ? 'bg-base400' : ''} h-[21px] w-[21px] rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center`}>
                    <CyDImage
                      source={AppImages.WHITE_CHECK_MARK}
                      className='h-[20px] w-[20px]'
                    />
                  </CyDView>
                </CyDTouchView>
                <CyDText className='text-base400 text-[10px] font-medium w-[95%]'>
                  {
                    'I acknowledge that this may allow transactions that are usually limited for security purposes. I understand that the fraud protection coverage will not apply during this time window.'
                  }
                </CyDText>
              </CyDView>
              <Button
                title='Proceed'
                disabled={!isChecked}
                onPress={() => {
                  void handleProceedClick();
                }}
              />
            </CyDView>
          </CyDView>
        </GestureHandlerRootView>
      )}
    </CyDModalLayout>
  );
}
