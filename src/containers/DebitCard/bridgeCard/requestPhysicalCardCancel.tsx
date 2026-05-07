import React, { useState } from 'react';
import {
  CyDText,
  CyDView,
  CyDTouchView,
  CyDScrollView,
  CyDIcons,
  CyDImage,
} from '../../../styles/tailwindComponents';
import { ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import * as Sentry from '@sentry/react-native';
import AppImages from '../../../../assets/images/appImages';
import { CardProviders } from '../../../constants/enum';
import { Card, ITrackingDetailsResponse } from '../../../models/card.model';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import useAxios from '../../../core/HttpRequest';
import DeleteCardModal from '../../../components/v2/deleteCardModal';
import DeleteCardSuccessModal from '../../../components/v2/deleteCardSuccessModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';

export interface PhysicalCardOrderStatus {
  requestId?: string;
  freshdeskId?: number;
  cardType: string;
  orderStatus: string;
  activityStatus: string;
  cardId?: string;
  isDummyCard?: boolean;
  isCardCreated?: boolean;
  isAddedToShipment?: boolean;
  cancellationEligible: boolean;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  preferredCardName?: string;
  cardProvider?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  amountCharged?: number;
}

interface RouteParams {
  card: Card;
  cardProvider: CardProviders;
  trackingDetail: ITrackingDetailsResponse[string];
  cardBalance: string;
  orderStatus: PhysicalCardOrderStatus;
  cardType: string;
}

export default function RequestPhysicalCardCancel(): React.ReactElement {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { card, cardBalance, orderStatus, cardType: cardTypeLabel } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const { deleteWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;
  const insets = useSafeAreaInsets();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(isDarkMode ? '#1A1D23' : '#F5F6F7');
      }
    }, [isDarkMode]),
  );

  const { cancellationEligible, amountCharged = 0 } = orderStatus;

  const cancellationCharge = cancellationEligible ? 0 : amountCharged;
  const refundAmount = cancellationEligible ? amountCharged : 0;
  const balanceNum = parseFloat(cardBalance) || 0;

  const maskedLast4 = card.last4 ? `** ${card.last4.slice(0, 2)}**` : '';

  const handleConfirm = (): void => {
    setShowConfirmModal(true);
  };

  const handleCancelOrder = async (): Promise<void> => {
    setShowConfirmModal(false);
    setIsCancelling(true);

    try {
      const response = await deleteWithAuth(
        '/v1/cards/physical-card-order',
        undefined,
        undefined,
        {
          cardId: card.cardId,
          reason: 'User requested cancellation',
          ...(!cancellationEligible && { forceCancel: true }),
        },
      );

      if (!response.isError && response.data?.success) {
        setShowSuccessModal(true);
      } else {
        const errorMessage =
          response.data?.errors?.[0]?.message ??
          response.data?.message ??
          t('CANCEL_ORDER_SOMETHING_WENT_WRONG');
        showModal('state', {
          type: 'error',
          title: t('CANCEL_ORDER_FAILED'),
          description: errorMessage,
          onSuccess: () => {
            hideModal();
            navigation.goBack();
          },
          onFailure: () => {
            hideModal();
            navigation.goBack();
          },
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      showModal('state', {
        type: 'error',
        title: t('CANCEL_ORDER_FAILED'),
        description: t('CANCEL_ORDER_SOMETHING_WENT_WRONG'),
        onSuccess: () => {
          hideModal();
          navigation.goBack();
        },
        onFailure: () => {
          hideModal();
          navigation.goBack();
        },
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSuccessDismiss = (): void => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <CyDView className='flex-1 bg-n20' style={{ paddingTop: insets.top }}>
      <CyDView className='flex-1 justify-between'>
        <CyDScrollView
          className='flex-1 px-[16px]'
          showsVerticalScrollIndicator={false}>
          <CyDTouchView
            onPress={() => navigation.goBack()}
            className='w-[36px] h-[36px] mt-[8px] rounded-full bg-n30 items-center justify-center'>
            <CyDIcons name='arrow-left' size={20} className='text-base400' />
          </CyDTouchView>

          <CyDText className='font-manrope font-bold text-[28px] leading-[135%] tracking-[-1px] text-base400 mt-[16px]'>
            {cancellationEligible
              ? t('PHYSICAL_CARD_CANCELLATION', { cardType: cardTypeLabel })
              : t('PHYSICAL_CARD_CANCEL_CONFIRMATION', {
                  cardType: cardTypeLabel,
                })}
          </CyDText>

          <CyDText className='font-manrope font-semibold text-[14px] leading-[145%] tracking-[-0.6px] text-n400 mt-[8px]'>
            {t('PHYSICAL_CARD_CANCEL_SUBTITLE')}
          </CyDText>

          <CyDView className='bg-n0 rounded-[12px] mt-[24px] px-[16px]'>
            <CyDView className='flex-row justify-between items-center py-[16px]'>
              <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-base400 flex-1'>
                {t('PHYSICAL_CARD_CANCELLATION_CHARGES', {
                  cardType: cardTypeLabel,
                })}
              </CyDText>
              {cancellationEligible ? (
                <CyDText className='font-manrope font-bold text-[14px] leading-[145%] tracking-[-0.6px] text-green400 text-right'>
                  {t('FREE_LABEL')}
                </CyDText>
              ) : (
                <CyDText className='font-manrope font-bold text-[14px] leading-[145%] tracking-[-0.6px] text-base400 text-right'>
                  {`$${cancellationCharge.toFixed(2)}`}
                </CyDText>
              )}
            </CyDView>

            <CyDView className='h-[1px] bg-n40' />

            <CyDView className='flex-row justify-between items-center py-[16px]'>
              <CyDText className='font-manrope font-bold text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
                {t('TOTAL_REFUND_AMOUNT')}
              </CyDText>
              <CyDText className='font-manrope font-bold text-[14px] leading-[145%] tracking-[-0.6px] text-base400 text-right'>
                {`$${refundAmount.toFixed(2)}`}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDText className='font-manrope font-medium text-[12px] leading-[150%] tracking-[0px] text-n100 mt-[24px]'>
            {t('CANCELLING_CARD')}
          </CyDText>

          <CyDView className='bg-n0 rounded-[12px] mt-[8px] px-[16px] py-[16px] flex-row justify-between items-center'>
            <CyDText className='font-manrope font-semibold text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
              {`${cardTypeLabel} Card`}
            </CyDText>
            <CyDText className='font-manrope font-semibold text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
              {maskedLast4}
            </CyDText>
          </CyDView>

          {cancellationEligible && (
            <>
              <CyDText className='font-manrope font-medium text-[12px] leading-[150%] tracking-[0px] text-n100 mt-[24px]'>
                {t('REFUNDING_TO')}
              </CyDText>

              <CyDView className='bg-n0 rounded-[12px] mt-[8px] px-[16px] py-[16px] flex-row items-center'>
                <CyDView className='w-[38px] h-[38px] rounded-[4px] bg-n30 items-center justify-center'>
                  <CyDImage
                    source={AppImages.APP_LOGO}
                    className='w-[24px] h-[24px]'
                    resizeMode='contain'
                  />
                </CyDView>

                <CyDView className='flex-1 ml-[12px]'>
                  <CyDText className='font-manrope font-semibold text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
                    {t('CYPHER_CARD_BALANCE')}
                  </CyDText>
                  <CyDText className='font-manrope font-medium text-[10px] leading-[160%] text-n300'>
                    {t('CARD_SPENDING_BALANCE')}
                  </CyDText>
                </CyDView>

                <CyDText className='font-manrope font-bold text-[16px] leading-[140%] tracking-[0px] text-base400'>
                  {`$${balanceNum.toFixed(0)}`}
                </CyDText>
              </CyDView>
            </>
          )}
        </CyDScrollView>

        <CyDView className='px-[16px] pt-[24px] pb-[12px] bg-n0 justify-center'>
          <CyDTouchView
            className='h-[52px] rounded-[12px] bg-[#FFDE59] items-center justify-center mb-[13px]'
            disabled={isCancelling}
            onPress={handleConfirm}>
            {isCancelling ? (
              <ActivityIndicator size='small' color='#000' />
            ) : (
              <CyDText className='font-manrope font-bold text-[18px] leading-[145%] tracking-[-1px] text-center text-black'>
                {t('CONFIRM_ACTION')}
              </CyDText>
            )}
          </CyDTouchView>
        </CyDView>
      </CyDView>

      <DeleteCardModal
        isModalVisible={showConfirmModal}
        setIsModalVisible={setShowConfirmModal}
        onDeleteCard={() => {
          void handleCancelOrder();
        }}
        confirmWord='confirm'
        title={t('CANCEL_ORDER_TITLE')}
        warning={t('CANCEL_ORDER_WARNING', { cardType: cardTypeLabel.toLowerCase() })}
        placeholder={t('CANCEL_ORDER_PLACEHOLDER')}
        actionLabel={t('CANCEL_ORDER_ACTION')}
        cancelLabel={t('DELETE_CARD_CANCEL')}
      />

      <DeleteCardSuccessModal
        isModalVisible={showSuccessModal}
        cardType={cardTypeLabel}
        last4={card.last4 ?? ''}
        onOkay={handleSuccessDismiss}
        title={t('CANCEL_ORDER_SUCCESS_TITLE')}
        description={t('CANCEL_ORDER_SUCCESS_DESC', {
          cardType: cardTypeLabel,
          last4: card.last4 ?? '',
        })}
      />
    </CyDView>
  );
}
