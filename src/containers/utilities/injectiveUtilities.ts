export const isInjectiveAddress = (address: string): boolean => {
  const INJECTIVE_ADDRESS_REGEX = /(?=^inj)(?=[a-zA-Z0-9]{42})/;
  return INJECTIVE_ADDRESS_REGEX.test(address);
};
