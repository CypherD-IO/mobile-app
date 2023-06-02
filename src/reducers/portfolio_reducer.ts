import { fetchTokenData, WalletHoldings } from '../core/Portfolio';
import { Chain, CHAIN_COLLECTION } from '../constants/server';
import { advancedSettingsInitialState, IAdvancedSettingsData } from '../containers/Options/advancedSettings';
export interface PortfolioState {
  tokenPortfolio?: WalletHoldings
  portfolioState: string
  selectedChain: Chain
  developerMode: boolean
  appAdvancedSettings: IAdvancedSettingsData
  walletConnectURI: string
  buyButtonClicked: boolean
}

export const PORTFOLIO_EMPTY = 'EMPTY';
export const PORTFOLIO_NOT_EMPTY = 'NOT_EMPTY';
export const PORTFOLIO_NEW_LOAD = 'NEW_LOAD';
export const PORTFOLIO_ERROR = 'ERROR';
export const PORTFOLIO_REFRESH = 'REFRESH';
export const PORTFOLIO_LOADING = 'LOADING';

// initial states
export const initialPortfolioState: PortfolioState = {
  tokenPortfolio: undefined,
  portfolioState: PORTFOLIO_NOT_EMPTY,
  selectedChain: CHAIN_COLLECTION,
  developerMode: false,
  appAdvancedSettings: advancedSettingsInitialState,
  walletConnectURI: '',
  buyButtonClicked: false
};

// reducers
export function portfolioStateReducer (state: any, action: { type: any, value: { hdWallet: { state: { wallet: { ethereum: any, cosmos: any, osmosis: any } } }, portfolioState: { dispatchPortfolio: (arg0: { value: { tokenPortfolio: WalletHoldings, portfolioState: string, rtimestamp: any } | { portfolioState: string } | { tokenPortfolio: WalletHoldings | null, portfolioState: string, rtimestamp: string } | { portfolioState: string } | { tokenPortfolio: WalletHoldings, portfolioState: string, rtimestamp: any } | { portfolioState: string } | { portfolioState: string } }) => void } } }) {
  switch (action.type) {
    case 'REFRESH' : {
      void fetchTokenData(action.value.hdWallet, action.value.portfolioState);
      return state;
    }
    case 'RESET' : {
      return { ...initialPortfolioState };
    }
    default:
      return { ...state, ...action.value };
  }
}
