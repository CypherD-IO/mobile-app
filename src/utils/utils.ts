export const isCosmosAddress = (address: string): boolean => {
    if (address) {
        return address.substring(0, 6) === 'cosmos' && address.length === 45;
    }
    return false;
};
  
export const isNobleAddress = (address: string): boolean => {
    if (address) {
        return address.substring(0, 5) === 'noble' && address.length === 44;
    }
    return false;
};
  
export const isOsmosisAddress = (address: string): boolean => {
    if (address) {
      return address.substring(0, 4) === 'osmo' && address.length === 43;
    }
    return false;
};
  
export const isInjectiveAddress = (address: string): boolean => {
    const INJECTIVE_ADDRESS_REGEX = /(?=^inj)(?=[a-zA-Z0-9]{42})/;
    return INJECTIVE_ADDRESS_REGEX.test(address);
};
  
export const isCoreumAddress = (address: string): boolean => {
    const COREUM_ADDRESS_REGEX = /(?=^core)(?=[a-zA-Z0-9]{43})/;
    return COREUM_ADDRESS_REGEX.test(address);
};
  
export const isSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};