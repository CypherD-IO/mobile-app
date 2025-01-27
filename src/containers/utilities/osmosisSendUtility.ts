import { DecimalHelper } from '../../utils/decimalHelper';

export const microOsmoToOsmo = (amount: string, decimals = 6): string => {
  return DecimalHelper.toString(
    DecimalHelper.removeDecimals(amount, decimals),
    6,
  );
};

export const microOsmoToUsd = (amount: string, tokenPrice: string): string => {
  return DecimalHelper.toString(
    DecimalHelper.multiply(DecimalHelper.removeDecimals(amount, 6), tokenPrice),
    6,
  );
};

export const isOsmosisAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 4) === 'osmo' && address.length === 43;
  }
  return false;
};
