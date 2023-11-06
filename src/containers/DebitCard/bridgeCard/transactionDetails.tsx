import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import {
  HdWalletContext,
  formatAmount,
  getExplorerUrlFromBackendNames,
} from '../../../core/util';
import {
  CyDFastImage,
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
} from '../../../constants/enum';
import clsx from 'clsx';
import { screenTitle } from '../../../constants';
import { useNavigation } from '@react-navigation/native';
import { GlobalContext } from '../../../core/globalContext';
import { ICardTransaction } from '../../../models/card.model';

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
        className='w-[60%] pl-[10px] justify-center items-start'>
        <CyDText
          className={clsx('font-bold', {
            'text-blue-500 underline': isHash && hashIsValid,
          })}>
          {value}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
};

const TransactionDetail = ({
  item,
}: {
  item: {
    icon: any;
    title: string;
    data: Array<{
      label: string;
      value: any;
    }>;
  };
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
          }
        })}
      </CyDView>
    </CyDView>
  );
};

export default function TransactionDetails({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: any };
}) {
  const { t } = useTranslation();
  const { transaction }: { transaction: ICardTransaction } = route.params;
  const {
    fxCurrencySymbol,
    fxCurrencyValue,
    fxConversionPrice,
    title: merchantName,
  } = transaction;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext(GlobalContext);
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
    transaction.type === CardTransactionTypes.REFUND
  ) {
    const last4 =
      globalContext?.globalState.cardProfile?.pc?.cards?.reduce((_, curVal) => {
        if (curVal?.cardId === transaction.cardId) {
          return curVal?.last4;
        } else {
          return 'XXXX';
        }
      }, 'XXXX') ?? 'XXXX';
    const debitOrRefundDetails = [
      {
        icon: AppImages.PAYMENT_DETAILS,
        title: t('TRANSACTION_DETAILS'),
        data: [
          { label: t('TRANSACTION_ID'), value: transaction.id },
          { label: t('TYPE'), value: transaction.type },
          {
            label: t('STATUS'),
            value: transaction.isSettled ? t('SETTLED') : t('PENDING'),
          },
          { label: t('CARD'), value: 'XXXX XXXX XXXX ' + last4 },
        ],
      },
      {
        icon: AppImages.MERCHANT_DETAILS,
        title: t('MERCHANT_DETAILS'),
        data: [
          { label: t('NAME'), value: merchantName },
          { label: t('CATEGORY'), value: transaction.category },
        ],
      },
      {
        icon: AppImages.CURRENCY_DETAILS,
        title: t('CURRENCY_CONVERSION_DETAILS'),
        data: [
          {
            label: t('AMOUNT_SPENT'),
            value: '$ ' + String(transaction.amount),
          },
          {
            label:
              t('CONVERSION_RATE') +
              '\n' +
              `(USD to ${String(fxCurrencySymbol)})`,
            value: formatAmount(fxConversionPrice),
          },
          {
            label: t('DOMESTIC_CURRENCY_SPENT'),
            value: String(fxCurrencyValue) + ' ' + String(fxCurrencySymbol),
          },
        ],
      },
    ];
    debitOrRefundDetails.forEach(detail => {
      transactionDetails.push(detail);
    });
  } else if (transaction.type === CardTransactionTypes.CREDIT) {
    const dataIsAvailable = transaction.tokenData !== undefined;
    const type = transaction.type;
    const id = dataIsAvailable ? transaction.id : 'N/A';
    const chain = dataIsAvailable ? transaction.tokenData.chain : 'N/A';
    const hash = dataIsAvailable ? transaction.tokenData.hash : 'N/A';
    const tokenNos = dataIsAvailable ? transaction.tokenData.tokenNos : 'N/A';
    const symbol = dataIsAvailable ? transaction.tokenData.symbol : '';
    const creditDetails = [
      {
        icon: AppImages.PAYMENT_DETAILS,
        title: t('TRANSACTION_DETAILS'),
        data: [
          { label: t('TRANSACTION_ID'), value: id },
          { label: t('TYPE'), value: type },
        ],
      },
      {
        icon: AppImages.CARD_SEL,
        title: t('LOADING_DETAILS'),
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
              '$' +
              String(transaction.amount)}
          </CyDText>
          <CyDText>{formatDate(transaction.date)}</CyDText>
        </CyDView>
        {transactionDetails.map((item, index) => {
          if (
            !(fxCurrencySymbol === 'USD' && index === 2) &&
            !(transaction.type === CardTransactionTypes.REFUND && index === 2)
          ) {
            return <TransactionDetail item={item} key={index} />;
          }
        })}
        <CyDTouchView
          onPress={async () => {
            await Intercom.displayMessenger();
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
