import React, { useCallback, useContext, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import {
  ButtonType,
  CardDesignType,
  CardProviders,
  CypherPlanId,
  PhysicalCardType,
} from '../../../constants/enum';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import useAxios from '../../../core/HttpRequest';
import { capitalize, get } from 'lodash';
import { CardProfile } from '../../../models/cardProfile.model';
import CyDSkeleton from '../../../components/v2/skeleton';
import { getCountryNameFromISO2 } from '../../../core/locale';
import OtpVerificationModal from '../../../components/v2/card/otpVerification';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../../../constants';
import { isAndroid, isIOS } from '../../../misc/checkers';
import clsx from 'clsx';
import { getCountryNameById } from '../../../core/util';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  preferredName: string;
  physicalCardType?: PhysicalCardType;
}
export default function ShippingCheckout() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const {
    userData,
    shippingAddress,
    currentCardProvider,
    preferredName,
    physicalCardType,
  } = route.params;
  const { globalState, globalDispatch } = useContext<any>(
    GlobalContext,
  ) as GlobalContextDef;
  const { t } = useTranslation();
  const { getWithAuth, postWithAuth } = useAxios();
  const [balance, setBalance] = useState<number>(0);
  const [profile, setProfile] = useState<CardProfile>();
  const [isOTPModalVisible, setIsOTPModalVisible] = useState<boolean>(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [preferredDesignId, setPreferredDesignId] = useState<string>('');
  const [cardDesignDetails, setCardDesignDetails] = useState<any>();
  const [cardFee, setCardFee] = useState<number>(0);
  const planData = globalState.planInfo;

  useEffect(() => {
    void fetchProfileAndBalance();
    void fetchCardDesignDetails();
  }, []);

  const fetchCardDesignDetails = async () => {
    try {
      const response = await getWithAuth('/v1/cards/designs');
      if (!response.isError) {
        const cardType =
          physicalCardType === PhysicalCardType.METAL
            ? CardDesignType.METAL
            : CardDesignType.PHYSICAL;

        // Set card design ID and details
        setPreferredDesignId(get(response.data, [cardType, 0, 'id'], ''));
        setCardDesignDetails(get(response.data, cardType, {}));

        // Set card fee
        const defaultFeeKey =
          physicalCardType === PhysicalCardType.METAL
            ? 'metalCardFee'
            : 'physicalCardFee';

        setCardFee(
          get(
            response.data,
            ['feeDetails', cardType],
            get(planData, ['default', CypherPlanId.PRO_PLAN, defaultFeeKey], 0),
          ),
        );
      }
    } catch (error) {
      Sentry.captureException(error);
      // Set default values in case of error
      setPreferredDesignId('');
      setCardDesignDetails({});
      setCardFee(0);
    }
  };

  const fetchProfileAndBalance = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = response.data;
      setProfile(tempProfile);
      const cardId = get(
        tempProfile,
        [currentCardProvider, 'cards', 0, 'cardId'],
        '',
      );
      if (currentCardProvider && cardId) {
        const balanceData = await getWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/balance`,
        );
        if (!balanceData.isError) {
          const tempBalance = get(balanceData, ['data', 'balance']);
          setBalance(tempBalance);
        }
      }
    }
  };

  const onConfirm = async (otp: string) => {
    setIsVerifyingOTP(true);
    const { line2, ...restShippingAddress } = shippingAddress;
    const payload = {
      ...restShippingAddress,
      ...(line2 ? { line2 } : {}),
      preferredCardName: preferredName,
      otp: Number(otp),
      ...(preferredDesignId ? { preferredDesignId } : {}),
    };
    setIsOTPModalVisible(false);
    const response = await postWithAuth(
      `/v1/cards/${currentCardProvider}/generate/physical`,
      payload,
    );
    setIsVerifyingOTP(false);
    if (!response.isError) {
      navigation.navigate(screenTitle.SHIPPING_CONFIRMATION_SCREEN, {
        userData,
        shippingAddress,
        currentCardProvider,
        preferredName,
        ...(physicalCardType && { physicalCardType }),
      });
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description:
          response.error.errors?.[0].message ??
          response?.error?.message ??
          'Error while placing your order. Contact cypher support',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(response.error);
    }
  };

  const RenderShippingAddress = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-subTextColor'>{t('DELIVERING_TO')}</CyDText>
        <CyDView className='flex flex-col gap-y-[16px] bg-white rounded-[12px] px-[16px] pb-[16px] mt-[4px]'>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDView className='flex flex-row items-center gap-x-[12px]'>
              <CyDImage
                source={AppImages.WALLET}
                className='w-[24px] h-[24px]'
                resizeMode='contain'
              />
              <CyDText className='text-[16px] font-bold'>
                {t('SHIPPING_ADDRESS')}
              </CyDText>
            </CyDView>
            <CyDView>
              <CyDText className='text-[14px] font-medium'>3 Weeks</CyDText>
            </CyDView>
          </CyDView>
          <CyDView>
            <CyDText className='text-[16px] font-medium'>
              {`${capitalize(userData?.firstName)} ${capitalize(userData?.lastName)}`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {shippingAddress?.line1}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {`${shippingAddress?.line2 ? `${shippingAddress.line2}, ` : ''}${shippingAddress?.city}`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {`${shippingAddress?.state}, ${String(getCountryNameById(shippingAddress?.country ?? ''))} ${
                shippingAddress?.postalCode
              }`}
            </CyDText>
            <CyDText className='text-[14px] my-[2px]'>
              {shippingAddress?.phoneNumber}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [userData, shippingAddress]);

  const RenderShippingCharges = useCallback(() => {
    return (
      <CyDView className='flex flex-col bg-white rounded-[12px]'>
        <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-inputBorderColor'>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDImage
              source={AppImages.MANAGE_CARD}
              className='w-[24px] h-[24px]'
              resizeMode='contain'
            />
            <CyDText>
              {physicalCardType === PhysicalCardType.METAL
                ? t('METAL_CARD')
                : t('PHYSICAL_CARD')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDText className='font-bold text-successTextGreen'>
              {'🎉' + t('FREE')}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-inputBorderColor'>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDImage
              source={AppImages.ENVELOPE}
              className='w-[24px] h-[24px]'
              resizeMode='contain'
            />
            <CyDText>{t('SHIPPING_CHARGES')}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
              {cardFee === 0 ? (
                <CyDView className='flex flex-row items-center gap-x-[4px]'>
                  <CyDText className='line-through font-bold'>{'$50'}</CyDText>
                  <CyDText className='font-bold text-successTextGreen'>
                    {'🎉' + t('FREE')}
                  </CyDText>
                </CyDView>
              ) : (
                <CyDText>${cardFee}</CyDText>
              )}
            </CyDSkeleton>
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center px-[16px] py-[14px]'>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDText className='font-bold'>{t('TOTAL_AMOUNT')}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
              <CyDText className='font-bold'>${cardFee}</CyDText>
            </CyDSkeleton>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [profile, currentCardProvider, balance]);

  const RenderNameOnCard = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-subTextColor'>{t('NAME_ON_CARD')}</CyDText>
        <CyDView className='flex flex-row justify-between bg-white rounded-[12px] p-[16px] mt-[4px]'>
          <CyDText className='text-[16px]'>{preferredName}</CyDText>
        </CyDView>
      </CyDView>
    );
  }, [preferredName]);

  const RenderPaymentMethod = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-subTextColor'>{t('PAYING_FROM')}</CyDText>
        <CyDView className='bg-white rounded-[12px] p-[4px] mt-[4px]'>
          <CyDView className='flex flex-row justify-between items-center px-[16px] py-[4px]'>
            <CyDView className='flex flex-row gap-x-[12px] items-center'>
              <CyDView className='p-[6px] bg-n20 rounded-[12px]'>
                <CyDImage
                  source={AppImages.APP_LOGO}
                  className='w-[44px] h-[44px]'
                  resizeMode='contain'
                />
              </CyDView>
              <CyDView>
                <CyDText>{t('CYPHER_CARD_BALANCE')}</CyDText>
                <CyDText className='text-subTextColor'>
                  {t('CYPHER_CARD_BALANCE_SUB')}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='text-[16px] font-bold'>{`$${balance}`}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [balance]);

  return (
    <CyDSafeAreaView className='bg-n20 h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <OtpVerificationModal
        isModalVisible={isOTPModalVisible}
        setIsModalVisible={setIsOTPModalVisible}
        triggerOTPUrl={`/v1/cards/${currentCardProvider}/generate/physical/otp`}
        isVerifyingOTP={isVerifyingOTP}
        verifyOTP={(otp: string) => {
          void onConfirm(otp);
        }}
      />
      <CyDView className='flex flex-1 flex-col justify-between h-full bg-transparent'>
        <CyDView className='mx-[16px] flex-1 pb-[92px]'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[36px] h-[36px]'
              />
            </CyDTouchView>
          </CyDView>
          <CyDScrollView
            className={clsx('flex-1', { 'mb-[22px]': isAndroid() })}
            showsVerticalScrollIndicator={false}>
            <CyDView className='my-[16px]'>
              <CyDText className='text-[26px] font-bold'>
                {physicalCardType === PhysicalCardType.METAL
                  ? t('METAL_CARD_CONFIRMATION')
                  : t('PHYSICAL_CARD_CONFIRMATION')}
              </CyDText>
              <CyDText className='text-[14px] mt-[8px]'>
                {t('PHYSICAL_CARD_CONFIRMATION_SUB')}
              </CyDText>
            </CyDView>
            <RenderShippingCharges />
            <CyDView className='mt-[24px]'>
              <RenderNameOnCard />
            </CyDView>
            <CyDView className='mt-[24px]'>
              <RenderShippingAddress />
            </CyDView>
            <CyDView className='mt-[24px] mb-[32px]'>
              <RenderPaymentMethod />
            </CyDView>
          </CyDScrollView>
        </CyDView>

        <CyDView
          className={clsx(
            'absolute w-full bottom-[0px] bg-white py-[32px] px-[16px]',
            {
              'bottom-[-32px]': isIOS(),
            },
          )}>
          <Button
            onPress={() => {
              setIsOTPModalVisible(true);
            }}
            loading={isVerifyingOTP}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
