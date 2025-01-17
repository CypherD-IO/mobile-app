import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import {
  CydMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function BottomConfirmCosmos(props: {
  isModalVisible: boolean;
  onPayPress: () => void;
  onCancelPress: () => void;
  payload: any;
  chain: string;
}) {
  const { isModalVisible, onPayPress, onCancelPress, payload, chain } = props;
  const { t } = useTranslation();

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        onCancelPress();
      }}>
      <CyDView
        className={'bg-n20 pb-[30px] flex items-center rounded-t-[20px]'}>
        <CyDTouchView
          className={'flex flex-row pl-[95%] justify-end z-10'}
          onPress={onCancelPress}>
          <CydMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400 top-[20px] right-[20px] '
          />
        </CyDTouchView>

        <CyDText className='text-center text-[19px] font-bold'>
          Confirm Sign
        </CyDText>
        <CyDText className='text-center text-[19px] mt-[10px] font-bold  '>
          {chain.charAt(0).toUpperCase() + chain.slice(1)}
        </CyDText>

        <CyDText className='text-left pr-[73%] mt-[20px] text-[16px] mb-[10px] font-bold'>
          Payload
        </CyDText>

        <CyDScrollView
          className={
            'bg-backLight border-2 border-portfolioBorderColor h-[35%] w-[90%] py-[10px] px-[10px] rounded-[10px]'
          }>
          <CyDText className='text-left text-[13px] font-regular  '>
            {JSON.stringify(payload, undefined, 8)}
          </CyDText>
        </CyDScrollView>

        <CyDView className='flex flex-row px-[10px]'>
          <ButtonWithOutImage
            sentry-label='bottom-confirm-cancel-button'
            mT={20}
            wT={45}
            mH={12}
            bG={Colors.whiteColor}
            vC={Colors.appColor}
            mB={30}
            text={t('CANCEL')}
            isBorder={true}
            onPress={onCancelPress}
          />
          <ButtonWithOutImage
            sentry-label='bottom-confirm-pay-button'
            mT={20}
            wT={45}
            bG={Colors.appColor}
            vC={Colors.appColor}
            mB={30}
            text={t('SIGN')}
            isBorder={false}
            onPress={onPayPress}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
