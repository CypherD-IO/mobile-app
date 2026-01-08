import {
  CyDFlatList,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { StyleSheet } from 'react-native';
import * as React from 'react';
import clsx from 'clsx';

interface ChooseChainModalProps {
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  data: any[];
  onPress: (item: { item: any; index: number }) => void;
  title: string;
  selectedItem: string;
  customStyle?: any;
  animationIn?: any;
  animationOut?: any;
  isClosable?: boolean;
  backEnabled?: boolean;
  onPressBack?: () => void;
}

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
  onPressBack,
}: ChooseChainModalProps) {
  /**
   * Renders a chain item in grid layout
   * Shows chain logo and name in a card format
   */
  const renderFromList = ({ item, index }: { item: any; index: number }) => {
    const isSelected = item.name === selectedItem;

    return (
      <CyDTouchView
        key={item.name}
        className={clsx(
          'flex flex-col items-center justify-center p-[12px] rounded-[16px] m-[4px] relative',
          {
            'bg-p150 border-2 border-p100': isSelected,
            'bg-n0 border border-n40': !isSelected,
          },
        )}
        style={styles.gridItem}
        onPress={() => {
          setModalVisible(false);
          onPress({ item, index });
        }}>
        {/* Chain Logo */}
        <CyDImage
          source={item.logo_url}
          className={'w-[36px] h-[36px] mb-[8px]'}
        />

        {/* Chain Name */}
        <CyDText
          className='text-[12px] font-medium text-center text-base400'
          numberOfLines={1}>
          {item.name}
        </CyDText>

        {/* Selected Indicator */}
        {isSelected && (
          <CyDView className='absolute top-[4px] right-[4px]'>
            <CyDIcons name='tick' size={16} className='text-p100' />
          </CyDView>
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
        {/* Header with Title and Close Button */}
        <CyDView className='flex flex-row items-center justify-between px-[12px] pt-[12px] pb-[14px]'>
          {/* Back Button (conditionally rendered) */}
          {backEnabled && (
            <CyDTouchView
              onPress={
                onPressBack ??
                (() => {
                  // no-op
                })
              }
              className={'mr-[12px]'}>
              <CyDIcons name='arrow-left' size={24} className='text-base400' />
            </CyDTouchView>
          )}

          {/* Title */}
          <CyDText className='flex-1 text-center text-[22px] font-bold'>
            {title}
          </CyDText>

          {/* Close Button */}
          <CyDTouchView
            onPress={() => {
              setModalVisible(false);
            }}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDFlatList
          data={data}
          renderItem={renderFromList}
          showsVerticalScrollIndicator={true}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.contentContainer}
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
  gridItem: {
    width: '30%',
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  contentContainer: {
    paddingTop: 8,
  },
});
