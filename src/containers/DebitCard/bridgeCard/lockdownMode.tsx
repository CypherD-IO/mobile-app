import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../../../components/v2/button';
import { ACCOUNT_STATUS, ButtonType } from '../../../constants/enum';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';

export default function LockdownMode(props) {
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();
  const [loading, setLoading] = useState(false);
  const { currentCardProvider } = props.route.params;

  const handleClickLockDownMode = async () => {
    const resp = await postWithAuth(
      `/v1/cards/${currentCardProvider}/account-status`,
      { status: ACCOUNT_STATUS.INACTIVE },
    );

    setLoading(false);
    if (!resp.isError) {
      showModal('state', {
        type: 'success',
        title: t('Lockdown mode enabled'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('Failed to enable Lockdown mode. Contact Support.'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  return (
    <>
      <SafeAreaView style={styles.topSafeArea}>
        <CyDView className='flex flex-col h-full justify-between'>
          <CyDView className='bg-cardBg pb-[16px]'>
            <CyDView className='flex flex-row mx-[20px]'>
              <CyDTouchView
                onPress={() => {
                  props.navigation.goBack();
                }}>
                <CyDImage
                  source={AppImages.BACK_ARROW_GRAY}
                  className='w-[32px] h-[32px]'
                />
              </CyDTouchView>
              <CyDView className='w-[calc(100% - 40px)] mx-auto'>
                <CyDText className='font-semibold text-black text-center -ml-[24px] text-[20px]'>
                  {t('LOCKDOWN_MODE')}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className='mt-[28px] rounded-[16px] bg-white items-center mx-[16px] py-[24px] px-[24px]'>
              <CyDImage
                source={AppImages.LOCKDOWN_MODE_IMAGE}
                className='h-[112px] w-[112px] my-[24px]'
              />
              <CyDText className='text-[16px] text-center'>
                {t('LOCKDOWN_MODE_DESC_TEXT_1')}
              </CyDText>
              <CyDText className='text-[16px] mt-[16px] text-center'>
                {t('LOCKDOWN_MODE_DESC_TEXT_3')}
              </CyDText>
              <CyDText className='text-[12px] mt-[24px] mx-[4px] text-center text-yellow-600'>
                **{t('LOCKDOWN_MODE_DESC_TEXT_2')}
              </CyDText>
              <Button
                type={ButtonType.RED}
                title={t('TURN_ON_LOCKDOWN')}
                titleStyle='text-white text-[18px]'
                style='w-full mt-[6px] rounded-[12px]'
                loading={loading}
                loaderStyle={{ height: 25, width: 25 }}
                onPress={() => {
                  setLoading(true);
                  showModal('state', {
                    type: 'warning',
                    title: t('Are you sure ?'),
                    description: t(
                      'Enabling lockdown mode will block all the card functionalitites',
                    ),
                    onSuccess: () => {
                      hideModal();
                      void handleClickLockDownMode();
                    },
                    onFailure: hideModal,
                  });
                }}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: '#EBEDF0',
  },
});
