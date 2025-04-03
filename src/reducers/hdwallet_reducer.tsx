import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import { CHAIN_ETH, Chain, CHAIN_NAMES } from '../constants/server';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_, isAddressSet } from '../core/util';
import { Dispatch } from 'react';
import { ISocialAuth } from '../models/socailAuth.interface';

export interface WalletKey {
  address: string;
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
  socialAuth?: ISocialAuth;
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
    }
  | {
      type: 'SET_SOCIAL_AUTH';
      value: {
        socialAuth: ISocialAuth;
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
  socialAuth: undefined,
};

// reducers
export function hdWalletStateReducer(
  state: HDWallet,
  action: HdWalletAction,
): HDWallet {
  switch (action.type) {
    case 'ADD_ADDRESS': {
      const { address, chain, publicKey } = action.value;

      const wallet = state.wallet;

      if (
        address !== undefined &&
        address !== 'IMPORTING' &&
        CHAIN_NAMES.includes(chain)
      ) {
        wallet[chain].wallets.push({
          address,
          publicKey,
        });

        // currIndex = 0 when its the first entry for wallets
        if (wallet[chain].wallets.length === 1) {
          wallet[chain].currentIndex = 0;
        }
      }

      return { ...state, wallet };
    }
    case 'LOAD_WALLET': {
      const { address, chain, publicKey, rawAddress, algo } = action.value;

      const wallet = state.wallet;
      if (isAddressSet(address) && CHAIN_NAMES.includes(chain)) {
        wallet[chain].wallets.length = 0;
        wallet[chain].wallets.push({
          address,
          publicKey,
          rawAddress,
          algo,
        });

        // currIndex = 0 when its the first entry for wallets
        if (wallet[chain].wallets.length === 1) {
          wallet[chain].currentIndex = 0;
        }

        if (chain === CHAIN_ETH.chainName) {
          Intercom.loginUserWithUserAttributes({ userId: address }).catch(
            () => {
              // throws error if user is already registered
            },
          );
          void analytics().setUserId(address);
        }
      }

      return { ...state, wallet };
    }

    case 'CHOOSE_CHAIN': {
      return { ...state, ...action.value };
    }

    case 'RESET_WALLET': {
      const resetWallet = initialHdWalletState;
      resetWallet.pinValue = state.pinValue;
      const emptyWallet: CypherDWallet = {};
      CHAIN_NAMES.forEach(chain => {
        emptyWallet[chain] = new ChainWallet({
          currentIndex: -1,
          wallets: [],
        });
      });
      emptyWallet.ethereum.currentIndex = 0;

      emptyWallet.ethereum.wallets.push({
        address: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
        publicKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
      });
      resetWallet.wallet = emptyWallet;
      return { ...resetWallet };
    }

    case 'RESET_PIN_AUTHENTICATION': {
      const { isReset } = action.value;
      return { ...state, reset: isReset };
    }

    case 'SET_PIN_VALUE': {
      const { pin } = action.value;
      return { ...state, pinValue: pin };
    }

    case 'SET_CHOOSEN_WALLET_INDEX': {
      const { indexValue } = action.value;
      return { ...state, choosenWalletIndex: indexValue };
    }

    case 'TOGGLE_BALANCE_VISIBILITY': {
      return { ...state, ...action.value };
    }

    case 'SET_READ_ONLY_WALLET': {
      return { ...state, ...action.value };
    }

    case 'SET_SOCIAL_AUTH': {
      return { ...state, ...action.value };
    }

    default:
      return state;
  }
}
