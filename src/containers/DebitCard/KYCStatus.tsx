/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-misused-promises */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Linking } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDTouchView,
  CyDScrollView,
  CyDSafeAreaView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import * as Sentry from '@sentry/react-native';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext } from '../../core/globalContext';
import Loading from '../../components/v2/loading';
import {
  ButtonType,
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
} from '../../constants/enum';
import { screenTitle } from '../../constants';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import { HdWalletContext } from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { get } from 'lodash';
import Button from '../../components/v2/button';
import LottieView from 'lottie-react-native';
import { CardProfile } from '../../models/cardProfile.model';
import SwitchView from '../../components/v2/switchView';
import CardProviderSwitch from '../../components/cardProviderSwitch';
import useCardUtilities from '../../hooks/useCardUtilities';

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
  const { cardProfileModal } = useCardUtilities();
  // const provider = 'pc';
  const data = [
    t('APPLICATION_SUBMITTED'),
    t('KYC_INITITATED'),
    t('APPLICATION_UNDER_REVIEW'),
    error ? t('KYC_FAILED') : t('KYC_COMPLETED'),
    t('CARD_ISSUED'),
  ];
  const [applicationStatus, setApplicationStatus] = useState();
  const [kyc, setKYC] = useState({
    isRetryable: false,
    message: '',
  });
  const latestKycStatus = useRef<NodeJS.Timeout>();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;
  useEffect(() => {
    if (isFocused) {
      latestKycStatus.current = setInterval(() => {
        void checkKYC();
      }, 5000);
    }
    return () => {
      clearInterval(latestKycStatus.current);
    };
  }, [isFocused]);

  useEffect(() => {
    setError(false);
    void checkKYC();
  }, []);

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = cardProfileModal(response.data);
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: tempProfile,
      });
      setTimeout(() => {
        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      }, 500);
    }
  };

  const fillIndexAccordingToKYCStatus = async (applicationStatus: string) => {
    setFillIndex(indexStatusMapping[applicationStatus]);
    switch (applicationStatus) {
      case CardApplicationStatus.KYC_INITIATED:
      case CardApplicationStatus.KYC_PENDING:
      case CardApplicationStatus.KYC_SUCCESSFUL:
      case CardApplicationStatus.SUBMITTED:
      case CardApplicationStatus.COMPLETION_PENDING:
        setError(false);
        setFillIndex(indexStatusMapping[applicationStatus]);
        break;
      case CardApplicationStatus.KYC_FAILED:
        setError(true);
        setFillIndex(indexStatusMapping[applicationStatus]);
        break;
      case CardApplicationStatus.DECLINED:
        setError(true);
        clearInterval(latestKycStatus.current);
        setFillIndex(indexStatusMapping[applicationStatus]);
        break;
      case CardApplicationStatus.VERIFICATION_COMPLETE:
      case CardApplicationStatus.KYC_EXPIRED:
        setError(false);
        setFillIndex(indexStatusMapping[applicationStatus]);
        break;
      case CardApplicationStatus.COMPLETED:
        setError(false);
        clearInterval(latestKycStatus.current);
        setFillIndex(indexStatusMapping[applicationStatus]);
        void refreshProfile();
        break;
      default:
        break;
    }
  };

  const checkKYC = async () => {
    try {
      const response = await getWithAuth('/v1/authentication/profile');
      if (!response.isError) {
        const tempProfile = cardProfileModal(response.data);
        const tempProvider = get(tempProfile, 'provider', 'rc');
        const tempApplicationStatus = get(
          tempProfile,
          [tempProvider, 'applicationStatus'],
          '',
        );
        const { kyc } = get(tempProfile, tempProvider);
        if (kyc) {
          setKYC(kyc);
        }
        if (tempApplicationStatus !== applicationStatus) {
          globalContext.globalDispatch({
            type: GlobalContextType.CARD_PROFILE,
            cardProfile: tempProfile,
          });
        }
        const cardApplicationStatus =
          get(tempProfile, tempProvider)?.applicationStatus ===
          CardApplicationStatus.COMPLETED;
        if (cardApplicationStatus) {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: screenTitle.BRIDGE_CARD_SCREEN,
                params: {
                  cardProvider: tempProvider,
                },
              },
            ],
          });
        }
        setApplicationStatus(tempApplicationStatus);
        await fillIndexAccordingToKYCStatus(tempApplicationStatus);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const getKyc = async () => {
    const { isError, data, error } = await getWithAuth(
      `/v1/cards/${provider}/application/kyc`,
    );
    if (isError) {
      if (error?.hasOwnProperty('message')) {
        showModal('state', {
          type: 'error',
          title: '',
          description: error.message,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      await Linking.openURL(data.url);
    }
  };

  const ShowKYCStatus = useCallback(
    ({ index }: { index: number }) => {
      if (
        (applicationStatus === CardApplicationStatus.KYC_INITIATED ||
          applicationStatus === CardApplicationStatus.VERIFICATION_COMPLETE ||
          applicationStatus === CardApplicationStatus.KYC_EXPIRED) &&
        index === 1 &&
        fillIndex === 1
      ) {
        return (
          <CyDView className={'ml-[30px]'}>
            <CyDView className='w-[70%]'>
              <Button
                title={t('INITIATE_KYC_ALL_CAPS')}
                style='py-[12px]'
                type={ButtonType.PRIMARY}
                onPress={() => {
                  void getKyc();
                }}
              />
            </CyDView>
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
        );
      } else if (
        (index === 3 &&
          fillIndex === 3 &&
          applicationStatus === CardApplicationStatus.KYC_FAILED) ||
        (index === 2 && fillIndex === 2)
      ) {
        if (kyc?.isRetryable) {
          return (
            <CyDView className={'ml-[30px]'}>
              <CyDView className='w-[70%]'>
                <Button
                  title={t('REINITIATE_KYC')}
                  style='py-[12px]'
                  type={ButtonType.PRIMARY}
                  onPress={() => {
                    void getKyc();
                  }}
                />
              </CyDView>
              <CyDView>
                <CyDText className='my-[8px]'>{kyc?.message}</CyDText>
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
          );
        }
        return (
          <CyDView className={'ml-[30px]'}>
            <CyDText className='my-[8px]'>{kyc?.message}</CyDText>
          </CyDView>
        );
      }
      return <></>;
    },
    [applicationStatus, error, fillIndex, kyc],
  );

  const KYCTimeline = useCallback(() => {
    return (
      <CyDView className={'flex flex-col'}>
        {data.map((item, index) => {
          return (
            <CyDView key={index}>
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
                    // <CyDImage
                    //   className={'w-[14px] h-[10px]'}
                    //   source={AppImages.CORRECT}
                    //   style={styles.tintBlack}
                    // />
                    <LottieView
                      source={AppImages.LOADER_TRANSPARENT}
                      autoPlay
                      loop
                      style={styles.loader}
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
                    className={clsx(
                      'font-bold font-nunito text-[16px] ml-[16px]',
                      {
                        'text-redColor': error && index === fillIndex,
                      },
                    )}>
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
                  <ShowKYCStatus index={index} />
                </CyDView>
              )}
            </CyDView>
          );
        })}
      </CyDView>
    );
  }, [applicationStatus, fillIndex, error]);

  return loading ? (
    <Loading />
  ) : (
    <CyDSafeAreaView className={'h-full bg-white'}>
      <CyDView className='h-[90%]'>
        <CardProviderSwitch />
        <CyDText className='font-extrabold font-nunito text-[20px] mt-[10px] mb-[10px] text-center'>
          {'Application Status'}
        </CyDText>
        <CyDScrollView>
          <CyDImage
            source={AppImages.CARD_KYC_BACKGROUND}
            className='h-[260px] w-full'
            resizeMode='stretch'
          />
          <CyDView className='h-[50%] px-[30px]'>
            <KYCTimeline />
          </CyDView>
        </CyDScrollView>
        <CyDTouchView
          onPress={async () => {
            void Intercom.present();
            sendFirebaseEvent(hdWalletContext, 'support');
          }}
          className={
            'w-[95%] self-center flex flex-row justify-center py-[7px] my-[5px] border-[2px] rounded-[7px] border-sepratorColor'
          }>
          <CyDText className='font-extrabold'>{t<string>('NEED_HELP')}</CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  tintBlack: {
    tintColor: 'black',
  },
  tintWhite: {
    tintColor: 'white',
  },
  loader: {
    height: 32,
  },
});
