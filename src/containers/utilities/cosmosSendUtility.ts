export const microAtomToAtom = (amount: string, decimals = 6): string => {
  return (parseFloat(amount) * 10 ** -decimals).toFixed(6).toString();
};

export const microAtomToUsd = (
  amount: string,
  tokenPrice: string,
  decimals = 6,
): string => {
  return (parseFloat(amount) * 10 ** -decimals * parseFloat(tokenPrice))
    .toFixed(6)
    .toString();
};

export const isCosmosAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 6) === 'cosmos' && address.length === 45;
  }
  return false;
};
