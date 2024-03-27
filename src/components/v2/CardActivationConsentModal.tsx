import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { ButtonType } from '../../constants/enum';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import Button from './button';
import clsx from 'clsx';
export default function CardActivationConsentModal({
  isModalVisible,
  onSuccess,
  onFailure,
}: {
  isModalVisible: boolean;
  onSuccess: () => void;
  onFailure: () => void;
}) {
  const { t } = useTranslation();
  const [hasConsent, setHasConsent] = useState(false);

  const RenderContent = useCallback(() => {
    return (
      <CyDView className='pr-[12px]'>
        <CyDView className='w-full flex flex-row justify-center items-center mt-[12px] bg-secondaryBackgroundColor'>
          <CyDImage
            source={AppImages.VIRTUAL_TO_PHYSICAL}
            className='h-[150px] w-[180px]'
            resizeMode='contain'
          />
        </CyDView>
        <CyDText className={'mt-[10px] text-center font-semibold'}>
          {t('ACTIVATE_PHYSICAL_CARD_SUB')}
        </CyDText>

        <CyDTouchView
          className='flex flex-row items-center mt-[32px]'
          onPress={() => {
            setHasConsent(!hasConsent);
          }}>
          <CyDView
            className={clsx('h-[20px] w-[20px] border-[1px] rounded-[4px]', {
              'bg-black': hasConsent,
            })}>
            {hasConsent && (
              <CyDImage
                source={AppImages.CORRECT}
                className='h-[15px] w-[15px] ml-[2px]'
                resizeMode='contain'
              />
            )}
          </CyDView>
          <CyDText className='px-[12px] text-[12px]'>
            {t('ACTIVATE_PHYSICAL_CARD_CONSENT')}
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
        className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
        <CyDTouchView onPress={() => onFailure()} className={'z-[50]'}>
          <CyDImage
            source={AppImages.CLOSE}
            className={
              ' w-[22px] h-[22px] z-[50] absolute right-[-5px] top-[-5px]'
            }
          />
        </CyDTouchView>
        {
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {t('ACTIVATE_PYHSICAL_CARD')}
          </CyDText>
        }
        <RenderContent />
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[12px]'
            title={t('PROCEED')}
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
