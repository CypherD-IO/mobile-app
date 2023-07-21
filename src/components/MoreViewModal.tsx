/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import AppImages from '../../assets/images/appImages';
import CyDModalLayout from './v2/modal';
import { CyDFastImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import { t } from 'i18next';

export default function MoreViewModal (props: any) {
  const { isModalVisible, onPress, onHome, onHistory, onBookmark } = props;

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={onPress}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
    >
      <CyDView className='flex flex-col justify-start items-end pointer-events-none w-[250px] h-[500px] ml-[80px]'>
          <CyDView className='rounded-[10px] flex items-start justify-start bg-secondaryBackgroundColor p-[15px]'>
              <CyDTouchView sentry-label='more-view-home-icon' className='flex flex-row justify-start items-center gap-[16px] my-[1px] ' onPress={() => { onHome(); onPress(); }}>
                <CyDFastImage source={AppImages.HOME_BROWSER} className='h-[22px] w-[22px]' resizeMode='contain' />
                <CyDText className='text-[16px] font-semibold text-secondaryTextColor'>{t('HOME')}</CyDText>
              </CyDTouchView>
              <CyDTouchView sentry-label='more-view-history-icon' className='flex flex-row justify-start items-center gap-[16px] my-[1px] ' onPress={() => { onHistory(); onPress(); }}>
                <CyDFastImage source={AppImages.HISTORY_BROWSER} className='h-[22px] w-[22px]' resizeMode='contain' />
                <CyDText className='text-[16px] font-semibold text-secondaryTextColor'>{t('HISTORY')}</CyDText>
              </CyDTouchView>
              <CyDTouchView sentry-label='more-view-bookmark-icon' className='flex flex-row justify-start items-center gap-[16px] my-[1px] ' onPress={() => { onBookmark(); onPress(); }}>
                <CyDFastImage source={AppImages.BOOKMARK_BROWSER} className='h-[22px] w-[22px]' resizeMode='contain' />
                <CyDText className='text-[16px] font-semibold text-secondaryTextColor'>{t('BROWSER')}</CyDText>
              </CyDTouchView>
          </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
