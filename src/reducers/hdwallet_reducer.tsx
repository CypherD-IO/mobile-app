import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import { CHAIN_ETH, Chain, CHAIN_NAMES } from '../constants/server';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_, isAddressSet } from '../core/util';
import * as Sentry from '@sentry/react-native';

export interface WalletKey {
  address: string
  privateKey: Buffer | Uint8Array | string
  publicKey: Buffer | Uint8Array | string
}

export class ChainWallet {
  public currentIndex: number;
  public wallets: WalletKey[];
  constructor ({ currentIndex, wallets }: { currentIndex: number, wallets: WalletKey[]}) {
    this.currentIndex = currentIndex;
    this.wallets = wallets;
  }

  public get address (): string | undefined {
    return (this.currentIndex < 0 || this.currentIndex > (this.wallets.length - 1)) ? undefined : this.wallets[this.currentIndex].address;
  }

  public get privateKey (): Buffer | Uint8Array | string {
    return (this.currentIndex < 0 || this.currentIndex > (this.wallets.length - 1)) ? 'null' : this.wallets[this.currentIndex].privateKey;
  }

  public get publicKey (): Buffer | Uint8Array | string {
    return (this.currentIndex < 0 || this.currentIndex > (this.wallets.length - 1)) ? 'null' : this.wallets[this.currentIndex].publicKey;
  }
}

export interface CypherDWallet {
  [key: string]: ChainWallet
}

export interface HDWallet {
  wallet: CypherDWallet
  selectedChain: Chain
  isForceRefresh: any
  card: any
  pre_card_token: any
  reset: boolean
  pinValue: string
  hideTabBar: boolean
  hideBalance: boolean
}

const wallet: CypherDWallet = {};

CHAIN_NAMES.forEach(chain => {
  wallet[chain] = new ChainWallet({
    currentIndex: -1,
    wallets: []
  });
});

// initial states
export const initialHdWalletState: HDWallet = {
  wallet,
  selectedChain: CHAIN_ETH,
  isForceRefresh: undefined,
  card: undefined,
  pre_card_token: undefined,
  reset: false,
  pinValue: '',
  hideTabBar: false,
  hideBalance: false
};

// reducers
export function hdWalletStateReducer (state: any, action: any) {
  switch (action.type) {
    case 'ADD_ADDRESS': {
      const { address, privateKey, chain, publicKey } = action.value;

      const wallet = state.wallet;

      if (address !== undefined && address !== 'IMPORTING' && CHAIN_NAMES.includes(chain)) {
        wallet[chain].wallets.push({
          address,
          privateKey,
          publicKey
        });

        // currIndex = 0 when its the first entry for wallets
        if (wallet[chain].wallets.length === 1) {
          wallet[chain].currentIndex = 0;
        }
      }

      return { ...state, wallet };
    }
    case 'LOAD_WALLET': {
      const { address, privateKey, chain, publicKey, rawAddress, algo } = action.value;

      const wallet = state.wallet;
      if (isAddressSet(address) && CHAIN_NAMES.includes(chain)) {
        wallet[chain].wallets.length = 0;
        wallet[chain].wallets.push({
          address,
          privateKey,
          publicKey,
          rawAddress,
          algo
        });

        // currIndex = 0 when its the first entry for wallets
        if (wallet[chain].wallets.length === 1) {
          wallet[chain].currentIndex = 0;
        }

        if (chain === CHAIN_ETH.chainName) {
          Intercom.registerIdentifiedUser({ userId: address }).catch(error => {
            Sentry.captureException(error);
          });
          void analytics().setUserId(address);
        }
      }

      return { ...state, wallet };
    }

    case 'UPDATE_CHAIN_INDEX': {
      const { chain, index } = action.value;
      const { wallet } = state;

      if (CHAIN_NAMES.includes(chain) && index >= 0 && index <= (wallet[chain].wallets.length - 1)) {
        wallet[chain].currentIndex = index;
      }
      return { ...state, wallet };
    }

    case 'LOAD_PRIVATE_KEY': {
      return { ...state, ...action.value };
    }

    case 'LOAD_TOKEN_HOLDINGS': {
      return { ...state, ...action.value };
    }

    case 'FORGET_WALLET': {
      const address = _NO_CYPHERD_CREDENTIAL_AVAILABLE_;
      const privateKey = _NO_CYPHERD_CREDENTIAL_AVAILABLE_;
      const publicKey = _NO_CYPHERD_CREDENTIAL_AVAILABLE_;

      const wallet: CypherDWallet = {};

      CHAIN_NAMES.forEach(chain => {
        wallet[chain] = new ChainWallet({
          currentIndex: -1,
          wallets: []
        });
      });

      wallet.ethereum.currentIndex = 0;

      wallet.ethereum.wallets.push({
        address,
        privateKey,
        publicKey
      });

      return { ...state, wallet };
    }

    case 'CHOOSE_CHAIN': {
      return { ...state, ...action.value };
    }

    case 'FORCE_REFRESH': {
      return { ...state, ...action.value };
    }

    case 'CARD_REFRESH': {
      return { ...state, ...action.value };
    }

    case 'PRE_CARD_TOKEN': {
      return { ...state, ...action.value };
    }

    case 'RESET_WALLET' : {
      const resetWallet = initialHdWalletState;
      resetWallet.pinValue = state.pinValue;
      return { ...resetWallet };
    }

    case 'RESET_PIN_AUTHENTICATION' : {
      const { isReset } = action.value;
      let reset = state.reset;
      reset = isReset;
      return { ...state, reset };
    }

    case 'SET_PIN_VALUE' : {
      const { pin } = action.value;
      let pinValue = state.pinValue;
      pinValue = pin;
      return { ...state, pinValue };
    }

    case 'HIDE_TAB_BAR' : {
      const { tabBarHidden } = action.value;
      let hideTabBar = state.hideTabBar;
      hideTabBar = tabBarHidden;
      return { ...state, hideTabBar };
    }
    case 'TOGGLE_BALANCE_VISIBILITY' : {
      return { ...state, ...action.value };
    }

    default:
      return state;
  }
}
