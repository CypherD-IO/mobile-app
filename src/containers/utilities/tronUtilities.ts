import bs58 from 'bs58';
import { sha256 } from '@cosmjs-rn/crypto';

/**
 * Validates if the provided string is a valid Tron address
 * @param address - The address string to validate
 * @returns boolean - True if the address is valid, false otherwise
 *
 * Tron addresses are base58 encoded strings that:
 * - Start with 'T' for mainnet addresses
 * - Are typically 34 characters long
 * - Follow specific encoding and checksum rules
 */
export const isTronAddress = (address: string): boolean => {
  // Basic format validation: Tron addresses start with 'T' and are 34 characters long
  const tronAddressRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

  // First check if the address matches the basic pattern
  if (!tronAddressRegex.test(address)) {
    return false;
  }

  try {
    // Decode the base58 encoded address
    const decoded = bs58.decode(address);

    // Tron addresses should be 25 bytes (21 bytes address + 4 bytes checksum)
    if (decoded.length !== 25) {
      return false;
    }

    // Extract the address bytes (first 21 bytes) and checksum (last 4 bytes)
    const addressBytes = decoded.slice(0, 21);
    const checksum = decoded.slice(21);

    // Calculate the expected checksum
    // Double SHA256 hash of the address bytes
    const hash1 = sha256(addressBytes);
    const hash2 = sha256(hash1);

    // The checksum is the first 4 bytes of the double hash
    const expectedChecksum = hash2.slice(0, 4);

    // Verify the checksum matches
    return checksum.every(
      (byte: number, index: number) => byte === expectedChecksum[index],
    );
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error validating Tron address:', error);
    return false;
  }
};
