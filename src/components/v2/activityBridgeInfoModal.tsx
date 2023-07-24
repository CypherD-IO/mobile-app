import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import { CyDFastImage, CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import Button from './button';
import moment from 'moment';
import { t } from 'i18next';
import { onShare } from '../../containers/utilities/socialShareUtility';
import { ActivityStatus, ActivityType } from '../../reducers/activity_reducer';
import clsx from 'clsx';
import { round } from 'lodash';
import { generateUserInviteLink } from '../../core/appsFlyerUtils';
import appsFlyer from 'react-native-appsflyer';
import useAxios from '../../core/HttpRequest';
import { HdWalletContext } from '../../core/util';

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
  const { getWithAuth } = useAxios();

  const hdWalletContext = useContext<any>(HdWalletContext);
  const { ethereum: { address } } = hdWalletContext.state.wallet;
  async function referFriend () {
    try {
      const resp = await getWithAuth('/v1/referral/tabDetails');
      await generateUserInviteLink(resp?.data?.inviteCodeTab.referralCode, address, (referralInviteLink) => {
        onShare(t('RECOMMEND_TITLE'), t('RECOMMEND_MESSAGE'), referralInviteLink)
          .then(
            () => {
              void appsFlyer.logEvent('referral_invite_shared', {});
            })
          .catch((error) => {
            void appsFlyer.logEvent('share_invite_failed', error);
          });
      });
    } catch (error) {
      // Ignore if the link generation fails
    }
  }

  if (params) {
    const { fromTokenAmount, toTokenAmount, quoteData, fromSymbol, toSymbol, status, type } = params;
    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white pb-[30px] rounded-t-[20px]'}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { setModalVisible(false); }}
          >
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView className='flex mt-[5%] flex-row justify-center items-center '>
            { type === ActivityType.BRIDGE
              ? <CyDFastImage source={status === ActivityStatus.SUCCESS || status === ActivityStatus.INPROCESS ? AppImages.BRIDGE_SUCCESS : AppImages.BRIDGE_PENDING}
                className={'w-[22px] h-[22px] right-[9px]'}
            />
              : <CyDFastImage source={status === ActivityStatus.SUCCESS || status === ActivityStatus.INPROCESS ? AppImages.SWAP_SUCCESS : AppImages.SWAP_PENDING}
              className='w-[22px] h-[22px] right-[9px]'
            />}
            <CyDView className='flex mt-[5%] justify-center items-center '>
              <CyDText className='text-center font-nunito text-[20px] font-extrabold font-primaryTextColor'>{t<string>(type === ActivityType.BRIDGE ? 'BRIDGE_TRANSACTION' : 'SWAP_TRANSACTION')}</CyDText>
              <CyDText className={clsx('text-center font-nunito text-[12px] font-extrabold ', {
                'text-successTextGreen': status === ActivityStatus.SUCCESS || status === ActivityStatus.INPROCESS,
                'text-amber-400': status === ActivityStatus.DELAYED
              })}>{statuses[status]}</CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-col px-[40px]' >
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>{t<string>('DATE')}</CyDText>
              <CyDText className='text-center font-nunito text-[14px] font-bold font-primaryTextColor'>{moment(new Date()).format('MMM DD, h:mm a')}</CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>{t<string>('SENT')}</CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center font-nunito text-[14px] font-bold font-primaryTextColor'>{`${fromTokenAmount} ${fromSymbol}`}</CyDText>
                <CyDText className='text-center font-nunito text-[13px] font-primaryTextColor'>{`${String(quoteData.fromAmountUsd).slice(0, String(quoteData.fromAmountUsd).indexOf('.') + 4)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>{t<string>('RECEIVED')}</CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center font-nunito text-[14px] font-bold font-primaryTextColor'>{`${toTokenAmount.slice(0, toTokenAmount.indexOf('.') + 4)} ${toSymbol}`}</CyDText>
                <CyDText className='text-center font-nunito text-[13px] font-primaryTextColor'>{`${String(quoteData.toAmountUsd).slice(0, String(quoteData.toAmountUsd).indexOf('.') + 4)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>{t<string>('GAS_FEE')}</CyDText>
              <CyDText className='text-center font-nunito text-[14px] font-bold mt-[3px] font-primaryTextColor'>{quoteData.gasFee ? `${round(parseFloat(quoteData.gasFee), 6)} USD` : ''}</CyDText>
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
