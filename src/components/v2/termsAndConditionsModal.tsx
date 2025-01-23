import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import useAxios from '../../core/HttpRequest';
import CyDModalLayout from './modal';
import clsx from 'clsx';
import Button from './button';
import { screenTitle } from '../../constants';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';

export default function TermsAndConditionsModal({
  isModalVisible,
  setIsModalVisible,
  onAgree,
  onCancel,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
  onAgree: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { patchWithAuth } = useAxios();
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const onClickAgree = async () => {
    setIsLoading(true);
    const response = await patchWithAuth('/v1/cards/agree-terms', {});
    if (!response.isError) {
      onAgree();
    }
    setIsLoading(false);
  };

  return (
    <CyDModalLayout
      setModalVisible={setIsModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className={'h-[64%] w-full bg-n0 p-[24px] rounded-[22px]'}>
        <CyDView className='flex flex-row items-center'>
          <CyDView className='flex w-full justify-center items-center'>
            <CyDText className={'font-bold text-center text-[22px]'}>
              {t('TERMS_CONDITIONS')}
            </CyDText>
          </CyDView>
          <CyDTouchView
            onPress={() => onCancel()}
            className={'z-[50] ml-[-24px]'}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDView className='flex flex-col justify-between items-center w-full mt-[24px]'>
          <CyDText className='text-center w-full mt-[12px]'>
            {t('TERMS_CONDITIONS_DESC')}
          </CyDText>
        </CyDView>

        <CyDView className='h-[160px] w-[240px] flex flex-col justify-between items-center blur-[10px] mt-[32px] bg-base400 self-center rounded-[4px]'>
          <CyDView className='opacity-40'>
            <CyDText className='text-center text-n0 mt-[12px]'>
              {t('TERMS_CONDITIONS')}
            </CyDText>
            <CyDText className='text-center text-[10px] text-n0 mt-[10px]'>
              CypherD Wallet Inc
            </CyDText>
            <CyDText className='text-[10px] text-n0 mt-[10px] px-[4px]'>
              We will post any changes to these terms of service in a notice of
              the change at the bottom of our web page.
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='w-full py-[16px] bg-n40 flex flex-row justify-center items-center'
            onPress={() => {
              setIsModalVisible(false);
              navigation.navigate(screenTitle.LEGAL_SCREEN);
            }}>
            <CyDText className='text-center text-blue-500'>
              {t('VIEW_TERMS_CONDITIONS')}
            </CyDText>
            <CyDIcons
              name='chevron-right'
              size={24}
              className='text-blue-500'
            />
          </CyDTouchView>
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
              <CyDMaterialDesignIcons
                name='check-bold'
                size={16}
                className='text-base400'
              />
            )}
          </CyDView>
          <CyDText className='px-[12px] text-[14px]'>{t('AGREE_T&C')}</CyDText>
        </CyDTouchView>

        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[12px]'
            title={t('AGGREE_CONTINUE')}
            disabled={!hasConsent}
            loading={isLoading}
            onPress={() => {
              void onClickAgree();
            }}
          />
          {/* <Button
            style='h-[54px] mt-[15px]'
            title={t('CANCEL')}
            onPress={() => {
              onFailure();
            }}
            type={ButtonType.SECONDARY}
          /> */}
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
  modalLayout: {
    margin: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
});
