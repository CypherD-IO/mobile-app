export const isKujiraAddress = (address: string): boolean => {
  const KUJIRA_ADDRESS_REGEX = /(?=^kujira)(?=[a-zA-Z0-9]{45})/;
  return KUJIRA_ADDRESS_REGEX.test(address);
};
