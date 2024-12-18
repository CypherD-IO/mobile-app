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
  getExplorerUrl,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';
import {
  TransactionFilterTypes,
  CardTransactionTypes,
  CardProviders,
  ReapTxnStatus,
  CardControlTypes,
  ButtonType,
  GlobalModalType,
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
  ICardSubObjectMerchant,
  ICardTransaction,
} from '../../../models/card.model';
import { capitalize, get, startCase, truncate } from 'lodash';
import { t } from 'i18next';
import { CardProfile } from '../../../models/cardProfile.model';
import Toast from 'react-native-toast-message';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Dimensions, StyleSheet, Linking, Platform } from 'react-native';
import CyDModalLayout from '../../../components/v2/modal';
import Button from '../../../components/v2/button';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { SHARE_TRANSACTION_TIMEOUT } from '../../../core/Http';
import { isAndroid } from '../../../misc/checkers';
import Share from 'react-native-share';

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

const CHANNEL_MAP = {
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
      <CyDImage
        source={AppImages.COPY}
        className='h-[16px] w-[16px] ml-[8px]'
        resizeMode='contain'
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
    .then(supported => {
      if (supported) {
        return Linking.openURL(url!);
      } else {
        // Fallback to browser if native maps app cannot be opened
        return Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        );
      }
    })
    .catch(err => console.error('An error occurred', err));
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
      <CyDView className='bg-white px-[16px] pt-[24px] pb-[50px] rounded-[16px]'>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDText className='text-[20px] font-medium'>
            {t('MERCHANT_DETAILS')}
          </CyDText>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDImage source={AppImages.CLOSE} className='h-[24px] w-[24px]' />
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
          image={AppImages.LOCATION_PIN_BLACK}
        />
      </CyDView>
    </CyDModalLayout>
  );
};

