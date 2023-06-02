export interface BrowserHistoryEntry {
  image: string
  url: string
  name: string
  origin: string
  datetime: string
}

export interface SearchHistoryEntry {
  image: string
  url: string
  name: string
  origin: string
}

export interface WebsiteInfo {
  title: string
  host: string
  origin: string
  url: string
}
export interface PayModalParams {
  gasFeeDollar: string
  gasFeeETH: string | number
  networkName: string
  networkCurrency: string
  valueETH: string | number
  valueDollar: string | number
  totalDollar: string | number
  totalETH: string | number
  appImage: string
  finalGasPrice: string
  gasLimit: string
  gasPrice: string
  payload: any
}

export type PageType = 'history' | 'home' | 'webview' | 'webviewError' | 'bookmarks';

export type ErrorType = 'hostname' | 'ssl';
