import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDMaterialDesignIcons,
  CyDImage,
  CyDTouchView,
} from '../../styles/tailwindComponents';
import Button from './button';
import { formatAmount, getSymbolFromCurrency } from '../../core/util';
import { ButtonType } from '../../constants/enum';
import { useGlobalModalContext } from './GlobalModal';
import AppImages from '../../../assets/images/appImages';
import { capitalize } from 'lodash';
import useAxios from '../../core/HttpRequest';
import analytics from '@react-native-firebase/analytics';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

export interface DeclineHandlingData {
  reason: string;
  merchantCountry: string;
  merchantCity: string;
  cardId: string;
  provider: string;
  categoryId: string;
  declineCode: string;
  txnId: string;
  merchant: string;
  last4: string;
  cardType: string;
  transactionCurrency: string;
  amount: string;
  approveUrl: string;
  reportUrl: string;
}

interface TransactionDeclineHandlingModalProps {
  isModalVisible: boolean;
  data: DeclineHandlingData;
  closeModal: () => void;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
});

const TransactionDeclineHandlingModal: React.FC<
  TransactionDeclineHandlingModalProps
> = ({ isModalVisible, data, closeModal }) => {
  const { t } = useTranslation();
  const {
    amount,
    transactionCurrency,
    merchant,
    last4,
    cardType,
    approveUrl,
    reportUrl,
    reason,
    merchantCountry,
    merchantCity,
    txnId,
  } = data;

  // Track modal appearance
  useEffect(() => {
    if (isModalVisible) {
      void analytics().logScreenView({
        screen_name: 'TransactionDeclineHandlingModal',
        screen_class: 'TransactionDeclineHandlingModal',
      });

      void logAnalyticsToFirebase(
        AnalyticEvent.TRANSACTION_DECLINE_MODAL_VIEWED,
        {
          transaction_id: txnId,
          merchant,
          reason,
        },
      );
    }
  }, [isModalVisible, txnId, merchant, reason]);

  const { showModal, hideModal } = useGlobalModalContext();
  const { getWithAuth } = useAxios();
  const [isLoading, setIsLoading] = useState(false);

  const handleThisWasMe = async () => {
    if (!approveUrl) {
      return;
    }

    // Track approval action
    void logAnalyticsToFirebase(AnalyticEvent.TRANSACTION_DECLINE_APPROVE, {
      transaction_id: txnId,
      merchant,
    });

    setIsLoading(true);
    try {
      const response = await getWithAuth(approveUrl);
      if (!response?.isError) {
        // Track successful approval
        void logAnalyticsToFirebase(
          AnalyticEvent.TRANSACTION_DECLINE_APPROVE_SUCCESS,
          {
            transaction_id: txnId,
          },
        );

        closeModal();
        setTimeout(() => {
          showModal('state', {
            type: 'success',
            title: t('TRANSACTION_APPROVED_SUCCESS'),
            description: t('TRANSACTION_APPROVED_SUCCESS_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, 500);
      } else {
        // Track approval failure
        void logAnalyticsToFirebase(
          AnalyticEvent.TRANSACTION_DECLINE_APPROVE_FAILED,
          {
            transaction_id: txnId,
            error: response?.error?.message || 'Unknown error',
          },
        );

        closeModal();
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('TRANSACTION_APPROVAL_FAILED'),
            description:
              response?.error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, 500);
      }
    } catch (error) {
      // Track exception
      void logAnalyticsToFirebase(
        AnalyticEvent.TRANSACTION_DECLINE_APPROVE_EXCEPTION,
        {
          transaction_id: txnId,
        },
      );

      closeModal();
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_APPROVAL_FAILED'),
          description: t('PLEASE_CONTACT_SUPPORT'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThisIsntMe = async () => {
    if (!reportUrl) {
      return;
    }

    // Track fraud report action
    void logAnalyticsToFirebase(
      AnalyticEvent.TRANSACTION_DECLINE_REPORT_FRAUD,
      {
        transaction_id: txnId,
        merchant,
      },
    );

    setIsLoading(true);
    closeModal();
    setTimeout(() => {
      showModal('state', {
        type: 'warning',
        title: t('CONFIRM_REPORT_TRANSACTION'),
        description: t('CARD_WILL_BE_FROZEN_WARNING', {
          cardType: capitalize(cardType),
          last4,
        }),
        onSuccess: async () => {
          try {
            const response = await getWithAuth(reportUrl);
            if (!response?.isError) {
              // Track successful fraud report
              void logAnalyticsToFirebase(
                AnalyticEvent.TRANSACTION_DECLINE_REPORT_SUCCESS,
                {
                  transaction_id: txnId,
                },
              );

              showModal('state', {
                type: 'success',
                title: t('TRANSACTION_REPORTED_SUCCESSFULLY'),
                description: t('TRANSACTION_REPORTED_DESCRIPTION'),
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            } else {
              // Track fraud report failure
              void logAnalyticsToFirebase(
                AnalyticEvent.TRANSACTION_DECLINE_REPORT_FAILED,
                {
                  transaction_id: txnId,
                  error: response?.error?.message || 'Unknown error',
                },
              );

              showModal('state', {
                type: 'error',
                title: t('TRANSACTION_REPORT_FAILED'),
                description:
                  response?.error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            }
          } catch (error) {
            // Track exception
            void logAnalyticsToFirebase(
              AnalyticEvent.TRANSACTION_DECLINE_REPORT_EXCEPTION,
              {
                transaction_id: txnId,
              },
            );

            showModal('state', {
              type: 'error',
              title: t('TRANSACTION_REPORT_FAILED'),
              description: t('PLEASE_CONTACT_SUPPORT'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          } finally {
            setIsLoading(false);
          }
        },
        onFailure: () => {
          // Track user canceled confirmation
          void logAnalyticsToFirebase(
            AnalyticEvent.TRANSACTION_DECLINE_REPORT_CANCELED,
            {
              transaction_id: txnId,
            },
          );

          setIsLoading(false);
          hideModal();
        },
      });
    }, 500);
  };

  // Track close action
  const handleCloseModal = () => {
    void logAnalyticsToFirebase(
      AnalyticEvent.TRANSACTION_DECLINE_MODAL_DISMISSED,
      {
        transaction_id: txnId,
      },
    );
    closeModal();
  };

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType='slide'
      style={styles.modalLayout}
      onRequestClose={handleCloseModal}>
      <CyDView className='flex-1' style={styles.overlay}>
        <CyDView className='bg-black rounded-t-[32px] pt-[16px]'>
          {/* Close button */}
          <CyDView className='flex-row justify-end px-[24px] mb-[8px]'>
            <CyDTouchView onPress={handleCloseModal} className='p-[8px]'>
              <CyDMaterialDesignIcons
                name='close'
                size={24}
                className='text-white'
              />
            </CyDTouchView>
          </CyDView>

          {/* Logo and Title */}
          <CyDView className='px-[24px] mb-[8px]'>
            <CyDView className='flex-row items-center mb-[8px]'>
              <CyDImage
                source={AppImages.WHITE_SHIELD_ICON}
                className='w-[24px] h-[24px]'
              />
              <CyDView className='ml-[8px]'>
                <CyDText className='text-white text-[16px] font-bold'>
                  Cypher
                </CyDText>
                <CyDText className='text-gray-400 text-[12px]'>
                  Security
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Warning Icon */}
          <CyDView className='w-[56px] h-[56px] bg-[#333333] rounded-[12px] justify-center items-center self-center mt-[24px] mb-[16px]'>
            <CyDMaterialDesignIcons
              name='alert'
              size={32}
              className='text-white'
            />
          </CyDView>

          {/* Title and Description */}
          <CyDView className='px-[24px]'>
            <CyDText className='text-white text-[18px] font-semibold text-center mb-[8px]'>
              Transaction Declined
            </CyDText>
            <CyDText className='text-gray-300 text-[14px] leading-[22px] text-center mb-[32px]'>
              {reason}
            </CyDText>

            {/* Card Info */}
            <CyDView className='flex-row items-center justify-center mb-[2px]'>
              <CyDMaterialDesignIcons
                name='credit-card'
                size={20}
                className='text-white mr-[8px]'
              />
              <CyDText className='text-white text-[14px]'>
                {capitalize(cardType)} Card **{last4}
              </CyDText>
            </CyDView>

            {/* Amount */}
            <CyDText className='text-white text-[32px] font-bold text-center mb-[14px]'>
              {getSymbolFromCurrency(transactionCurrency) ??
                transactionCurrency}
              {Number(formatAmount(amount)).toLocaleString()}
            </CyDText>

            {/* Merchant Info */}
            <CyDText className='text-gray-400 text-[12px] text-center'>
              Paying to
            </CyDText>
            <CyDText className='text-white text-[18px] font-semibold text-center'>
              {merchant?.length > 24
                ? capitalize(merchant?.substring(0, 24)) + '...'
                : capitalize(merchant)}
            </CyDText>
            <CyDText className='text-gray-400 text-[12px] text-center mb-[32px]'>
              {merchantCity}, {merchantCountry}
            </CyDText>

            {/* Buttons */}
            <CyDView className='gap-[12px] mb-[42px]'>
              <Button
                title='Yes, I made this purchase *'
                onPress={() => {
                  void handleThisWasMe();
                }}
                style='rounded-full py-[16px] bg-[#FFB800]'
                type={ButtonType.PRIMARY}
                loading={isLoading}
              />
              <Button
                title="This isn't me, Report transaction"
                onPress={() => {
                  void handleThisIsntMe();
                }}
                style='rounded-full bg-[#333333] py-[16px]'
                type={ButtonType.DARK_GREY_FILL}
                titleStyle='text-white text-[16px]'
                loading={isLoading}
              />
              <CyDText className='text-gray-400 text-[12px] text-center'>
                * Confirming will not automatically process the payment.
                You&apos;ll need to retry the transaction after verification.
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </Modal>
  );
};

export default TransactionDeclineHandlingModal;
