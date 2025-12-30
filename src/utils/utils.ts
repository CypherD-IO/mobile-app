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
    if (address) {
        return address.substring(0, 3) === 'inj' && address.length === 42;
    }
    return false;
};

export const isCoreumAddress = (address: string): boolean => {
    if (address) {
        return address.substring(0, 4) === 'core' && address.length === 43;
    }
    return false;
};
  
export const isSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};