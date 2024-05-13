export const isEvmosAddress = (address: string): boolean => {
  return address.substring(0, 5) === 'evmos' && address.length === 44;
};
