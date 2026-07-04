/**
 * Unit tests for the Secure Wallet variant config + seed verify helpers.
 */
import { ConnectionTypes } from '../../../../constants/enum';
import {
  buildVerifyChallenge,
  getSecureWalletVariant,
  SECURE_WALLET_SUPPORTED_TYPES,
  validateVerifyWords,
} from '../getSecureWalletVariant';

describe('getSecureWalletVariant', () => {
  it('seed phrase → mnemonic + four-word verify, no social extras', () => {
    expect(getSecureWalletVariant(ConnectionTypes.SEED_PHRASE)).toEqual({
      secretType: 'mnemonic',
      verifyMode: 'fourWords',
      showSocialGuidance: false,
      showMoveFundsNote: false,
    });
  });

  it('private key → privateKey + acknowledge, no social extras', () => {
    expect(getSecureWalletVariant(ConnectionTypes.PRIVATE_KEY)).toEqual({
      secretType: 'privateKey',
      verifyMode: 'acknowledge',
      showSocialGuidance: false,
      showMoveFundsNote: false,
    });
  });

  it('social login → privateKey + acknowledge + guidance + move-funds', () => {
    [
      ConnectionTypes.SOCIAL_LOGIN_EVM,
      ConnectionTypes.SOCIAL_LOGIN_SOLANA,
    ].forEach(connectionType => {
      expect(getSecureWalletVariant(connectionType)).toEqual({
        secretType: 'privateKey',
        verifyMode: 'acknowledge',
        showSocialGuidance: true,
        showMoveFundsNote: true,
      });
    });
  });

  it('returns null for WalletConnect and unknown/null', () => {
    expect(getSecureWalletVariant(ConnectionTypes.WALLET_CONNECT)).toBeNull();
    expect(
      getSecureWalletVariant(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN),
    ).toBeNull();
    expect(getSecureWalletVariant(null)).toBeNull();
    expect(getSecureWalletVariant(undefined)).toBeNull();
  });

  it('supported-types list matches the non-null variants', () => {
    SECURE_WALLET_SUPPORTED_TYPES.forEach(connectionType => {
      expect(getSecureWalletVariant(connectionType)).not.toBeNull();
    });
  });
});

describe('buildVerifyChallenge', () => {
  it('returns `ask` distinct positions, ascending, within range', () => {
    const res = buildVerifyChallenge(12, 4, () => 0);
    expect(res).toHaveLength(4);
    expect(new Set(res).size).toBe(4);
    expect([...res]).toEqual([...res].sort((a, b) => a - b));
    res.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(12);
    });
  });

  it('clamps `ask` to the word count', () => {
    expect(buildVerifyChallenge(3, 4, () => 0)).toHaveLength(3);
  });
});

describe('validateVerifyWords', () => {
  const mnemonic = 'alpha bravo charlie delta echo foxtrot';

  it('passes correct words, case- and whitespace-insensitive', () => {
    expect(validateVerifyWords(mnemonic, { 0: 'Alpha', 3: ' delta ' })).toBe(
      true,
    );
  });

  it('fails when any word is wrong', () => {
    expect(validateVerifyWords(mnemonic, { 0: 'alpha', 1: 'wrong' })).toBe(
      false,
    );
  });

  it('fails on empty answers', () => {
    expect(validateVerifyWords(mnemonic, {})).toBe(false);
  });
});
