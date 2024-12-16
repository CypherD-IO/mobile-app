import React, { memo } from 'react';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { intercomAnalyticsLog } from '../../containers/utilities/analyticsUtility';
import { screenTitle } from '../../constants';
import { useTranslation } from 'react-i18next';
import {
  TransactionFilterTypes,
  CardTransactionTypes,
  ReapTxnStatus,
} from '../../constants/enum';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import moment from 'moment';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { ICardTransaction } from '../../models/card.model';
import {
  formatToLocalDate,
  getSymbolFromCurrency,
  limitDecimalPlaces,
} from '../../core/util';

interface CardTransactionItemProps {
  item: ICardTransaction;
}

const getTransactionIndicator = (type: string) => {
  switch (type.toUpperCase()) {
    case TransactionFilterTypes.CREDIT:
      return AppImages.ICON_DOWN;
    case TransactionFilterTypes.DEBIT:
      return AppImages.ICON_UP;
    case TransactionFilterTypes.REFUND:
      return AppImages.ICON_DOWN;
    default:
      return AppImages.MOVE_FUNDS;
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
const getChannelIcon = (channel: string) => CHANNEL_MAP[channel] || {};

const CardTransactionItem = ({ item }: CardTransactionItemProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {
    iconUrl,
    type,
    createdAt,
    title,
    amount,
    isSettled,
    tStatus,
    fxCurrencyValue,
    fxCurrencySymbol,
    wallet,
    channel,
  } = item;
  return (
    <>
      {/* <CyDView className='absolute bottom-[-930px] h-[1000px] w-full bg-white border-x border-sepratorColor' /> */}
      <CyDTouchView
        key={item.id}
        className={clsx(
          'h-[70px] flex flex-row justify-between items-center bg-white p-[16px] border-b border-x border-sepratorColor',
        )}
        onPress={() => {
          void intercomAnalyticsLog('card_transaction_info_clicked');
          navigation.navigate(
            screenTitle.BRIDGE_CARD_TRANSACTION_DETAILS_SCREEN,
            { transaction: item },
          );
        }}>
        <CyDView
          className={
            'flex flex-row justify-start align-center items-center w-[65%]'
          }>
          <CyDView className='w-[28px] h-[28px] rounded-tl-[8px] rounded-br-[8px] items-center justify-center bg-n30'>
            <CyDFastImage
              source={
                iconUrl && iconUrl !== ''
                  ? { uri: iconUrl }
                  : getTransactionIndicator(type)
              }
              className={clsx('h-[14px] w-[14px]', {})}
              resizeMode={'contain'}
            />
          </CyDView>
          <CyDView className={'ml-[12px]'}>
            <CyDText
              className='font-medium font-[13px] flex-wrap w-[200px]'
              ellipsizeMode='tail'
              numberOfLines={1}>
              {title.replace(/\s+/g, ' ')}
            </CyDText>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='text-[11px] font-base150'>
                {formatToLocalDate(moment.unix(createdAt).toISOString())}
              </CyDText>
              {getChannelIcon(wallet ?? channel).categoryIcon && (
                <>
                  <CyDView className='w-[4px] h-[4px] bg-base150 rounded-full mx-[4px]' />

                  <CyDFastImage
                    source={getChannelIcon(wallet ?? channel).categoryIcon}
                    className='h-[16px] w-[16px]'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[10px] font-semibold ml-[2px] text-base150'>
                    {getChannelIcon(wallet ?? channel).paymentChannel}
                  </CyDText>
                </>
              )}
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='flex justify-center items-end'>
          {tStatus === ReapTxnStatus.DECLINED ? (
            <CyDView className='flex flex-row items-center'>
              <CyDImage
                source={AppImages.GREY_EXCLAMATION_ICON}
                className='mr-[2px] h-[20px] w-[20px]'
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
      </CyDTouchView>
    </>
  );
};

export default memo(CardTransactionItem);
