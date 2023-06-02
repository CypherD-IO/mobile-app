import Intercom from '@intercom/intercom-react-native';
import moment from 'moment';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { string } from 'yup';
import AppImages from '../../../../assets/images/appImages';
import { HdWalletContext } from '../../../core/util';
import { CyDImage, CyDSafeAreaView, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';
export default function TransactionDetails({navigation, route}: {navigation: any, route: {params:any}}) {

  const {transaction} = route.params
  const {metadata} = transaction
  const {merchant} = metadata;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const {t} = useTranslation();

  const getMerchantAddress = () => {
    const {merchantCity, merchantState, merchantCountry, postalCode} = merchant;
    let address = merchantCity;
    if(merchantState !== '') address+= ', ' + merchantState;
    if(merchantCountry !== '') address+= ', ' + merchantCountry;
    if(postalCode !== '') address+= ' - ' + postalCode;
    return address;
  }

  const transactionDetails = [
    {
      icon: AppImages.PAYMENT_DETAILS,
      title: t('PAYMENT_DETAILS'),
      data: [
        {label: t('TRANSACTION_ID'), value: transaction.id},
        {label: t('PAYMENT_MODE'), value: metadata.authMethod},
        {label: t('PAYMENT_TYPE'), value: metadata.wallet},
      ]
    },
    {
      icon: AppImages.MERCHANT_DETAILS,
      title: t('MERCHANT_DETAILS'),
      data: [
        {label: t('NAME'), value: merchant.merchantName},
        {label: t('ADDRESS'), value: getMerchantAddress()},
        {label: t('CATEGORY'), value: transaction.category}
      ]
    },
    {
      icon: AppImages.CURRENCY_DETAILS,
      title: t('CURRENCY_DETAILS'),
      data: [
        {label: t('AMOUNT_SPENT'), value: '$ ' + (-Number(transaction.amount))},
        {label: t('CONVERSION_RATE') + `\n(USD to ${metadata.localTransactionCurrency})`, value: (Number(metadata.localTransactionAmount)/-Number(transaction.amount)).toFixed(2)},
        {label: t('DOMESTIC_CURRENCY_SPENT'), value: (metadata.localTransactionAmount) + ' ' + metadata.localTransactionCurrency},
      ]
    }
  ]

  const formatDate = (date: Date) => {
    return moment(date).format('MMM DD YYYY, h:mm a');
  };

  const DetailItem = ({item}) => {
    return(
      <CyDView className={'flex flex-row px-[8px] ml-[25px] mb-[20px]'}>
        <CyDView className={'w-[45%]'}>
          <CyDText className={'text-[16px] w-[95%]'}>{item.label}</CyDText>
        </CyDView>
        <CyDView className={'w-[55%]'}>
          <CyDText className={'font-bold'}>{item.value}</CyDText>
        </CyDView>
      </CyDView>
    )
  }

  const TransactionDetail = ({item}) => {
    return(
      <CyDView className='pb-[5px] rounded-[7px] mt-[25px] bg-lightGrey'>
        <CyDView className='flex flex-row items-center px-[8px] pt-[15px] pb-[7px] border-b-[1px] border-sepratorColor'>
          <CyDImage className={'h-[20px] w-[20px] mr-[5px]'} source={item.icon} resizeMode={'contain'}></CyDImage>
          <CyDText className={'text-[18px] font-extrabold'}>{item.title}</CyDText>
        </CyDView>
        <CyDView className={'mt-[12]'}>
          {item.data.map((detailItem, index) => {
            return (
              <DetailItem item={detailItem} key={index}/>
            )
          })}
        </CyDView>
      </CyDView>
    )
  }

  return(
    <CyDSafeAreaView>
      <CyDScrollView className='h-full bg-white px-[25px]'>
        <CyDView className={'flex flex-col justify-center items-center'}>
          <CyDImage source={{uri: transaction.iconUrl}} className={'h-[50px] w-[50px]'} resizeMode={'contain'}></CyDImage>
          <CyDText className='font-extrabold text-[45px] mt-[5px]'>{'$' + -Number(transaction.amount)}</CyDText>
          <CyDText>{formatDate(transaction.date)}</CyDText>
        </CyDView>
        {transactionDetails.map((transaction, index) => {
          return (
            <TransactionDetail item={transaction} key={index}/>
          )
        })}
        <CyDTouchView onPress={async () => { await Intercom.displayMessenger(); sendFirebaseEvent(hdWalletContext, 'support');}} className={'flex flex-row justify-center py-[7px] my-[20px] border-[1px] rounded-[7px] border-sepratorColor'}>
          <CyDText className='font-extrabold'>{t<string>('NEED_HELP')}</CyDText>
        </CyDTouchView>
      </CyDScrollView>
    </CyDSafeAreaView>
  )
}
