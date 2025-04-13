import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import {
  HdWalletContext,
  copyToClipboard,
  formatAmount,
  getCountryNameById,
  limitDecimalPlaces,
  parseErrorMessage,
  getSymbolFromCurrency,
  getChainIconFromChainName,
  getExplorerUrlFromChainName,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';
import {
  TransactionFilterTypes,
  CardTransactionTypes,
  CardProviders,
  ReapTxnStatus,
  CardControlTypes,
  ButtonType,
  GlobalModalType,
  CardStatus,
  GlobalContextType,
  CardOperationsAuthType,
  CypherPlanId,
  CypherDeclineCodes,
  ON_OPEN_NAVIGATE,
} from '../../../constants/enum';
import clsx from 'clsx';
import { screenTitle } from '../../../constants';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import {
  Card,
  ICardTransaction,
  ICardSubObjectMerchant,
} from '../../../models/card.model';
import { capitalize, get, startCase, truncate } from 'lodash';
import { t } from 'i18next';
import { CardProfile } from '../../../models/cardProfile.model';
import Toast from 'react-native-toast-message';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Linking, Platform } from 'react-native';
import CyDModalLayout from '../../../components/v2/modal';
import Button from '../../../components/v2/button';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import useCardUtilities from '../../../hooks/useCardUtilities';
import LinearGradient from 'react-native-linear-gradient';
import GradientText from '../../../components/gradientText';
import SelectPlanModal from '../../../components/selectPlanModal';
import analytics from '@react-native-firebase/analytics';
import ReportTransactionModal from '../../../components/v2/reportTransactionModal';
import Loading from '../../../components/v2/loading';

const formatDate = (date: Date) => {
  return moment(date).format('MMM DD YYYY, h:mm a');
};

const formatHash = (hash: string) => {
  return hash === 'N/A'
    ? 'N/A'
    : hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
};

const getTransactionSign = (type: string) => {
  switch (type.toUpperCase()) {
    case TransactionFilterTypes.CREDIT:
      return '+';
    case TransactionFilterTypes.DEBIT:
      return '-';
    case TransactionFilterTypes.WITHDRAWAL:
      return '-';
    case TransactionFilterTypes.REFUND:
      return '+';
    default:
      return '..';
  }
};

interface ChannelMap {
  [key: string]: {
    categoryIcon: AppImages;
    paymentChannel: string;
  };
}

const CHANNEL_MAP: ChannelMap = {
  APPLE: { categoryIcon: AppImages.APPLE_LOGO_GRAY, paymentChannel: 'Pay' },
  ANDROID: { categoryIcon: AppImages.GOOGLE_LOGO_GRAY, paymentChannel: 'Pay' },
  POS: { categoryIcon: AppImages.POS_ICON_GRAY, paymentChannel: 'P.O.S' },
  'Visa Direct': {
    categoryIcon: AppImages.WIRELESS_ICON_GRAY,
    paymentChannel: 'Visa Direct',
  },
  ECOMMERCE: {
    categoryIcon: AppImages.ECOMMERCE_ICON_GRAY,
    paymentChannel: 'Ecommerce',
  },
  ATM: { categoryIcon: AppImages.ATM_ICON_GRAY, paymentChannel: 'ATM' },
};
const getChannelIcon = (channel: string) => CHANNEL_MAP[channel] || {};

const CopyButton = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) => {
  const { t } = useTranslation();

  const handleCopy = () => {
    copyToClipboard(value);
    Toast.show({
      type: 'success',
      text1: `${label} Copied`,
    });
    if (onCopy) {
      onCopy();
    }
  };

  return (
    <CyDTouchView onPress={handleCopy}>
      <CyDMaterialDesignIcons
        name={'content-copy'}
        size={16}
        className='text-base400'
      />
    </CyDTouchView>
  );
};

const openMapsWithLocation = (location: {
  merchantName: string;
  merchantCity: string;
  merchantState: string;
  merchantCountry: string;
}) => {
  const { merchantName, merchantCity, merchantState, merchantCountry } =
    location;
  const address = `${merchantName}, ${merchantCity}, ${merchantState}, ${merchantCountry}`;
  const encodedAddress = encodeURIComponent(address);

  // Different URL schemes for iOS and Android
  const url = Platform.select({
    ios: `maps://?q=${encodedAddress}`,
    android: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
  });

  Linking.canOpenURL(url!)
    .then(async supported => {
      if (supported) {
        return await Linking.openURL(url!);
      } else {
        // Fallback to browser if native maps app cannot be opened
        return await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        );
      }
    })
    .catch(err => console.error('An error occurred', err));
};

interface InfoMessageProps {
  message: string;
  condition: boolean;
}

