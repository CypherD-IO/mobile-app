export const microAtomToAtom = (amount: string): string => {
  return (parseFloat(amount) * 10 ** -6).toFixed(6).toString();
};

export const microAtomToUsd = (amount: string, tokenPrice: string): string => {
  return (parseFloat(amount) * 10 ** -6 * parseFloat(tokenPrice))
    .toFixed(6)
    .toString();
};

export const isCosmosAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 6) === 'cosmos' && address.length === 45;
  }
  return false;
};
