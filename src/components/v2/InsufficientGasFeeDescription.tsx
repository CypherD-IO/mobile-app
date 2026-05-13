import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../../core/util';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import { DecimalHelper } from '../../utils/decimalHelper';

interface InsufficientGasFeeDescriptionProps {
  gasFeeInCrypto: string;
  balanceInCrypto: string;
  nativeTokenSymbol: string;
  nativeTokenPrice?: number | string;
}

const formatCryptoAmount = (value: string): string => {
  const amount = DecimalHelper.fromString(value);
  if (
    DecimalHelper.isGreaterThan(amount, 0) &&
    DecimalHelper.isLessThan(amount, 0.00001)
  ) {
    return '< 0.00001';
  }
  return formatAmount(value, 6);
};

const formatUsd = (
  cryptoAmount: string,
  price?: number | string,
): string | null => {
  if (price === undefined || price === null || price === '') return null;
  const priceDecimal = DecimalHelper.fromString(price);
  if (DecimalHelper.isLessThanOrEqualTo(priceDecimal, 0)) return null;
  const usd = DecimalHelper.multiply(cryptoAmount, priceDecimal);
  return `~$${formatAmount(usd, 2)}`;
};

export const InsufficientGasFeeDescription: React.FC<
  InsufficientGasFeeDescriptionProps
> = ({
  gasFeeInCrypto,
  balanceInCrypto,
  nativeTokenSymbol,
  nativeTokenPrice,
}) => {
  const { t } = useTranslation();

  const requiredCrypto = `~${formatCryptoAmount(
    gasFeeInCrypto,
  )} ${nativeTokenSymbol}`;
  const availableCrypto = `${formatCryptoAmount(
    balanceInCrypto,
  )} ${nativeTokenSymbol}`;
  const requiredUsd = formatUsd(gasFeeInCrypto, nativeTokenPrice);
  const availableUsd = formatUsd(balanceInCrypto, nativeTokenPrice);

  return (
    <CyDView className='mt-[15px] mb-[10px]'>
      <CyDText className='text-[14px] text-base400 text-center'>
        {t('INSUFFICIENT_GAS_FEE_INTRO', { symbol: nativeTokenSymbol })}
      </CyDText>

      <CyDView className='mt-[16px] bg-n30 rounded-[12px] px-[16px] py-[14px]'>
        <CyDView className='flex-row items-start justify-between'>
          <CyDText className='text-[13px] text-base200'>
            {t('INSUFFICIENT_GAS_FEE_REQUIRED')}
          </CyDText>
          <CyDView className='items-end'>
            <CyDText className='text-[15px] font-bold text-base400'>
              {requiredCrypto}
            </CyDText>
            {requiredUsd && (
              <CyDText className='text-[12px] text-base200 mt-[2px]'>
                {requiredUsd}
              </CyDText>
            )}
          </CyDView>
        </CyDView>

        <CyDView className='h-[1px] bg-n40 my-[10px]' />

        <CyDView className='flex-row items-start justify-between'>
          <CyDText className='text-[13px] text-base200'>
            {t('INSUFFICIENT_GAS_FEE_AVAILABLE')}
          </CyDText>
          <CyDView className='items-end'>
            <CyDText className='text-[15px] font-bold text-base400'>
              {availableCrypto}
            </CyDText>
            {availableUsd && (
              <CyDText className='text-[12px] text-base200 mt-[2px]'>
                {availableUsd}
              </CyDText>
            )}
          </CyDView>
        </CyDView>
      </CyDView>

      <CyDView className='mt-[14px] flex-row items-start'>
        <CyDMaterialDesignIcons
          name='information-outline'
          size={14}
          className='text-base150 mr-[6px] mt-[2px]'
        />
        <CyDText className='flex-1 text-[11px] italic text-base150 leading-[16px]'>
          {t('INSUFFICIENT_GAS_FEE_ESTIMATE_NOTE')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};
