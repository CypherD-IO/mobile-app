/**
 * RSA Utility Module
 *
 * Provides RSA key generation using react-native-quick-crypto.
 * API matches react-native-rsa-native for drop-in replacement.
 *
 * Output format comparison (both produce):
 * - public: PEM-formatted SPKI public key
 * - private: PEM-formatted PKCS8 private key
 */

import crypto from 'crypto';

export interface RSAKeyPair {
  public: string;
  private: string;
}

export const RSA = {
  /**
   * Generates an RSA key pair.
   * @param modulusLength - Key size in bits (e.g., 2048, 4096)
   * @returns Promise<RSAKeyPair> with public and private keys in PEM format
   */
  generateKeys: async (modulusLength: number): Promise<RSAKeyPair> => {
    return await new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength,
          publicExponent: 0x10001, // 65537
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        },
        (err: Error | null, publicKey: string, privateKey: string) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              public: publicKey,
              private: privateKey,
            });
          }
        },
      );
    });
  },
};

export default RSA;
