import { isIOS } from '../../misc/checkers';

export type TabKeys = 'token' | 'nft';
export const tabs = [
  { key: 'token' as TabKeys, title: 'Tokens' },
  { key: 'nft' as TabKeys, title: 'NFTs' },
];

export const H_BALANCE_BANNER = 260;
export const H_HEADER_BAR = 60;
export const OFFSET_TABVIEW = isIOS() ? -H_BALANCE_BANNER : 0;
export const H_GUTTER = 40;
export const H_TAB_BAR = 40;