const InfoMessage: React.FC<InfoMessageProps> = ({ message, condition }) => {
  if (!condition) return null;

  return (
    <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px] mt-[24px]'>
      <CyDView className='flex-row items-center'>
        <CyDMaterialDesignIcons
          name='information-outline'
          size={24}
          className='text-base400'
        />
        <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
          {t(message)}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

const MerchantDetailsModal = ({
  showModal,
  setShowModal,
  metadata,
}: {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  metadata: ICardSubObjectMerchant;
}) => {
  return (
    <CyDModalLayout
      isModalVisible={showModal}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-n0 px-[16px] pt-[24px] pb-[50px] rounded-[16px]'>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className='text-[20px] font-medium'>
            {t('MERCHANT_DETAILS')}
          </CyDText>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='bg-n20 p-[16px] rounded-[12px] mt-[24px]'>
          <CyDText className='text-[12px] font-medium text-base150'>
            {t('NAME')}
          </CyDText>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDText className='text-[16px] font-medium'>
              {startCase(metadata?.merchantName.toLowerCase())}
            </CyDText>
            <CopyButton
              label={t('MERCHANT_NAME')}
              value={startCase(metadata?.merchantName.toLowerCase()) ?? ''}
              onCopy={() => setShowModal(false)}
            />
          </CyDView>
        </CyDView>
        <CyDView className='bg-n20 p-[16px] rounded-[12px] mt-[12px]'>
          <CyDText className='text-[12px] font-medium text-base150'>
            {t('MERCHANT_ID_LABEL')}
          </CyDText>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDText className='text-[16px] font-medium'>
              {metadata?.merchantId}
            </CyDText>
            <CopyButton
              label={t('MERCHANT_ID_LABEL')}
              value={metadata?.merchantId ?? ''}
              onCopy={() => setShowModal(false)}
            />
          </CyDView>
        </CyDView>
        <CyDView className='bg-n20 p-[16px] rounded-[12px] mt-[12px]'>
          <CyDText className='text-[12px] font-medium text-base150'>
            {t('MCC Code')}
          </CyDText>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDText className='text-[16px] font-medium'>
              {metadata?.merchantCategoryCode}
            </CyDText>
            <CopyButton
              label={t('MCC Code')}
              value={metadata?.merchantCategoryCode ?? ''}
              onCopy={() => setShowModal(false)}
            />
          </CyDView>
        </CyDView>
        <CyDView className='bg-n20 p-[16px] rounded-[12px] mt-[12px]'>
          <CyDText className='text-[12px] font-medium text-base150'>
            {t('COUNTRY')}
          </CyDText>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDText className='text-[16px] font-medium'>
              {getCountryNameById(metadata?.merchantCountry)}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='mt-[24px]' />
        <Button
          title={t('LOCATE_ON_MAPS')}
          onPress={() => {
            openMapsWithLocation({
              merchantName: metadata?.merchantName ?? '',
              merchantCity: metadata?.merchantCity ?? '',
              merchantState: metadata?.merchantState ?? '',
              merchantCountry: metadata?.merchantCountry ?? '',
            });
          }}
          style='py-[15px]'
          type={ButtonType.GREY_FILL}
          icon={
            <CyDMaterialDesignIcons
              name='map-marker-radius'
              size={24}
              className='text-base400'
            />
          }
        />
      </CyDView>
    </CyDModalLayout>
  );
};

const DeclinedTransactionActionItem = ({
  metadata,
  countryAlreadyAllowed,
  provider,
  addIntlCountry,
  navigation,
  isInsufficientFunds,
  isDailyLimitExceeded,
  isMonthlyLimitExceeded,
  isCountryDisabled,
  isCardInactive,
  activateCard,
  isCardActivated,
  fetchCardBalance,
  fundsAvailable,
  showTransactionDeclineHandlingModal = true,
  limits,
  cardDetails,
  isChannelOff,
}: {
  metadata: ICardSubObjectMerchant;
  countryAlreadyAllowed: boolean;
  provider: CardProviders;
  addIntlCountry: (iso2: string, cardId: string) => Promise<void>;
  navigation: NavigationProp<ParamListBase>;
  isInsufficientFunds: boolean;
  isDailyLimitExceeded: boolean;
  isMonthlyLimitExceeded: boolean;
  isCountryDisabled: boolean;
  isCardInactive: boolean;
  isCardActivated: boolean;
  activateCard: () => Promise<void>;
  fetchCardBalance: () => Promise<number>;
  fundsAvailable: boolean;
  showTransactionDeclineHandlingModal: boolean;
  limits: any;
  cardDetails: Card;
  isChannelOff: boolean;
}) => {
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const { patchWithAuth } = useAxios();
  const [isThisWasMeLoading, setIsThisWasMeLoading] = useState(false);
  const [isThisIsntMeLoading, setIsThisIsntMeLoading] = useState(false);

  const handleThisWasMe = async (): Promise<void> => {
    try {
      setIsThisWasMeLoading(true);
      const merchantId = metadata?.merchantId;
      if (!merchantId) {
        throw new Error('Merchant ID is required');
      }

      // Get existing amerc array from limits prop
      const existingAMercs = get(limits, 'aMercs', {});

      // Add the new merchant to the list
      const payload = {
        aMercs: {
          ...existingAMercs,
          [merchantId]: -1, // 1 indicates allowed merchant
        },
      };

      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardDetails.cardId}/limits-v2`,
        payload,
      );

      if (!response.error) {
        showModal('state', {
          type: 'success',
          title: t('SUCCESS_RETRY_TRANSACTION'),
          description: t('TXN_APPROVED_SUCCESS_DESCRIPTION'),
          onSuccess: () => {
            hideModal();
            navigation.goBack();
          },
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('ERROR'),
          text2: t('ACTION_FAILED'),
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      Toast.show({
        type: 'error',
        text1: t('ERROR'),
        text2: t('SOMETHING_WENT_WRONG'),
      });
    } finally {
      setIsThisWasMeLoading(false);
    }
  };

  const handleThisIsntMe = async (): Promise<void> => {
    const merchantId = metadata?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID is required');
    }

    showModal('state', {
      type: 'warning',
      title: t('CONFIRM_REPORT_TRANSACTION'),
      description: t('CARD_WILL_BE_FROZEN_WARNING', {
        cardType: capitalize(cardDetails.type),
        last4: cardDetails.last4,
      }),
      onSuccess: async () => {
        try {
          setIsThisIsntMeLoading(true);
          // Get existing dmerc array from limits prop
          const existingDMercs = get(limits, 'dMercs', []);

          // Add the new merchant to the list if not already present
          if (!existingDMercs.includes(merchantId)) {
            const payload = {
              dMercs: [...existingDMercs, merchantId],
            };

            const response = await patchWithAuth(
              `/v1/cards/${provider}/card/${cardDetails.cardId}/limits-v2`,
              payload,
            );

            if (!response.error) {
              showModal('state', {
                type: 'success',
                title: t('TRANSACTION_REPORTED_SUCCESSFULLY'),
                description: t('TRANSACTION_REPORTED_DESCRIPTION'),
                onSuccess: () => {
                  hideModal();
                  navigation.goBack();
                },
              });
            } else {
              Toast.show({
                type: 'error',
                text1: t('ERROR'),
                text2: t('ACTION_FAILED'),
              });
            }
          }
        } catch (error) {
          Sentry.captureException(error);
          Toast.show({
            type: 'error',
            text1: t('ERROR'),
            text2: t('SOMETHING_WENT_WRONG'),
          });
        } finally {
          setIsThisIsntMeLoading(false);
        }
      },
      onFailure: hideModal,
    });
  };

  if (isCountryDisabled && metadata?.merchantCountry && isCountryDisabled) {
    // Show existing UI for country disabled scenario
    return (
      <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-start'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {!countryAlreadyAllowed
              ? `Add ${getCountryNameById(metadata?.merchantCountry) ?? metadata?.merchantCountry} to your allowed countries or update card settings to match your requirements.`
              : `International transactions are already enabled for ${getCountryNameById(metadata?.merchantCountry) ?? metadata?.merchantCountry}. Retry your transaction.`}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1'>
          <CyDTouchView
            className='rounded-[4px] bg-n20 px-[8px] py-[6px] flex-1'
            onPress={() => {
              navigation.navigate(screenTitle.CARD_CONTROLS, {
                cardId: cardDetails.cardId ?? '',
                currentCardProvider: provider,
                onOpenNavigate: ON_OPEN_NAVIGATE.SELECT_COUNTRY,
              });
            }}>
            <CyDText className='text-center text-[14px] font-semibold'>
              {'Review Settings'}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            className={clsx(
              'border border-p40 rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1 ml-[10px]',
              countryAlreadyAllowed && 'bg-green20 border-green350',
            )}
            disabled={countryAlreadyAllowed}
            onPress={() => {
              void addIntlCountry(
                metadata?.merchantCountry,
                cardDetails.cardId,
              );
            }}>
            <CyDView className='flex flex-row items-center justify-center px-[4px]'>
              {countryAlreadyAllowed && (
                <CyDFastImage
                  source={AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED}
                  className='w-[16px] h-[16px] mr-[4px]'
                />
              )}
              <CyDText className='text-center text-[14px] font-semibold text-wrap text-black'>
                {countryAlreadyAllowed
                  ? `Added ${
                      (getCountryNameById(metadata?.merchantCountry)?.length ??
                        0) < 10
                        ? getCountryNameById(metadata?.merchantCountry)
                        : metadata?.merchantCountry
                    }`
                  : `Add ${
                      (getCountryNameById(metadata?.merchantCountry)?.length ??
                        0) < 10
                        ? getCountryNameById(metadata?.merchantCountry)
                        : metadata?.merchantCountry
                    }`}
              </CyDText>
            </CyDView>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  } else if (showTransactionDeclineHandlingModal) {
    return (
      <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-center'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {t('TRANSACTION_DECLINE_HANDLING_MESSAGE')}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1 gap-x-[6px]'>
          <Button
            title={t('THIS_WAS_ME')}
            onPress={() => {
              void handleThisWasMe();
            }}
            paddingY={8}
            loading={isThisWasMeLoading}
            type={ButtonType.PRIMARY}
            style='flex-1 rounded-[6px]'
            titleStyle='text-[14px] font-semibold'
          />
          {!limits?.dMercs?.includes(metadata?.merchantId ?? '') && (
            <Button
              title={t('THIS_ISNT_ME')}
              onPress={() => {
                void handleThisIsntMe();
              }}
              paddingY={8}
              loading={isThisIsntMeLoading}
              type={ButtonType.SECONDARY}
              style='flex-1 rounded-[6px]'
              titleStyle='text-[14px] font-semibold text-red400'
            />
          )}
        </CyDView>
      </CyDView>
    );
  } else if (isInsufficientFunds) {
    return (
      <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-center'>
          {/* <CyDFastImage
            source={
              fundsAvailable
                ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                : AppImages.INFO_CIRCLE
            }
            className='w-[24px] h-[24px]'
          /> */}
          <CyDMaterialDesignIcons
            name={fundsAvailable ? 'check-circle' : 'information-outline'}
            size={20}
            className={clsx('mr-[2px]', {
              'text-green400': fundsAvailable,
              'text-base150': !fundsAvailable,
            })}
          />
          <CyDText className='text-[12px] font-medium ml-1 flex-1'>
            {fundsAvailable
              ? t('FUNDS_AVAILABLE_MESSAGE')
              : t('INSUFFICIENT_FUNDS_MESSAGE')}
          </CyDText>
        </CyDView>
        {!fundsAvailable && (
          <CyDView className='mt-[10px] flex-row items-center flex-1'>
            <CyDTouchView
              className={
                'rounded-[4px] bg-p40 px-[8px] py-[6px] flex-row items-center justify-center flex-1'
              }
              onPress={() => {
                navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
                  navigation,
                  cardId: cardDetails.cardId ?? '',
                  currentCardProvider: provider,
                });
              }}>
              <CyDText className='text-center text-[14px] font-semibold text-black'>
                {t('ADD_FUNDS')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}
      </CyDView>
    );
  } else if (isDailyLimitExceeded) {
    return (
      <CyDView className='rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-center'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {t('REVIEW_SETTINGS_MESSAGE_DAILY_LIMIT')}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1'>
          <CyDTouchView
            className='rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1'
            onPress={() => {
              navigation.navigate(screenTitle.CARD_CONTROLS, {
                cardId: cardDetails.cardId ?? '',
                currentCardProvider: provider,
                onOpenNavigate: ON_OPEN_NAVIGATE.DAILY_LIMIT,
              });
            }}>
            <CyDText className='text-center text-[14px] font-semibold text-black'>
              {t('UPDATE_LIMITS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  } else if (isMonthlyLimitExceeded) {
    return (
      <CyDView className='rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-center'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {t('REVIEW_SETTINGS_MESSAGE_MONTHLY_LIMIT')}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1'>
          <CyDTouchView
            className='rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1'
            onPress={() => {
              navigation.navigate(screenTitle.CARD_CONTROLS, {
                cardId: cardDetails.cardId ?? '',
                currentCardProvider: provider,
                onOpenNavigate: ON_OPEN_NAVIGATE.MONTHLY_LIMIT,
              });
            }}>
            <CyDText className='text-center text-[14px] font-semibold text-black'>
              {t('UPDATE_LIMITS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  } else if (isChannelOff) {
    return (
      <CyDView className='rounded-[12px] border border-n40 p-[12px]'>
        <CyDView className='flex-row items-center'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {t('REVIEW_SETTINGS_MESSAGE_CHANNEL_OFF')}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1'>
          <CyDTouchView
            className='rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1'
            onPress={() => {
              navigation.navigate(screenTitle.CARD_CONTROLS, {
                cardId: cardDetails.cardId ?? '',
                currentCardProvider: provider,
              });
            }}>
            <CyDText className='text-center text-[14px] font-semibold text-black'>
              {t('UPDATE_CHANNEL_SETTINGS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  } else if (isCardInactive) {
    return (
      <>
        <CyDView className='bg-n0 rounded-[12px] border border-n40 p-[12px]'>
          <CyDView className='flex-row items-center'>
            <CyDFastImage
              source={
                isCardActivated
                  ? AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED
                  : AppImages.INFO_CIRCLE
              }
              className='w-[24px] h-[24px]'
            />
            <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
              {isCardActivated
                ? t('CARD_ACTIVATED_MESSAGE')
                : t('CARD_INACTIVE_MESSAGE')}
            </CyDText>
          </CyDView>
          {!isCardActivated && (
            <CyDView className='mt-[10px] flex-row items-center flex-1'>
              <CyDTouchView
                className={
                  'rounded-[4px] bg-p40 px-[8px] py-[6px] flex-row items-center justify-center flex-1'
                }
                onPress={() => {
                  void activateCard();
                }}>
                <CyDText className='text-center text-[14px] font-semibold'>
                  {t('ACTIVATE_CARD')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          )}
        </CyDView>
      </>
    );
  } else {
    return <></>;
  }
};

const getStatusBackgroundClass = (transaction: ICardTransaction) => {
  const isSettledRefund =
    transaction.type === CardTransactionTypes.REFUND && transaction.isSettled;
  const isSettledNonRefund =
    transaction.type !== CardTransactionTypes.REFUND &&
    transaction.tStatus === ReapTxnStatus.CLEARED;

  return isSettledRefund || isSettledNonRefund ? 'bg-green20' : 'bg-n30';
};

const getStatusIcon = (transaction: ICardTransaction) => {
  if (transaction.type === CardTransactionTypes.REFUND) {
    return !transaction.isSettled
      ? AppImages.PENDING_GRAY
      : AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED;
  }

  if (
    transaction.tStatus === ReapTxnStatus.DECLINED ||
    transaction.tStatus === ReapTxnStatus.VOID
  ) {
    return AppImages.GRAY_CIRCULAR_CROSS;
  }

  return transaction.tStatus === ReapTxnStatus.PENDING || !transaction.isSettled
    ? AppImages.PENDING_GRAY
    : AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED;
};

const getStatusText = (transaction: ICardTransaction) => {
  if (transaction.type === CardTransactionTypes.REFUND) {
    return !transaction.isSettled ? t('IN_PROGRESS') : t('SETTLED');
  }

  if (transaction.tStatus === ReapTxnStatus.DECLINED) return t('DECLINED');
  if (transaction.tStatus === ReapTxnStatus.VOID) return t('CANCELLED');

  return transaction.tStatus === ReapTxnStatus.PENDING || !transaction.isSettled
    ? t('IN_PROGRESS')
    : t('SETTLED');
};

interface TransactionDetailProps {
  isDeclined?: boolean;
  reason?: string;
  metadata?: ICardSubObjectMerchant;
  cardDetails: Card;
  provider: CardProviders;
  addIntlCountry: (iso2: string, cardId: string) => Promise<void>;
  navigation: NavigationProp<ParamListBase>;
  transaction: ICardTransaction;
  getRequiredData: (cardId: string) => Promise<void>;
  setIsMerchantDetailsModalVisible: (visible: boolean) => void;
  limits: any;
  activateCard: () => Promise<void>;
  fetchCardBalance: () => Promise<number>;
  declineCode: string;
}

const TransactionDetail = ({
  isDeclined = false,
  reason = '',
  metadata,
  addIntlCountry,
  cardDetails,
  navigation,
  provider,
  transaction,
  setIsMerchantDetailsModalVisible,
  getRequiredData,
  limits,
  activateCard,
  fetchCardBalance,
  declineCode,
}: TransactionDetailProps) => {
  const isInsufficientFunds = reason
    ?.toLowerCase()
    .includes('insufficient funds');
  const isLimitExceeded = reason?.toLowerCase().includes('limit');
  const isCardInactive = /frozen|active/i.test(reason ?? '');
  const isCardActivated = cardDetails.status === CardStatus.ACTIVE;
  const [fundsAvailable, setFundsAvailable] = useState(false);

  useEffect(() => {
    if (isDeclined && metadata?.merchantCountry && cardDetails.cardId) {
      void getRequiredData(cardDetails.cardId);
    }
  }, [isDeclined, metadata?.merchantCountry, cardDetails.cardId]);

  useEffect(() => {
    const checkBalance = async () => {
      const balance = await fetchCardBalance();
      setFundsAvailable(balance > transaction.amount);
    };

    if (isInsufficientFunds) {
      void checkBalance();
    }
  }, []);

  const isCredit = transaction.type === CardTransactionTypes.CREDIT;
  const isWithdrawal = transaction.category === 'Crypto Withdrawal';
  const countryList = get(limits, 'countries', []) as string[];
  const countryAlreadyAllowed =
    countryList.includes(metadata?.merchantCountry ?? '') ||
    countryList.includes('ALL');
  const isBlacklistedMerchant =
    declineCode === CypherDeclineCodes.MERCHANT_DENIED ||
    declineCode === CypherDeclineCodes.MERCHANT_GLOBAL;
  const isNewMerchantHighSpendRule =
    declineCode === CypherDeclineCodes.NEW_MERCHANT_HIGH_SPEND_RULE;

  return (
    <>
      <CyDView>
        {isDeclined && (
          <DeclinedTransactionActionItem
            metadata={metadata}
            countryAlreadyAllowed={countryAlreadyAllowed}
            provider={provider}
            addIntlCountry={addIntlCountry}
            navigation={navigation}
            isInsufficientFunds={isInsufficientFunds}
            isDailyLimitExceeded={
              declineCode === CypherDeclineCodes.DAILY_LIMIT
            }
            isMonthlyLimitExceeded={
              declineCode === CypherDeclineCodes.MONTHLY_LIMIT
            }
            isCountryDisabled={declineCode === CypherDeclineCodes.INT_COUNTRY}
            activateCard={activateCard}
            isCardInactive={isCardInactive}
            isCardActivated={isCardActivated}
            fetchCardBalance={fetchCardBalance}
            fundsAvailable={fundsAvailable}
            showTransactionDeclineHandlingModal={
              isBlacklistedMerchant || isNewMerchantHighSpendRule
            }
            isChannelOff={declineCode === CypherDeclineCodes.INT_CHANNEL_LIMIT}
            limits={limits}
            cardDetails={cardDetails}
          />
        )}
        <InfoMessage
          message='REFUND_IN_PROGRESS_MESSAGE'
          condition={
            transaction.type === CardTransactionTypes.REFUND &&
            !transaction.isSettled
          }
        />
        <InfoMessage
          message='CRYPTO_WITHDRAWAL_INFO_MESSAGE'
          condition={transaction.title
            .toLowerCase()
            .includes('crypto withdrawal')}
        />
        <CyDView className='mt-[24px]'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDText className='text-[14px] text-n200 font-semibold'>
              {t('STATUS')}
            </CyDText>
            <CyDView
              className={clsx(
                'flex flex-row items-center bg-n30 rounded-[20px] px-[8px] py-[4px]',
                getStatusBackgroundClass(transaction),
              )}>
              <CyDImage
                source={getStatusIcon(transaction)}
                className='h-[16px] w-[16px] mr-[4px]'
              />
              <CyDText
                className={clsx(
                  'text-[12px] text-n200',
                  getStatusBackgroundClass(transaction) === 'bg-green20' &&
                    'text-green350',
                )}>
                {getStatusText(transaction)}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Card Row */}
          {transaction.type !== CardTransactionTypes.CREDIT &&
            cardDetails.cardId && (
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('CARD')}
                </CyDText>
                <CyDView className='flex flex-row items-center'>
                  <CyDView className='flex items-center'>
                    <CyDText className='text-[14px] font-semibold'>
                      {`** ${cardDetails?.last4}`}
                    </CyDText>
                    <CyDText className='text-[10px] text-n200 font-semibold ml-[2px]'>
                      {cardDetails?.type.toUpperCase()}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            )}

          {/* Merchant Name Row */}
          {transaction.metadata?.merchant?.merchantName && (
            <>
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('MERCHANT_FIRST_LETTER_CAPS')}
                </CyDText>
                <CyDText className='text-[14px] font-semibold'>
                  {capitalize(transaction.metadata.merchant.merchantName)}
                </CyDText>
              </CyDView>
              {/* Only show additional info section if there is location data */}
              {
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDTouchView
                    onPress={() => {
                      setIsMerchantDetailsModalVisible(true);
                    }}>
                    <CyDText className='text-blue300 text-[12px] font-bold'>
                      {t('ADDITIONAL_INFO')}
                    </CyDText>
                  </CyDTouchView>
                  <CyDText className='text-[12px] font-semibold text-n200'>
                    {[
                      transaction.metadata?.merchant?.merchantCity &&
                        transaction.metadata.merchant.merchantCity !== 'null' &&
                        startCase(
                          transaction.metadata.merchant.merchantCity.toLowerCase(),
                        ),
                      transaction.metadata?.merchant?.merchantState &&
                        transaction.metadata.merchant.merchantState !==
                          'null' &&
                        transaction.metadata.merchant.merchantState,
                      transaction.metadata?.merchant?.merchantCountry &&
                        transaction.metadata.merchant.merchantCountry !==
                          'null' &&
                        startCase(
                          getCountryNameById(
                            transaction.metadata.merchant.merchantCountry,
                          ),
                        ),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </CyDText>
                </CyDView>
              }
            </>
          )}

          {/* Transaction ID Row */}
          <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
            <CyDText className='text-[14px] text-n200 font-semibold'>
              {t('TRANSACTION_ID')}
            </CyDText>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='text-[14px] font-semibold'>
                {transaction.id.length > 15
                  ? `${transaction.id.slice(0, 10)}...${transaction.id.slice(-7)}`
                  : transaction.id}
              </CyDText>
              <CopyButton label={t('TRANSACTION_ID')} value={transaction.id} />
            </CyDView>
          </CyDView>

          {(isCredit || isWithdrawal) && transaction.tokenData && (
            <>
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('CHAIN')}
                </CyDText>
                <CyDView className='flex flex-row items-center'>
                  {transaction.tokenData?.chain && (
                    <CyDFastImage
                      source={getChainIconFromChainName(
                        transaction.tokenData?.chain ?? '',
                      )}
                      className='w-[16px] h-[16px] mr-[4px]'
                    />
                  )}
                  <CyDText className='text-[14px] font-semibold'>
                    {capitalize(transaction.tokenData?.chain)}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('LOADED_AMOUNT')}
                </CyDText>
                <CyDText className='text-[14px] font-semibold'>
                  {(() => {
                    const amount = transaction.tokenData?.tokenNos ?? '0';
                    const wholeNumber = parseFloat(amount);
                    const decimals = wholeNumber < 1 ? 6 : 2;
                    return limitDecimalPlaces(amount, decimals);
                  })()}{' '}
                  {transaction.tokenData?.symbol?.toUpperCase()}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('TRANSACTION_HASH')}
                </CyDText>
                <CyDText className='text-[14px] font-semibold'>
                  {formatHash(transaction.tokenData?.hash)}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-end items-center mt-[2px]'>
                <CyDTouchView
                  className='flex flex-row items-center'
                  onPress={() => {
                    navigation.navigate(screenTitle.TRANS_DETAIL, {
                      url: getExplorerUrlFromChainName(
                        transaction.tokenData?.chain ?? '',
                        transaction.tokenData?.hash ?? '',
                      ),
                    });
                  }}>
                  <CyDText className='text-[12px]'>
                    {t('VIEW_TRANSACTION')}
                  </CyDText>
                  <CyDIcons
                    name='arrow-left'
                    size={16}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
            </>
          )}

          {/* Billed Amount Row */}
          {!isCredit && (
            <>
              <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
                <CyDText className='text-[14px] text-n200 font-semibold'>
                  {t('BILLED_AMOUNT')}
                </CyDText>
                <CyDText className='text-[14px] font-semibold'>
                  {`$ ${limitDecimalPlaces(transaction.amount, 2)}`}
                </CyDText>
              </CyDView>
              {transaction.fxConversionPrice && (
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText className='text-[12px] text-n200'>
                    {`$ 1 -> ${getSymbolFromCurrency(transaction.fxCurrencySymbol)} ${formatAmount(
                      limitDecimalPlaces(transaction.fxConversionPrice, 2),
                    )}`}
                  </CyDText>
                </CyDView>
              )}
            </>
          )}
        </CyDView>
      </CyDView>
    </>
  );
};

interface RouteParams {
  transaction: ICardTransaction;
}

interface TransactionDisplayProps {
  image: any;
  textColor: string;
  imageText: string;
}

const getTransactionDisplayProps = (
  type: CardTransactionTypes,
  status?: ReapTxnStatus,
): TransactionDisplayProps => {
  if (
    type === CardTransactionTypes.DEBIT &&
    status === ReapTxnStatus.DECLINED
  ) {
    return {
      image: AppImages.GREY_EXCLAMATION_ICON,
      textColor: 'text-base400',
      imageText: 'Declined',
    };
  } else if (
    type === CardTransactionTypes.DEBIT &&
    status === ReapTxnStatus.VOID
  ) {
    return {
      image: AppImages.GREY_EXCLAMATION_ICON,
      textColor: 'text-n600',
      imageText: 'Cancelled',
    };
  } else if (type === CardTransactionTypes.DEBIT) {
    return {
      image: AppImages.DEBIT_TRANSACTION_ICON,
      textColor: 'text-red150',
      imageText: 'Debited',
    };
  } else if (type === CardTransactionTypes.CREDIT) {
    return {
      image: AppImages.CREDIT_TRANSACTION_ICON,
      textColor: 'text-green350',
      imageText: 'Credited',
    };
  } else if (type === CardTransactionTypes.REFUND) {
    return {
      image: AppImages.CREDIT_TRANSACTION_ICON,
      textColor: 'text-green350',
      imageText: 'Refunded',
    };
  } else {
    return {
      image: AppImages.CREDIT_TRANSACTION_ICON,
      textColor: 'text-green350',
      imageText: 'Credited',
    };
  }
};

export default function TransactionDetails() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { transaction }: { transaction: ICardTransaction } = route.params;
  const { fxCurrencySymbol } = transaction;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, patchWithAuth, postWithAuth } = useAxios();
  const cardProfile: CardProfile | undefined =
    globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider ?? CardProviders.REAP_CARD;
  const { showModal, hideModal } = useGlobalModalContext();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [limits, setLimits] = useState({});
  const insets = useSafeAreaInsets();
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [isMerchantDetailsModalVisible, setIsMerchantDetailsModalVisible] =
    useState(false);
  const viewRef = useRef<any>(null);
  const { getWalletProfile } = useCardUtilities();
  const planInfo = get(cardProfile, ['planInfo'], null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const cardDetails: Card = get(cardProfile, [provider, 'cards'], null)?.find(
    card => card?.cardId === transaction?.cardId,
  ) ?? {
    bin: '',
    cardId: '',
    last4: 'XXXX',
    network: '',
    status: '',
    type: '',
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const fetchCardBalance = async () => {
    const url = `/v1/cards/${provider}/card/${String(cardDetails.cardId)}/balance`;
    try {
      const response = await getWithAuth(url);
      if (!response.isError && response?.data && response.data.balance) {
        return Number(response.data.balance);
      } else {
        return 0;
      }
    } catch (error) {
      Sentry.captureException(error);
      return 0;
    }
  };

  const getRequiredData = async (cardId: string) => {
    if (provider && cardId) {
      try {
        const { isError, data } = await getWithAuth(
          `/v1/cards/${provider}/card/${cardId}/limits-v2`,
        );
        if (!isError && data) {
          setLimits(data);
        }
      } catch (error) {
        Sentry.captureException(error);
        showModal('state', {
          type: 'error',
          title: t('UNEXPECTED_ERROR'),
          description: parseErrorMessage(error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
  };

  const addIntlCountry = async (iso2: string, cardId?: string) => {
    showModal(GlobalModalType.CARD_ACTIONS_FROM_NOTIFICATION, {
      closeModal: () => {
        hideModal();
      },
      data: {
        reason: transaction?.cDReason ?? transaction?.dReason ?? '',
        merchant: transaction?.metadata?.merchant?.merchantName ?? '',
        merchantCountry: transaction?.metadata?.merchant?.merchantCountry ?? '',
        merchantCity: transaction?.metadata?.merchant?.merchantCity ?? '',
        cardId,
        provider,
        transactionCurrency: transaction?.fxCurrencySymbol ?? '',
        amount: transaction?.amount ?? 0,
        navigation,
      },
    });
    if (!iso2 || !cardId) {
      showModal('state', {
        type: 'error',
        title: t('INVALID_PARAMETERS'),
        description: 'Missing ISO2 code or cardId',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }
    try {
      // Get current countries list
      const currentCountries = get(limits, 'countries', []) as string[];

      const payload = {
        countries: [...currentCountries, iso2],
      };

      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardId}/limits-v2`,
        payload,
      );

      if (!response.isError) {
        showModal('state', {
          type: 'success',
          title: `Added ${iso2} to your allowed countries`,
          description: 'Please retry your transaction again.',
          onSuccess: () => {
            hideModal();
          },
          onFailure: hideModal,
        });
        void getRequiredData(cardId);
      } else {
        showModal('state', {
          type: 'error',
          title: t('UNABLE_TO_UPDATE_DETAILS'),
          description: response.error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      showModal('state', {
        type: 'error',
        title: t('UNEXCPECTED_ERROR'),
        description: parseErrorMessage(error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const activateCard = () => {
    hideModal();
    navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
      onSuccess: () => {
        showModal('state', {
          type: 'success',
          title: t('Card Successfully Activated'),
          description: `Your card is active now!`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void refreshProfile();
      },
      currentCardProvider: provider,
      card: cardDetails,
      authType:
        cardDetails.status === CardStatus.BLOCKED
          ? CardOperationsAuthType.UNBLOCK
          : CardOperationsAuthType.UNLOCK,
    });
  };

  const displayProps = getTransactionDisplayProps(
    transaction.type,
    transaction.tStatus,
  );

  const getShareMessage = () => {
    if (transaction.metadata?.merchant?.merchantName) {
      if (transaction.fxCurrencySymbol && transaction.fxCurrencyValue) {
        return `Hey! I just spent ${getSymbolFromCurrency(transaction.fxCurrencySymbol)}${transaction.fxCurrencyValue} at ${transaction.metadata.merchant.merchantName} using my Cypher Card! 🚀 Living the crypto life!`;
      } else {
        return `Hey! I just spent $${transaction.amount} at ${transaction.metadata.merchant.merchantName} using my Cypher Card! 🚀 Living the crypto life!`;
      }
    } else {
      return `Hey I just made this transaction using my Cypher Card! 🚀 Living the crypto life!`;
    }
  };

  async function shareTransactionImage() {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const url = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'base64',
      });
      const shareImage = {
        title: t('SHARE_TITLE'),
        message: getShareMessage(),
        subject: t('SHARE_TITLE'),
        url: `data:image/jpeg;base64,${url}`,
      };

      await Share.open(shareImage);
    } catch (error) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Share failed',
          text2: 'Unable to share transaction details',
        });
      }
    }
  }

  async function shareTransaction() {
    try {
      await shareTransactionImage();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Please try again',
      });
    }
  }

  const shouldShowPremium = () => {
    let showPremium = false;

    if (planInfo?.planId !== CypherPlanId.PRO_PLAN) {
      if (transaction.type === CardTransactionTypes.CREDIT) {
        showPremium = true;
      } else if (
        (transaction.type === CardTransactionTypes.DEBIT ||
          transaction.tStatus === ReapTxnStatus.DECLINED) &&
        !transaction.title.toLowerCase().includes('crypto withdrawal')
      ) {
        showPremium = true;
      }
    }

    return showPremium;
  };

  const getPremiumAmount = () => {
    if (transaction?.type === CardTransactionTypes.CREDIT) {
      const fee = get(transaction, ['tokenData', 'fee'], 0);
      return Number(fee);
    } else if (transaction?.type === CardTransactionTypes.DEBIT) {
      const fee = get(transaction, ['fxFee'], 0);
      return Number(fee / 2);
    }
    return 0;
  };

  return (
    <>
      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        cardProvider={provider}
        cardId={cardDetails.cardId}
      />
      {transaction?.metadata?.merchant && (
        <MerchantDetailsModal
          showModal={isMerchantDetailsModalVisible}
          setShowModal={setIsMerchantDetailsModalVisible}
          metadata={transaction?.metadata?.merchant}
        />
      )}
      <ReportTransactionModal
        isModalVisible={isReportModalVisible}
        setModalVisible={setIsReportModalVisible}
        transaction={transaction}
      />
      <CyDView className='flex-1 bg-n20' style={{ paddingTop: insets.top }}>
        <CyDTouchView
          className='w-full'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDIcons
            name='arrow-left'
            size={24}
            className='text-base400 ml-[16px]'
          />
        </CyDTouchView>
        <ViewShot ref={viewRef} style={styles.container}>
          <CyDScrollView
            className='bg-n20'
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <CyDView className='min-h-full pb-[100px]'>
              <CyDView className='flex flex-col justify-center items-center my-[24px]'>
                <CyDView className='h-[36px] w-[36px] rounded-full bg-n40 flex items-center justify-center'>
                  <CyDFastImage
                    source={displayProps.image}
                    className='h-[20px] w-[20px]'
                  />
                </CyDView>
                <CyDText className='text-[10px] font-semibold mt-[4px] text-n600'>
                  {displayProps.imageText}
                </CyDText>
                <CyDView className='flex-row items-end'>
                  <CyDText
                    className={clsx(
                      'font-extrabold text-[36px] mt-[8px]',
                      displayProps.textColor,
                      (transaction?.cDReason ?? transaction?.dReason) &&
                        'text-[24px]',
                    )}>
                    {(() => {
                      const currencyCode =
                        transaction.fxCurrencySymbol ?? 'USD';
                      const value = limitDecimalPlaces(
                        transaction.fxCurrencyValue ?? transaction.amount,
                        2,
                      );
                      const [whole] = value.split('.');
                      const symbol =
                        getSymbolFromCurrency(currencyCode) ?? currencyCode;

                      return symbol.length > 2
                        ? `${getTransactionSign(transaction.type)}${whole}`
                        : `${getTransactionSign(transaction.type)}${symbol}${whole}`;
                    })()}
                  </CyDText>
                  <CyDText
                    className={clsx(
                      'font-extrabold text-[24px] mb-[4px]',
                      displayProps.textColor,
                      (transaction?.cDReason ?? transaction?.dReason) &&
                        'mb-[0px]',
                    )}>
                    {(() => {
                      const currencyCode =
                        transaction.fxCurrencySymbol ?? 'USD';
                      const value = limitDecimalPlaces(
                        transaction.fxCurrencyValue ?? transaction.amount,
                        2,
                      );
                      const [, decimal] = value.split('.');
                      const symbol =
                        getSymbolFromCurrency(currencyCode) ?? currencyCode;

                      return symbol.length > 2
                        ? `.${decimal ? String(decimal) : '00'} ${symbol}`
                        : `.${decimal ? String(decimal) : '00'}`;
                    })()}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[4px]'>
                  {getChannelIcon(
                    transaction?.wallet ?? transaction?.channel ?? '',
                  )?.categoryIcon && (
                    <>
                      <CyDFastImage
                        source={
                          getChannelIcon(
                            transaction?.wallet ?? transaction?.channel ?? '',
                          )?.categoryIcon
                        }
                        className='h-[16px] w-[16px]'
                        resizeMode='contain'
                      />
                      <CyDText className='text-[12px] text-n200 ml-[2px] font-semibold'>
                        {
                          getChannelIcon(
                            transaction?.wallet ?? transaction?.channel ?? '',
                          )?.paymentChannel
                        }
                      </CyDText>
                      <CyDView className='w-[6px] h-[6px] bg-n200 rounded-full mx-[6px]' />
                    </>
                  )}
                  <CyDText className='text-[12px] text-n200 font-semibold'>
                    {formatDate(transaction.date)}
                  </CyDText>
                </CyDView>

                {(transaction?.cDReason ?? transaction?.dReason) && (
                  <CyDView className='mt-[8px] px-[24px]'>
                    <CyDTouchView>
                      <CyDText
                        className={clsx(
                          'text-center text-red400 tracking-[-0.5px] leading-[22.4px] font-[500] mx-[24px]',
                          'text-[14px]',
                        )}>
                        {transaction?.cDReason ?? transaction?.dReason}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                )}
                {transaction.type !== CardTransactionTypes.CREDIT && (
                  <CyDView className='flex flex-row justify-center items-center p-[5px] bg-n0 rounded-tl-[12px] rounded-br-[12px] mt-[24px]'>
                    <CyDView className='bg-n20 rounded-tl-[4px] rounded-br-[4px] h-[20px] w-[20px] p-[4px]'>
                      <CyDFastImage
                        source={{ uri: transaction.iconUrl }}
                        className='w-[14px] h-[14px] rounded-[4px]'
                        resizeMode='contain'
                      />
                    </CyDView>
                    <CyDText className='ml-[4px] text-[12px] font-bold text-n100'>
                      {capitalize(
                        truncate(transaction.category, { length: 20 }),
                      )}{' '}
                      {transaction.title
                        .toLowerCase()
                        .includes('crypto withdrawal')
                        ? 'Crypto Withdrawal'
                        : ''}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
              <CyDView className='flex flex-col flex-1 justify-between bg-n0'>
                <CyDView className='w-full bg-n0 px-[25px] mt-[24px] mb-[60px]'>
                  <TransactionDetail
                    isSettled={transaction?.isSettled ?? false}
                    isDeclined={transaction.tStatus === ReapTxnStatus.DECLINED}
                    reason={transaction?.cDReason ?? transaction?.dReason ?? ''}
                    metadata={transaction?.metadata?.merchant}
                    getRequiredData={getRequiredData}
                    cardDetails={cardDetails}
                    limits={limits}
                    provider={provider}
                    addIntlCountry={addIntlCountry}
                    navigation={navigation}
                    transaction={transaction}
                    setIsMerchantDetailsModalVisible={
                      setIsMerchantDetailsModalVisible
                    }
                    activateCard={activateCard}
                    fetchCardBalance={fetchCardBalance}
                    declineCode={transaction?.cDCode ?? transaction?.dCode}
                  />

                  {Number(transaction?.mccPaddingAmount) > 0 && (
                    <CyDView className='flex flex-row gap-[4px] bg-p0 rounded-[6px] border-[1px] border-p400 p-[12px] mt-[24px]'>
                      <CyDMaterialDesignIcons
                        name={'information-outline'}
                        size={16}
                        className={'text-p400 mt-[4px] flex-shrink-0'}
                      />
                      <CyDText className='text-p400 text-[12px] font-medium flex-1 flex-wrap'>
                        {t('MCC_PADDING_MESSAGE', {
                          amount: transaction?.mccPaddingAmount,
                          days: t('REFUND_DAYS_RANGE'),
                        })}
                      </CyDText>
                    </CyDView>
                  )}
                </CyDView>
                {shouldShowPremium() && (
                  <CyDView className='bg-p10 p-6'>
                    <CyDView className='flex flex-row items-center gap-x-[4px] justify-center'>
                      <CyDText className='font-extrabold text-[20px]'>
                        {'Cypher'}
                      </CyDText>
                      <GradientText
                        textElement={
                          <CyDText className='font-extrabold text-[20px]'>
                            {'Premium'}
                          </CyDText>
                        }
                        gradientColors={['#FA9703', '#F89408', '#F6510A']}
                      />
                    </CyDView>
                    <CyDView className='mt-[16px]'>
                      <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                        <CyDText className='font-medium text-[14px] text-base200'>
                          {'Save'}
                        </CyDText>
                        {getPremiumAmount() > 0 ? (
                          <LinearGradient
                            colors={['#FA9703', '#F7510A', '#FA9703']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            locations={[0, 0.5, 1]}
                            style={styles.gradientStyle}>
                            <CyDText className='font-semibold text-[14px] text-white'>
                              {`~$${getPremiumAmount()}`}
                            </CyDText>
                          </LinearGradient>
                        ) : (
                          <CyDText className='font-medium text-[14px] text-base200'>
                            {'more'}
                          </CyDText>
                        )}
                      </CyDView>
                      {transaction.type === CardTransactionTypes.CREDIT ? (
                        <CyDText className='font-medium text-[14px] text-base200 text-center'>
                          {'on this load with premium'}
                        </CyDText>
                      ) : (
                        <CyDText className='font-medium text-[14px] text-base200 text-center'>
                          {'on this transaction with premium'}
                        </CyDText>
                      )}
                    </CyDView>
                    <CyDView className='mt-[16px] flex flex-row justify-center items-center mx-[24px] gap-x-[33px]'>
                      <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                        <CyDMaterialDesignIcons
                          name='check-bold'
                          size={18}
                          className='text-base400'
                        />
                        <CyDText className='font-semibold text-[12px]'>
                          {'Zero Forex Markup'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                        <CyDMaterialDesignIcons
                          name='check-bold'
                          size={18}
                          className='text-base400'
                        />
                        <CyDText className='font-semibold text-[12px]'>
                          {'Zero USDC Load Fee'}
                        </CyDText>
                      </CyDView>
                    </CyDView>

                    <Button
                      title={'Explore Premium'}
                      type={ButtonType.DARK}
                      onPress={() => {
                        void analytics().logEvent(
                          'explore_premium_tn_detail_cta',
                        );
                        setPlanChangeModalVisible(true);
                      }}
                      style='h-[42px] py-[8px] px-[12px] rounded-[4px] mt-[16px] bg-black w-2/3 self-center'
                      titleStyle='text-[14px] text-white font-semibold'
                    />
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          </CyDScrollView>
        </ViewShot>

        {/* Sticky bottom buttons */}
        <CyDView
          className='absolute bottom-0 left-0 right-0 bg-n0 px-[16px] flex flex-row justify-between shadow-lg shadow-black/10'
          style={{
            paddingBottom: insets.bottom + 16,
            paddingTop: 16,
          }}>
          <Button
            title={t('NEED_HELP')}
            onPress={() => {
              if (transaction.isReported) {
                Toast.show({
                  type: 'error',
                  text1: t('TRANSACTION_ALREADY_REPORTED'),
                });
              } else if (
                transaction.type === CardTransactionTypes.DEBIT &&
                !transaction.title.toLowerCase().includes('withdrawal')
              ) {
                setIsReportModalVisible(true);
                sendFirebaseEvent(hdWalletContext, 'report_transaction_issue');
              } else {
                sendFirebaseEvent(hdWalletContext, 'support');
                void Intercom.present();
              }
            }}
            type={ButtonType.GREY_FILL}
            style='bg-n30 py-[8px] px-[8px] text-black mx-[4px] rounded-[16px] flex-1'
            titleStyle='text-[14px] font-medium'
          />
          <Button
            title={capitalize(t('SHARE'))}
            onPress={() => {
              void shareTransaction();
            }}
            type={ButtonType.GREY_FILL}
            icon={
              <CyDMaterialDesignIcons
                name={'share-variant'}
                size={16}
                className='text-base400 mr-[6px]'
              />
            }
            style='bg-n30 py-[8px] px-[8px] text-black mx-[4px] rounded-[16px] flex-1'
            titleStyle='text-[14px] font-medium'
          />
        </CyDView>
      </CyDView>
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    width: '100%',
    justifyContent: 'flex-end',
    margin: 0,
  },
  gradientStyle: {
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
