import React, { memo } from 'react';
import {
  CyDFastImage,
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
} from '../../constants/enum';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { ICardTransaction } from '../../models/card.model';
import { formatToLocalDate, limitDecimalPlaces } from '../../core/util';

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

const CardTransactionItem = ({ item }: CardTransactionItemProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { iconUrl, type, createdAt, title, amount, isSettled } = item;
  return (
    <>
      {/* <CyDView className='absolute bottom-[-930px] h-[1000px] w-full bg-white border-x border-sepratorColor' /> */}
      <CyDTouchView
        key={item.id}
        className={clsx(
          'h-[70px] flex flex-row justify-between items-center bg-white px-[10px] border-b border-x border-sepratorColor',
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
          <CyDFastImage
            source={
              iconUrl && iconUrl !== ''
                ? { uri: iconUrl }
                : getTransactionIndicator(type)
            }
            className={clsx('h-[30px] w-[30px]', {})}
            resizeMode={'contain'}
          />
          <CyDView className={'ml-[10px]'}>
            <CyDText
              className='font-bold flex-wrap w-[200px]'
              ellipsizeMode='tail'
              numberOfLines={1}>
              {title.replace(/\s+/g, ' ')}
            </CyDText>
            <CyDText>
              {formatToLocalDate(moment.unix(createdAt).toISOString())}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='flex justify-center items-end'>
          <CyDText
            className={clsx('font-bold text-[16px] mr-[5px]', {
              'text-redCyD':
                type === CardTransactionTypes.DEBIT ||
                type === CardTransactionTypes.WITHDRAWAL,
              'text-successTextGreen': type === CardTransactionTypes.CREDIT,
              'text-darkYellow': type === CardTransactionTypes.REFUND,
              'text-black': !isSettled,
            })}>
            {getTransactionSign(type)}
            {limitDecimalPlaces(amount, 2)} {t<string>('USD')}
          </CyDText>
        </CyDView>
      </CyDTouchView>
    </>
  );
};

export default memo(CardTransactionItem);
