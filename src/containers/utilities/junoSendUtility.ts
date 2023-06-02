export const isJunoAddress = (address: string): boolean => {
  return (address.substring(0, 4) === 'juno' && address.length === 43);
};
