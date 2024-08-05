import { PublicKey } from '@solana/web3.js';

export const isSolanaAddress = (address: string): boolean => {
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  if (!solanaAddressRegex.test(address)) {
    return false;
  }

  try {
    PublicKey.isOnCurve(new PublicKey(address).toBuffer());
    return true;
  } catch (error) {
    return false;
  }
};
