export const microOsmoToOsmo = (amount: string): string => {
  return (parseFloat(amount) * 10 ** -6).toFixed(6).toString();
};

export const microOsmoToUsd = (amount: string, tokenPrice: string): string => {
  return (parseFloat(amount) * 10 ** -6 * parseFloat(tokenPrice))
    .toFixed(6)
    .toString();
};

export const isOsmosisAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 4) === 'osmo' && address.length === 43;
  }
  return false;
};
