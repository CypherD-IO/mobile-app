/**
 * Unit tests for hdWalletStateReducer — wallet state management.
 *
 * LOAD_WALLET is skipped because it calls Intercom + Firebase (side effects).
 */

// jest.mock calls are hoisted by Jest, so these run before imports.
jest.mock('@intercom/intercom-react-native', () => ({
  __esModule: true,
  default: { loginUserWithUserAttributes: jest.fn() },
}));

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  setUserId: jest.fn(),
}));

// Mock the deep dependency chain: server.tsx -> appImages -> themeReducer (JSX)
jest.mock('../../constants/server', () => ({
  CHAIN_ETH: { chainName: 'ethereum', backendName: 'ethereum' },
  CHAIN_SOLANA: { chainName: 'solana', backendName: 'solana' },
  Chain: {},
  CHAIN_NAMES: ['ethereum', 'solana', 'cosmos'],
}));

jest.mock('../../core/util', () => ({
  isAddressSet: jest.fn(
    (addr: string) => Boolean(addr?.trim() && addr !== 'IMPORTING'),
  ),
}));

import {
  hdWalletStateReducer,
  initialHdWalletState,
  ChainWallet,
  HDWallet,
} from '../hdwallet_reducer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fresh copy of initial state so tests don't mutate each other. */
const freshState = (): HDWallet => ({
  ...initialHdWalletState,
  wallet: { ...initialHdWalletState.wallet },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hdWalletStateReducer', () => {
  // ── ADD_ADDRESS ──────────────────────────────────────────────────────

  describe('ADD_ADDRESS', () => {
    it('adds a wallet to a chain and sets currentIndex to 0', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: {
          address: '0xABC',
          chain: 'ethereum',
          publicKey: 'pk1',
          path: "m/44'/60'/0'/0/0",
        },
      });

      expect(next.wallet.ethereum).toBeInstanceOf(ChainWallet);
      expect(next.wallet.ethereum.address).toBe('0xABC');
      expect(next.wallet.ethereum.publicKey).toBe('pk1');
    });

    it('appends a second wallet without changing currentIndex', () => {
      let state = freshState();
      state = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: {
          address: '0x111',
          chain: 'ethereum',
          publicKey: 'pk1',
        },
      });
      state = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: {
          address: '0x222',
          chain: 'ethereum',
          publicKey: 'pk2',
        },
      });

      // currentIndex stays 0 (the first wallet added)
      expect(state.wallet.ethereum.address).toBe('0x111');
      expect(state.wallet.ethereum.wallets).toHaveLength(2);
    });

    it('returns state unchanged for empty address', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: { address: '', chain: 'ethereum', publicKey: 'pk' },
      });
      expect(next).toBe(state);
    });

    it('returns state unchanged for IMPORTING address', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: { address: 'IMPORTING', chain: 'ethereum', publicKey: 'pk' },
      });
      expect(next).toBe(state);
    });

    it('returns state unchanged for unknown chain', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: { address: '0xABC', chain: 'fakecoin', publicKey: 'pk' },
      });
      expect(next).toBe(state);
    });
  });

  // ── CHOOSE_CHAIN ─────────────────────────────────────────────────────

  describe('CHOOSE_CHAIN', () => {
    it('updates selectedChain', () => {
      const state = freshState();
      const newChain = { chainName: 'solana', backendName: 'solana' } as any;
      const next = hdWalletStateReducer(state, {
        type: 'CHOOSE_CHAIN',
        value: { selectedChain: newChain },
      });
      expect(next.selectedChain).toBe(newChain);
    });

    it('does not mutate other state fields', () => {
      const state = freshState();
      state.pinValue = 'secret';
      const next = hdWalletStateReducer(state, {
        type: 'CHOOSE_CHAIN',
        value: {
          selectedChain: {
            chainName: 'cosmos',
            backendName: 'cosmos',
          } as any,
        },
      });
      expect(next.pinValue).toBe('secret');
    });
  });

  // ── RESET_WALLET ─────────────────────────────────────────────────────

  describe('RESET_WALLET', () => {
    it('resets to initial state but preserves pinValue', () => {
      let state = freshState();
      state.pinValue = '1234';
      state.hideBalance = true;
      state.isReadOnlyWallet = true;

      const next = hdWalletStateReducer(state, { type: 'RESET_WALLET' });

      expect(next.pinValue).toBe('1234');
      expect(next.hideBalance).toBe(false);
      expect(next.isReadOnlyWallet).toBe(false);
    });

    it('creates fresh empty chain wallets', () => {
      let state = freshState();
      state = hdWalletStateReducer(state, {
        type: 'ADD_ADDRESS',
        value: { address: '0xABC', chain: 'ethereum', publicKey: 'pk' },
      });

      const next = hdWalletStateReducer(state, { type: 'RESET_WALLET' });
      expect(next.wallet.ethereum.address).toBeUndefined();
      expect(next.wallet.ethereum.wallets).toHaveLength(0);
    });
  });

  // ── RESET_PIN_AUTHENTICATION ─────────────────────────────────────────

  describe('RESET_PIN_AUTHENTICATION', () => {
    it('sets reset flag to true', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'RESET_PIN_AUTHENTICATION',
        value: { isReset: true },
      });
      expect(next.reset).toBe(true);
    });

    it('sets reset flag to false', () => {
      const state = { ...freshState(), reset: true };
      const next = hdWalletStateReducer(state, {
        type: 'RESET_PIN_AUTHENTICATION',
        value: { isReset: false },
      });
      expect(next.reset).toBe(false);
    });
  });

  // ── SET_PIN_VALUE ────────────────────────────────────────────────────

  describe('SET_PIN_VALUE', () => {
    it('updates pinValue', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'SET_PIN_VALUE',
        value: { pin: '9876' },
      });
      expect(next.pinValue).toBe('9876');
    });
  });

  // ── SET_CHOOSEN_WALLET_INDEX ─────────────────────────────────────────

  describe('SET_CHOOSEN_WALLET_INDEX', () => {
    it('updates choosenWalletIndex', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'SET_CHOOSEN_WALLET_INDEX',
        value: { indexValue: 2 },
      });
      expect(next.choosenWalletIndex).toBe(2);
    });
  });

  // ── TOGGLE_BALANCE_VISIBILITY ────────────────────────────────────────

  describe('TOGGLE_BALANCE_VISIBILITY', () => {
    it('hides balance', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'TOGGLE_BALANCE_VISIBILITY',
        value: { hideBalance: true },
      });
      expect(next.hideBalance).toBe(true);
    });

    it('shows balance', () => {
      const state = { ...freshState(), hideBalance: true };
      const next = hdWalletStateReducer(state, {
        type: 'TOGGLE_BALANCE_VISIBILITY',
        value: { hideBalance: false },
      });
      expect(next.hideBalance).toBe(false);
    });
  });

  // ── SET_READ_ONLY_WALLET ─────────────────────────────────────────────

  describe('SET_READ_ONLY_WALLET', () => {
    it('enables read-only mode', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'SET_READ_ONLY_WALLET',
        value: { isReadOnlyWallet: true },
      });
      expect(next.isReadOnlyWallet).toBe(true);
    });

    it('disables read-only mode', () => {
      const state = { ...freshState(), isReadOnlyWallet: true };
      const next = hdWalletStateReducer(state, {
        type: 'SET_READ_ONLY_WALLET',
        value: { isReadOnlyWallet: false },
      });
      expect(next.isReadOnlyWallet).toBe(false);
    });
  });

  // ── default case ─────────────────────────────────────────────────────

  describe('default', () => {
    it('returns state for unknown action type', () => {
      const state = freshState();
      const next = hdWalletStateReducer(state, {
        type: 'UNKNOWN_ACTION' as any,
      });
      expect(next).toBe(state);
    });
  });
});
