export const isCoreumAddress = (address: string): boolean => {
  const COREUM_ADDRESS_REGEX = /(?=^core)(?=[a-zA-Z0-9]{43})/;
  return COREUM_ADDRESS_REGEX.test(address);
};
