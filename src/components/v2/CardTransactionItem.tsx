import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import clsx from 'clsx';
import moment from 'moment';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import {
  CardTransactionTypes,
  ReapTxnStatus,
  TransactionFilterTypes,
} from '../../constants/enum';
import { intercomAnalyticsLog } from '../../containers/utilities/analyticsUtility';
import {
  formatToLocalDate,
  getSymbolFromCurrency,
  limitDecimalPlaces,
} from '../../core/util';
import { ICardTransaction } from '../../models/card.model';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { get } from 'lodash';

interface CardTransactionItemProps {
  item: ICardTransaction;
}

const getTransactionIndicator = (type: string) => {
  switch (type.toUpperCase()) {
    case TransactionFilterTypes.CREDIT:
      return 'arrow-down-circle';
    case TransactionFilterTypes.DEBIT:
      return 'arrow-up-circle';
    case TransactionFilterTypes.REFUND:
      return 'arrow-down-circle';
    default:
      return 'transfer';
  }
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
const getChannelIcon = (channel: string) => get(CHANNEL_MAP, [channel], {});

const CardTransactionItem = ({ item }: CardTransactionItemProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {
    iconUrl,
    type,
    createdAt,
    title,
    amount,
    tStatus,
    fxCurrencyValue,
    fxCurrencySymbol,
    wallet,
    channel,
  } = item;
  return (
    <>
      {/* <CyDView className='absolute bottom-[-930px] h-[1000px] w-full bg-n0 border-x n40' /> */}
      <CyDTouchView
        key={item.id}
        className={clsx(
          'flex flex-col p-[16px] border-b border-n40 rounded-[22px]',
        )}
        onPress={() => {
          void intercomAnalyticsLog('card_transaction_info_clicked');
          navigation.navigate(screenTitle.CARD_TRANSACTION_DETAILS_SCREEN, {
            transaction: item,
          });
        }}>
        <CyDView className='flex flex-row justify-between items-center w-full'>
          <CyDView
            className={
              'flex flex-row justify-start align-center items-center w-[65%]'
            }>
            <CyDView className='w-[28px] h-[28px] rounded-tl-[8px] rounded-br-[8px] items-center justify-center bg-n30'>
              {iconUrl && iconUrl !== '' ? (
                <CyDFastImage
                  source={{ uri: iconUrl }}
                  className={clsx('h-[14px] w-[14px]', {})}
                  resizeMode={'contain'}
                />
              ) : (
                <CyDMaterialDesignIcons
                  name={getTransactionIndicator(type)}
                  size={16}
                  className={clsx('text-base400', {
                    invert:
                      type === CardTransactionTypes.CREDIT ||
                      type === CardTransactionTypes.REFUND ||
                      type === CardTransactionTypes.DEBIT,
                  })}
                />
              )}
            </CyDView>
            <CyDView className={'ml-[12px]'}>
              <CyDText
                className='font-[600] text-[13px] flex-wrap w-[200px]'
                ellipsizeMode='tail'
                numberOfLines={1}>
                {title.replace(/\s+/g, ' ')}
              </CyDText>
              <CyDView className='flex flex-row items-center'>
                <CyDText className='text-[11px] font-base150'>
                  {formatToLocalDate(moment.unix(createdAt).toISOString())}
                </CyDText>
                {getChannelIcon(wallet ?? channel ?? '').categoryIcon && (
                  <>
                    <CyDView className='w-[4px] h-[4px] bg-base150 rounded-full mx-[4px]' />

                    <CyDFastImage
                      source={
                        getChannelIcon(wallet ?? channel ?? '').categoryIcon
                      }
                      className='h-[16px] w-[16px]'
                      resizeMode='contain'
                    />
                  </>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='flex justify-center items-end'>
            {tStatus === ReapTxnStatus.DECLINED ? (
              <CyDView className='flex flex-row items-center'>
                <CyDMaterialDesignIcons
                  name='alert-circle'
                  size={20}
                  className='text-n200 mr-[2px]'
                />
                <CyDText className='text-[14px] font-weight-500 mr-[5px] text-n200'>
                  {t('DECLINED')}
                </CyDText>
              </CyDView>
            ) : (
              <CyDText
                className={clsx('font-[600] text-[14px] mr-[5px]', {
                  'text-successTextGreen':
                    type === CardTransactionTypes.CREDIT ||
                    type === CardTransactionTypes.REFUND,
                })}>
                {getTransactionSign(type)}
                {getSymbolFromCurrency(fxCurrencySymbol ?? 'USD') ??
                  fxCurrencySymbol}{' '}
                {limitDecimalPlaces(fxCurrencyValue ?? amount, 2)}{' '}
              </CyDText>
            )}
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center w-full'>
          {item.metadata?.merchant?.merchantCountry &&
            item.metadata.merchant.merchantCountry !== 'US' &&
            !item.fxCurrencySymbol &&
            item.type === CardTransactionTypes.DEBIT &&
            item.tStatus !== ReapTxnStatus.DECLINED && (
              <CyDView className='bg-p10 rounded-full flex flex-row items-center px-[12px] py-[6px] mt-[8px] w-full'>
                <CyDMaterialDesignIcons
                  name='exclamation'
                  size={14}
                  className='text-red400 mr-[2px]'
                />
                <CyDText className='font-bold text-[12px] mr-[2px]'>
                  {t('ATTENTION')}:
                </CyDText>
                <CyDText className='text-[12px] flex-1 flex-wrap'>
                  {t('OVERCHARGED_BY_MERCHANT')}
                </CyDText>
              </CyDView>
            )}
        </CyDView>
      </CyDTouchView>
    </>
  );
};

export default memo(CardTransactionItem);
