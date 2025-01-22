import React from 'react';
import AppImages from '../../assets/images/appImages';
import CyDModalLayout from './v2/modal';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { t } from 'i18next';

export default function MoreViewModal(props: any) {
  const { isModalVisible, onPress, onHome, onHistory, onBookmark } = props;

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={onPress}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}>
      <CyDView className='w-fit h-full relative '>
        <CyDView className='bg-n20 rounded-[10px] p-[15px] absolute top-[60px] right-[0px]'>
          <CyDTouchView
            sentry-label='more-view-home-icon'
            className='flex flex-row justify-start items-center gap-[16px] my-[1px]'
            onPress={() => {
              onHome();
              onPress();
            }}>
            <CyDMaterialDesignIcons
              name='home'
              size={20}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-medium '>{t('HOME')}</CyDText>
          </CyDTouchView>
          <CyDTouchView
            sentry-label='more-view-history-icon'
            className='flex flex-row justify-start items-center gap-[16px] my-[1px]'
            onPress={() => {
              onHistory();
              onPress();
            }}>
            <CyDMaterialDesignIcons
              name='history'
              size={20}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-medium'>
              {t('HISTORY')}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            sentry-label='more-view-bookmark-icon'
            className='flex flex-row justify-start items-center gap-[16px] my-[1px]'
            onPress={() => {
              onBookmark();
              onPress();
            }}>
            <CyDMaterialDesignIcons
              name='bookmark-outline'
              size={20}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-medium'>
              {t('BOOKMARKS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
