/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Linking, RefreshControl } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { CyDImage, CyDText, CyDView, CyDImageBackground, CyDFlatList, CyDTouchView } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';
import * as Sentry from '@sentry/react-native';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext } from '../../core/globalContext';
import axios from 'axios';
import Loading from '../../components/v2/loading';
import { CardApplicationStatus, GlobalContextType, KYCStatus } from '../../constants/enum';
import { getCardProfile } from '../../core/card';
import { screenTitle } from '../../constants';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import { HdWalletContext } from '../../core/util';
import { hostWorker } from '../../global';
interface timeLineItem {
  item: string
  index: number
}

export default function CardKYCStatusScreen ({ navigation }) {
  const { t } = useTranslation();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [fillIndex, setFillIndex] = useState<number>(1);
  const [error, setError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const data = [t('APPLICATION_SUBMITTED'), t('KYC_INITITATED'), t('APPLICATION_UNDER_REVIEW'), t('KYC_COMPLETED'), t('CARD_ISSUED')];
  const [kycData, setKycData] = useState();
  let latestKycStatus: any;
  let latestCardProfileStatus: any;
  const availableReviewCodes = ['R112', 'R131', 'R311', 'R332'];

  useEffect(() => {
    if (isFocused) {
      latestKycStatus = setInterval(() => { void checkKYC(); }, 5000);
    }
    return () => {
      clearInterval(latestKycStatus);
      clearInterval(latestCardProfileStatus);
    };
  }, [isFocused]);

  useEffect(() => {
    setError(false);
    void getKYC();
  }, []);

  const fillIndexAccordingToKYCStatus = async (kycStatus: string) => {
    switch (kycStatus) {
      case KYCStatus.IN_REVIEW:
        setFillIndex(2);
        break;
      case KYCStatus.APPROVED:
        setFillIndex(3);
        await getProfile();
        break;
      case KYCStatus.DECLINED:
        setFillIndex(3);
        setError(true);
    }
  };

  const getProfile = async () => {
    const profileData = await getCardProfile(globalContext.globalState.token);
    if (profileData.solid.applicationStatus === CardApplicationStatus.COMPLETION_PENDING) {
      setFillIndex(4);
      setError(true);
      if (latestCardProfileStatus) {
        clearInterval(latestCardProfileStatus);
      };
    }
    if (profileData.solid.applicationStatus === CardApplicationStatus.COMPLETED) {
      globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: profileData });
      if (latestCardProfileStatus) {
        clearInterval(latestCardProfileStatus);
      };
    }
  };

  const checkKYC = async () => {
    const KYCUrl = `${ARCH_HOST}/v1/cards/application/kyc`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };
    try {
      const { data } = await axios.get(KYCUrl, config);
      setKycData(data);
      await fillIndexAccordingToKYCStatus(data.kycStatus);
      if (data.kycStatus === KYCStatus.APPROVED) {
        clearInterval(latestKycStatus);
        latestCardProfileStatus = setInterval(() => { void getProfile(); }, 5000);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const getKYC = async () => {
    setLoading(true);
    const KYCUrl = `${ARCH_HOST}/v1/cards/application/kyc`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };
    try {
      const { data } = await axios.get(KYCUrl, config);
      setKycData(data);
      await fillIndexAccordingToKYCStatus(data.kycStatus);
      const profileData = await getCardProfile(globalContext.globalState.token);
      globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: profileData });
      setLoading(false);
    } catch (e) {
      Sentry.captureException(e);
      setLoading(false);
    }
  };

  const KYCTimeline = ({ item, index }: timeLineItem) => {
    return (
      <CyDView className={'flex flex-col'}>
        <CyDView className={'flex flex-row '}>
          <CyDView
            className={clsx(
              'w-[28px] h-[28px]  rounded-full flex flex-row items-center justify-center',
              {
                'border-[1px]': index > fillIndex,
                'bg-[#FFDE59]': index <= fillIndex,
                'bg-red-500': error && index === fillIndex
              }
            )}
          >
            {index < fillIndex && (
              <CyDImage
                className={'w-[14px] h-[10px]'}
                source={AppImages.CORRECT}
                style={styles.tintBlack}
              />
            )}

            {!error && index === fillIndex && (
              <CyDImage
                className={'w-[14px] h-[10px]'}
                source={AppImages.CORRECT}
                style={styles.tintBlack}
              />
            )}

            {error && index === fillIndex && (
              <CyDImage
                className={'w-[33px] h-[12px]'}
                source={AppImages.CLOSE}
                style={styles.tintWhite}
              />
            )}

          </CyDView>
          <CyDView>
            <CyDText className={clsx('font-bold font-nunito text-[16px] ml-[16px]', { 'text-redColor': error && index === fillIndex })}>
              {item}
            </CyDText>
          </CyDView>
        </CyDView>
        {index < data.length - 1 && (
          <CyDView
            className={clsx('ml-[12px]  min-h-[22px] border-l-[2px]', {
              'border-[#F3F3F3]': index >= fillIndex,
              'border-[#808080]': index < fillIndex
            })}
          >
            {kycData?.kycStatus === KYCStatus.IN_REVIEW && index === 2 && fillIndex === 2 && <CyDView className={'ml-[30px]'}>
              {kycData?.idvUrl && kycData?.idvStatus !== KYCStatus.APPROVED && <CyDView>
                <CyDText>{t<string>('IDV_PROMPT')}</CyDText>
                <CyDTouchView onPress={async () => await Linking.openURL(kycData.idvUrl)}
                  className={'bg-appColor py-[10px] flex flex-row justify-center items-center rounded-[12px] w-[90%] my-[10px]'}>
                  <CyDText className={'text-center font-bold'}>{t<string>('COMPLETE_IDV')}</CyDText>
                </CyDTouchView>
              </CyDView>
              }
              {kycData?.hasOwnProperty('reviewCode') && availableReviewCodes.includes(kycData?.reviewCode) && <CyDView>
                <CyDText className={'text-red-600'}>{t('PROMPT_FOR_VALID_CREDS_FOR_CARD')}</CyDText>
              </CyDView>}
              <CyDView>
                <CyDTouchView className={'mt-[10px] mb-[15px]'} onPress={() => navigation.navigate(screenTitle.UPDATE_CARD_APPLICATION_SCREEN)}>
                  <CyDText className={'text-blue-700 font-bold underline underline-offset-2'}>{t<string>('CLICK_TO_EDIT_YOUR_APPLICATION')}</CyDText>
                </CyDTouchView>
              </CyDView>
            </CyDView>
            }
            {index === fillIndex && <CyDView className={'ml-[30px] mb-[10px]'}>
              <CyDTouchView className={'mb-[15px]'} onPress={() => { void Intercom.displayMessenger(); sendFirebaseEvent(hdWalletContext, 'support'); }}>
                <CyDText className={'text-blue-700 font-bold underline underline-offset-2'}>{t<string>('CONTACT_US_FOR_ASSISTANCE')}</CyDText>
              </CyDTouchView>
            </CyDView>
            }
          </CyDView>
        )}
      </CyDView>
    );
  };

  return (
    loading
      ? <Loading />
      : <CyDView className={'h-full bg-white'}>
      <CyDImageBackground className={'h-[55%]'} source={AppImages.CARD_KYC_BACKGROUND} resizeMode={'cover'}></CyDImageBackground>
      <CyDView className={clsx('absolute', { 'mt-[90px]': isIOS(), 'mt-[40px]': isAndroid() })}>
        <CyDView className={clsx('px-[30px]', { 'mt-[25px]': isAndroid(), 'mt-[-25px]': isIOS() })}>
          <CyDText className={clsx('text-[24px] font-extrabold')}>{t<string>('CARD_KYC_HEADING')}</CyDText>
        </CyDView>
        <CyDView className={'px-[30px] mt-[200px]'}>
          <CyDView>
            <CyDFlatList
              data={data}
              renderItem={KYCTimeline}
              nestedScrollEnabled={true}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => await getKYC()} />}
              showsVerticalScrollIndicator={true}
            />
          </CyDView>
          {(error && fillIndex === data.length - 1) && <CyDView className={'ml-[44px] mt-[10px]'}>
              <CyDTouchView className={'mb-[15px]'} onPress={() => { void Intercom.displayMessenger(); sendFirebaseEvent(hdWalletContext, 'support'); }}>
                <CyDText className={'text-blue-700 font-bold underline underline-offset-2'}>{t<string>('CONTACT_US_FOR_ASSISTANCE')}</CyDText>
              </CyDTouchView>
            </CyDView>}
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  tintBlack: {
    tintColor: 'black'
  },
  tintWhite: {
    tintColor: 'white'
  }
});
