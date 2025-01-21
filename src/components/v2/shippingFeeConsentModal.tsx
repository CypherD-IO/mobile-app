import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { ButtonType } from '../../constants/enum';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import Button from './button';
import clsx from 'clsx';
export default function ShippingFeeConsentModal({
  isModalVisible,
  feeAmount,
  onSuccess,
  onFailure,
}: {
  isModalVisible: boolean;
  feeAmount: string;
  onSuccess: () => void;
  onFailure: () => void;
}) {
  const { t } = useTranslation();
  const title = 'Upgrade to Physical Card';
  const [hasConsent, setHasConsent] = useState(false);

  const RenderContent = useCallback(() => {
    return (
      <CyDView className='pr-[12px]'>
        <CyDText className='mt-[42px] text-[16px] font-bold'>
          Please Note:
        </CyDText>
        <CyDView className={'flex flex-row mt-[18px]'}>
          <CydMaterialDesignIcons
            name={'triangle'}
            size={14}
            className='text-p150 rotate-90 mr-[4px]'
          />
          <CyDText className={'ml-[10px] font-semibold'}>
            {t('SHIPPING_FEE_SUB1') + '$' + feeAmount + t('SHIPPING_FEE_SUB2')}
          </CyDText>
        </CyDView>

        <CyDTouchView
          className='flex flex-row items-center mt-[32px]'
          onPress={() => {
            setHasConsent(!hasConsent);
          }}>
          <CyDView
            className={clsx(
              'h-[20px] w-[20px] border-[1px] border-base400 rounded-[4px]',
              {
                'bg-black': hasConsent,
              },
            )}>
            {hasConsent && (
              <CydMaterialDesignIcons
                name='check-bold'
                size={16}
                className='text-base400'
              />
            )}
          </CyDView>
          <CyDText className='px-[12px] text-[12px]'>
            {t('SHIPPING_FEE_ACC')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    );
  }, [hasConsent, setHasConsent]);
  return (
    <CyDModalLayout
      setModalVisible={() => {
        onSuccess();
      }}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}
      isModalVisible={isModalVisible}>
      <CyDView
        className={'bg-n20 p-[25px] pb-[30px] rounded-t-[20px] relative'}>
        <CyDTouchView onPress={() => onFailure()} className={'z-[50] self-end'}>
          <CydMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        {
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {title}
          </CyDText>
        }
        <RenderContent />
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[12px]'
            title={t('PROCEED_TO_PAY') + ` $${feeAmount}`}
            disabled={!hasConsent}
            onPress={() => {
              onSuccess();
            }}
          />
          <Button
            style='h-[54px] mt-[15px]'
            title={t('CANCEL')}
            onPress={() => {
              onFailure();
            }}
            type={ButtonType.SECONDARY}
          />
        </CyDView>
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
