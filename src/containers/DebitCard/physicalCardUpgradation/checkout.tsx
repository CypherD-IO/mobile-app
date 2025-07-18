import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../../styles/tailwindComponents';
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
import { ButtonType, CardProviders, CardType } from '../../../constants/enum';
import { IShippingAddress } from '../../../models/shippingAddress.interface';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import useAxios from '../../../core/HttpRequest';
import { capitalize, get } from 'lodash';
import { CardProfile } from '../../../models/cardProfile.model';
import CyDSkeleton from '../../../components/v2/skeleton';
import OtpVerificationModal from '../../../components/v2/card/otpVerification';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../../../constants';
import { isAndroid } from '../../../misc/checkers';
import clsx from 'clsx';
import { getCountryNameById, parseErrorMessage } from '../../../core/util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';

interface RouteParams {
  userData: IKycPersonDetail;
  shippingAddress: IShippingAddress;
  currentCardProvider: CardProviders;
  preferredName: string;
  cardType: CardType;
}

const RenderTitle = ({ cardType }: { cardType: CardType }) => {
  if (cardType === CardType.METAL) {
    return (
      <CyDText className='text-[28px] font-bold'>
        {t('METAL_CARD_CONFIRMATION')}
      </CyDText>
    );
  } else if (cardType === CardType.PHYSICAL) {
    return (
      <CyDText className='text-[28px] font-bold'>
        {t('PHYSICAL_CARD_CONFIRMATION')}
      </CyDText>
    );
  }
  return <CyDText className='text-[28px] font-bold'>{t('CHECKOUT')}</CyDText>;
};

