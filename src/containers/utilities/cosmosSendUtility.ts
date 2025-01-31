import { DecimalHelper } from '../../utils/decimalHelper';

export const microAtomToAtom = (amount: string, decimals = 6): string => {
  return DecimalHelper.toString(
    DecimalHelper.removeDecimals(amount, decimals),
    6,
  );
};

export const microAtomToUsd = (
  amount: string,
  tokenPrice: string,
  decimals = 6,
): string => {
  return DecimalHelper.toString(
    DecimalHelper.multiply(
      DecimalHelper.removeDecimals(amount, decimals),
      tokenPrice,
    ),
    6,
  );
};

export const isCosmosAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 6) === 'cosmos' && address.length === 45;
  }
  return false;
};
