export const isNobleAddress = (address: string): boolean => {
  if (address) {
    return (address.substring(0, 5) === 'noble' && address.length === 44);
  }
  return false;
};
