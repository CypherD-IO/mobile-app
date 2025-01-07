import {
  CyDFlatList,
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { StyleSheet } from 'react-native';
import * as React from 'react';
import clsx from 'clsx';
import AppImages from './../../../assets/images/appImages';

enum typeOfChain {
  CHAIN = 'chain',
  TOKEN = 'token',
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function ChooseChainModal({
  isModalVisible,
  setModalVisible,
  data,
  onPress,
  title,
  selectedItem,
  type = 'chain',
  customStyle = {},
  animationIn = 'slideInUp',
  animationOut = 'slideOutDown',
  isClosable = false,
  backEnabled = false,
  onPressBack = () => {},
}) {
  const renderFromList = item => {
    return (
      (type === typeOfChain.CHAIN ? true : item.item.isVerified) && (
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
              source={
                type === typeOfChain.CHAIN
                  ? item.item.logo_url
                  : { uri: item.item.logoUrl }
              }
              className={'w-[28px] h-[28px] mr-[18px]'}
            />
            <CyDText className={' text-[18px]  font-regular'}>
              {item.item.name}
            </CyDText>
          </CyDView>

          {item.item.name === selectedItem && type === typeOfChain.CHAIN && (
            <CydMaterialDesignIcons
              name='check-bold'
              size={16}
              className='text-base400 self-end'
            />
          )}

          {type === typeOfChain.TOKEN && (
            <CyDView>
              <CyDText
                className={
                  'font-semibold text-subTextColor text-[16px] text-right'
                }>
                {new Intl.NumberFormat('en-US', {
                  maximumSignificantDigits: 4,
                }).format(item.item.actualBalance)}
              </CyDText>
              <CyDText
                className={
                  'font-semibold text-subTextColor text-[12px] text-right mr-[2px]'
                }>
                {currencyFormatter.format(item.item.totalValue)}
              </CyDText>
            </CyDView>
          )}
        </CyDTouchView>
      )
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
          <CydMaterialDesignIcons
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
            <CydMaterialDesignIcons
              name={'arrow-left-thin'}
              size={32}
              className='text-base400'
            />
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