export default function ShippingCheckout() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const {
    userData,
    shippingAddress,
    currentCardProvider,
    preferredName,
    cardType,
  } = route.params;
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

  useEffect(() => {
    void fetchProfileAndBalance();
    void fetchCardDesignDetails();
  }, []);

  const fetchCardDesignDetails = async () => {
    try {
      const response = await getWithAuth('/v1/cards/designs');
      if (!response.isError) {
        // Set card design ID and details
        setPreferredDesignId(get(response.data, [cardType, 0, 'id'], ''));
        setCardDesignDetails(get(response.data, cardType, {}));

        setCardFee(get(response.data, ['feeDetails', cardType], 0));
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
      ) as string;
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
    let payload, url;
    if (cardType === CardType.VIRTUAL) {
      payload = {
        preferredDesignId,
        otp: Number(otp),
      };
      url = `/v1/cards/${currentCardProvider}/generate/virtual`;
    } else {
      const { line2, taxId, ...restShippingAddress } = shippingAddress;
      payload = {
        ...restShippingAddress,
        ...(line2 ? { line2 } : {}),
        ...(taxId ? { taxId } : {}),
        preferredCardName: preferredName,
        otp: Number(otp),
        preferredDesignId,
      };
      url = `/v1/cards/${currentCardProvider}/generate/physical`;
    }
    setIsOTPModalVisible(false);
    const response = await postWithAuth(url, payload);
    setIsVerifyingOTP(false);
    if (!response.isError) {
      navigation.navigate(screenTitle.SHIPPING_CONFIRMATION_SCREEN, {
        userData,
        shippingAddress,
        currentCardProvider,
        preferredName,
        cardType,
        preferredDesignId,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: parseErrorMessage(response.error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(response.error);
    }
  };

  const RenderShippingAddress = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-n100 text-[12px]'>
          {t('DELIVERING_TO')}
        </CyDText>
        <CyDView className='flex flex-col gap-y-[16px] bg-n0 rounded-[12px] px-[16px] py-[16px] my-[4px]'>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDView className='flex flex-row items-center gap-x-[4px]'>
              <CyDMaterialDesignIcons
                name='map-marker-outline'
                size={20}
                className='text-base400'
              />
              <CyDText className='text-[14px] font-bold'>
                {t('SHIPPING_ADDRESS')}
              </CyDText>
            </CyDView>
            <CyDView>
              <CyDText className='text-[14px] font-bold'>4-5 Weeks</CyDText>
            </CyDView>
          </CyDView>
          <CyDView>
            <CyDText className='text-[12px] font-medium'>
              {`${capitalize(userData?.firstName)} ${capitalize(userData?.lastName)}`}
            </CyDText>
            <CyDText className='text-[12px] my-[2px] font-medium'>
              {shippingAddress?.line1}
            </CyDText>
            <CyDText className='text-[12px] my-[2px] font-medium'>
              {`${shippingAddress?.line2 ? `${shippingAddress.line2}, ` : ''}${shippingAddress?.city}`}
            </CyDText>
            <CyDText className='text-[12px] my-[2px] font-medium'>
              {`${shippingAddress?.state}, ${String(getCountryNameById(shippingAddress?.country ?? ''))} ${
                shippingAddress?.postalCode
              }`}
            </CyDText>
            <CyDText className='text-[12px] my-[2px] font-medium'>
              {shippingAddress?.phoneNumber}
            </CyDText>
            <CyDText className='text-[12px] my-[2px] font-medium'>
              {shippingAddress?.taxId}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [userData, shippingAddress]);

  const RenderShippingCharges = useCallback(() => {
    const getTitle = () => {
      if (cardType === CardType.METAL) {
        return t('METAL_CARD');
      } else if (cardType === CardType.PHYSICAL) {
        return t('PHYSICAL_CARD');
      }
      return t('VIRTUAL_CARD');
    };
    return (
      <CyDView className='flex flex-col bg-n0 rounded-[12px]'>
        <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-base80'>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDIcons name='card' size={26} className='text-base400' />
            <CyDText className='text-[14px] font-medium'>{getTitle()}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            {cardFee === 0 ? (
              <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
                <CyDText className='font-bold text-green400 text-[14px]'>
                  {'🎉' + 'Free'}
                </CyDText>
              </CyDSkeleton>
            ) : (
              <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
                <CyDText className='text-[14px] font-bold'>${cardFee}</CyDText>
              </CyDSkeleton>
            )}
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center px-[16px] py-[12px] border-b-[0.5px] border-base80'>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDMaterialDesignIcons
              name='email-outline'
              size={24}
              className='text-base400'
            />
            <CyDText className='text-[14px] font-medium'>
              {cardType === CardType.VIRTUAL
                ? t('OTHER_CHARGES')
                : t('SHIPPING_CHARGES')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
              <CyDText className='font-bold text-[14px]'>{'$0'}</CyDText>
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
  }, [profile, currentCardProvider, balance, cardFee, cardType]);

  const RenderNameOnCard = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-n100 text-[12px]'>{t('NAME_ON_CARD')}</CyDText>
        <CyDView className='flex flex-row justify-between bg-n0 rounded-[12px] p-[16px] mt-[4px]'>
          <CyDText className='text-[14px] font-semibold'>
            {preferredName}
          </CyDText>
        </CyDView>
      </CyDView>
    );
  }, [preferredName]);

  const RenderPaymentMethod = useCallback(() => {
    return (
      <CyDView>
        <CyDText className='text-n100 text-[12px]'>{t('PAYING_FROM')}</CyDText>
        <CyDView className='bg-n0 rounded-[12px] p-[4px] mt-[4px]'>
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
                <CyDText className='text-[14px] font-semibold'>
                  {t('CYPHER_CARD_BALANCE')}
                </CyDText>
                <CyDText className='text-n300 text-[10px] font-medium'>
                  {t('CYPHER_CARD_BALANCE_SUB')}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row items-center'>
              <CyDSkeleton height={24} width={54} rounded={4} value={balance}>
                <CyDText className='text-[16px] font-bold'>{`$${balance}`}</CyDText>
              </CyDSkeleton>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }, [balance]);

  return (
    <CyDView className='bg-n20 h-full' style={{ paddingTop: insets.top }}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <OtpVerificationModal
        isModalVisible={isOTPModalVisible}
        setIsModalVisible={setIsOTPModalVisible}
        triggerOTPUrl={`/v1/cards/${currentCardProvider}/generate/otp`}
        isVerifyingOTP={isVerifyingOTP}
        verifyOTP={(otp: string) => {
          void onConfirm(otp);
        }}
        feeAmount={cardFee}
      />
      <CyDView className='flex flex-1 flex-col justify-between h-full'>
        <CyDView className='mx-[16px] flex-1'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => navigation.goBack()}
              className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center'>
              <CyDMaterialDesignIcons
                name='arrow-left'
                size={20}
                className='text-base400 '
              />
            </CyDTouchView>
          </CyDView>
          <CyDScrollView
            className={clsx('flex-1', { 'mb-[22px]': isAndroid() })}
            showsVerticalScrollIndicator={false}>
            <CyDView className='my-[16px]'>
              <RenderTitle cardType={cardType} />
              <CyDText className='text-[14px] font-semibold text-n400 mt-[6px]'>
                {t('PHYSICAL_CARD_CONFIRMATION_SUB')}
              </CyDText>
            </CyDView>
            <CyDView className='mb-[16px]'>
              <RenderPaymentMethod />
            </CyDView>
            <RenderShippingCharges />
            {cardType !== CardType.VIRTUAL && (
              <CyDView className='mt-[16px]'>
                <RenderNameOnCard />
              </CyDView>
            )}
            {cardType !== CardType.VIRTUAL && (
              <CyDView className='mt-[16px]'>
                <RenderShippingAddress />
              </CyDView>
            )}
          </CyDScrollView>
        </CyDView>

        <CyDView className={clsx('w-full bg-n0 pt-[16px] pb-[32px] px-[16px]')}>
          <Button
            onPress={() => {
              setIsOTPModalVisible(true);
            }}
            loading={isVerifyingOTP}
            type={ButtonType.PRIMARY}
            title={
              cardType === CardType.VIRTUAL
                ? t('GET_VIRTUAL_CARD')
                : t('CONFIRM_SHIPPING')
            }
            style={'h-[60px] w-full py-[10px]'}
            disabled={!preferredDesignId}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
