import { PublicKey } from '@solana/web3.js';
import { fromBech32 } from '@cosmjs/encoding';

const isValidBech32Address = (address: string, prefix: string): boolean => {
  try {
    const decoded = fromBech32(address);
    return decoded.prefix === prefix && decoded.data.length === 20;
  } catch {
    return false;
  }
};

export const isCosmosAddress = (address: string): boolean =>
  isValidBech32Address(address, 'cosmos');

export const isNobleAddress = (address: string): boolean =>
  isValidBech32Address(address, 'noble');

export const isOsmosisAddress = (address: string): boolean =>
  isValidBech32Address(address, 'osmo');

export const isInjectiveAddress = (address: string): boolean =>
  isValidBech32Address(address, 'inj');

export const isCoreumAddress = (address: string): boolean =>
  isValidBech32Address(address, 'core');

export const isSolanaAddress = (address: string): boolean => {
  try {
    const key = new PublicKey(address);
    return key.toBytes().length === 32;
  } catch {
    return false;
  }
};
