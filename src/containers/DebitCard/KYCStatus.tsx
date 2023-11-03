/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { StyleSheet, Linking, RefreshControl } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDImageBackground,
  CyDFlatList,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';
import * as Sentry from '@sentry/react-native';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext } from '../../core/globalContext';
import axios from 'axios';
import Loading from '../../components/v2/loading';
import {
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
  KYCStatus,
} from '../../constants/enum';
import { getWalletProfile } from '../../core/card';
import { screenTitle } from '../../constants';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import { HdWalletContext } from '../../core/util';
import { hostWorker } from '../../global';
import useAxios from '../../core/HttpRequest';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { get } from 'lodash';
interface timeLineItem {
  item: string;
  index: number;
}

const indexStatusMapping: Record<string, number> = {
  created: 0,
  'verification-complete': 1,
  'kyc-initiated': 1,
  'kyc-expired': 1,
  'kyc-pending': 2,
  'kyc-failed': 3,
  submitted: 3,
  'kyc-successful': 4,
  'completion-pending': 4,
  declined: 4,
  completed: 5,
};

export default function CardKYCStatusScreen({ navigation }) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [fillIndex, setFillIndex] = useState<number>(1);
  const [error, setError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const provider = 'pc';
  const data = [
    t('APPLICATION_SUBMITTED'),
    t('KYC_INITITATED'),
    t('APPLICATION_UNDER_REVIEW'),
    t('KYC_COMPLETED'),
    t('CARD_ISSUED'),
  ];
  const [applicationStatus, setApplicationStatus] = useState();
  let latestKycStatus: any;
  let latestCardProfileStatus: any;
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    if (isFocused) {
      latestKycStatus = setInterval(() => {
        void checkKYC();
      }, 5000);
    }
    return () => {
      clearInterval(latestKycStatus);
      clearInterval(latestCardProfileStatus);
    };
  }, [isFocused]);

  useEffect(() => {
    setError(false);
    void checkKYC();
  }, []);

  const fillIndexAccordingToKYCStatus = async (kycStatus: string) => {
    setFillIndex(indexStatusMapping[kycStatus]);
    if (kycStatus === 'kyc-successful') {
      await getProfile();
    } else if (kycStatus === 'declined') {
      setError(error);
    }
  };

  const getProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const applicationStatus = get(
        response,
        ['data', provider!, 'applicationStatus'],
        '',
      );
      console.log(applicationStatus);
      if (applicationStatus === CardApplicationStatus.COMPLETION_PENDING) {
        setFillIndex(4);
        setError(true);
        if (latestCardProfileStatus) {
          clearInterval(latestCardProfileStatus);
        }
      }
      if (applicationStatus === CardApplicationStatus.COMPLETED) {
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: response.data,
        });
        if (latestCardProfileStatus) {
          clearInterval(latestCardProfileStatus);
        }
      }
    }
  };

  const checkKYC = async () => {
    try {
      const response = await getWithAuth('/v1/authentication/profile');
      if (!response.isError) {
        const applicationStatus = get(
          response,
          ['data', provider!, 'applicationStatus'],
          '',
        );
        console.log(applicationStatus);
        setApplicationStatus(applicationStatus);
        await fillIndexAccordingToKYCStatus(applicationStatus);
        if (applicationStatus === KYCStatus.APPROVED) {
          clearInterval(latestKycStatus);
        }
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const getKyc = async () => {
    const { isError, data, error } = await getWithAuth(
      `/v1/cards/${CardProviders.PAYCADDY}/application/kyc`,
    );
    if (isError) {
      if (error?.hasOwnProperty('message')) {
        showModal('state', {
          type: 'error',
          title: t('INSUFFICIENT_FUNDS'),
          description: error.message,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      await Linking.openURL(data.url);
    }
  };

  // const timeLine = () => {
  //   return kycStatus.map(
  //     (item, index) =>
  //       ((index === 3 &&
  //         applicationStatus !== CardApplicationStatus.DECLINED) ||
  //         index !== 3) && (
  //         <div className={'flex flex-row'} key={index}>
  //           <div className={'w-2/12 flex flex-col items-center'}>
  //             <div
  //               className={clsx(
  //                 'flex justify-center items-center rounded-full flex-shrink-0 w-[28px] h-[28px] border border-timeline drop-shadow-xl',
  //                 {
  //                   'bg-success': index < fillIndex,
  //                   'bg-appBg': index === fillIndex,
  //                   'bg-error': error && index === fillIndex,
  //                 },
  //               )}>
  //               {index < fillIndex && (
  //                 <img src={'https://public.cypherd.io/icons/blackTick.svg'} />
  //               )}
  //               {index === fillIndex && error && (
  //                 <img src={'https://public.cypherd.io/icons/errorCross.svg'} />
  //               )}
  //               {index === fillIndex && !error && (
  //                 <div>
  //                   <Lottie
  //                     animationData={loadingAnimationData}
  //                     autoplay
  //                     loop
  //                     width={50}
  //                   />
  //                 </div>
  //               )}
  //             </div>
  //             {index !== kycStatus.length - 1 && (
  //               <div className={'w-[1px] bg-timeline h-full'}></div>
  //             )}
  //           </div>

  //           <div className={'w-10/12'} style={{ minHeight: '6rem' }}>
  //             <div>
  //               <div
  //                 className={
  //                   'mb-0 font-bold text-[24px] font-nunito text-primaryText -mt-1'
  //                 }>
  //                 <p className={''}>{item.title}</p>
  //                 <p className={'text-[16px]'}>{item.subtitle}</p>
  //                 {item.showKyc && <KYC />}
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       ),
  //   );
  // };

  const KYCTimeline = useCallback(
    ({ item, index }: timeLineItem) => {
      return (
        <CyDView className={'flex flex-col'}>
          <CyDView className={'flex flex-row '}>
            <CyDView
              className={clsx(
                'w-[28px] h-[28px]  rounded-full flex flex-row items-center justify-center',
                {
                  'border-[1px]': index > fillIndex,
                  'bg-[#FFDE59]': index <= fillIndex,
                  'bg-red-500': error && index === fillIndex,
                },
              )}>
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
              <CyDText
                className={clsx('font-bold font-nunito text-[16px] ml-[16px]', {
                  'text-redColor': error && index === fillIndex,
                })}>
                {item}
              </CyDText>
            </CyDView>
          </CyDView>
          {index < data.length - 1 && (
            <CyDView
              className={clsx('ml-[12px]  min-h-[22px] border-l-[2px]', {
                'border-[#F3F3F3]': index >= fillIndex,
                'border-[#808080]': index < fillIndex,
              })}>
              {applicationStatus === KYCStatus.IN_REVIEW &&
                index === 2 &&
                fillIndex === 2 && <CyDView>To Do</CyDView>}
              {/* {kycData?.kycStatus === KYCStatus.IN_REVIEW &&
                index === 2 &&
                fillIndex === 2 && (
                  <CyDView className={'ml-[30px]'}>
                    {kycData?.idvUrl &&
                      kycData?.idvStatus !== KYCStatus.APPROVED && (
                        <CyDView>
                          <CyDText>{t<string>('IDV_PROMPT')}</CyDText>
                          <CyDTouchView
                            onPress={async () =>
                              await Linking.openURL(kycData.idvUrl)
                            }
                            className={
                              'bg-appColor py-[10px] flex flex-row justify-center items-center rounded-[12px] w-[90%] my-[10px]'
                            }>
                            <CyDText className={'text-center font-bold'}>
                              {t<string>('COMPLETE_IDV')}
                            </CyDText>
                          </CyDTouchView>
                        </CyDView>
                      )}
                    <CyDView>
                      <CyDTouchView
                        className={'mt-[10px] mb-[15px]'}
                        onPress={() =>
                          navigation.navigate(
                            screenTitle.UPDATE_CARD_APPLICATION_SCREEN,
                          )
                        }>
                        <CyDText
                          className={
                            'text-blue-700 font-bold underline underline-offset-2'
                          }>
                          {t<string>('CLICK_TO_EDIT_YOUR_APPLICATION')}
                        </CyDText>
                      </CyDTouchView>
                    </CyDView>
                  </CyDView>
                )} */}
              {index === fillIndex && (
                <CyDView className={'ml-[30px] mb-[10px]'}>
                  <CyDTouchView
                    className={'mb-[15px]'}
                    onPress={() => {
                      void Intercom.displayMessenger();
                      sendFirebaseEvent(hdWalletContext, 'support');
                    }}>
                    <CyDText
                      className={
                        'text-blue-700 font-bold underline underline-offset-2'
                      }>
                      {t<string>('CONTACT_US_FOR_ASSISTANCE')}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )}
            </CyDView>
          )}
        </CyDView>
      );
    },
    [applicationStatus],
  );

  return loading ? (
    <Loading />
  ) : (
    <CyDView className={'h-full bg-white'}>
      <CyDImageBackground
        className={'h-[55%]'}
        source={AppImages.CARD_KYC_BACKGROUND}
        resizeMode={'cover'}
      />
      <CyDView
        className={clsx('absolute', {
          'mt-[90px]': isIOS(),
          'mt-[40px]': isAndroid(),
        })}>
        <CyDView
          className={clsx('px-[30px]', {
            'mt-[25px]': isAndroid(),
            'mt-[-25px]': isIOS(),
          })}>
          <CyDText className={clsx('text-[24px] font-extrabold')}>
            {t<string>('CARD_KYC_HEADING')}
          </CyDText>
        </CyDView>
        <CyDView className={'px-[30px] mt-[200px]'}>
          <CyDView>
            <CyDFlatList
              data={data}
              renderItem={KYCTimeline}
              nestedScrollEnabled={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => await checkKYC()}
                />
              }
              showsVerticalScrollIndicator={true}
            />
          </CyDView>
          {error && fillIndex === data.length - 1 && (
            <CyDView className={'ml-[44px] mt-[10px]'}>
              <CyDTouchView
                className={'mb-[15px]'}
                onPress={() => {
                  void Intercom.displayMessenger();
                  sendFirebaseEvent(hdWalletContext, 'support');
                }}>
                <CyDText
                  className={
                    'text-blue-700 font-bold underline underline-offset-2'
                  }>
                  {t<string>('CONTACT_US_FOR_ASSISTANCE')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  tintBlack: {
    tintColor: 'black',
  },
  tintWhite: {
    tintColor: 'white',
  },
});
