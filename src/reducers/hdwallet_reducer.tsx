import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import { CHAIN_ETH, Chain, CHAIN_NAMES } from '../constants/server';
import { isAddressSet } from '../core/util';
import { Dispatch } from 'react';

export interface WalletKey {
  address: string | undefined;
  publicKey: Buffer | Uint8Array | string;
  rawAddress?: string;
  algo?: string;
}

export class ChainWallet {
  public currentIndex: number;
  public wallets: WalletKey[];
  constructor({
    currentIndex,
    wallets,
  }: {
    currentIndex: number;
    wallets: WalletKey[];
  }) {
    this.currentIndex = currentIndex;
    this.wallets = wallets;
  }

  public get address(): string | undefined {
    return this.currentIndex < 0 || this.currentIndex > this.wallets.length - 1
      ? undefined
      : this.wallets[this.currentIndex].address;
  }

  public get publicKey(): Buffer | Uint8Array | string {
    return this.currentIndex < 0 || this.currentIndex > this.wallets.length - 1
      ? 'null'
      : this.wallets[this.currentIndex].publicKey;
  }
}

export interface CypherDWallet {
  [key: string]: ChainWallet;
}

export interface HDWallet {
  wallet: CypherDWallet;
  selectedChain: Chain;
  card: any;
  reset: boolean;
  pinValue: string;
  hideTabBar: boolean;
  hideBalance: boolean;
  isReadOnlyWallet: boolean;
  choosenWalletIndex: number;
}

export interface HdWalletContextDef {
  state: HDWallet;
  dispatch: Dispatch<HdWalletAction>;
}

type HdWalletAction =
  | {
      type: 'ADD_ADDRESS';
      value: {
        address: string;
        chain: string;
        publicKey: Buffer | Uint8Array | string;
      };
    }
  | {
      type: 'LOAD_WALLET';
      value: {
        address: string;
        chain: string;
        publicKey: Buffer | Uint8Array | string;
        rawAddress?: string;
        algo?: string;
      };
    }
  | {
      type: 'CHOOSE_CHAIN';
      value: {
        selectedChain: Chain;
      };
    }
  | {
      type: 'RESET_WALLET';
    }
  | {
      type: 'RESET_PIN_AUTHENTICATION';
      value: {
        isReset: boolean;
      };
    }
  | {
      type: 'SET_PIN_VALUE';
      value: {
        pin: string;
      };
    }
  | {
      type: 'SET_CHOOSEN_WALLET_INDEX';
      value: {
        indexValue: number;
      };
    }
  | {
      type: 'TOGGLE_BALANCE_VISIBILITY';
      value: {
        hideBalance: boolean;
      };
    }
  | {
      type: 'SET_READ_ONLY_WALLET';
      value: {
        isReadOnlyWallet: boolean;
      };
    };

const wallet: CypherDWallet = {};

CHAIN_NAMES.forEach(chain => {
  wallet[chain] = new ChainWallet({
    currentIndex: -1,
    wallets: [],
  });
});

// initial states
export const initialHdWalletState: HDWallet = {
  wallet,
  selectedChain: CHAIN_ETH,
  card: undefined,
  reset: false,
  pinValue: '',
  hideTabBar: false,
  hideBalance: false,
  isReadOnlyWallet: false,
  choosenWalletIndex: -1,
};

// reducers
export function hdWalletStateReducer(
  state: HDWallet,
  action: HdWalletAction,
): HDWallet {
  switch (action.type) {
    case 'ADD_ADDRESS': {
      const { address, chain, publicKey } = action.value;

      if (!address || address === 'IMPORTING' || !CHAIN_NAMES.includes(chain)) {
        return state;
      }

      const existingChainWallet =
        state.wallet[chain] ||
        new ChainWallet({
          currentIndex: -1,
          wallets: [],
        });

      const updatedWallets = [
        ...existingChainWallet.wallets,
        { address, publicKey },
      ];

      const updatedWallet = {
        ...state.wallet,
        [chain]: new ChainWallet({
          currentIndex:
            updatedWallets.length === 1 ? 0 : existingChainWallet.currentIndex,
          wallets: updatedWallets,
        }),
      };

      return {
        ...state,
        wallet: updatedWallet,
      };
    }
    case 'LOAD_WALLET': {
      const { address, chain, publicKey, rawAddress, algo } = action.value;

      if (!isAddressSet(address) || !CHAIN_NAMES.includes(chain)) {
        return state;
      }

      // Create new wallet state immutably
      const updatedWallet = {
        ...state.wallet,
        [chain]: new ChainWallet({
          currentIndex: 0,
          wallets: [
            {
              address,
              publicKey,
              rawAddress,
              algo,
            },
          ],
        }),
      };

      // Handle analytics for ETH chain
      if (chain === CHAIN_ETH.chainName) {
        void Promise.all([
          Intercom.loginUserWithUserAttributes({ userId: address }).catch(
            () => {
              // User already registered
            },
          ),
          analytics().setUserId(address),
        ]);
      }

      return {
        ...state,
        wallet: updatedWallet,
      };
    }

    case 'CHOOSE_CHAIN': {
      return {
        ...state,
        selectedChain: action.value.selectedChain,
      };
    }

    case 'RESET_WALLET': {
      const emptyWallet: CypherDWallet = {};
      CHAIN_NAMES.forEach(chain => {
        emptyWallet[chain] = new ChainWallet({
          currentIndex: -1,
          wallets: [],
        });
      });

      return {
        ...initialHdWalletState,
        pinValue: state.pinValue,
        wallet: emptyWallet,
      };
    }

    case 'RESET_PIN_AUTHENTICATION': {
      return {
        ...state,
        reset: action.value.isReset,
      };
    }

    case 'SET_PIN_VALUE': {
      return {
        ...state,
        pinValue: action.value.pin,
      };
    }

    case 'SET_CHOOSEN_WALLET_INDEX': {
      return {
        ...state,
        choosenWalletIndex: action.value.indexValue,
      };
    }

    case 'TOGGLE_BALANCE_VISIBILITY': {
      return {
        ...state,
        hideBalance: action.value.hideBalance,
      };
    }

    case 'SET_READ_ONLY_WALLET': {
      return {
        ...state,
        isReadOnlyWallet: action.value.isReadOnlyWallet,
      };
    }

    default:
      return state;
  }
}
