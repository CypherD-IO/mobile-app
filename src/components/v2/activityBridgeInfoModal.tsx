import React from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import Button from './button';
import moment from 'moment';
import { t } from 'i18next';
import { onShare } from '../../containers/utilities/socialShareUtility';
import { ActivityStatus } from '../../reducers/activity_reducer';
import clsx from 'clsx';
import { round } from 'lodash';

const statuses: Record<string, string> = {
  [ActivityStatus.PENDING]: 'PENDING',
  [ActivityStatus.SUCCESS]: 'SUCCESS',
  [ActivityStatus.FAILED]: 'FAILED',
  [ActivityStatus.INPROCESS]: 'IN PROCESS',
  [ActivityStatus.DELAYED]: 'DELAYED'
};

export default function ActivityBridgeInfoModal ({
  isModalVisible,
  setModalVisible,
  params
}: {
  isModalVisible: boolean
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>
  params: any
}) {
  async function referFriend () {
    await onShare(t('RECOMMEND_TITLE'), t('RECOMMEND_MESSAGE'), t('RECOMMEND_URL'));
    setModalVisible(false);
  }

  if (params) {
    const { fromTokenAmount, toTokenAmount, quoteData, fromSymbol, toSymbol, status } = params;
    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white pb-[30px] rounded-[20px]'}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { setModalVisible(false); }}
          >
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView className='flex mt-[5%] flex-row justify-center items-center '>
            <CyDImage source={status === ActivityStatus.SUCCESS || status === ActivityStatus.INPROCESS ? AppImages.BRIDGE_SUCCESS : AppImages.BRIDGE_PENDING}
                className={'w-[21px] h-[21px] right-[9px]'}
            />
            <CyDView className='flex mt-[5%] justify-center items-center '>
              <CyDText className='text-center font-nunito text-[20px] font-extrabold font-[##434343]'>{t<string>('BRIDGE_TRANSACTION')}</CyDText>
              <CyDText className={clsx('text-center font-nunito text-[12px] font-extrabold ', {
                'text-successTextGreen': status === ActivityStatus.SUCCESS || status === ActivityStatus.INPROCESS,
                'text-amber-400': status === ActivityStatus.DELAYED
              })}>{statuses[status]}</CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-col px-[40px]' >
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-[##434343]'>{t<string>('DATE')}</CyDText>
              <CyDText className='text-center font-nunito text-[14px] font-bold font-[##434343]'>{moment(new Date()).format('MMM DD, h:mm a')}</CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-[##434343]'>{t<string>('SENT')}</CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center font-nunito text-[14px] font-bold font-[##434343]'>{`${fromTokenAmount} ${fromSymbol}`}</CyDText>
                <CyDText className='text-center font-nunito text-[13px] font-[##434343]'>{`${String(quoteData.fromAmountUsd).slice(0, String(quoteData.fromAmountUsd).indexOf('.') + 4)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-[##434343]'>{t<string>('RECEIVED')}</CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center font-nunito text-[14px] font-bold font-[##434343]'>{`${toTokenAmount.slice(0, toTokenAmount.indexOf('.') + 4)} ${toSymbol}`}</CyDText>
                <CyDText className='text-center font-nunito text-[13px] font-[##434343]'>{`${String(quoteData.toAmountUsd).slice(0, String(quoteData.toAmountUsd).indexOf('.') + 4)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-[##434343]'>{t<string>('GAS_FEE')}</CyDText>
              <CyDText className='text-center font-nunito text-[14px] font-bold mt-[3px] font-[##434343]'>{quoteData.gasFee ? `${round(parseFloat(quoteData.gasFee), 6)} USD` : ''}</CyDText>
            </CyDView>

            <CyDImage source={AppImages.CYPHER_LOVE}
                className={'w-[98%] h-[90px] mt-[15px]'}
            />
            <CyDText className={'text-center font-nunito font-extrabold text-[20px] mt-[10px]'}>{t<string>('LOVE_CYPHERD_APP')}</CyDText>
            <CyDText className={'text-center font-nunito mt-[10px]'}>{t<string>('SHARE_WITH_FRIENDS')}</CyDText>

            <CyDView className='w-[100%] mt-[10%]'>
              <Button onPress={() => {
                void referFriend();
              }} style={'py-[5%] mx-[0px]'} image={AppImages.REFER} title={t('RECOMMEND_FRIEND')} titleStyle={'text-[14px]'}/>
            </CyDView>

          </CyDView>
        </CyDView>
      </CyDModalLayout>
    );
  } else {
    return <></>;
  }
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
