import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import {
  HdWalletContext,
  copyToClipboard,
  formatAmount,
  getExplorerUrlFromBackendNames,
  limitDecimalPlaces,
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
} from '../../../constants/enum';
import clsx from 'clsx';
import { screenTitle } from '../../../constants';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { ICardTransaction } from '../../../models/card.model';
import { capitalize, split } from 'lodash';
import { t } from 'i18next';
import { CardProfile } from '../../../models/cardProfile.model';
import Toast from 'react-native-toast-message';

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
        'flex flex-row justify-center items-center px-[8px] mb-[20px]'
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
        className='w-[60%] pl-[10px] justify-center items-start flex flex-row'>
        <CyDText
          className={clsx('font-bold', {
            'text-blue-500 underline': isHash && hashIsValid,
            'text-red-500': item.label === t('STATUS') && value === 'DECLINED',
          })}>
          {item.label === t('TRANSACTION_ID') && value.length > 20
            ? `${value.slice(0, 10)}....${value.slice(-4)}`
            : value}
        </CyDText>
        {item.label === t('TRANSACTION_ID') && (
          <CyDTouchView
            onPress={() => {
              copyToClipboard(value);
              Toast.show({
                type: 'success',
                text1: t('TRANSACTION_ID_COPIED'),
              });
            }}>
            <CyDImage
              source={AppImages.COPY}
              className='h-[16px] w-[16px] ml-[8px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        )}
      </CyDTouchView>
    </CyDView>
  );
};

const TransactionDetail = ({
  item,
  isSettled,
  isDeclined = false,
  reason = '',
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
}) => {
  return (
    <CyDView className='pb-[5px] rounded-[7px] mt-[25px] bg-lightGrey'>
      <CyDView className='flex flex-row items-center px-[8px] pt-[15px] pb-[7px] border-b-[1px] border-sepratorColor'>
        <CyDFastImage
          className={'h-[20px] w-[20px] mr-[10px]'}
          source={item.icon}
          resizeMode={'contain'}
        />
        <CyDText className={'text-[18px] font-extrabold'}>{item.title}</CyDText>
      </CyDView>
      <CyDView className={'mt-[12px]'}>
        {item.data.map((detailItem, index) => {
          // Check to remove default as a item value.
          if (!(detailItem.value === 'default')) {
            return <DetailItem item={detailItem} key={index} />;
          } else {
            return null;
          }
        })}
        {!isSettled && item.title === t('TRANSACTION_DETAILS') && (
          <CyDView>
            <CyDText className='pl-[12px]'>
              <CyDText className='font-bold underline'>
                {isDeclined ? 'Reason:' : 'Note:'}
              </CyDText>
              {' ' + (isDeclined ? reason : t('TRANSACTION_YET_TO_BE_SETTLED'))}
            </CyDText>
          </CyDView>
        )}
      </CyDView>
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
          { label: t('CATEGORY'), value: capitalize(transaction.category) },
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
                reason={transaction?.dReason ?? transaction?.cDReason ?? ''}
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
