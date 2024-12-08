import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import {
  HdWalletContext,
  copyToClipboard,
  formatAmount,
  getCountryNameById,
  getExplorerUrlFromBackendNames,
  limitDecimalPlaces,
  parseErrorMessage,
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
  ICardSubObjectMerchant,
  ICardTransaction,
} from '../../../models/card.model';
import { capitalize, get, isEmpty, split } from 'lodash';
import { t } from 'i18next';
import { CardProfile } from '../../../models/cardProfile.model';
import Toast from 'react-native-toast-message';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';

const TRANSACTION_DETAILS_TITLE = t('TRANSACTION_DETAILS');

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

const CopyButton = ({ label, value }: { label: string; value: string }) => {
  const { t } = useTranslation();

  const handleCopy = () => {
    copyToClipboard(value);
    Toast.show({
      type: 'success',
      text1: `${label} Copied`,
    });
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

const DetailItem = ({
  item,
}: {
  item: {
    label: string;
    value: any;
  };
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isHash = item.label === t('HASH');
  const hashIsValid = item.value.hash !== 'N/A';
  const value = isHash
    ? hashIsValid
      ? formatHash(item.value.hash)
      : item.value.hash
    : item.value;
  return (
    <CyDView
      className={
        'flex flex-row justify-between items-center px-[8px] mb-[20px]'
      }>
      <CyDView className={'w-[40%] justify-center items-start'}>
        <CyDText className={'text-[16px]'}>{item.label}</CyDText>
      </CyDView>
      <CyDTouchView
        disabled={!(isHash && hashIsValid)}
        onPress={() => {
          const chainString = item.value.chain;
          navigation.navigate(screenTitle.TRANS_DETAIL, {
            url: getExplorerUrlFromBackendNames(chainString, item.value.hash),
          });
        }}
        className='w-[60%] pl-[10px] justify-end items-start flex flex-row'>
        <CyDText
          className={clsx('font-bold text-right', {
            'text-blue-500 underline': isHash && hashIsValid,
            'text-red-500': item.label === t('STATUS') && value === 'DECLINED',
          })}>
          {item.label === t('TRANSACTION_ID') && value.length > 20
            ? `${value.slice(0, 10)}....${value.slice(-4)}`
            : value}
        </CyDText>
        {[t('TRANSACTION_ID'), t('MERCHANT_ID'), t('MCC_CODE')].includes(
          item.label,
        ) && <CopyButton label={item.label} value={value} />}
      </CyDTouchView>
    </CyDView>
  );
};

const TransactionDetail = ({
  item,
  isSettled,
  isDeclined = false,
  reason = '',
  metadata,
  addIntlCountry,
  cardId,
  navigation,
  provider,
}: {
  item: {
    icon: any;
    title: string;
    data: Array<{
      label: string;
      value: any;
    }>;
  };
  isSettled: boolean;
  isDeclined?: boolean;
  reason?: string;
  metadata?: ICardSubObjectMerchant;
  cardId: string;
  provider: CardProviders;
  addIntlCountry: (iso2: string, cardId: string) => Promise<void>;
  navigation: NavigationProp<ParamListBase>;
}) => {
  const isCountryDisabled =
    reason?.includes('International transactions are disabled') ||
    reason?.includes('is not in the allow list');

  return (
    <CyDView>
      <CyDView className='pb-[5px] rounded-[7px] mt-[25px] bg-lightGrey'>
        <CyDView className='flex flex-row items-center px-[8px] pt-[15px] pb-[7px] border-b-[1px] border-sepratorColor'>
          <CyDFastImage
            className={'h-[20px] w-[20px] mr-[10px]'}
            source={item.icon}
            resizeMode={'contain'}
          />
          <CyDText className={'text-[18px] font-extrabold'}>
            {item.title}
          </CyDText>
        </CyDView>
        <CyDView className={'mt-[12px]'}>
          {item.data.map((detailItem, index) => {
            if (!(detailItem.value === 'default')) {
              return <DetailItem item={detailItem} key={index} />;
            } else {
              return null;
            }
          })}
          {!isSettled && item.title === TRANSACTION_DETAILS_TITLE && (
            <CyDView>
              <CyDText className='pl-[12px]'>
                <CyDText className='font-bold underline'>
                  {isDeclined ? 'Reason:' : 'Note:'}
                </CyDText>
                {' ' +
                  (isDeclined ? reason : t('TRANSACTION_YET_TO_BE_SETTLED'))}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDView>

      {metadata?.merchantCountry &&
        isCountryDisabled &&
        isDeclined &&
        item.title === TRANSACTION_DETAILS_TITLE && (
          <CyDView className='bg-n0 rounded-[12px] border border-[#E9EBF8] p-[12px] mt-[8px]'>
            <CyDView className='flex-row items-start'>
              <CyDImage
                source={AppImages.INFO_CIRCLE}
                className='w-[24px] h-[24px]'
              />

              <CyDText className='text-[12px] font-medium ml-[8px] flex-1'>
                {`Add ${metadata?.merchantCountry} to your allowed countries or update card settings to match your requirements.`}
              </CyDText>
            </CyDView>
            <CyDView className='mt-[10px] flex-row items-center flex-1'>
              <CyDTouchView
                className='border border-[#DFE2E6] rounded-[4px] bg-[#FAFBFB] px-[8px] py-[6px] flex-1'
                onPress={() => {
                  navigation.navigate(screenTitle.INTERNATIONAL_CARD_CONTROLS, {
                    cardId: cardId ?? '',
                    currentCardProvider: provider,
                    cardControlType: CardControlTypes.INTERNATIONAL,
                  });
                }}>
                <CyDText className='text-center text-[14px] font-semibold'>
                  {'Review Settings'}
                </CyDText>
              </CyDTouchView>
              <CyDTouchView
                className={clsx(
                  'border border-p40 rounded-[4px] bg-p40 px-[8px] py-[6px] flex-1 ml-[10px]',
                )}
                onPress={() => {
                  void addIntlCountry(metadata?.merchantCountry, cardId ?? '');
                }}>
                <CyDText className='text-center text-[14px] font-semibold'>
                  {`Add ${metadata?.merchantCountry}`}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
        )}
    </CyDView>
  );
};

interface RouteParams {
  transaction: ICardTransaction;
}
export default function TransactionDetails() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { transaction }: { transaction: ICardTransaction } = route.params;
  const {
    fxCurrencySymbol,
    fxCurrencyValue,
    fxConversionPrice,
    title: merchantName,
  } = transaction;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, patchWithAuth } = useAxios();
  const cardProfile: CardProfile | undefined =
    globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider ?? CardProviders.REAP_CARD;
  const transactionDetails: Array<{
    icon: any;
    title: string;
    data: Array<{
      label: string;
      value: any;
    }>;
  }> = [];
  const { showModal, hideModal } = useGlobalModalContext();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [limits, setLimits] = useState({});

  if (
    transaction.type === CardTransactionTypes.DEBIT ||
    transaction.type === CardTransactionTypes.REFUND ||
    transaction.type === CardTransactionTypes.WITHDRAWAL
  ) {
    const last4 =
      globalContext?.globalState.cardProfile?.pc?.cards?.reduce((_, curVal) => {
        if (curVal?.cardId === transaction.cardId) {
          return curVal?.last4;
        } else {
          return 'XXXX';
        }
      }, 'XXXX') ?? 'XXXX';
    const transactionId =
      (transaction.id && split(transaction.id, ':')[1]) || transaction.id;
    const debitOrRefundDetails = [
      {
        icon: AppImages.PAYMENT_DETAILS,
        title: t('TRANSACTION_DETAILS'),
        data: [
          { label: t('TRANSACTION_ID'), value: transactionId },
          { label: t('TYPE'), value: transaction.type },
          {
            label: t('STATUS'),
            value:
              transaction.tStatus === ReapTxnStatus.DECLINED
                ? t('DECLINED')
                : transaction.isSettled
                  ? t('SETTLED')
                  : t('PENDING'),
          },
        ],
      },
      {
        icon: AppImages.MERCHANT_DETAILS,
        title: t('MERCHANT_DETAILS'),
        data: [
          { label: t('NAME'), value: merchantName },
          ...(transaction.metadata?.merchant?.merchantCategoryCode
            ? [
                {
                  label: t('MCC_CODE'),
                  value: transaction.metadata?.merchant?.merchantCategoryCode,
                },
              ]
            : []),
          ...(transaction.metadata?.merchant?.merchantId
            ? [
                {
                  label: t('MERCHANT_ID'),
                  value: transaction.metadata?.merchant?.merchantId,
                },
              ]
            : []),
          { label: t('CATEGORY'), value: capitalize(transaction.category) },
          ...(transaction.metadata?.merchant?.merchantCountry
            ? [
                {
                  label: t('COUNTRY'),
                  value:
                    getCountryNameById(
                      transaction.metadata?.merchant?.merchantCountry,
                    ) ?? transaction.metadata?.merchant?.merchantCountry,
                },
              ]
            : []),
        ],
      },
    ];
    if (fxCurrencySymbol && fxCurrencySymbol !== 'USD') {
      debitOrRefundDetails.push({
        icon: AppImages.CURRENCY_DETAILS,
        title: t('CURRENCY_CONVERSION_DETAILS'),
        data: [
          {
            label: t('BILLED_AMOUNT'),
            value: '$ ' + String(transaction.amount),
          },
          {
            label:
              t('CONVERSION_RATE') +
              '\n' +
              `(USD to ${String(fxCurrencySymbol)})`,
            value: formatAmount(fxConversionPrice ?? 0),
          },
          {
            label: t('TRANSACTION_AMOUNT'),
            value: String(fxCurrencyValue) + ' ' + String(fxCurrencySymbol),
          },
        ],
      });
    }
    if (last4 !== 'XXXX') {
      debitOrRefundDetails[0].data.push({
        label: t('CARD'),
        value: 'XXXX XXXX XXXX ' + last4,
      });
    }
    debitOrRefundDetails.forEach(detail => {
      transactionDetails.push(detail);
    });
  } else if (transaction.type === CardTransactionTypes.CREDIT) {
    const type = transaction.type;
    const id = transaction.id
      ? split(transaction.id, ':')[1] || transaction.id
      : 'N/A';
    const chain = transaction?.tokenData?.chain ?? 'N/A';
    const hash = transaction?.tokenData?.hash ?? 'N/A';
    const tokenNos = transaction?.tokenData?.tokenNos ?? 'N/A';
    const symbol = transaction?.tokenData?.symbol ?? '';
    const creditDetails = [
      {
        icon: AppImages.PAYMENT_DETAILS,
        title: t('TRANSACTION_DETAILS'),
        data: [
          { label: t('TRANSACTION_ID'), value: id },
          { label: t('TYPE'), value: type },
        ],
      },
      ...(transaction.tokenData
        ? [
            {
              icon: AppImages.CARD_SEL,
              title: t('TOKEN_DETAILS'),
              data: [
                { label: t('CHAIN'), value: chain },
                {
                  label: t('LOADED_AMOUNT'),
                  value: `${String(formatAmount(tokenNos, 2))} ${String(
                    symbol.toUpperCase(),
                  )}`,
                },
                { label: t('HASH'), value: { hash, chain } },
              ],
            },
          ]
        : []),
    ];
    creditDetails.forEach(detail => {
      transactionDetails.push(detail);
    });
  }

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
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CyDScrollView className='h-full bg-white px-[25px]'>
        <CyDView className={'flex flex-col justify-center items-center'}>
          <CyDFastImage
            source={{ uri: transaction.iconUrl }}
            className={'h-[50px] w-[50px]'}
            resizeMode={'contain'}
          />
          <CyDText className='font-extrabold text-[45px] mt-[5px]'>
            {getTransactionSign(transaction.type) +
              limitDecimalPlaces(
                transaction.fxCurrencyValue ?? transaction.amount,
                2,
              ) +
              ' ' +
              (transaction.fxCurrencySymbol ?? 'USD')}
          </CyDText>
          <CyDText>{formatDate(transaction.date)}</CyDText>
        </CyDView>
        {transactionDetails.map((item, index) => {
          if (
            !(fxCurrencySymbol === 'USD' && index === 2) &&
            !(transaction.type === CardTransactionTypes.REFUND && index === 2)
          ) {
            return (
              <TransactionDetail
                item={item}
                key={index}
                isSettled={transaction?.isSettled ?? false}
                isDeclined={transaction.tStatus === ReapTxnStatus.DECLINED}
                reason={transaction?.cDReason ?? transaction?.dReason ?? ''}
                metadata={transaction?.metadata?.merchant}
                cardId={transaction?.cardId ?? ''}
                addIntlCountry={addIntlCountry}
                provider={provider}
                navigation={navigation}
              />
            );
          } else {
            return null;
          }
        })}
        {!transaction.isSettled &&
          fxCurrencySymbol !== 'USD' &&
          !(provider === CardProviders.REAP_CARD) && (
            <CyDView className='bg-lightGrey'>
              <CyDText className='px-[12px] pb-[12px] mt-[-15px]'>
                {t('TRANSACTION_SETTLEMENT_AMOUNT')}
              </CyDText>
            </CyDView>
          )}
        <CyDTouchView
          onPress={() => {
            void Intercom.present();
            sendFirebaseEvent(hdWalletContext, 'support');
          }}
          className={
            'flex flex-row justify-center py-[7px] my-[20px] border-[1px] rounded-[7px] border-sepratorColor'
          }>
          <CyDText className='font-extrabold'>{t<string>('NEED_HELP')}</CyDText>
        </CyDTouchView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
