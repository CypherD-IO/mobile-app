import React, { useRef, useState } from 'react';
import { StyleSheet, Modal, PanResponder, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDMaterialDesignIcons,
  CyDImage,
} from '../../styles/tailwindComponents';
import Button from './button';
import {
  formatAmount,
  formatDate,
  getSymbolFromCurrency,
} from '../../core/util';
import { ButtonType, CardProviders } from '../../constants/enum';
import { useGlobalModalContext } from './GlobalModal';
import AppImages from '../../../assets/images/appImages';
import { capitalize } from 'lodash';
import useAxios from '../../core/HttpRequest';

export interface DeclineHandlingData {
  txnId: string;
  reason: string;
  merchant: string;
  merchantCountry: string;
  merchantCity: string;
  cardId: string;
  last4: string;
  cardType: string;
  provider: CardProviders;
  transactionCurrency: string;
  amount: string;
  approveUrl?: string;
  reportUrl?: string;
  declineCode: string;
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

const SWIPE_THRESHOLD = 50;

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
  } = data;
  const { showModal, hideModal } = useGlobalModalContext();
  const translateY = useRef(new Animated.Value(0)).current;
  const { getWithAuth } = useAxios();
  const [isLoading, setIsLoading] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            closeModal();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleThisIsntMe = () => {
    closeModal();
    setTimeout(() => {
      showModal('state', {
        type: 'warning',
        title: t('CONFIRM_REPORT_TRANSACTION'),
        description: t('CARD_WILL_BE_FROZEN_WARNING', {
          cardType: capitalize(cardType),
          last4: last4,
        }),
        onSuccess: async () => {
          if (!reportUrl) return;

          setIsLoading(true);
          try {
            const response = await getWithAuth(reportUrl);
            if (!response?.isError) {
              showModal('state', {
                type: 'success',
                title: t('TRANSACTION_REPORTED'),
                description: '',
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            } else {
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
        onFailure: hideModal,
      });
    }, 500);
  };

  const handleThisWasMe = async () => {
    if (!approveUrl) return;

    setIsLoading(true);
    try {
      const response = await getWithAuth(approveUrl);
      if (!response?.isError) {
        closeModal();
        setTimeout(() => {
          showModal('state', {
            type: 'success',
            title: t('TRANSACTION_APPROVED_SUCCESS'),
            description: '',
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, 500);
      } else {
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

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType='fade'
      style={styles.modalLayout}
      onRequestClose={closeModal}>
      <CyDView className='flex-1' style={styles.overlay}>
        <Animated.View
          style={{
            transform: [{ translateY }],
          }}
          {...panResponder.panHandlers}>
          <CyDView className='bg-black rounded-t-[32px] pt-[16px]'>
            <CyDView className='w-[40px] h-[4px] bg-n40 rounded-full self-center mb-[16px]' />

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
                This transaction was declined as a precaution, since it&apos;s a
                high-value transaction with a merchant you don&apos;t frequently
                use.
              </CyDText>

              {/* Card Info */}
              <CyDView className='flex-row items-center justify-center mb-[2px]'>
                <CyDMaterialDesignIcons
                  name='credit-card'
                  size={20}
                  className='text-white mr-[8px]'
                />
                <CyDText className='text-white text-[14px]'>
                  {cardType} Card **{last4}
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
                {formatDate(new Date())}
              </CyDText>

              {/* Buttons */}
              <CyDView className='gap-[12px] mb-[42px]'>
                <Button
                  title='Yes, I made this purchase *'
                  onPress={handleThisWasMe}
                  style='rounded-full py-[16px] bg-[#FFB800]'
                  type={ButtonType.PRIMARY}
                  loading={isLoading}
                />
                <Button
                  title="This isn't me, Report transaction"
                  onPress={handleThisIsntMe}
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
        </Animated.View>
      </CyDView>
    </Modal>
  );
};

export default TransactionDeclineHandlingModal;
