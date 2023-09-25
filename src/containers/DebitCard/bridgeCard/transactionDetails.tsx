import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import { HdWalletContext, formatAmount } from '../../../core/util';
import { CyDFastImage, CyDSafeAreaView, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';

export default function TransactionDetails({ navigation, route }: { navigation: any, route: { params: any } }) {
  const { t } = useTranslation();
  const { transaction } = route.params;
  const { fxCurrencySymbol, fxCurrencyValue, fxConversionPrice, title: merchantName } = transaction;
  const hdWalletContext = useContext<any>(HdWalletContext);

  const transactionDetails = [
    {
      icon: AppImages.PAYMENT_DETAILS,
      title: t('TRANSACTION_DETAILS'),
      data: [
        { label: t('TRANSACTION_ID'), value: transaction.id }
      ]
    },
    {
      icon: AppImages.MERCHANT_DETAILS,
      title: t('MERCHANT_DETAILS'),
      data: [
        { label: t('NAME'), value: merchantName },
        { label: t('CATEGORY'), value: transaction.category }
      ]
    },
    {
      icon: AppImages.CURRENCY_DETAILS,
      title: t('CURRENCY_CONVERSION_DETAILS'),
      data: [
        { label: t('AMOUNT_SPENT'), value: '$ ' + String(transaction.amount) },
        { label: t('CONVERSION_RATE') + '\n' + `(USD to ${String(fxCurrencySymbol)})`, value: formatAmount(fxConversionPrice) },
        { label: t('DOMESTIC_CURRENCY_SPENT'), value: String(fxCurrencyValue) + ' ' + String(fxCurrencySymbol) }
      ]
    }
  ];

  const formatDate = (date: Date) => {
    return moment(date).format('MMM DD YYYY, h:mm a');
  };

  const DetailItem = ({ item }) => {
    return (
      <CyDView className={'flex flex-row justify-center items-center px-[8px] mb-[20px]'}>
        <CyDView className={'w-[50%] pr-[20px] justify-center items-end'}>
          <CyDText className={'text-[16px] text-right'}>{item.label}</CyDText>
        </CyDView>
        <CyDView className={'w-[50%] pl-[20px] justify-center items-start'}>
          <CyDText className={'font-bold text-left'}>{item.value}</CyDText>
        </CyDView>
      </CyDView>
    );
  };

  const TransactionDetail = ({ item }) => {
    return (
      <CyDView className='pb-[5px] rounded-[7px] mt-[25px] bg-lightGrey'>
        <CyDView className='flex flex-row items-center px-[8px] pt-[15px] pb-[7px] border-b-[1px] border-sepratorColor'>
          <CyDFastImage className={'h-[20px] w-[20px] mr-[10px]'} source={item.icon} resizeMode={'contain'} />
          <CyDText className={'text-[18px] font-extrabold'}>{item.title}</CyDText>
        </CyDView>
        <CyDView className={'mt-[12px]'}>
          {item.data.map((detailItem, index) => {
            return (
              <DetailItem item={detailItem} key={index} />
            );
          })}
        </CyDView>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView>
      <CyDScrollView className='h-full bg-white px-[25px]'>
        <CyDView className={'flex flex-col justify-center items-center'}>
          <CyDFastImage source={{ uri: transaction.iconUrl }} className={'h-[50px] w-[50px]'} resizeMode={'contain'} />
          <CyDText className='font-extrabold text-[45px] mt-[5px]'>{'$' + Number(transaction.amount)}</CyDText>
          <CyDText>{formatDate(transaction.date)}</CyDText>
        </CyDView>
        {transactionDetails.map((transaction, index) => {
          if (!(fxCurrencySymbol === 'USD' && index === 2)) {
            return (
              <TransactionDetail item={transaction} key={index} />
            );
          }
        })}
        <CyDTouchView onPress={async () => { await Intercom.displayMessenger(); sendFirebaseEvent(hdWalletContext, 'support'); }} className={'flex flex-row justify-center py-[7px] my-[20px] border-[1px] rounded-[7px] border-sepratorColor'}>
          <CyDText className='font-extrabold'>{t<string>('NEED_HELP')}</CyDText>
        </CyDTouchView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
