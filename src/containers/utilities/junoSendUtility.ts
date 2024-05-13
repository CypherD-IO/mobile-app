export const isJunoAddress = (address: string): boolean => {
  if (address) {
    return address.substring(0, 4) === 'juno' && address.length === 43;
  }
  return false;
};
