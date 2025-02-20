import {
  CyDFlatList,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { StyleSheet } from 'react-native';
import * as React from 'react';
import clsx from 'clsx';

export default function ChooseChainModal({
  isModalVisible,
  setModalVisible,
  data,
  onPress,
  title,
  selectedItem,
  customStyle = {},
  animationIn = 'slideInUp',
  animationOut = 'slideOutDown',
  isClosable = false,
  backEnabled = false,
  onPressBack = () => {},
}) {
  const renderFromList = item => {
    return (
      <CyDTouchView
        key={item.item.name}
        className={clsx(
          'flex flex-row py-[12px] px-[24px] items-center justify-between',
          {
            'bg-n0 rounded-[18px]': item.item.name === selectedItem,
          },
        )}
        onPress={() => {
          setModalVisible(false);
          onPress(item);
        }}>
        <CyDView className={'flex flex-row items-center'}>
          <CyDImage
            source={item.item.logo_url}
            className={'w-[28px] h-[28px] mr-[18px]'}
          />
          <CyDText className={' text-[18px]  font-regular'}>
            {item.item.name}
          </CyDText>
        </CyDView>

        {item.item.name === selectedItem && (
          <CyDMaterialDesignIcons
            name='check-bold'
            size={16}
            className='text-base400 self-end'
          />
        )}
      </CyDTouchView>
    );
  };

  return (
    <CyDModalLayout
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      animationIn={animationIn}
      animationOut={animationOut}
      style={styles.modalLayout}>
      <CyDView
        className={
          'bg-n20 border-1 rounded-t-[36px] border-n40 p-[12px] pb-[22px] h-[60%] relative'
        }>
        <CyDTouchView
          onPress={() => {
            setModalVisible(false);
          }}
          className={'self-end'}>
          <CyDMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        <CyDText
          className={'text-center pt-[24px] pb-[14px] text-[22px]  font-bold'}>
          {title}
        </CyDText>

        {backEnabled && (
          <CyDTouchView
            onPress={onPressBack}
            className={'absolute z-[50] top-[20px] left-[24px]'}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        )}
        <CyDFlatList
          data={data}
          renderItem={renderFromList}
          showsVerticalScrollIndicator={true}
        />
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
