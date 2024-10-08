import React, { useCallback, useContext, useState } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../../../../constants';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import AppImages from '../../../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import useAxios from '../../../../core/HttpRequest';
import {
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
} from '../../../../constants/enum';
import useCardUtilities from '../../../../hooks/useCardUtilities';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { CardProfile } from '../../../../models/cardProfile.model';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import { Linking, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import Loading from '../../../../components/v2/loading';
import CardProviderSwitch from '../../../../components/cardProviderSwitch';

export default function KYCVerficicationV2() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth } = useAxios();
  const { cardProfileModal } = useCardUtilities();
  const { showModal, hideModal } = useGlobalModalContext();
  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;
  const cardProfile: CardProfile = globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  const [kycStatus, setKycStatus] = useState<CardApplicationStatus>(
    CardApplicationStatus.CREATED,
  );
  const [loading, setLoading] = useState({
    firsLoad: false,
    kycUrl: false,
    refresh: false,
  });
  const [kyc, setKYC] = useState({
    isRetryable: false,
    message: '',
  });

  useFocusEffect(
    useCallback(() => {
      setLoading({ ...loading, firsLoad: true });
      void checkKYCStatus();
      setLoading({ ...loading, firsLoad: false });

      const interval = setInterval(() => {
        void checkKYCStatus();
      }, 3000);
      return () => clearInterval(interval);
    }, []),
  );

  const checkKYCStatus = async () => {
    try {
      const response = await getWithAuth('/v1/authentication/profile');
      if (!response.isError) {
        const tempProfile = await cardProfileModal(response.data);
        const tempProvider = get(tempProfile, 'provider');
        if (!tempProvider) {
          throw new Error('Provider not found');
        }
        const applicationStatus = get(
          tempProfile,
          [tempProvider, 'applicationStatus'],
          '',
        );
        setKycStatus(applicationStatus);
        const _kyc = get(tempProfile, [tempProvider, 'kyc']);
        if (_kyc) {
          setKYC(_kyc);
        }
      } else {
        showModal('state', {
          type: 'error',
          title: t('KYC data not found'),
          description: response.error ?? t('UNEXPECTED_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('KYC data not found'),
        description: error instanceof Error ? error.message : 'Unknown error',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const getKyc = async () => {
    setLoading({ ...loading, kycUrl: true });
    const { isError, data, error } = await getWithAuth(
      `/v1/cards/${provider}/application/kyc`,
    );

    if (isError) {
      showModal('state', {
        type: 'error',
        title: '',
        description: 'message' in error ? error.message : t('UNEXPECTED_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      await Linking.openURL(data.url);
    }
    setLoading({ ...loading, kycUrl: false });
  };

  const renderKYCStatus = () => {
    switch (kycStatus) {
      case CardApplicationStatus.KYC_INITIATED:
        return (
          <CyDText className='text-base400 text-[20px] font-bold'>
            {t('KYC_INITIATED')}
          </CyDText>
        );
      case CardApplicationStatus.KYC_PENDING:
        return (
          <CyDText className='text-base400 text-[20px] font-bold'>
            {t('KYC_PENDING')}
          </CyDText>
        );
      case CardApplicationStatus.KYC_SUCCESSFUL:
        return (
          <CyDText className='text-emerald-700 text-[20px] font-bold'>
            {t('KYC_COMPLETED')}
          </CyDText>
        );
      case CardApplicationStatus.KYC_FAILED:
        return (
          <CyDText className='text-red-500 text-[20px] font-bold text-center'>
            {t('KYC_FAILED')}
          </CyDText>
        );
      case CardApplicationStatus.COMPLETION_PENDING:
        return (
          <CyDText className='text-red-500 text-[20px] font-bold'>
            {t('COMPLETION_PENDING')}
          </CyDText>
        );
      case CardApplicationStatus.COMPLETED:
        return (
          <CyDText className='text-emerald-700 text-[20px] font-bold'>
            {t('KYC_SUCCESSFUL')}
          </CyDText>
        );
      default:
        return <CyDText>{t('KYC_STATUS_UNKNOWN')}</CyDText>;
    }
  };

  const renderKYCStatusDescription = () => {
    switch (kycStatus) {
      case CardApplicationStatus.KYC_INITIATED:
        return (
          <CyDView>
            <CyDText className='text-[14px] font-regular text-base400 text-center mx-[26px]'>
              {t('KYC_INITIATED_DESCRIPTION')}
            </CyDText>
            <Button
              title={t('INITIATE_KYC_ALL_CAPS')}
              onPress={() => {
                void getKyc();
              }}
              style='mt-[16px]'
              loading={loading.kycUrl}
              loaderStyle={styles.loader}
            />
          </CyDView>
        );
      case CardApplicationStatus.KYC_PENDING:
        return (
          <CyDText className='text-[14px] font-regular text-base400 text-center mx-[26px]'>
            {t('KYC_PENDING_DESCRIPTION')}
          </CyDText>
        );
      case CardApplicationStatus.KYC_SUCCESSFUL:
      case CardApplicationStatus.COMPLETED:
        return (
          <CyDText className='text-[14px] font-regular text-base400 text-center mx-[26px]'>
            {t('KYC_SUCCESSFUL_DESCRIPTION')}
          </CyDText>
        );
      case CardApplicationStatus.KYC_FAILED:
        return (
          <CyDView>
            <CyDText className='text-[14px] font-regular text-base400 text-center mx-[26px]'>
              {t('KYC_FAILED_DESCRIPTION')}
            </CyDText>
            <CyDText className='text-base400 text-[14px] font-regular mt-[12px] text-center'>
              {t('KYC_CONTACT_SUPPORT')}
            </CyDText>
          </CyDView>
        );
      case CardApplicationStatus.COMPLETION_PENDING:
        return (
          <CyDText className='text-[14px] font-regular text-base400 text-center mx-[26px]'>
            {t('COMPLETION_PENDING_DESCRIPTION')}
          </CyDText>
        );
    }
  };

  const renderKYCStatusImage = () => {
    switch (kycStatus) {
      case CardApplicationStatus.KYC_INITIATED:
      case CardApplicationStatus.KYC_PENDING:
        return AppImages.KYC_VERIFICATION_PENDING;
      case CardApplicationStatus.KYC_SUCCESSFUL:
        return AppImages.SUCCESS_TICK_GREEN_BG;
      case CardApplicationStatus.KYC_FAILED:
        return AppImages.KYC_VERIFICATION_FAILED;
      case CardApplicationStatus.COMPLETION_PENDING:
        return AppImages.KYC_VERIFICATION_DELAYED;
      case CardApplicationStatus.COMPLETED:
        return AppImages.SUCCESS_TICK_GREEN_BG;
      default:
        return AppImages.KYC_VERIFICATION_PENDING;
    }
  };

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = await cardProfileModal(response.data);
      globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: tempProfile,
      });
      setTimeout(() => {
        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      }, 500);
    }
  };

  if (loading.firsLoad) {
    return <Loading />;
  }

  return (
    <CyDView
      className='flex-1 flex flex-col justify-between bg-[#F1F0F5]'
      style={{ paddingTop: insets.top }}>
      <CyDView className='p-[16px]'>
        {/* remove the CardProviderSwitch after sunsetting PC */}
        <CyDView className='flex-row justify-between items-center'>
          <CyDTouchView
            className='w-[60px]'
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: screenTitle.PORTFOLIO }],
              })
            }>
            <CyDFastImage
              className={'w-[32px] h-[32px]'}
              resizeMode='cover'
              source={AppImages.BACK_ARROW_GRAY}
            />
          </CyDTouchView>
          <CardProviderSwitch />
          <CyDView className='bg-[#F1F0F5] w-[32px] h-[32px]' />
        </CyDView>

        <CyDScrollView>
          <CyDText className='text-[28px] font-bold mt-[12px] mb-[16px] font-manrope'>
            {t('IDENTITY_VERIFICATION')}
          </CyDText>

          <CyDView className='mt-[16px] rounded-[16px] bg-white px-[16px] py-[24px] flex flex-col items-center'>
            {renderKYCStatus()}
            <CyDImage
              source={renderKYCStatusImage()}
              className='mt-[24px] mb-[12px] flex self-center w-[102px] h-[102px]'
            />
            <CyDView className=' text-center'>
              {renderKYCStatusDescription()}
            </CyDView>
          </CyDView>
          {kycStatus === CardApplicationStatus.KYC_FAILED && kyc?.message && (
            <CyDView className='bg-white p-[12px] rounded-[16px] mt-[24px] '>
              <CyDText className=' text-black text-[18px] font-bold font-manrope '>
                {t('REASON')}
              </CyDText>
              {kycStatus === CardApplicationStatus.KYC_FAILED && (
                <CyDText className='text-[12px] font-medium text-n200 font-manrope '>
                  {kyc.message}
                </CyDText>
              )}
            </CyDView>
          )}
          {(kycStatus === CardApplicationStatus.KYC_INITIATED ||
            (kycStatus === CardApplicationStatus.KYC_FAILED &&
              kyc?.isRetryable)) && (
            <CyDTouchView
              className='bg-white p-[12px] rounded-[16px] mt-[24px] '
              onPress={() => {
                navigation.navigate(screenTitle.CARD_APPLICATION);
              }}>
              <CyDView className='flex-row items-center'>
                <CyDText className=' text-black text-[18px] font-bold font-manrope '>
                  {t('EDIT_APPLICATION')}
                </CyDText>
                <CyDImage
                  source={AppImages.EDIT}
                  className='ml-[4px] h-[24px] w-[24px]'
                />
              </CyDView>

              {kycStatus === CardApplicationStatus.KYC_INITIATED && (
                <CyDText className='text-[12px] font-medium text-n200 font-manrope '>
                  {t('EDIT_APPLICATION_DESCRIPTION')}
                </CyDText>
              )}
              {kycStatus === CardApplicationStatus.KYC_FAILED && (
                <CyDText className='text-[12px] font-medium text-n200 font-manrope '>
                  {t('EDIT_APPLICATION_DESCRIPTION_RETRY')}
                </CyDText>
              )}
            </CyDTouchView>
          )}
          {(kycStatus === CardApplicationStatus.KYC_PENDING ||
            kycStatus === CardApplicationStatus.COMPLETION_PENDING ||
            kycStatus === CardApplicationStatus.COMPLETED) && (
            <CyDView className='bg-white p-[12px] rounded-[16px] flex-row items-center justify-between mt-[24px] '>
              <CyDView>
                <CyDText className=' text-black text-[18px] font-bold font-manrope '>
                  {t('VERIFICATION_STATUS')}
                </CyDText>
                {kycStatus === CardApplicationStatus.KYC_PENDING && (
                  <CyDView className='flex-row items-center'>
                    <CyDView className='w-[12px] h-[12px] rounded-full bg-p200 mr-[4px]' />
                    <CyDText className='text-[14px] font-medium text-p200 font-manrope'>
                      {t('IN_PROGRESS')}
                    </CyDText>
                  </CyDView>
                )}
                {kycStatus === CardApplicationStatus.COMPLETION_PENDING && (
                  <CyDView className='flex-row items-center'>
                    <CyDView className='w-[12px] h-[12px] rounded-full bg-red-500 mr-[4px]' />
                    <CyDText className='text-[14px] font-medium text-red-500 font-manrope'>
                      {t('ACTION_REQUIRED')}
                    </CyDText>
                  </CyDView>
                )}
                {kycStatus === CardApplicationStatus.COMPLETED && (
                  <CyDView className='flex-row items-center'>
                    <CyDView className='w-[12px] h-[12px] rounded-full bg-emerald-700 mr-[4px]' />
                    <CyDText className='text-[14px] font-medium text-emerald-700 font-manrope'>
                      {t('SUCCESS_TITLE')}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
              {kycStatus !== CardApplicationStatus.COMPLETED && (
                <CyDTouchView
                  className='flex-row items-center p-[6px] rounded-[6px] bg-n30'
                  onPress={() => {
                    setLoading({ ...loading, refresh: true });
                    void checkKYCStatus();
                    setLoading({ ...loading, refresh: false });
                  }}>
                  {!loading.refresh && (
                    <CyDImage
                      source={AppImages.REFRESH_BROWSER}
                      className='w-[18px] h-[18px]'
                    />
                  )}
                  {loading.refresh && (
                    <LottieView
                      source={AppImages.LOADER_TRANSPARENT}
                      autoPlay
                      loop
                      style={styles.loader}
                    />
                  )}
                  <CyDText className='font-manrope text-black ml-[4px] text-bold font-black text-[12px]'>
                    {t('REFRESH')}
                  </CyDText>
                </CyDTouchView>
              )}
              {kycStatus === CardApplicationStatus.COMPLETED && (
                // <CyDImage source={AppImages.CELEBRATE} />
                <CyDText className='text-[40px]'>{'🎉'}</CyDText>
              )}
            </CyDView>
          )}
        </CyDScrollView>
      </CyDView>
      <CyDView className='px-[16px] pb-[48px] bg-white rounded-t-[16px]'>
        <CyDView className='pt-[14px]'>
          <Button
            title={t('CONTINUE')}
            onPress={() => {
              void refreshProfile();
            }}
            disabled={kycStatus !== CardApplicationStatus.COMPLETED}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    width: 22,
    height: 22,
  },
});