const DeclinedTransactionActionItem = ({
  metadata,
  countryAlreadyAllowed,
  cardId,
  provider,
  addIntlCountry,
  navigation,
  isInsufficientFunds,
  isLimitExceeded,
  isCountryDisabled,
}: {
  metadata: ICardSubObjectMerchant;
  countryAlreadyAllowed: boolean;
  cardId: string;
  provider: CardProviders;
  addIntlCountry: (iso2: string, cardId: string) => Promise<void>;
  navigation: NavigationProp<ParamListBase>;
  isInsufficientFunds: boolean;
  isLimitExceeded: boolean;
  isCountryDisabled: boolean;
}) => {
  const { t } = useTranslation();
  if (isCountryDisabled && metadata?.merchantCountry && isCountryDisabled) {
    // Show existing UI for country disabled scenario
    return (
      <CyDView className='bg-n0 rounded-[12px] border border-[#E9EBF8] p-[12px] mt-[24px]'>
        <CyDView className='flex-row items-start'>
          <CyDImage
            source={AppImages.INFO_CIRCLE}
            className='w-[24px] h-[24px]'
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
              navigation.navigate(screenTitle.CARD_CONTROLS_MENU, {
                cardId: cardId ?? '',
                currentCardProvider: provider,
              });
            }}>
            <CyDText className='text-center text-[14px] font-semibold'>
              {'Review Settings'}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            className={clsx(
              'border border-p40 rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1 ml-[10px]',
              countryAlreadyAllowed && 'bg-white border-n40',
            )}
            disabled={countryAlreadyAllowed}
            onPress={() => {
              void addIntlCountry(metadata?.merchantCountry, cardId ?? '');
            }}>
            <CyDView className='flex flex-row items-center justify-center px-[4px]'>
              {countryAlreadyAllowed && (
                <CyDFastImage
                  source={AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED}
                  className='w-[16px] h-[16px] mr-[4px]'
                />
              )}
              <CyDText className='text-center text-[14px] font-semibold text-wrap'>
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
  } else if (isInsufficientFunds || isLimitExceeded) {
    return (
      <CyDView className='bg-n0 rounded-[12px] border border-[#E9EBF8] p-[12px] mt-[24px]'>
        <CyDView className='flex-row items-center'>
          <CyDImage
            source={AppImages.INFO_CIRCLE}
            className='w-[24px] h-[24px]'
          />
          <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
            {isInsufficientFunds
              ? t('INSUFFICIENT_FUNDS_MESSAGE')
              : t('REVIEW_SETTINGS_MESSAGE')}
          </CyDText>
        </CyDView>
        <CyDView className='mt-[10px] flex-row items-center flex-1'>
          <CyDTouchView
            className='rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1'
            onPress={() => {
              navigation.navigate(
                isInsufficientFunds
                  ? screenTitle.BRIDGE_FUND_CARD_SCREEN
                  : screenTitle.CARD_CONTROLS_MENU,
                {
                  ...(isInsufficientFunds && { navigation }),
                  cardId: cardId ?? '',
                  currentCardProvider: provider,
                },
              );
            }}>
            <CyDText className='text-center text-[14px] font-semibold'>
              {isInsufficientFunds ? t('ADD_FUNDS') : t('REVIEW_SETTINGS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
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
    (transaction.tStatus === ReapTxnStatus.CLEARED || transaction.isSettled);

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

const TransactionDetail = ({
  isSettled = false,
  isDeclined = false,
  reason = '',
  metadata,
  addIntlCountry,
  cardId,
  navigation,
  provider,
  transaction,
  setIsMerchantDetailsModalVisible,
  getRequiredData,
  limits,
  cardProfile,
}: {
  isSettled: boolean;
  isDeclined?: boolean;
  reason?: string;
  metadata?: ICardSubObjectMerchant;
  cardId: string;
  provider: CardProviders;
  addIntlCountry: (iso2: string, cardId: string) => Promise<void>;
  navigation: NavigationProp<ParamListBase>;
  transaction: ICardTransaction;
  getRequiredData: (cardId: string) => Promise<void>;
  setIsMerchantDetailsModalVisible: (visible: boolean) => void;
  limits: any;
  cardProfile: CardProfile;
}) => {
  const isCountryDisabled =
    reason?.includes('International transactions are disabled') ||
    reason?.includes('is not in the allow list');
  const isInsufficientFunds = reason
    ?.toLowerCase()
    .includes('insufficient funds');
  const isLimitExceeded = reason?.toLowerCase().includes('limit');
  useEffect(() => {
    if (isDeclined && metadata?.merchantCountry && cardId) {
      void getRequiredData(cardId);
    }
  }, [isDeclined, metadata?.merchantCountry, cardId]);
  const isCredit = transaction.type === CardTransactionTypes.CREDIT;
  const countryList = get(limits, 'cusL.intl.cLs', []) as string[];
  const countryAlreadyAllowed = countryList.includes(
    metadata?.merchantCountry ?? '',
  );

  const cardDetails: Card = get(cardProfile, [provider, 'cards'])?.find(
    card => card?.cardId === transaction?.cardId,
  ) ?? {
    bin: '',
    cardId: '',
    last4: 'XXXX',
    network: '',
    status: '',
    type: '',
  };

  return (
    <>
      <CyDView>
        {isDeclined && (
          <DeclinedTransactionActionItem
            metadata={metadata}
            countryAlreadyAllowed={countryAlreadyAllowed}
            cardId={cardId}
            provider={provider}
            addIntlCountry={addIntlCountry}
            navigation={navigation}
            isInsufficientFunds={isInsufficientFunds}
            isLimitExceeded={isLimitExceeded}
            isCountryDisabled={isCountryDisabled}
          />
        )}
        {transaction.type === CardTransactionTypes.REFUND &&
          !transaction.isSettled && (
            <CyDView className='bg-n0 rounded-[12px] border border-[#E9EBF8] p-[12px] mt-[24px]'>
              <CyDView className='flex-row items-start'>
                <CyDImage
                  source={AppImages.INFO_CIRCLE}
                  className='w-[24px] h-[24px]'
                />
                <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
                  {t('REFUND_IN_PROGRESS_MESSAGE')}
                </CyDText>
              </CyDView>
            </CyDView>
          )}
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
                  {capitalize(transaction.metadata?.merchant?.merchantName)}
                </CyDText>
              </CyDView>
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
                      startCase(
                        (transaction.metadata?.merchant?.merchantCity).toLowerCase(),
                      ),
                    transaction.metadata?.merchant?.merchantState,
                    transaction.metadata?.merchant?.merchantCountry &&
                      startCase(
                        getCountryNameById(
                          transaction.metadata?.merchant?.merchantCountry,
                        ),
                      ),
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </CyDText>
              </CyDView>
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

          {isCredit && transaction.tokenData && (
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
                      url: getExplorerUrl(
                        transaction.tokenData?.symbol ?? '',
                        transaction.tokenData?.chain ?? '',
                        transaction.tokenData?.hash ?? '',
                      ),
                    });
                  }}>
                  <CyDText className='text-[12px]'>
                    {t('VIEW_TRANSACTION')}
                  </CyDText>
                  <CyDFastImage
                    source={AppImages.RIGHT_ARROW_LONG}
                    className='w-[12px] h-[6px] ml-[2px]'
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

          {}
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
      textColor: 'text-n600',
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
  const { getWithAuth, patchWithAuth } = useAxios();
  const cardProfile: CardProfile | undefined =
    globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider ?? CardProviders.REAP_CARD;
  const { showModal, hideModal } = useGlobalModalContext();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [limits, setLimits] = useState({});
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const [isMerchantDetailsModalVisible, setIsMerchantDetailsModalVisible] =
    useState(false);
  const viewRef = useRef<any>(null);

  const getRequiredData = async (cardId: string) => {
    if (provider && cardId) {
      try {
        const { isError, data } = await getWithAuth(
          `/v1/cards/${provider}/card/${cardId}/limits`,
        );
        if (!isError) {
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
      const payload = {
        cusL: {
          ...get(limits, 'cusL'),
          intl: {
            ...get(limits, ['cusL', CardControlTypes.INTERNATIONAL]),
            dis: false,
            cLs: [
              ...get(
                limits,
                ['cusL', CardControlTypes.INTERNATIONAL, 'cLs'],
                [],
              ),
              iso2,
            ],
          },
        },
      };
      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardId}/limits`,
        payload,
      );

      if (!response.isError) {
        showModal('state', {
          type: 'success',
          title: `Added ${iso2} to your allowed countries`,
          description: 'Please retry your transaction again.',
          onSuccess: () => {
            hideModal();
            navigation.navigate(screenTitle.CARD_CONTROLS_MENU, {
              cardId: cardId ?? '',
              currentCardProvider: provider,
            });
          },
          onFailure: hideModal,
        });
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

  const displayProps = getTransactionDisplayProps(
    transaction.type,
    transaction.tStatus,
  );

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
        ...(isAndroid() && {
          message: transaction.metadata?.merchant?.merchantName
            ? `Hey! I just spent ${transaction.amount} at ${transaction.metadata.merchant.merchantName} using my Cypher Card! 🚀 Living the crypto life!`
            : `Hey I just made this transaction using my Cypher Card! 🚀 Living the crypto life!`,
        }),
        subject: t('SHARE_TITLE'),
        url: `data:image/jpeg;base64,${url}`,
      };

      await Share.open(shareImage);
    } catch (error) {
      console.error('Share error:', error);
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
      console.error('Share error:', error);
      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Please try again',
      });
    }
  }

  return (
    <>
      {transaction?.metadata?.merchant && (
        <MerchantDetailsModal
          showModal={isMerchantDetailsModalVisible}
          setShowModal={setIsMerchantDetailsModalVisible}
          metadata={transaction?.metadata?.merchant}
        />
      )}
      <CyDSafeAreaView className='flex-1 bg-cardBg' edges={['top']}>
        <CyDTouchView
          className='w-full'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDFastImage
            className={'w-[32px] h-[32px] ml-[16px]'}
            resizeMode='cover'
            source={AppImages.BACK_ARROW_GRAY}
          />
        </CyDTouchView>
        <ViewShot ref={viewRef}>
          <CyDScrollView className='h-full bg-cardBg'>
            <CyDView className='min-h-full'>
              <CyDView
                className={
                  'flex flex-col justify-center items-center mt-[24px]'
                }>
                <CyDView className='h-[36px] w-[36px] rounded-full bg-[#DFE2E6] flex items-center justify-center'>
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
                    {getTransactionSign(transaction.type) +
                      (() => {
                        const currencyCode =
                          transaction.fxCurrencySymbol ?? 'USD';
                        const value = limitDecimalPlaces(
                          transaction.fxCurrencyValue ?? transaction.amount,
                          2,
                        );
                        const [whole] = value.split('.');
                        return (
                          (getSymbolFromCurrency(currencyCode) ??
                            currencyCode) + String(whole)
                        );
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
                      const value = limitDecimalPlaces(
                        transaction.fxCurrencyValue ?? transaction.amount,
                        2,
                      );
                      const [, decimal] = value.split('.');
                      return '.' + (decimal ? String(decimal) : '00');
                    })()}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center mt-[4px]'>
                  {getChannelIcon(transaction?.wallet ?? transaction?.channel)
                    ?.categoryIcon && (
                    <>
                      <CyDFastImage
                        source={
                          getChannelIcon(
                            transaction?.wallet ?? transaction?.channel,
                          )?.categoryIcon
                        }
                        className='h-[16px] w-[16px]'
                        resizeMode='contain'
                      />
                      <CyDText className='text-[12px] text-n200 ml-[2px] font-semibold'>
                        {
                          getChannelIcon(
                            transaction?.wallet ?? transaction?.channel,
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
                        Declined due to{' '}
                        {transaction?.cDReason ?? transaction?.dReason}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                )}
                {transaction.type !== CardTransactionTypes.CREDIT && (
                  <CyDView className='flex flex-row justify-center items-center p-[5px] bg-white rounded-tl-[12px] rounded-br-[12px] mt-[24px]'>
                    <CyDView className='bg-n20 rounded-tl-[4px] rounded-br-[4px] h-[20px] w-[20px] p-[4px]'>
                      <CyDFastImage
                        source={{ uri: transaction.iconUrl }}
                        className='w-[14px] h-[14px] rounded-[4px]'
                        resizeMode='contain'
                      />
                    </CyDView>
                    <CyDText className='ml-[4px] text-[12px] font-bold text-n500'>
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
              <CyDView
                style={{
                  minHeight: screenHeight - insets.top - 250, // 200 is approximate header height
                }}
                className='w-full bg-n0 px-[25px] mt-[24px]'>
                <TransactionDetail
                  isSettled={transaction?.isSettled ?? false}
                  isDeclined={transaction.tStatus === ReapTxnStatus.DECLINED}
                  reason={transaction?.cDReason ?? transaction?.dReason ?? ''}
                  metadata={transaction?.metadata?.merchant}
                  getRequiredData={getRequiredData}
                  cardId={transaction?.cardId ?? ''}
                  limits={limits}
                  provider={provider}
                  addIntlCountry={addIntlCountry}
                  navigation={navigation}
                  transaction={transaction}
                  setIsMerchantDetailsModalVisible={
                    setIsMerchantDetailsModalVisible
                  }
                  cardProfile={cardProfile}
                />

                {!transaction.isSettled &&
                  fxCurrencySymbol !== 'USD' &&
                  !(provider === CardProviders.REAP_CARD) && (
                    <CyDView className='bg-lightGrey'>
                      <CyDText className='px-[12px] pb-[12px] mt-[-15px]'>
                        {t('TRANSACTION_SETTLEMENT_AMOUNT')}
                      </CyDText>
                    </CyDView>
                  )}
                <CyDView className='flex flex-row justify-center mt-[24px] mb-[20px]'>
                  <Button
                    title={capitalize(t('SHARE'))}
                    onPress={() => {
                      void shareTransaction();
                    }}
                    type={ButtonType.GREY_FILL}
                    style='bg-n10 border-[1px] border-n40 py-[8px] px-[8px] text-black mx-[4px]'
                    image={AppImages.SHARE}
                    imageStyle='w-[14px] h-[14px] mr-[4px] ml-[2px]'
                    titleStyle='text-[14px] font-medium'
                  />
                  <Button
                    title={t('NEED_HELP')}
                    onPress={() => {
                      void Intercom.present();
                      sendFirebaseEvent(hdWalletContext, 'support');
                    }}
                    type={ButtonType.GREY_FILL}
                    style='bg-n10 border-[1px] border-n40 py-[8px] px-[8px] text-black mx-[4px]'
                    titleStyle='text-[14px] font-medium'
                  />
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDScrollView>
        </ViewShot>
      </CyDSafeAreaView>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'white' }} />
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    width: '100%',
    justifyContent: 'flex-end',
    margin: 0,
  },
});
