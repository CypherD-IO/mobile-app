import { ConnectionTypes } from '../../../constants/enum';

export type SecureWalletSecretType = 'mnemonic' | 'privateKey';
export type SecureWalletVerifyMode = 'fourWords' | 'acknowledge';

export interface SecureWalletVariant {
  secretType: SecureWalletSecretType;
  verifyMode: SecureWalletVerifyMode;
  /** Social-login users get extra "how to import elsewhere" guidance. */
  showSocialGuidance: boolean;
  /** Social-login users get an informational "move funds instead" note. */
  showMoveFundsNote: boolean;
}

/** Connection types that have a backable secret (so the Home step shows). */
export const SECURE_WALLET_SUPPORTED_TYPES: ConnectionTypes[] = [
  ConnectionTypes.SEED_PHRASE,
  ConnectionTypes.PRIVATE_KEY,
  ConnectionTypes.SOCIAL_LOGIN_EVM,
  ConnectionTypes.SOCIAL_LOGIN_SOLANA,
];

/**
 * Maps the wallet's connection type to its Secure Wallet flow variant.
 * Returns null for types with no local secret to back up (WalletConnect /
 * watch-only) — those never reach this screen.
 */
export const getSecureWalletVariant = (
  connectionType: ConnectionTypes | null | undefined,
): SecureWalletVariant | null => {
  switch (connectionType) {
    case ConnectionTypes.SEED_PHRASE:
      return {
        secretType: 'mnemonic',
        verifyMode: 'fourWords',
        showSocialGuidance: false,
        showMoveFundsNote: false,
      };
    case ConnectionTypes.PRIVATE_KEY:
      return {
        secretType: 'privateKey',
        verifyMode: 'acknowledge',
        showSocialGuidance: false,
        showMoveFundsNote: false,
      };
    case ConnectionTypes.SOCIAL_LOGIN_EVM:
    case ConnectionTypes.SOCIAL_LOGIN_SOLANA:
      return {
        secretType: 'privateKey',
        verifyMode: 'acknowledge',
        showSocialGuidance: true,
        showMoveFundsNote: true,
      };
    default:
      return null;
  }
};

/**
 * Picks `ask` distinct word positions (0-based, ascending) to challenge for the
 * seed-phrase verify step. rng is injectable for deterministic tests.
 */
export const buildVerifyChallenge = (
  wordCount: number,
  ask = 4,
  rng: () => number = Math.random,
): number[] => {
  const positions = Array.from({ length: wordCount }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, Math.min(ask, wordCount)).sort((a, b) => a - b);
};

/**
 * Validates the user's answers (keyed by 0-based word index) against the
 * mnemonic. Case- and whitespace-insensitive. Empty answers fail.
 */
export const validateVerifyWords = (
  mnemonic: string,
  answers: Record<number, string>,
): boolean => {
  const words = mnemonic.trim().split(/\s+/);
  const entries = Object.entries(answers);
  if (entries.length === 0) return false;
  return entries.every(([idx, value]) => {
    const expected = words[Number(idx)];
    return (
      typeof expected === 'string' &&
      value.trim().toLowerCase() === expected.toLowerCase()
    );
  });
};
